import type { CardImage, CardPayload, CardVariant } from '../../types/product';
import { entryAngle, findVariantByValue, parseCardPayload } from './card-state';

/** Progressive enhancement for snippets/product-card.liquid: listens to the
 * swatch radio group and swaps image/price/badge/links per variant. With no
 * (or malformed) payload the server-rendered card keeps working untouched.
 *
 * It also feeds the pointer-entry angle to the CSS hover effect (the swatch
 * ring sweep in styles.css) as an `--enter` custom property. Plain CSS +
 * @property transitions cover this; a motion library would only pay off for
 * springs or orchestrated sequences. */
class ProductCard extends HTMLElement {
  #payload: CardPayload | null = null;

  connectedCallback(): void {
    const script = this.querySelector('script[data-card-payload]');
    this.#payload = parseCardPayload(script?.textContent);
    this.addEventListener('change', this.#onChange);
    this.addEventListener('pointerover', this.#onPointerOver);
  }

  disconnectedCallback(): void {
    this.removeEventListener('change', this.#onChange);
    this.removeEventListener('pointerover', this.#onPointerOver);
  }

  /** Stamps the entry angle on the swatch labels when the pointer crosses
   * into them (pointerover bubbles; entries-within are filtered out). */
  #onPointerOver = (event: Event): void => {
    if (!(event instanceof MouseEvent && event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>('label');
    if (!target || !this.contains(target)) return;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    const angle = entryAngle(target.getBoundingClientRect(), event.clientX, event.clientY);
    target.style.setProperty('--enter', `${angle}deg`);
  };

  #onChange = (event: Event): void => {
    if (!this.#payload) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-swatch]')) return;
    const variant = findVariantByValue(this.#payload, input.value);
    if (variant) this.#apply(variant);
  };

  #apply(variant: CardVariant): void {
    this.#applyImage('[data-primary-image]', variant.primaryImage, true);
    this.#applyImage('[data-secondary-image]', variant.secondaryImage, false);
    this.#applyPrice(variant);

    const badge = this.querySelector<HTMLElement>('[data-badge]');
    if (badge) badge.hidden = !variant.onSale;

    for (const link of this.querySelectorAll<HTMLAnchorElement>('a[data-card-link]')) {
      link.href = variant.url;
    }
  }

  #applyImage(selector: string, image: CardImage | null, updateAlt: boolean): void {
    const img = this.querySelector<HTMLImageElement>(selector);
    if (!img) return;
    if (!image) {
      img.hidden = true;
      return;
    }
    img.hidden = false;
    img.src = image.src;
    img.srcset = image.srcset;
    img.width = image.width;
    img.height = image.height;
    if (updateAlt) img.alt = image.alt;
  }

  #applyPrice(variant: CardVariant): void {
    const currentValue = this.querySelector('[data-price-current-value]');
    if (currentValue) currentValue.textContent = variant.price;

    const current = this.querySelector<HTMLElement>('[data-price-current]');
    if (current) {
      current.classList.toggle('text-sale', variant.onSale);
      current.classList.toggle('text-ink', !variant.onSale);
    }

    const saleLabel = this.querySelector<HTMLElement>('[data-price-sale-label]');
    if (saleLabel) saleLabel.hidden = !variant.onSale;

    const compare = this.querySelector<HTMLElement>('[data-price-compare]');
    if (compare) {
      compare.hidden = !variant.onSale;
      const compareValue = compare.querySelector('[data-price-compare-value]');
      if (compareValue) compareValue.textContent = variant.compareAtPrice ?? '';
    }
  }
}

if (!customElements.get('product-card')) {
  customElements.define('product-card', ProductCard);
}
