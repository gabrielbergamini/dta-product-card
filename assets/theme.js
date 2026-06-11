//#region src/components/product-card/card-state.ts
function isCardImage(value) {
	if (typeof value !== "object" || value === null) return false;
	const image = value;
	return typeof image["src"] === "string" && typeof image["srcset"] === "string" && typeof image["width"] === "number" && typeof image["height"] === "number" && typeof image["alt"] === "string";
}
function isCardVariant(value) {
	if (typeof value !== "object" || value === null) return false;
	const variant = value;
	return typeof variant["id"] === "number" && typeof variant["value"] === "string" && typeof variant["available"] === "boolean" && typeof variant["onSale"] === "boolean" && typeof variant["price"] === "string" && (variant["compareAtPrice"] === null || typeof variant["compareAtPrice"] === "string") && typeof variant["url"] === "string" && (variant["primaryImage"] === null || isCardImage(variant["primaryImage"])) && (variant["secondaryImage"] === null || isCardImage(variant["secondaryImage"]));
}
/** Parse and validate the JSON payload embedded by product-card.liquid.
* Returns null on any malformed input — the server-rendered card then
* simply stays as-is. */
function parseCardPayload(raw) {
	if (!raw) return null;
	let data;
	try {
		data = JSON.parse(raw);
	} catch (_unused) {
		return null;
	}
	if (typeof data !== "object" || data === null) return null;
	const variants = data.variants;
	if (!Array.isArray(variants) || variants.length === 0) return null;
	if (!variants.every(isCardVariant)) return null;
	return { variants };
}
function findVariantByValue(payload, value) {
	return payload.variants.find((variant) => variant.value === value);
}
/** Angle (conic-gradient convention: 0deg = top, clockwise) from an element's
* center to the pointer position. Drives the entry-aware hover effects:
* sweeps start opposite this angle and close into it. */
function entryAngle(rect, clientX, clientY) {
	const dx = clientX - (rect.left + rect.width / 2);
	const dy = clientY - (rect.top + rect.height / 2);
	return Math.round(Math.atan2(dy, dx) * 180 / Math.PI) + 90;
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/checkPrivateRedeclaration.js
function _checkPrivateRedeclaration(e, t) {
	if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/classPrivateMethodInitSpec.js
function _classPrivateMethodInitSpec(e, a) {
	_checkPrivateRedeclaration(e, a), a.add(e);
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/classPrivateFieldInitSpec.js
function _classPrivateFieldInitSpec(e, t, a) {
	_checkPrivateRedeclaration(e, t), t.set(e, a);
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/assertClassBrand.js
function _assertClassBrand(e, t, n) {
	if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
	throw new TypeError("Private element is not present on this object");
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/classPrivateFieldGet2.js
function _classPrivateFieldGet2(s, a) {
	return s.get(_assertClassBrand(s, a));
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/classPrivateFieldSet2.js
function _classPrivateFieldSet2(s, a, r) {
	return s.set(_assertClassBrand(s, a), r), r;
}
//#endregion
//#region src/components/product-card/product-card.ts
var _payload = /* @__PURE__ */ new WeakMap();
var _onPointerOver = /* @__PURE__ */ new WeakMap();
var _onChange = /* @__PURE__ */ new WeakMap();
var _ProductCard_brand = /* @__PURE__ */ new WeakSet();
/** Progressive enhancement for snippets/product-card.liquid: listens to the
* swatch radio group and swaps image/price/badge/links per variant. With no
* (or malformed) payload the server-rendered card keeps working untouched.
*
* It also feeds the pointer-entry angle to the CSS hover effect (the swatch
* ring sweep in styles.css) as an `--enter` custom property. Plain CSS +
* @property transitions cover this; a motion library would only pay off for
* springs or orchestrated sequences. */
var ProductCard = class extends HTMLElement {
	constructor(..._args) {
		super(..._args);
		_classPrivateMethodInitSpec(this, _ProductCard_brand);
		_classPrivateFieldInitSpec(this, _payload, null);
		_classPrivateFieldInitSpec(this, _onPointerOver, (event) => {
			if (!(event instanceof MouseEvent && event.target instanceof Element)) return;
			const target = event.target.closest("label");
			if (!target || !this.contains(target)) return;
			if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
			const angle = entryAngle(target.getBoundingClientRect(), event.clientX, event.clientY);
			target.style.setProperty("--enter", `${angle}deg`);
		});
		_classPrivateFieldInitSpec(this, _onChange, (event) => {
			if (!_classPrivateFieldGet2(_payload, this)) return;
			const input = event.target;
			if (!(input instanceof HTMLInputElement) || !input.matches("[data-swatch]")) return;
			const variant = findVariantByValue(_classPrivateFieldGet2(_payload, this), input.value);
			if (variant) _assertClassBrand(_ProductCard_brand, this, _apply).call(this, variant);
		});
	}
	connectedCallback() {
		const script = this.querySelector("script[data-card-payload]");
		_classPrivateFieldSet2(_payload, this, parseCardPayload(script === null || script === void 0 ? void 0 : script.textContent));
		this.addEventListener("change", _classPrivateFieldGet2(_onChange, this));
		this.addEventListener("pointerover", _classPrivateFieldGet2(_onPointerOver, this));
	}
	disconnectedCallback() {
		this.removeEventListener("change", _classPrivateFieldGet2(_onChange, this));
		this.removeEventListener("pointerover", _classPrivateFieldGet2(_onPointerOver, this));
	}
};
function _apply(variant) {
	_assertClassBrand(_ProductCard_brand, this, _applyImage).call(this, "[data-primary-image]", variant.primaryImage, true);
	_assertClassBrand(_ProductCard_brand, this, _applyImage).call(this, "[data-secondary-image]", variant.secondaryImage, false);
	_assertClassBrand(_ProductCard_brand, this, _applyPrice).call(this, variant);
	const badge = this.querySelector("[data-badge]");
	if (badge) badge.hidden = !variant.onSale;
	for (const link of this.querySelectorAll("a[data-card-link]")) link.href = variant.url;
}
function _applyImage(selector, image, updateAlt) {
	const img = this.querySelector(selector);
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
function _applyPrice(variant) {
	const currentValue = this.querySelector("[data-price-current-value]");
	if (currentValue) currentValue.textContent = variant.price;
	const current = this.querySelector("[data-price-current]");
	if (current) {
		current.classList.toggle("text-sale", variant.onSale);
		current.classList.toggle("text-ink", !variant.onSale);
	}
	const saleLabel = this.querySelector("[data-price-sale-label]");
	if (saleLabel) saleLabel.hidden = !variant.onSale;
	const compare = this.querySelector("[data-price-compare]");
	if (compare) {
		var _variant$compareAtPri;
		compare.hidden = !variant.onSale;
		const compareValue = compare.querySelector("[data-price-compare-value]");
		if (compareValue) compareValue.textContent = (_variant$compareAtPri = variant.compareAtPrice) !== null && _variant$compareAtPri !== void 0 ? _variant$compareAtPri : "";
	}
}
if (!customElements.get("product-card")) customElements.define("product-card", ProductCard);
//#endregion
