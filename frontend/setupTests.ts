import "@testing-library/jest-dom";

// Guarded so suites that opt into the `node` test environment (route handler
// tests, which need the Web Request/Response globals) can share this setup
// file without tripping over missing DOM globals.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

if (typeof window !== "undefined" && !window.scrollTo) {
  window.scrollTo = jest.fn();
}
