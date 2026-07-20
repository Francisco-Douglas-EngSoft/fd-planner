import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom lacks these APIs used by Tiptap/ProseMirror
if (!("getSelection" in window)) {
  (window as unknown as { getSelection: () => null }).getSelection = () => null;
}
if (!(document.createRange().getClientRects)) {
  document.createRange = () => {
    const range = new Range();
    return range;
  };
}

Range.prototype.getClientRects = Range.prototype.getClientRects || (() => ({
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* iterator() {},
} as DOMRectList));

Range.prototype.getBoundingClientRect = Range.prototype.getBoundingClientRect || (() => ({
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect));

HTMLElement.prototype.getClientRects = HTMLElement.prototype.getClientRects || (() => ({
  length: 0,
  item: () => null,
  [Symbol.iterator]: function* iterator() {},
} as DOMRectList));

HTMLElement.prototype.getBoundingClientRect = HTMLElement.prototype.getBoundingClientRect || (() => ({
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect));