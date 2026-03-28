import "@testing-library/jest-dom";

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

if (!window.scrollTo) {
  window.scrollTo = jest.fn();
}
