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