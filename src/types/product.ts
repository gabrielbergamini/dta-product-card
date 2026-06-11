/** Contract between snippets/product-card.liquid (producer) and the
 * <product-card> custom element (consumer). Prices are preformatted by
 * Liquid's `money` filter — the client never does money math. */
export interface CardImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
}

export interface CardVariant {
  id: number;
  /** The selector option value this variant represents (a color name, size, …). */
  value: string;
  available: boolean;
  onSale: boolean;
  price: string;
  compareAtPrice: string | null;
  url: string;
  primaryImage: CardImage | null;
  secondaryImage: CardImage | null;
}

export interface CardPayload {
  variants: CardVariant[];
}
