import "@testing-library/jest-dom";

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = jest.fn();
}
