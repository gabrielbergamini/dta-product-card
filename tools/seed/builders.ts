/** Pure builders for the Plain T-shirt seed — kept I/O-free for unit testing. */

export const COLORS = ['Orange', 'Green', 'Blue', 'Yellow', 'Pink', 'Navy'] as const;
export type Color = (typeof COLORS)[number];

export const PRODUCT = {
  title: 'Plain T-shirt',
  handle: 'plain-t-shirt',
  vendor: 'Good Brand Company',
  price: '20.00',
  compareAtPrice: '29.50',
  // Apparel & Accessories > Clothing > Clothing Tops > T-Shirts. Required for the
  // shopify.color-pattern linked option: that metafield is category-constrained,
  // so a product without a taxonomy category can't link swatches at all.
  categoryId: 'gid://shopify/TaxonomyCategory/aa-1-13-8'
} as const;

/** Figma design hexes, seeded into the standard color-pattern swatch metaobjects. */
export const SWATCH_HEXES: Record<Color, string> = {
  Orange: '#FF6633',
  Green: '#006600',
  Blue: '#00639C',
  Yellow: '#FCE78D',
  Pink: '#FFCCFF',
  Navy: '#19264B'
};

/** Shopify's global product taxonomy "Color" attribute values (stable platform-wide
 * ids) — the color-pattern metaobject requires a base-color taxonomy reference. */
export const COLOR_TAXONOMY_VALUE_IDS: Record<Color, string> = {
  Orange: 'gid://shopify/TaxonomyValue/10',
  Green: 'gid://shopify/TaxonomyValue/9',
  Blue: 'gid://shopify/TaxonomyValue/2',
  Yellow: 'gid://shopify/TaxonomyValue/14',
  Pink: 'gid://shopify/TaxonomyValue/11',
  Navy: 'gid://shopify/TaxonomyValue/15'
};

/** Taxonomy "Pattern" attribute value "Solid" — required base pattern for swatches. */
export const PATTERN_SOLID_TAXONOMY_VALUE_ID = 'gid://shopify/TaxonomyValue/2874';

export interface SwatchEntry {
  handle: string;
  label: Color;
  hex: string;
  colorTaxonomyValueId: string;
}

/** One shopify--color-pattern metaobject per color: handle keyed by the
 * downcased option value, color from the Figma palette. */
export function buildSwatchEntries(): SwatchEntry[] {
  return COLORS.map((color) => ({
    handle: color.toLowerCase(),
    label: color,
    hex: SWATCH_HEXES[color],
    colorTaxonomyValueId: COLOR_TAXONOMY_VALUE_IDS[color]
  }));
}

export interface SeedFile {
  filename: string;
  alt: string;
}

export interface ProductSetFileInput {
  originalSource: string;
  alt: string;
  filename: string;
  contentType: 'IMAGE';
}

export interface ProductSetVariantInput {
  optionValues: { optionName: 'Color'; name: Color }[];
  price: string;
  compareAtPrice: string;
  inventoryPolicy: 'CONTINUE';
  file: ProductSetFileInput;
}

export interface ProductSetInput {
  title: string;
  handle: string;
  vendor: string;
  status: 'ACTIVE';
  descriptionHtml: string;
  productOptions: { name: 'Color'; values: { name: Color }[] }[];
  files: ProductSetFileInput[];
  variants: ProductSetVariantInput[];
}

export function buildSeedFiles(): SeedFile[] {
  return COLORS.flatMap((color) => [
    { filename: `${color.toLowerCase()}.jpg`, alt: color },
    { filename: `${color.toLowerCase()}-secondary.jpg`, alt: `${color} secondary` }
  ]);
}

function requireUpload(uploads: Map<string, string>, filename: string): string {
  const url = uploads.get(filename);
  if (!url) throw new Error(`missing upload for ${filename}`);
  return url;
}

export function buildProductSetInput(uploads: Map<string, string>): ProductSetInput {
  const files: ProductSetFileInput[] = buildSeedFiles().map((file) => ({
    originalSource: requireUpload(uploads, file.filename),
    alt: file.alt,
    filename: file.filename,
    contentType: 'IMAGE'
  }));

  const variants: ProductSetVariantInput[] = COLORS.map((color) => {
    const filename = `${color.toLowerCase()}.jpg`;
    return {
      optionValues: [{ optionName: 'Color', name: color }],
      price: PRODUCT.price,
      compareAtPrice: PRODUCT.compareAtPrice,
      inventoryPolicy: 'CONTINUE',
      file: {
        originalSource: requireUpload(uploads, filename),
        alt: color,
        filename,
        contentType: 'IMAGE'
      }
    };
  });

  return {
    title: PRODUCT.title,
    handle: PRODUCT.handle,
    vendor: PRODUCT.vendor,
    status: 'ACTIVE',
    descriptionHtml: '<p>A plain t-shirt in six colors.</p>',
    productOptions: [{ name: 'Color', values: COLORS.map((color) => ({ name: color })) }],
    files,
    variants
  };
}
