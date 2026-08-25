import "@testing-library/jest-dom/vitest";

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      void callback;
    }

    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// ProseMirror queries browser layout APIs that JSDOM does not implement.
if (!Document.prototype.elementFromPoint) {
  Document.prototype.elementFromPoint = () => null;
}

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
}

if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    }) satisfies DOMRect;
}
