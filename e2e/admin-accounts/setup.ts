import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";
configure({ asyncUtilTimeout: 12000 });
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn(async () => {}) }));
afterEach(cleanup);
