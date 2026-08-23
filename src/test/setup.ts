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
