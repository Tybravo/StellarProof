import "@testing-library/jest-dom";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";

// jsdom does not implement TextEncoder/TextDecoder, which the Stellar SDK
// requires at import time. Node's implementation is API-compatible.
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = NodeTextEncoder as unknown as typeof globalThis.TextEncoder;
  globalThis.TextDecoder = NodeTextDecoder as unknown as typeof globalThis.TextDecoder;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

if (!window.scrollTo) {
  window.scrollTo = jest.fn();
}
