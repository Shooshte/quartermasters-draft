import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

process.env.DATABASE_URL ??= "postgres://postgres:password@localhost:5432/quartermasters_test";

afterEach(() => {
  cleanup();
  vi.mocked(window.scrollTo).mockClear();
});

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: vi.fn(),
});

// Polyfill ResizeObserver for jsdom (required by Radix UI components)
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
