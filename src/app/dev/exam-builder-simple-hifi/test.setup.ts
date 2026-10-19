import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.stubGlobal(
  "fetch",
  vi.fn(() => Promise.reject(new Error("Hi-fi 검증에서 통신은 금지됩니다."))),
);

// jsdom has no native modal implementation. These shims test open/close events,
// not browser focus containment, Escape handling or top-layer geometry.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
  this.querySelector<HTMLButtonElement>("button")?.focus();
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};
afterEach(cleanup);
