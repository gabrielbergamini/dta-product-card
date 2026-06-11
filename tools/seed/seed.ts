/**
 * Seeds the "Plain T-shirt" product into the dev store via the Admin GraphQL API.
 * Idempotent: skips creation when the product exists, but always reconciles the
 * native color swatches (standard color-pattern metaobjects + option link).
 *
 * Usage: npm run seed  (reads .env — see .env.example for the required token)
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildProductSetInput,
  buildSeedFiles,
  buildSwatchEntries,
  PATTERN_SOLID_TAXONOMY_VALUE_ID,
  PRODUCT
} from './builders';

const API_VERSION = '2026-01';
const ASSETS_DIR = path.join(import.meta.dirname, '..', '..', 'src', 'figma-assets');

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env var ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  return value;
}

const STORE = requiredEnv('SHOPIFY_STORE_DOMAIN');
const TOKEN = requiredEnv('SHOPIFY_ADMIN_TOKEN');
const ENDPOINT = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

interface UserError {
  field?: string[] | null;
  message: string;
}

async function admin<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) {
    throw new Error(`Admin API HTTP ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors, null, 2)}`);
  }
  if (!json.data) throw new Error('Admin API returned no data');
  return json.data;
}

function assertNoUserErrors(label: string, userErrors: UserError[]): void {
  if (userErrors.length > 0) {
    throw new Error(`${label} userErrors: ${JSON.stringify(userErrors, null, 2)}`);
  }
}

async function findExistingProduct(): Promise<string | null> {
  const data = await admin<{ products: { nodes: { id: string }[] } }>(
    `query ($query: String!) { products(first: 1, query: $query) { nodes { id } } }`,
    { query: `handle:${PRODUCT.handle}` }
  );
  return data.products.nodes[0]?.id ?? null;
}

interface StagedTarget {
  url: string;
  resourceUrl: string;
  parameters: { name: string; value: string }[];
}

async function stageAndUploadAll(): Promise<Map<string, string>> {
  const files = buildSeedFiles();
  const buffers = new Map<string, Buffer>();
  for (const file of files) {
    buffers.set(file.filename, await readFile(path.join(ASSETS_DIR, file.filename)));
  }

  const input = files.map((file) => ({
    filename: file.filename,
    mimeType: 'image/jpeg',
    resource: 'IMAGE',
    httpMethod: 'POST',
    fileSize: String(buffers.get(file.filename)?.byteLength ?? 0)
  }));

  const data = await admin<{
    stagedUploadsCreate: { stagedTargets: StagedTarget[]; userErrors: UserError[] };
  }>(
    `mutation ($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    { input }
  );
  assertNoUserErrors('stagedUploadsCreate', data.stagedUploadsCreate.userErrors);

  const targets = data.stagedUploadsCreate.stagedTargets;
  if (targets.length !== files.length) {
    throw new Error(`expected ${files.length} staged targets, got ${targets.length}`);
  }

  const uploads = new Map<string, string>();
  for (const [index, file] of files.entries()) {
    const target = targets[index];
    if (!target) throw new Error(`no staged target for ${file.filename}`);
    const buffer = buffers.get(file.filename);
    if (!buffer) throw new Error(`no buffer for ${file.filename}`);

    const body = new FormData();
    for (const parameter of target.parameters) {
      body.append(parameter.name, parameter.value);
    }
    body.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' }), file.filename);

    const uploadResponse = await fetch(target.url, { method: 'POST', body });
    if (!uploadResponse.ok) {
      throw new Error(
        `upload failed for ${file.filename}: HTTP ${uploadResponse.status} ${await uploadResponse.text()}`
      );
    }
    uploads.set(file.filename, target.resourceUrl);
    console.log(`uploaded ${file.filename}`);
  }
  return uploads;
}

async function createProduct(uploads: Map<string, string>): Promise<string> {
  const data = await admin<{
    productSet: { product: { id: string; handle: string } | null; userErrors: UserError[] };
  }>(
    `mutation ($input: ProductSetInput!) {
      productSet(synchronous: true, input: $input) {
        product { id handle }
        userErrors { field message }
      }
    }`,
    { input: buildProductSetInput(uploads) }
  );
  assertNoUserErrors('productSet', data.productSet.userErrors);
  const product = data.productSet.product;
  if (!product) throw new Error('productSet returned no product');
  return product.id;
}

async function publishEverywhere(productId: string): Promise<void> {
  const data = await admin<{
    publications: { nodes: { id: string; catalog: { title: string } | null }[] };
  }>(`query { publications(first: 25) { nodes { id catalog { title } } } }`);

  const publications = data.publications.nodes;
  if (publications.length === 0) {
    console.warn('no publications found — publish the product to the Online Store manually in admin');
    return;
  }

  const result = await admin<{ publishablePublish: { userErrors: UserError[] } }>(
    `mutation ($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) { userErrors { field message } }
    }`,
    { id: productId, input: publications.map((publication) => ({ publicationId: publication.id })) }
  );
  assertNoUserErrors('publishablePublish', result.publishablePublish.userErrors);
  console.log(`published to: ${publications.map((p) => p.catalog?.title ?? p.id).join(', ')}`);
}

/** Defines the variant "Hover image" metafield (file picker in admin) so merchants
 * can change each variant's card hover image. Tolerates an existing definition. */
async function ensureHoverImageDefinition(): Promise<void> {
  const data = await admin<{
    metafieldDefinitionCreate: {
      createdDefinition: { id: string } | null;
      userErrors: (UserError & { code?: string })[];
    };
  }>(
    `mutation {
      metafieldDefinitionCreate(
        definition: {
          name: "Hover image"
          namespace: "custom"
          key: "hover_image"
          description: "Secondary image shown when hovering the product card"
          type: "file_reference"
          ownerType: PRODUCTVARIANT
          pin: true
          validations: [{ name: "file_type_options", value: "[\\"Image\\"]" }]
        }
      ) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }`
  );
  const errors = data.metafieldDefinitionCreate.userErrors;
  if (errors.length > 0 && !errors.every((error) => error.code === 'TAKEN')) {
    throw new Error(`metafieldDefinitionCreate userErrors: ${JSON.stringify(errors, null, 2)}`);
  }
  console.log(errors.length > 0 ? 'hover_image definition already exists' : 'created hover_image definition');
}

/** Defines the product "Badge" metafield (validated New / Best Seller dropdown in
 * admin) used by the card as the non-sale badge label. Tolerates an existing definition. */
async function ensureBadgeDefinition(): Promise<void> {
  const data = await admin<{
    metafieldDefinitionCreate: {
      createdDefinition: { id: string } | null;
      userErrors: (UserError & { code?: string })[];
    };
  }>(
    `mutation {
      metafieldDefinitionCreate(
        definition: {
          name: "Badge"
          namespace: "custom"
          key: "badge"
          description: "Label shown on the product card (mutually exclusive with the automatic On Sale badge)"
          type: "single_line_text_field"
          ownerType: PRODUCT
          pin: true
          validations: [{ name: "choices", value: "[\\"New\\",\\"Best Seller\\"]" }]
        }
      ) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }`
  );
  const errors = data.metafieldDefinitionCreate.userErrors;
  if (errors.length > 0 && !errors.every((error) => error.code === 'TAKEN')) {
    throw new Error(`metafieldDefinitionCreate(badge) userErrors: ${JSON.stringify(errors, null, 2)}`);
  }
  console.log(errors.length > 0 ? 'badge definition already exists' : 'created badge definition');
}

/** Points each variant's hover_image metafield at its "<color> secondary" media. */
async function assignHoverImages(productId: string): Promise<void> {
  const data = await admin<{
    product: {
      media: { nodes: { id: string; alt: string | null }[] };
      variants: { nodes: { id: string; title: string }[] };
    };
  }>(
    `query ($id: ID!) {
      product(id: $id) {
        media(first: 50) { nodes { id alt } }
        variants(first: 50) { nodes { id title } }
      }
    }`,
    { id: productId }
  );

  const mediaByAlt = new Map(data.product.media.nodes.map((media) => [media.alt ?? '', media.id]));
  const metafields = data.product.variants.nodes.map((variant) => {
    const mediaId = mediaByAlt.get(`${variant.title} secondary`);
    if (!mediaId) throw new Error(`no "${variant.title} secondary" media found for hover image`);
    return {
      ownerId: variant.id,
      namespace: 'custom',
      key: 'hover_image',
      type: 'file_reference',
      value: mediaId
    };
  });

  const result = await admin<{ metafieldsSet: { userErrors: UserError[] } }>(
    `mutation ($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) { userErrors { field message } }
    }`,
    { metafields }
  );
  assertNoUserErrors('metafieldsSet', result.metafieldsSet.userErrors);
  console.log(`assigned hover images to ${metafields.length} variants`);
}

const COLOR_PATTERN_TYPE = 'shopify--color-pattern';

/** Sets the product's taxonomy category (T-Shirts). The shopify.color-pattern
 * metafield is category-constrained — without a category the option link is
 * rejected with INVALID_METAFIELD_VALUE_FOR_LINKED_OPTION. */
async function ensureProductCategory(productId: string): Promise<void> {
  const data = await admin<{
    productUpdate: { product: { id: string } | null; userErrors: UserError[] };
  }>(
    `mutation ($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id }
        userErrors { field message }
      }
    }`,
    { product: { id: productId, category: PRODUCT.categoryId } }
  );
  assertNoUserErrors('productUpdate(category)', data.productUpdate.userErrors);
  console.log('set product taxonomy category (T-Shirts)');
}

/** Enables the standard shopify.color-pattern metafield definition on products —
 * the metafield behind the admin's native option-value swatches. Enabling it also
 * provisions the shopify--color-pattern metaobject definition. Tolerates it
 * already being enabled. */
async function ensureColorPatternDefinition(): Promise<void> {
  const templates = await admin<{
    standardMetafieldDefinitionTemplates: { nodes: { id: string; namespace: string; key: string }[] };
  }>(
    `query {
      standardMetafieldDefinitionTemplates(first: 250) {
        nodes { id namespace key }
      }
    }`
  );
  const template = templates.standardMetafieldDefinitionTemplates.nodes.find(
    (node) => node.namespace === 'shopify' && node.key === 'color-pattern'
  );
  if (!template) throw new Error('no standard metafield template for shopify.color-pattern');

  const data = await admin<{
    standardMetafieldDefinitionEnable: {
      createdDefinition: { id: string } | null;
      userErrors: (UserError & { code?: string })[];
    };
  }>(
    `mutation ($id: ID!) {
      standardMetafieldDefinitionEnable(id: $id, ownerType: PRODUCT) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }`,
    { id: template.id }
  );
  const errors = data.standardMetafieldDefinitionEnable.userErrors;
  if (errors.length > 0 && !errors.every((error) => error.code === 'TAKEN')) {
    throw new Error(`standardMetafieldDefinitionEnable userErrors: ${JSON.stringify(errors, null, 2)}`);
  }
  console.log(errors.length > 0 ? 'color-pattern definition already enabled' : 'enabled color-pattern definition');
}

/** Upserts one color-pattern metaobject per design color: label, Figma hex, and
 * the required base color/pattern taxonomy references. Returns metaobject ids
 * keyed by handle for the option-value linking step. */
async function upsertSwatchMetaobjects(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const entry of buildSwatchEntries()) {
    const data = await admin<{
      metaobjectUpsert: { metaobject: { id: string; handle: string } | null; userErrors: UserError[] };
    }>(
      `mutation ($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
        metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
          metaobject { id handle }
          userErrors { field message }
        }
      }`,
      {
        handle: { type: COLOR_PATTERN_TYPE, handle: entry.handle },
        metaobject: {
          fields: [
            { key: 'label', value: entry.label },
            { key: 'color', value: entry.hex },
            { key: 'color_taxonomy_reference', value: JSON.stringify([entry.colorTaxonomyValueId]) },
            { key: 'pattern_taxonomy_reference', value: PATTERN_SOLID_TAXONOMY_VALUE_ID }
          ]
        }
      }
    );
    assertNoUserErrors(`metaobjectUpsert(${entry.handle})`, data.metaobjectUpsert.userErrors);
    const metaobject = data.metaobjectUpsert.metaobject;
    if (!metaobject) throw new Error(`metaobjectUpsert(${entry.handle}) returned no metaobject`);
    ids.set(metaobject.handle, metaobject.id);
  }
  console.log(`upserted ${ids.size} swatch metaobjects`);
  return ids;
}

/** Links the product's Color option to the standard color-pattern metafield so
 * each option value carries its swatch (admin shows a native color picker). */
async function linkColorOptionToSwatches(productId: string, swatchIds: Map<string, string>): Promise<void> {
  const data = await admin<{
    product: {
      options: {
        id: string;
        name: string;
        linkedMetafield: { namespace: string; key: string } | null;
        optionValues: { id: string; name: string }[];
      }[];
    };
  }>(
    `query ($id: ID!) {
      product(id: $id) {
        options {
          id
          name
          linkedMetafield { namespace key }
          optionValues { id name }
        }
      }
    }`,
    { id: productId }
  );

  const option = data.product.options.find((candidate) => candidate.name.toLowerCase() === 'color');
  if (!option) throw new Error('product has no Color option to link');
  if (option.linkedMetafield?.key === 'color-pattern') {
    console.log('Color option already linked to color-pattern swatches');
    return;
  }

  const optionValuesToUpdate = option.optionValues.map((value) => {
    const metaobjectId = swatchIds.get(value.name.toLowerCase());
    if (!metaobjectId) throw new Error(`no swatch metaobject for option value "${value.name}"`);
    return { id: value.id, linkedMetafieldValue: metaobjectId };
  });

  const result = await admin<{
    productOptionUpdate: { userErrors: (UserError & { code?: string })[] };
  }>(
    `mutation ($productId: ID!, $option: OptionUpdateInput!, $optionValuesToUpdate: [OptionValueUpdateInput!]) {
      productOptionUpdate(
        productId: $productId
        option: $option
        optionValuesToUpdate: $optionValuesToUpdate
      ) {
        userErrors { field message code }
      }
    }`,
    {
      productId,
      option: { id: option.id, linkedMetafield: { namespace: 'shopify', key: 'color-pattern' } },
      optionValuesToUpdate
    }
  );
  assertNoUserErrors('productOptionUpdate', result.productOptionUpdate.userErrors);
  console.log(`linked Color option (${optionValuesToUpdate.length} values) to color-pattern swatches`);
}

async function main(): Promise<void> {
  let productId = await findExistingProduct();
  if (productId) {
    console.log(`"${PRODUCT.title}" already exists (${productId}) — reconciling swatches only.`);
  } else {
    console.log('uploading images…');
    const uploads = await stageAndUploadAll();
    console.log('creating product…');
    productId = await createProduct(uploads);
    console.log(`created ${productId}`);
    await publishEverywhere(productId);
    await ensureHoverImageDefinition();
    await ensureBadgeDefinition();
    await assignHoverImages(productId);
  }
  await ensureProductCategory(productId);
  await ensureColorPatternDefinition();
  const swatchIds = await upsertSwatchMetaobjects();
  await linkColorOptionToSwatches(productId, swatchIds);
  console.log(`done — https://${STORE}/products/${PRODUCT.handle}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
