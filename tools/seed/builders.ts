/** Pure builders for the Plain T-shirt seed — kept I/O-free for unit testing. */

export const COLORS = ['Orange', 'Green', 'Blue', 'Yellow', 'Pink', 'Navy'] as const;
export type Color = (typeof COLORS)[number];

export const PRODUCT = {
  title: 'Plain T-shirt',
  handle: 'plain-t-shirt',
  vendor: 'Good Brand Company',
  price: '20.00',
  compareAtPrice: '29.50'
} as const;

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
