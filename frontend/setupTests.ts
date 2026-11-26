import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
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

