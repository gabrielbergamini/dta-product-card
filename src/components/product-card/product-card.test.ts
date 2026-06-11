import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CardPayload } from '../../types/product';

function payloadFixture(): CardPayload {
  return {
    variants: [
      {
        id: 1,
        value: 'Orange',
        available: true,
        onSale: true,
        price: '$20.00',
        compareAtPrice: '$29.50',
        url: '/products/plain-t-shirt?variant=1',
        primaryImage: { src: 'orange.jpg', srcset: 'orange.jpg 360w', width: 1000, height: 1000, alt: 'Orange tee' },
        secondaryImage: { src: 'orange-2.jpg', srcset: 'orange-2.jpg 360w', width: 800, height: 1000, alt: '' }
      },
      {
        id: 2,
        value: 'Navy',
        available: true,
        onSale: false,
        price: '$29.50',
        compareAtPrice: null,
        url: '/products/plain-t-shirt?variant=2',
        primaryImage: { src: 'navy.jpg', srcset: 'navy.jpg 360w', width: 1000, height: 1000, alt: 'Navy tee' },
        secondaryImage: null
      }
    ]
  };
}

/* Mirrors the markup contract of snippets/product-card.liquid — keep in sync. */
function mount(payloadJson: string): HTMLElement {
  document.body.innerHTML = `
    <product-card>
      <div class="card-media">
        <a data-card-link href="/products/plain-t-shirt?variant=1">
          <img data-primary-image src="orange.jpg" srcset="orange.jpg 360w" width="1000" height="1000" alt="Orange tee">
          <img data-secondary-image src="orange-2.jpg" srcset="orange-2.jpg 360w" width="800" height="1000" alt="" aria-hidden="true">
        </a>
        <span data-badge>On Sale!</span>
      </div>
      <fieldset>
        <legend>Color</legend>
        <label><input type="radio" name="color-1" value="Orange" data-swatch checked></label>
        <label><input type="radio" name="color-1" value="Navy" data-swatch></label>
      </fieldset>
      <h3><a data-card-link href="/products/plain-t-shirt?variant=1">Plain T-shirt</a></h3>
      <p>
        <span data-price-compare><span data-price-compare-value>$29.50</span></span>
        <span data-price-current class="text-sale"><span data-price-sale-label>Sale price</span><span data-price-current-value>$20.00</span></span>
      </p>
      <script type="application/json" data-card-payload>${payloadJson}</script>
    </product-card>`;
  const card = document.querySelector('product-card');
  if (!(card instanceof HTMLElement)) throw new Error('mount failed');
  return card;
}

function selectColor(card: HTMLElement, color: string): void {
  const radio = card.querySelector<HTMLInputElement>(`input[value="${color}"]`);
  if (!radio) throw new Error(`no radio for ${color}`);
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeAll(async () => {
  await import('./product-card');
});

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('<product-card>', () => {
  it('swaps images, prices, badge, and links when a non-sale variant is selected', () => {
    const card = mount(JSON.stringify(payloadFixture()));
    selectColor(card, 'Navy');

    const primary = card.querySelector<HTMLImageElement>('[data-primary-image]');
    expect(primary?.getAttribute('src')).toBe('navy.jpg');
    expect(primary?.alt).toBe('Navy tee');

    const secondary = card.querySelector<HTMLImageElement>('[data-secondary-image]');
    expect(secondary?.hidden).toBe(true);

    expect(card.querySelector('[data-price-current-value]')?.textContent).toBe('$29.50');
    expect(card.querySelector<HTMLElement>('[data-price-compare]')?.hidden).toBe(true);
    expect(card.querySelector<HTMLElement>('[data-price-sale-label]')?.hidden).toBe(true);
    expect(card.querySelector<HTMLElement>('[data-badge]')?.hidden).toBe(true);
    expect(card.querySelector('[data-price-current]')?.classList.contains('text-sale')).toBe(false);
    expect(card.querySelector('[data-price-current]')?.classList.contains('text-ink')).toBe(true);

    for (const link of card.querySelectorAll<HTMLAnchorElement>('a[data-card-link]')) {
      expect(link.getAttribute('href')).toBe('/products/plain-t-shirt?variant=2');
    }
  });

  it('restores sale presentation when switching back to a sale variant', () => {
    const card = mount(JSON.stringify(payloadFixture()));
    selectColor(card, 'Navy');
    selectColor(card, 'Orange');

    expect(card.querySelector<HTMLImageElement>('[data-primary-image]')?.getAttribute('src')).toBe('orange.jpg');
    expect(card.querySelector<HTMLImageElement>('[data-secondary-image]')?.hidden).toBe(false);
    expect(card.querySelector<HTMLElement>('[data-badge]')?.hidden).toBe(false);
    expect(card.querySelector('[data-price-compare-value]')?.textContent).toBe('$29.50');
    expect(card.querySelector('[data-price-current-value]')?.textContent).toBe('$20.00');
    expect(card.querySelector('[data-price-current]')?.classList.contains('text-sale')).toBe(true);
  });

  it('does nothing when the payload is malformed', () => {
    const card = mount('{broken json');
    selectColor(card, 'Navy');
    expect(card.querySelector<HTMLImageElement>('[data-primary-image]')?.getAttribute('src')).toBe('orange.jpg');
  });

  it('ignores colors missing from the payload', () => {
    const card = mount(JSON.stringify(payloadFixture()));
    const radio = card.querySelector<HTMLInputElement>('input[value="Navy"]');
    if (!radio) throw new Error('missing radio');
    radio.value = 'Chartreuse';
    selectColor(card, 'Chartreuse');
    expect(card.querySelector<HTMLImageElement>('[data-primary-image]')?.getAttribute('src')).toBe('orange.jpg');
  });
});
