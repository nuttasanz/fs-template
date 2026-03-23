import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver — required by Mantine's Modal / ScrollArea
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement Element.scrollIntoView — required by Mantine's Combobox
Element.prototype.scrollIntoView = () => {};

// jsdom does not implement window.matchMedia — required by Mantine's color scheme hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
