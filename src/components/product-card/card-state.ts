import type { CardImage, CardPayload, CardVariant } from '../../types/product';

function isCardImage(value: unknown): value is CardImage {
  if (typeof value !== 'object' || value === null) return false;
  const image = value as Record<string, unknown>;
  return (
    typeof image['src'] === 'string' &&
    typeof image['srcset'] === 'string' &&
    typeof image['width'] === 'number' &&
    typeof image['height'] === 'number' &&
    typeof image['alt'] === 'string'
  );
}

function isCardVariant(value: unknown): value is CardVariant {
  if (typeof value !== 'object' || value === null) return false;
  const variant = value as Record<string, unknown>;
  return (
    typeof variant['id'] === 'number' &&
    typeof variant['value'] === 'string' &&
    typeof variant['available'] === 'boolean' &&
    typeof variant['onSale'] === 'boolean' &&
    typeof variant['price'] === 'string' &&
    (variant['compareAtPrice'] === null || typeof variant['compareAtPrice'] === 'string') &&
    typeof variant['url'] === 'string' &&
    (variant['primaryImage'] === null || isCardImage(variant['primaryImage'])) &&
    (variant['secondaryImage'] === null || isCardImage(variant['secondaryImage']))
  );
}

/** Parse and validate the JSON payload embedded by product-card.liquid.
 * Returns null on any malformed input — the server-rendered card then
 * simply stays as-is. */
export function parseCardPayload(raw: string | null | undefined): CardPayload | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const variants = (data as { variants?: unknown }).variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  if (!variants.every(isCardVariant)) return null;
  return { variants: variants };
}

export function findVariantByValue(payload: CardPayload, value: string): CardVariant | undefined {
  return payload.variants.find((variant) => variant.value === value);
}

/** Angle (conic-gradient convention: 0deg = top, clockwise) from an element's
 * center to the pointer position. Drives the entry-aware hover effects:
 * sweeps start opposite this angle and close into it. */
export function entryAngle(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number
): number {
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  return Math.round((Math.atan2(dy, dx) * 180) / Math.PI) + 90;
}
