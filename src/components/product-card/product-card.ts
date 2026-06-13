import type { CardImage, CardPayload, CardVariant } from '../../types/product';
import {
  entryAngle,
  findVariantByValue,
  gestureAxis,
  type GestureAxis,
  type ImageView,
  parseCardPayload,
  swipeDestination,
  swipeProgress
} from './card-state';

interface SwipeGesture {
  pointerId: number;
  media: HTMLElement;
  startX: number;
  startY: number;
  startView: ImageView;
  axis: GestureAxis;
}

/** Progressive enhancement for snippets/product-card.liquid: listens to the
 * swatch radio group and swaps image/price/badge/links per variant. With no
 * (or malformed) payload the server-rendered card keeps working untouched.
 *
 * It also feeds the pointer-entry angle to the CSS hover effect (the swatch
 * ring sweep in styles.css) and adds a touch-native horizontal swipe between
 * the primary and secondary images. */
class ProductCard extends HTMLElement {
  #payload: CardPayload | null = null;
  #imageView: ImageView = 0;
  #gesture: SwipeGesture | null = null;
  #suppressClick = false;
  #suppressClickTimer: number | null = null;

  connectedCallback(): void {
    const script = this.querySelector('script[data-card-payload]');
    this.#payload = parseCardPayload(script?.textContent);
    this.addEventListener('change', this.#onChange);
    this.addEventListener('pointerover', this.#onPointerOver);
    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('pointermove', this.#onPointerMove);
    this.addEventListener('pointerup', this.#onPointerUp);
    this.addEventListener('pointercancel', this.#onPointerCancel);
    this.addEventListener('click', this.#onClick, true);
    this.#syncSwipeAvailability();
    this.#setImageView(0);
  }

  disconnectedCallback(): void {
    this.removeEventListener('change', this.#onChange);
    this.removeEventListener('pointerover', this.#onPointerOver);
    this.removeEventListener('pointerdown', this.#onPointerDown);
    this.removeEventListener('pointermove', this.#onPointerMove);
    this.removeEventListener('pointerup', this.#onPointerUp);
    this.removeEventListener('pointercancel', this.#onPointerCancel);
    this.removeEventListener('click', this.#onClick, true);
    this.#gesture = null;
    this.#clearClickSuppression();
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

  #onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0) return;
    if (!(event.target instanceof Element)) return;
    const media = event.target.closest<HTMLElement>('.card-media');
    if (!media || !this.contains(media) || !this.#hasSecondaryImage(media)) return;

    this.#gesture = {
      pointerId: event.pointerId,
      media,
      startX: event.clientX,
      startY: event.clientY,
      startView: this.#imageView,
      axis: 'pending'
    };
  };

  #onPointerMove = (event: PointerEvent): void => {
    const gesture = this.#gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (gesture.axis === 'pending') {
      gesture.axis = gestureAxis(deltaX, deltaY);
      if (gesture.axis === 'vertical') {
        this.#gesture = null;
        return;
      }
      if (gesture.axis === 'pending') return;

      gesture.media.dataset['swipeDragging'] = '';
      if (typeof gesture.media.setPointerCapture === 'function') {
        gesture.media.setPointerCapture(event.pointerId);
      }
    }

    if (event.cancelable) event.preventDefault();
    const progress = swipeProgress(gesture.startView, deltaX, gesture.media.getBoundingClientRect().width);
    gesture.media.style.setProperty('--image-swipe-progress', String(progress));
  };

  #onPointerUp = (event: PointerEvent): void => {
    this.#finishSwipe(event, false);
  };

  #onPointerCancel = (event: PointerEvent): void => {
    this.#finishSwipe(event, true);
  };

  #onClick = (event: MouseEvent): void => {
    if (!this.#suppressClick || !(event.target instanceof Element)) return;
    const media = event.target.closest('.card-media');
    if (!media || !this.contains(media)) return;

    this.#clearClickSuppression();
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #onChange = (event: Event): void => {
    if (!this.#payload) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches('[data-swatch]')) return;
    const variant = findVariantByValue(this.#payload, input.value);
    if (variant) this.#apply(variant);
  };

  #apply(variant: CardVariant): void {
    // Keep the viewer on the same image (primary/secondary) across a variant
    // change: swap the sources in place, leaving --image-swipe-progress
    // untouched so no crossfade fires. #setImageView re-validates the view and
    // only falls back to primary when the new variant has no secondary image.
    const view = this.#imageView;
    this.#applyImage('[data-primary-image]', variant.primaryImage, true);
    this.#applyImage('[data-secondary-image]', variant.secondaryImage, false);
    this.#syncSwipeAvailability();
    this.#setImageView(view);
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

  #finishSwipe(event: PointerEvent, cancelled: boolean): void {
    const gesture = this.#gesture;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    this.#gesture = null;
    if (gesture.axis !== 'horizontal') return;

    if (
      typeof gesture.media.hasPointerCapture === 'function' &&
      typeof gesture.media.releasePointerCapture === 'function' &&
      gesture.media.hasPointerCapture(event.pointerId)
    ) {
      gesture.media.releasePointerCapture(event.pointerId);
    }

    const deltaX = event.clientX - gesture.startX;
    const destination = cancelled
      ? gesture.startView
      : swipeDestination(gesture.startView, deltaX, gesture.media.getBoundingClientRect().width);

    delete gesture.media.dataset['swipeDragging'];
    void gesture.media.offsetWidth;
    this.#setImageView(destination);

    if (!cancelled) this.#suppressNextClick();
  }

  #syncSwipeAvailability(): void {
    const media = this.querySelector<HTMLElement>('.card-media');
    if (!media) return;
    const available = this.#hasSecondaryImage(media);
    media.toggleAttribute('data-swipe-enabled', available);

    const pagination = media.querySelector<HTMLElement>('[data-image-pagination]');
    if (pagination) pagination.hidden = !available;

    if (!available) this.#setImageView(0);
  }

  #hasSecondaryImage(media: HTMLElement): boolean {
    const secondary = media.querySelector<HTMLImageElement>('[data-secondary-image]');
    return Boolean(secondary && !secondary.hidden);
  }

  #setImageView(view: ImageView): void {
    const media = this.querySelector<HTMLElement>('.card-media');
    if (!media) return;
    const resolvedView: ImageView = view === 1 && this.#hasSecondaryImage(media) ? 1 : 0;
    this.#imageView = resolvedView;
    media.dataset['imageView'] = resolvedView === 1 ? 'secondary' : 'primary';
    media.style.setProperty('--image-swipe-progress', String(resolvedView));
  }

  #suppressNextClick(): void {
    this.#clearClickSuppression();
    this.#suppressClick = true;
    this.#suppressClickTimer = window.setTimeout(() => {
      this.#suppressClick = false;
      this.#suppressClickTimer = null;
    }, 500);
  }

  #clearClickSuppression(): void {
    this.#suppressClick = false;
    if (this.#suppressClickTimer !== null) {
      window.clearTimeout(this.#suppressClickTimer);
      this.#suppressClickTimer = null;
    }
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
