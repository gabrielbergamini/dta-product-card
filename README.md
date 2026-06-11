# DTA Product Card

A Shopify theme built around: a product card, rendered as a grid on the homepage and on collection pages.

The card was built from scratch on top of Shopify's Skeleton theme. It shows the product image, brand, title
and price, with color swatches that swap the imagery in place and a secondary image revealed on hover (as per spec, it works on card hover, not image-only hover). When a variant is on sale you get the "On Sale!" badge and "striked" pricing. Products without color variants, sales/compare-at pricing, or extra images simply render without those parts.

## Stack

- Shopify Skeleton theme as the shell
- Vite for the asset pipeline (fixed-name, unminified output into `assets/`)
- Tailwind CSS v4
- TypeScript (strict) compiled to ES2017
- A single vanilla `<product-card>` custom element
- ESLint + Prettier (wired together), Vitest, theme-check, Husky + lint-staged

## How the card works

`snippets/product-card.liquid` renders everything server-side, so the card is fully usable without
JavaScript. It also embeds a small JSON payload per card. The `<product-card>` element
(`src/components/product-card/`) reads that payload and swaps image, price, badge and links when a swatch
is selected. If the payload is missing or malformed the element does nothing and the server-rendered card
stays intact.

Variant selectors adapt to the data: option values with a known color (the six from the design) render as
circles, anything else renders as a labeled chip. Products with a single default variant get plain product
URLs, no `?variant=` noise.

Hover images are merchant-editable: each variant has a pinned **Hover image** metafield
(`custom.hover_image`, file picker in admin). If it's not set, the theme falls back to a product media whose
alt text is "<color> secondary", then to the product's second image for single-option products.

Swatches are a native radio group (arrow keys work), price changes are announced via `aria-live`, and the
hover transition respects `prefers-reduced-motion`.

## Dev

You need Node 20.6+, the Shopify CLI authenticated against your store, and a `.env` with
`SHOPIFY_STORE_DOMAIN` (plus `SHOPIFY_STORE_PASSWORD` if the storefront is password-protected) — see
`.env.example`.

```bash
npm install
npm run dev      # vite build --watch + shopify theme dev on http://127.0.0.1:9292
npm run verify   # typecheck, lint, format, tests, build, theme-check
```

## Seeding the demo product

`npm run seed` creates the "Plain T-shirt" (six color variants, \$20.00 on sale from \$29.50, all images from
`src/figma-assets/` plus the hover-image metafields). It needs an Admin API token in `.env` — see
`.env.example` for the scopes. The script is idempotent: it won't touch an existing `plain-t-shirt`.

If you'd rather not create a token, the same GraphQL operations can be run through
`shopify store auth` + `shopify store execute`.

## Fonts

The design's badge font (Franklin Gothic ATF) is commercially licensed, so the theme ships Libre Franklin
instead, sized so the badge matches the design's rendered dimensions. Body text is Roboto, as designed.
