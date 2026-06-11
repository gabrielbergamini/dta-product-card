import { describe, expect, it } from 'vitest';
import { buildProductSetInput, buildSeedFiles, COLORS, PRODUCT } from './builders';

describe('buildSeedFiles', () => {
  it('produces a primary and secondary file per color with the alt convention', () => {
    const files = buildSeedFiles();
    expect(files).toHaveLength(12);
    expect(files).toContainEqual({ filename: 'orange.jpg', alt: 'Orange' });
    expect(files).toContainEqual({ filename: 'orange-secondary.jpg', alt: 'Orange secondary' });
  });
});

describe('buildProductSetInput', () => {
  const uploads = new Map(buildSeedFiles().map((f) => [f.filename, `https://staged/${f.filename}`]));
  const input = buildProductSetInput(uploads);

  it('defines the Color option with all six values in design order', () => {
    expect(input.productOptions).toEqual([{ name: 'Color', values: COLORS.map((color) => ({ name: color })) }]);
  });

  it('creates six variants, all on sale, with their primary image attached', () => {
    expect(input.variants).toHaveLength(6);
    for (const variant of input.variants) {
      expect(variant.price).toBe(PRODUCT.price);
      expect(variant.compareAtPrice).toBe(PRODUCT.compareAtPrice);
      expect(variant.inventoryPolicy).toBe('CONTINUE');
      expect(variant.file.originalSource).toMatch(/^https:\/\/staged\//);
    }
  });

  it('attaches all 12 files with the alt-text convention', () => {
    expect(input.files).toHaveLength(12);
    const alts = input.files.map((file) => file.alt);
    expect(alts).toContain('Navy secondary');
  });

  it('throws if an upload is missing', () => {
    expect(() => buildProductSetInput(new Map())).toThrow(/missing upload/i);
  });
});
