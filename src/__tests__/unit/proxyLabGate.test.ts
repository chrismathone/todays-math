/**
 * 수학 랩실(`/lab`) 관문 — src/proxy.ts.
 *
 * 원장님 결정(2026-09-21): `/lab` 은 **로그인 없이** 연다(GET·HEAD). 랩실은 서버·DB 를 부르지 않고
 * 진도는 브라우저(localStorage)에만 있다. 모형 파일(`public/lab/**` → `/lab/...`)도 같은 길로 받는다.
 *
 * 🔴 여기서 더 중요한 쪽은 **「안 열리는가」**다. 처음 들어온 판은 `pathname.startsWith("/lab")` 여서
 *    `/label` · `/labx` · `/laboratory` 처럼 `/lab` 밖의 경로까지 로그인 없이 열었다(병합 검사에서 발견 —
 *    로그인 안 한 창의 `/labx` 가 로그인으로 안 가고 404 를 냈다). 지금은 그런 화면이 없지만,
 *    나중에 `/labels` 같은 원장 화면이 생기면 **만든 사람이 모르게 공개**된다.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (request: NextRequest) =>
    handler(Object.assign(request, { auth: session() })),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

import { proxy } from "@/proxy";

async function run(method: string, path: string): Promise<Response> {
  const call = proxy as unknown as (r: NextRequest) => Promise<Response>;
  return await call(new NextRequest(`http://localhost${path}`, { method }));
}

function toLogin(res: Response): boolean {
  const location = res.headers.get("location");
  return (
    res.status === 307 &&
    location !== null &&
    new URL(location).pathname === "/login"
  );
}

beforeEach(() => {
  session.mockReset();
  session.mockReturnValue(null);
});

describe("로그인 안 한 사람의 /lab", () => {
  const OPEN = [
    "/lab",
    "/lab/",
    "/lab/play/area",
    "/lab/teacher",
    "/lab/blender/cube-net-fold.glb",
  ];

  it.each(OPEN)("GET %s 는 로그인 없이 지나간다", async (path) => {
    const res = await run("GET", path);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(OPEN)("HEAD %s 도 지나간다", async (path) => {
    const res = await run("HEAD", path);
    expect(res.headers.get("location")).toBeNull();
  });

  it.each(["/label", "/labels", "/labx", "/laboratory", "/lab-notes"])(
    "🔴 GET %s 는 /lab 이 아니다 — 로그인으로 보낸다",
    async (path) => {
      expect(toLogin(await run("GET", path))).toBe(true);
    },
  );

  it.each(["POST", "PUT", "DELETE"])(
    "🔴 %s /lab 은 열지 않는다 — 여는 것은 읽기뿐이다",
    async (method) => {
      expect(toLogin(await run(method, "/lab"))).toBe(true);
    },
  );
});
