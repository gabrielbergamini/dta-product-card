import { describe, expect, it } from 'vitest';
import type { CardPayload } from '../../types/product';
import { entryAngle, findVariantByValue, parseCardPayload } from './card-state';

const image = {
  src: '//cdn/orange.jpg',
  srcset: '//cdn/orange.jpg 360w',
  width: 1000,
  height: 1000,
  alt: 'Plain T-shirt'
};

const variant = {
  id: 1,
  value: 'Orange',
  available: true,
  onSale: true,
  price: '$20.00',
  compareAtPrice: '$29.50',
  url: '/products/plain-t-shirt?variant=1',
  primaryImage: image,
  secondaryImage: null
};

describe('parseCardPayload', () => {
  it('parses a valid payload', () => {
    const payload = parseCardPayload(JSON.stringify({ variants: [variant] }));
    expect(payload).not.toBeNull();
    expect(payload?.variants).toHaveLength(1);
    expect(payload?.variants[0]?.value).toBe('Orange');
  });

  it('returns null for missing input', () => {
    expect(parseCardPayload(null)).toBeNull();
    expect(parseCardPayload(undefined)).toBeNull();
    expect(parseCardPayload('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseCardPayload('{nope')).toBeNull();
  });

  it('returns null for an empty variants array', () => {
    expect(parseCardPayload('{"variants":[]}')).toBeNull();
  });

  it('returns null when a variant is malformed', () => {
    const bad = { ...variant, price: 20 }; // number, not preformatted string
    expect(parseCardPayload(JSON.stringify({ variants: [bad] }))).toBeNull();
  });

  it('accepts null images and null compareAtPrice', () => {
    const minimal = {
      ...variant,
      onSale: false,
      compareAtPrice: null,
      primaryImage: null,
      secondaryImage: null
    };
    const payload = parseCardPayload(JSON.stringify({ variants: [minimal] }));
    expect(payload?.variants[0]?.compareAtPrice).toBeNull();
  });
});

describe('entryAngle', () => {
  const rect = { left: 0, top: 0, width: 100, height: 100 };

  it('maps the four entry sides to conic angles (0 = top, clockwise)', () => {
    expect(entryAngle(rect, 50, 0)).toBe(0); // entered from the top
    expect(entryAngle(rect, 100, 50)).toBe(90); // from the right
    expect(entryAngle(rect, 50, 100)).toBe(180); // from the bottom
    expect(entryAngle(rect, 0, 50)).toBe(270); // from the left
  });
});

describe('findVariantByValue', () => {
  const payload: CardPayload = {
    variants: [variant, { ...variant, id: 2, value: 'Navy' }]
  };

  it('finds a variant by exact color', () => {
    expect(findVariantByValue(payload, 'Navy')?.id).toBe(2);
  });

  it('returns undefined for unknown colors', () => {
    expect(findVariantByValue(payload, 'Chartreuse')).toBeUndefined();
  });
});
