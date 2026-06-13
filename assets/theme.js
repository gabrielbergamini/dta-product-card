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
var GESTURE_SLOP_PX = 8;
var SWIPE_THRESHOLD_RATIO = .15;
function gestureAxis(deltaX, deltaY) {
	if (Math.hypot(deltaX, deltaY) < GESTURE_SLOP_PX) return "pending";
	return Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
}
function swipeProgress(startView, deltaX, width) {
	if (width <= 0) return startView;
	return Math.max(0, Math.min(1, startView - deltaX / width));
}
function swipeDestination(startView, deltaX, width) {
	if (width <= 0) return startView;
	const threshold = width * SWIPE_THRESHOLD_RATIO;
	if (startView === 0 && deltaX <= -threshold) return 1;
	if (startView === 1 && deltaX >= threshold) return 0;
	return startView;
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
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/classPrivateFieldSet2.js
function _classPrivateFieldSet2(s, a, r) {
	return s.set(_assertClassBrand(s, a), r), r;
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/classPrivateFieldGet2.js
function _classPrivateFieldGet2(s, a) {
	return s.get(_assertClassBrand(s, a));
}
//#endregion
//#region src/components/product-card/product-card.ts
var _payload = /* @__PURE__ */ new WeakMap();
var _imageView = /* @__PURE__ */ new WeakMap();
var _gesture = /* @__PURE__ */ new WeakMap();
var _suppressClick = /* @__PURE__ */ new WeakMap();
var _suppressClickTimer = /* @__PURE__ */ new WeakMap();
var _onPointerOver = /* @__PURE__ */ new WeakMap();
var _onPointerDown = /* @__PURE__ */ new WeakMap();
var _onPointerMove = /* @__PURE__ */ new WeakMap();
var _onPointerUp = /* @__PURE__ */ new WeakMap();
var _onPointerCancel = /* @__PURE__ */ new WeakMap();
var _onClick = /* @__PURE__ */ new WeakMap();
var _onChange = /* @__PURE__ */ new WeakMap();
var _ProductCard_brand = /* @__PURE__ */ new WeakSet();
/** Progressive enhancement for snippets/product-card.liquid: listens to the
* swatch radio group and swaps image/price/badge/links per variant. With no
* (or malformed) payload the server-rendered card keeps working untouched.
*
* It also feeds the pointer-entry angle to the CSS hover effect (the swatch
* ring sweep in styles.css) and adds a touch-native horizontal swipe between
* the primary and secondary images. */
var ProductCard = class extends HTMLElement {
	constructor(..._args) {
		super(..._args);
		_classPrivateMethodInitSpec(this, _ProductCard_brand);
		_classPrivateFieldInitSpec(this, _payload, null);
		_classPrivateFieldInitSpec(this, _imageView, 0);
		_classPrivateFieldInitSpec(this, _gesture, null);
		_classPrivateFieldInitSpec(this, _suppressClick, false);
		_classPrivateFieldInitSpec(this, _suppressClickTimer, null);
		_classPrivateFieldInitSpec(this, _onPointerOver, (event) => {
			if (!(event instanceof MouseEvent && event.target instanceof Element)) return;
			const target = event.target.closest("label");
			if (!target || !this.contains(target)) return;
			if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
			const angle = entryAngle(target.getBoundingClientRect(), event.clientX, event.clientY);
			target.style.setProperty("--enter", `${angle}deg`);
		});
		_classPrivateFieldInitSpec(this, _onPointerDown, (event) => {
			if (event.pointerType === "mouse" || !event.isPrimary || event.button !== 0) return;
			if (!(event.target instanceof Element)) return;
			const media = event.target.closest(".card-media");
			if (!media || !this.contains(media) || !_assertClassBrand(_ProductCard_brand, this, _hasSecondaryImage).call(this, media)) return;
			_classPrivateFieldSet2(_gesture, this, {
				pointerId: event.pointerId,
				media,
				startX: event.clientX,
				startY: event.clientY,
				startView: _classPrivateFieldGet2(_imageView, this),
				axis: "pending"
			});
		});
		_classPrivateFieldInitSpec(this, _onPointerMove, (event) => {
			const gesture = _classPrivateFieldGet2(_gesture, this);
			if (!gesture || event.pointerId !== gesture.pointerId) return;
			const deltaX = event.clientX - gesture.startX;
			const deltaY = event.clientY - gesture.startY;
			if (gesture.axis === "pending") {
				gesture.axis = gestureAxis(deltaX, deltaY);
				if (gesture.axis === "vertical") {
					_classPrivateFieldSet2(_gesture, this, null);
					return;
				}
				if (gesture.axis === "pending") return;
				gesture.media.dataset["swipeDragging"] = "";
				if (typeof gesture.media.setPointerCapture === "function") gesture.media.setPointerCapture(event.pointerId);
			}
			if (event.cancelable) event.preventDefault();
			const progress = swipeProgress(gesture.startView, deltaX, gesture.media.getBoundingClientRect().width);
			gesture.media.style.setProperty("--image-swipe-progress", String(progress));
		});
		_classPrivateFieldInitSpec(this, _onPointerUp, (event) => {
			_assertClassBrand(_ProductCard_brand, this, _finishSwipe).call(this, event, false);
		});
		_classPrivateFieldInitSpec(this, _onPointerCancel, (event) => {
			_assertClassBrand(_ProductCard_brand, this, _finishSwipe).call(this, event, true);
		});
		_classPrivateFieldInitSpec(this, _onClick, (event) => {
			if (!_classPrivateFieldGet2(_suppressClick, this) || !(event.target instanceof Element)) return;
			const media = event.target.closest(".card-media");
			if (!media || !this.contains(media)) return;
			_assertClassBrand(_ProductCard_brand, this, _clearClickSuppression).call(this);
			event.preventDefault();
			event.stopImmediatePropagation();
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
		this.addEventListener("pointerdown", _classPrivateFieldGet2(_onPointerDown, this));
		this.addEventListener("pointermove", _classPrivateFieldGet2(_onPointerMove, this));
		this.addEventListener("pointerup", _classPrivateFieldGet2(_onPointerUp, this));
		this.addEventListener("pointercancel", _classPrivateFieldGet2(_onPointerCancel, this));
		this.addEventListener("click", _classPrivateFieldGet2(_onClick, this), true);
		_assertClassBrand(_ProductCard_brand, this, _syncSwipeAvailability).call(this);
		_assertClassBrand(_ProductCard_brand, this, _setImageView).call(this, 0);
	}
	disconnectedCallback() {
		this.removeEventListener("change", _classPrivateFieldGet2(_onChange, this));
		this.removeEventListener("pointerover", _classPrivateFieldGet2(_onPointerOver, this));
		this.removeEventListener("pointerdown", _classPrivateFieldGet2(_onPointerDown, this));
		this.removeEventListener("pointermove", _classPrivateFieldGet2(_onPointerMove, this));
		this.removeEventListener("pointerup", _classPrivateFieldGet2(_onPointerUp, this));
		this.removeEventListener("pointercancel", _classPrivateFieldGet2(_onPointerCancel, this));
		this.removeEventListener("click", _classPrivateFieldGet2(_onClick, this), true);
		_classPrivateFieldSet2(_gesture, this, null);
		_assertClassBrand(_ProductCard_brand, this, _clearClickSuppression).call(this);
	}
};
function _apply(variant) {
	const view = _classPrivateFieldGet2(_imageView, this);
	_assertClassBrand(_ProductCard_brand, this, _applyImage).call(this, "[data-primary-image]", variant.primaryImage, true);
	_assertClassBrand(_ProductCard_brand, this, _applyImage).call(this, "[data-secondary-image]", variant.secondaryImage, false);
	_assertClassBrand(_ProductCard_brand, this, _syncSwipeAvailability).call(this);
	_assertClassBrand(_ProductCard_brand, this, _setImageView).call(this, view);
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
function _finishSwipe(event, cancelled) {
	const gesture = _classPrivateFieldGet2(_gesture, this);
	if (!gesture || event.pointerId !== gesture.pointerId) return;
	_classPrivateFieldSet2(_gesture, this, null);
	if (gesture.axis !== "horizontal") return;
	if (typeof gesture.media.hasPointerCapture === "function" && typeof gesture.media.releasePointerCapture === "function" && gesture.media.hasPointerCapture(event.pointerId)) gesture.media.releasePointerCapture(event.pointerId);
	const deltaX = event.clientX - gesture.startX;
	const destination = cancelled ? gesture.startView : swipeDestination(gesture.startView, deltaX, gesture.media.getBoundingClientRect().width);
	delete gesture.media.dataset["swipeDragging"];
	gesture.media.offsetWidth;
	_assertClassBrand(_ProductCard_brand, this, _setImageView).call(this, destination);
	if (!cancelled) _assertClassBrand(_ProductCard_brand, this, _suppressNextClick).call(this);
}
function _syncSwipeAvailability() {
	const media = this.querySelector(".card-media");
	if (!media) return;
	const available = _assertClassBrand(_ProductCard_brand, this, _hasSecondaryImage).call(this, media);
	media.toggleAttribute("data-swipe-enabled", available);
	const pagination = media.querySelector("[data-image-pagination]");
	if (pagination) pagination.hidden = !available;
	if (!available) _assertClassBrand(_ProductCard_brand, this, _setImageView).call(this, 0);
}
function _hasSecondaryImage(media) {
	const secondary = media.querySelector("[data-secondary-image]");
	return Boolean(secondary && !secondary.hidden);
}
function _setImageView(view) {
	const media = this.querySelector(".card-media");
	if (!media) return;
	const resolvedView = view === 1 && _assertClassBrand(_ProductCard_brand, this, _hasSecondaryImage).call(this, media) ? 1 : 0;
	_classPrivateFieldSet2(_imageView, this, resolvedView);
	media.dataset["imageView"] = resolvedView === 1 ? "secondary" : "primary";
	media.style.setProperty("--image-swipe-progress", String(resolvedView));
}
function _suppressNextClick() {
	_assertClassBrand(_ProductCard_brand, this, _clearClickSuppression).call(this);
	_classPrivateFieldSet2(_suppressClick, this, true);
	_classPrivateFieldSet2(_suppressClickTimer, this, window.setTimeout(() => {
		_classPrivateFieldSet2(_suppressClick, this, false);
		_classPrivateFieldSet2(_suppressClickTimer, this, null);
	}, 500));
}
function _clearClickSuppression() {
	_classPrivateFieldSet2(_suppressClick, this, false);
	if (_classPrivateFieldGet2(_suppressClickTimer, this) !== null) {
		window.clearTimeout(_classPrivateFieldGet2(_suppressClickTimer, this));
		_classPrivateFieldSet2(_suppressClickTimer, this, null);
	}
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
