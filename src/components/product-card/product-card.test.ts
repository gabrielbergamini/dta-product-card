import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { CardPayload } from '../../types/product';

class TestPointerEvent extends MouseEvent {
  readonly isPrimary: boolean;
  readonly pointerId: number;
  readonly pointerType: string;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.isPrimary = init.isPrimary ?? true;
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'touch';
  }
}

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
        <span data-image-pagination hidden aria-hidden="true">
          <span data-image-dot="primary"></span>
          <span data-image-dot="secondary"></span>
        </span>
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

function mediaFor(card: HTMLElement): HTMLElement {
  const media = card.querySelector<HTMLElement>('.card-media');
  if (!media) throw new Error('missing card media');
  media.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 300,
    bottom: 340,
    width: 300,
    height: 340,
    toJSON: () => ({})
  });
  return media;
}

function pointer(target: Element, type: string, clientX: number, clientY: number): boolean {
  return target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 7,
      pointerType: 'touch',
      button: 0,
      clientX,
      clientY
    })
  );
}

beforeAll(async () => {
  Object.defineProperty(globalThis, 'PointerEvent', { configurable: true, value: TestPointerEvent });
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

  it('previews and commits the secondary image after a left swipe', () => {
    const card = mount(JSON.stringify(payloadFixture()));
    const media = mediaFor(card);

    pointer(media, 'pointerdown', 240, 120);
    pointer(media, 'pointermove', 165, 124);

    expect(media.dataset['swipeDragging']).toBe('');
    expect(Number(media.style.getPropertyValue('--image-swipe-progress'))).toBeCloseTo(0.25);

    pointer(media, 'pointerup', 165, 124);

    expect(media.dataset['imageView']).toBe('secondary');
    expect(media.style.getPropertyValue('--image-swipe-progress')).toBe('1');
    expect(media.hasAttribute('data-swipe-dragging')).toBe(false);

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    const link = media.querySelector('a');
    expect(link?.dispatchEvent(click)).toBe(false);
    expect(click.defaultPrevented).toBe(true);
  });

  it('leaves vertical movement to page scrolling without suppressing taps', () => {
    const card = mount(JSON.stringify(payloadFixture()));
    const media = mediaFor(card);

    pointer(media, 'pointerdown', 200, 100);
    pointer(media, 'pointermove', 205, 180);
    pointer(media, 'pointerup', 205, 180);

    expect(media.dataset['imageView']).toBe('primary');
    expect(media.style.getPropertyValue('--image-swipe-progress')).toBe('0');

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    const link = media.querySelector('a');
    expect(link?.dispatchEvent(click)).toBe(true);
    expect(click.defaultPrevented).toBe(false);
  });

  it('swipes right to restore the primary image', () => {
    const card = mount(JSON.stringify(payloadFixture()));
    const media = mediaFor(card);

    pointer(media, 'pointerdown', 240, 120);
    pointer(media, 'pointermove', 165, 120);
    pointer(media, 'pointerup', 165, 120);
    pointer(media, 'pointerdown', 80, 120);
    pointer(media, 'pointermove', 155, 120);
    pointer(media, 'pointerup', 155, 120);

    expect(media.dataset['imageView']).toBe('primary');
    expect(media.style.getPropertyValue('--image-swipe-progress')).toBe('0');
  });

  it('keeps the secondary view when the newly selected variant also has a secondary image', () => {
    const payload = payloadFixture();
    payload.variants[1] = {
      ...payload.variants[1]!,
      secondaryImage: { src: 'navy-2.jpg', srcset: 'navy-2.jpg 360w', width: 800, height: 1000, alt: '' }
    };
    const card = mount(JSON.stringify(payload));
    const media = mediaFor(card);

    pointer(media, 'pointerdown', 240, 120);
    pointer(media, 'pointermove', 165, 120);
    pointer(media, 'pointerup', 165, 120);
    expect(media.dataset['imageView']).toBe('secondary');

    selectColor(card, 'Navy');

    // View stays on secondary; progress never dips toward primary (no glitch).
    expect(media.dataset['imageView']).toBe('secondary');
    expect(media.style.getPropertyValue('--image-swipe-progress')).toBe('1');
    const primary = card.querySelector<HTMLImageElement>('[data-primary-image]');
    const secondary = card.querySelector<HTMLImageElement>('[data-secondary-image]');
    expect(primary?.getAttribute('src')).toBe('navy.jpg');
    expect(secondary?.getAttribute('src')).toBe('navy-2.jpg');
    expect(secondary?.hidden).toBe(false);
  });

  it('resets to primary and disables swipe when the selected variant has no secondary image', () => {
    const card = mount(JSON.stringify(payloadFixture()));
    const media = mediaFor(card);

    pointer(media, 'pointerdown', 240, 120);
    pointer(media, 'pointermove', 165, 120);
    pointer(media, 'pointerup', 165, 120);
    selectColor(card, 'Navy');

    expect(media.dataset['imageView']).toBe('primary');
    expect(media.hasAttribute('data-swipe-enabled')).toBe(false);
    expect(card.querySelector<HTMLElement>('[data-image-pagination]')?.hidden).toBe(true);
  });
});
