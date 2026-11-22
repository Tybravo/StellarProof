import "@testing-library/jest-dom";

// Guarded so suites using `@jest-environment node` (API route tests) can load this file.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

if (typeof window !== "undefined" && !window.scrollTo) {
  window.scrollTo = jest.fn();
}
