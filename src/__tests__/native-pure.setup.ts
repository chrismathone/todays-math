import { vi } from "vitest";
// This suite never loads the application's env-aware setup or Prisma runtime. Even constructor
// initialization (which can search schema env paths) is replaced before loader modules import.
vi.mock("@prisma/client", () => ({ PrismaClient: class {} }));
vi.stubGlobal("fetch", () => {
  throw new Error("Network/paid API calls are forbidden in native pure tests");
});
