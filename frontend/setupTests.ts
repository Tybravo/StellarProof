import "@testing-library/jest-dom";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";

// jsdom does not implement TextEncoder/TextDecoder, which the Stellar SDK
// requires at import time. Node's implementation is API-compatible.
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = NodeTextEncoder as unknown as typeof globalThis.TextEncoder;
  globalThis.TextDecoder = NodeTextDecoder as unknown as typeof globalThis.TextDecoder;
}

// Guarded so suites that opt into the `node` test environment (route handler
// tests, which need the Web Request/Response globals) can share this setup
// file without tripping over missing DOM globals.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

if (typeof window !== "undefined" && !window.scrollTo) {
  window.scrollTo = jest.fn();
}
