import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (request: NextRequest) =>
    handler(Object.assign(request, { auth: session() })),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
import { proxy } from "@/proxy";
import {
  TEXTBOOK_EDITORIAL_IMAGES,
  isTextbookEditorialRead,
} from "@/lib/textbook/render/editorialAssets";

const run = (method: string, path: string) =>
  (proxy as unknown as (request: NextRequest) => Promise<Response>)(
    new NextRequest(`https://today.test${path}`, { method }),
  );
const readers = [
  null,
  {
    user: {
      id: "teacher",
      role: "director",
      approvalStatus: "approved",
      menus: [],
    },
  },
  {
    user: {
      id: "reviewer",
      role: "reviewer",
      approvalStatus: "pending",
      menus: [],
    },
  },
  {
    student: {
      accountId: "student",
      studentId: "student",
      mustChangePassword: true,
    },
  },
];
describe("published textbook design assets", () => {
  it.each([
    ...TEXTBOOK_EDITORIAL_IMAGES.map((name) => `/textbook/editorial/${name}`),
    "/textbook/editorial/fonts/NotoSansKR-400.ttf",
    "/textbook/editorial/fonts/NotoSansKR-700.ttf",
    "/textbook/editorial/fonts/OFL.txt",
  ])("serves %s for every reader without a login redirect", async (path) => {
    for (const reader of readers)
      for (const method of ["GET", "HEAD"]) {
        session.mockReturnValue(reader);
        const response = await run(method, path);
        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
  });
  it.each([
    "/textbook/editorial/private.pdf",
    "/textbook/editorial/fonts/private.ttf",
    "/textbook/editorial/cover.png/extra",
    "/textbook/editorial/.gitattributes",
    "/textbook/editorial-other/cover.png",
    "/textbook/editions/private",
    "/studio",
  ])("retains the existing gate for %s", async (path) => {
    session.mockReturnValue(null);
    expect(isTextbookEditorialRead("GET", path)).toBe(false);
    expect((await run("GET", path)).status).toBe(307);
  });
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "retains the gate for %s writes",
    async (method) => {
      session.mockReturnValue(null);
      expect((await run(method, "/textbook/editorial/cover.png")).status).toBe(
        307,
      );
    },
  );
});
