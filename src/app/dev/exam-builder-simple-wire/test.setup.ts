import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.stubGlobal(
  "fetch",
  vi.fn(() => Promise.reject(new Error("Wire 검증에서 통신은 금지됩니다."))),
);
afterEach(cleanup);
