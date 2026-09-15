/**
 * ③ **학생 세션 → proxy 허용 목록 밖은 전부 막힘** (브리프 `todays-concept-student-auth.md` §4 ③).
 *
 * 규칙 자체는 `studentRouteAccess.test.ts` 가 잠근다. 여기서 보는 것은 **관문 배선**이다 —
 * 진짜 `src/proxy.ts` 에 학생 세션을 실어 보내 무엇이 지나가는지 센다.
 *
 * 🔴 모집단은 **파일 목록에서 스스로** 뽑는다(`src/app/**` 의 page·route 전부 + Auth.js 동작 경로 +
 *    D-125 ⑷ 의 학생 화면 넷). 손으로 적은 목록은 새 라우트를 모른다 — 2026-08-18 교훈
 *    「세는 쪽과 고치는 쪽이 같이 눈이 먼다」. 그리고 **지나간 것의 집합**을 기대 목록과 통째로 견준다
 *    («막혔나»만 세면 새로 열린 자리가 안 보인다).
 *
 * 세션은 `auth()` 래퍼를 세워 싣는다(proxyRoleGate.test.ts 와 같다). 싣는 모양 `{ student, expires }` 는
 * `studentSessionPipeline.test.ts` 가 **진짜 Auth.js 로** 만들어 본 그 모양이다.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (request: NextRequest) =>
    handler(Object.assign(request, { auth: session() })),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { recordAudit } from "@/lib/audit";
import {
  STUDENT_FORBIDDEN_MESSAGE,
  STUDENT_MUST_CHANGE_MESSAGE,
} from "@/lib/studentRouteAccess";
import { proxy } from "@/proxy";

const APP = path.join(process.cwd(), "src", "app");
const UUID = "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70";
const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"] as const;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** `src/app/(main)/tests/[id]/print/page.tsx` → `/tests/<uuid>/print` */
function toUrlPath(file: string): string {
  const segs = path
    .relative(APP, path.dirname(file))
    .split(path.sep)
    .filter((s) => s !== "" && !/^\(.*\)$/.test(s))
    .map((s) =>
      /^\[\[?\.\.\./.test(s) ? "a/b.png" : /^\[.*\]$/.test(s) ? UUID : s,
    );
  return `/${segs.join("/")}`.replace(/\/$/, "") || "/";
}

const FILES = walk(APP);
const PAGE_FILES = FILES.filter((f) => /[\\/]page\.tsx?$/.test(f));
const ROUTE_FILES = FILES.filter((f) => /[\\/]route\.ts$/.test(f));

/** Auth.js 가 `[...nextauth]` 하나로 받는 동작들 — 그 파일에서 경로를 못 뽑으므로 여기서 편다 */
const AUTH_ACTIONS = [
  "session",
  "csrf",
  "providers",
  "signin",
  "signout",
  "callback/credentials",
  "callback/student",
  "error",
];

/** 학생 화면(D-125 ⑷)과 학생 API — 화면 파일은 아직 없다(D-07 Hi-fi 뒤). 그래도 관문은 먼저 선다 */
const LEARN_PAGES = [
  "/learn",
  "/learn/login",
  "/learn/password",
  `/learn/watch/${UUID}`,
];
const LEARN_APIS = [
  "/api/learn/login",
  "/api/learn/logout",
  "/api/learn/password",
  "/api/learn/lectures",
  `/api/learn/lectures/${UUID}`,
  "/api/learn/watch",
];
const STATIC = [
  "/favicon.ico",
  "/icon.svg",
  "/apple-icon.png",
  "/brand/today-math-mark.svg",
  "/figures/a.png",
  "/figures-svg/a.svg",
];

const PAGES = [...new Set([...PAGE_FILES.map(toUrlPath), ...LEARN_PAGES])];
const APIS = [
  ...new Set([
    ...ROUTE_FILES.flatMap((f) =>
      f.includes("[...nextauth]")
        ? AUTH_ACTIONS.map((a) => `/api/auth/${a}`)
        : [toUrlPath(f)],
    ),
    ...LEARN_APIS,
  ]),
];
const EVERYTHING = [...PAGES, ...APIS, ...STATIC];

const studentSession = (mustChangePassword: boolean) => ({
  student: {
    accountId: UUID,
    studentId: UUID,
    name: "이서준",
    mustChangePassword,
  },
  expires: "2099-01-01T00:00:00.000Z",
});

async function run(method: string, urlPath: string): Promise<Response> {
  const call = proxy as unknown as (r: NextRequest) => Promise<Response>;
  return call(new NextRequest(`http://localhost${urlPath}`, { method }));
}

const passed = (res: Response) =>
  res.status === 200 && res.headers.get("location") === null;

type Sweep = { pass: string[]; blocked: { key: string; res: Response }[] };

async function sweep(): Promise<Sweep> {
  const out: Sweep = { pass: [], blocked: [] };
  for (const p of EVERYTHING)
    for (const m of METHODS) {
      const res = await run(m, p);
      if (passed(res)) out.pass.push(`${m} ${p}`);
      else out.blocked.push({ key: `${m} ${p}`, res });
    }
  return out;
}

const brand = [
  "/favicon.ico",
  "/icon.svg",
  "/apple-icon.png",
  "/brand/today-math-mark.svg",
].flatMap((p) => [`GET ${p}`, `HEAD ${p}`]);

const EXIT = [
  "POST /api/learn/logout",
  "GET /api/auth/session",
  "GET /api/auth/csrf",
  "POST /api/auth/signout",
];

beforeEach(() => {
  session.mockReset();
  vi.mocked(recordAudit).mockClear();
});

describe("모집단 — 파일 목록에서 뽑았다 (분모부터 검산)", () => {
  it("page·route 파일을 실제로 읽었다", () => {
    expect(PAGE_FILES.length).toBeGreaterThanOrEqual(10);
    expect(ROUTE_FILES.length).toBeGreaterThanOrEqual(60);
    // 원장 API 몇을 이름으로 짚어 본다 — 경로 변환이 망가지면 여기서 걸린다
    for (const known of [
      "/api/problems",
      "/api/tests/generate",
      `/api/students/${UUID}`,
      "/api/auth/signup",
    ])
      expect(APIS, known).toContain(known);
    expect(PAGES).toContain("/");
    expect(PAGES).toContain("/login");
  });
});

describe("🔴 첫 비밀번호를 바꾼 학생 — 지나가는 것의 집합이 정확히 이것이다", () => {
  it("화면 셋 · 학생 API · 나가기 · 세션 · 브랜드 이미지뿐", async () => {
    session.mockReturnValue(studentSession(false));
    const { pass } = await sweep();
    expect(pass.sort()).toStrictEqual(
      [
        ...["/learn", "/learn/password", `/learn/watch/${UUID}`].flatMap(
          (p) => [`GET ${p}`, `HEAD ${p}`],
        ),
        "GET /api/learn/lectures",
        `GET /api/learn/lectures/${UUID}`,
        "POST /api/learn/watch",
        "POST /api/learn/password",
        ...EXIT,
        ...brand,
      ].sort(),
    );
  });

  it("🔴 막힌 API 는 전부 403 JSON · 막힌 화면 GET 은 /learn 으로 · 화면에 다른 메서드는 403", async () => {
    session.mockReturnValue(studentSession(false));
    const { blocked } = await sweep();
    expect(blocked.length).toBeGreaterThan(500);
    for (const { key, res } of blocked) {
      const [method, p] = key.split(" ") as [string, string];
      if (p.startsWith("/api/")) {
        expect(res.status, key).toBe(403);
        expect(await res.json(), key).toStrictEqual({
          error: { code: "FORBIDDEN", message: STUDENT_FORBIDDEN_MESSAGE },
        });
      } else if (method === "GET" || method === "HEAD") {
        expect(res.status, key).toBe(307);
        expect(new URL(res.headers.get("location")!).pathname, key).toBe(
          "/learn",
        );
      } else expect(res.status, key).toBe(403);
    }
  });

  it("🔴 학생 요청은 원장 갈래를 하나도 안 탄다 — 요청 감사 기록이 한 줄도 없다", async () => {
    session.mockReturnValue(studentSession(false));
    await sweep();
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("🔴 첫 로그인 학생 — 비밀번호 바꾸기 외에는 못 간다", () => {
  it("지나가는 것은 바꾸기 화면·바꾸기 API · 나가기 · 세션 · 브랜드뿐", async () => {
    session.mockReturnValue(studentSession(true));
    const { pass } = await sweep();
    expect(pass.sort()).toStrictEqual(
      [
        "GET /learn/password",
        "HEAD /learn/password",
        "POST /api/learn/password",
        ...EXIT,
        ...brand,
      ].sort(),
    );
  });

  it("막힌 화면은 /learn/password 로, 바꾸면 쓸 학생 API 는 까닭을 말한다", async () => {
    session.mockReturnValue(studentSession(true));
    const { blocked } = await sweep();
    for (const { key, res } of blocked) {
      const [method, p] = key.split(" ") as [string, string];
      if (!p.startsWith("/api/") && (method === "GET" || method === "HEAD"))
        expect(new URL(res.headers.get("location")!).pathname, key).toBe(
          "/learn/password",
        );
    }
    const lectures = await run("GET", "/api/learn/lectures");
    expect(await lectures.json()).toStrictEqual({
      error: { code: "FORBIDDEN", message: STUDENT_MUST_CHANGE_MESSAGE },
    });
  });
});

describe("로그인 안 한 사람 — /learn 은 학생 로그인으로 (D-125 ⑷)", () => {
  it("🔴 /learn/login 이 아닌 학생 화면은 /learn/login 으로 · /learn/login 은 열림", async () => {
    session.mockReturnValue(null);
    for (const p of ["/learn", "/learn/password", `/learn/watch/${UUID}`]) {
      const res = await run("GET", p);
      expect(res.status, p).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname, p).toBe(
        "/learn/login",
      );
    }
    expect(passed(await run("GET", "/learn/login"))).toBe(true);
    expect(passed(await run("POST", "/learn/login"))).toBe(true);
  });

  it("원장님 로그인 화면·학생 API 는 예전 그대로 — API 는 라우트가 401 을 낸다", async () => {
    session.mockReturnValue(null);
    expect(passed(await run("GET", "/login"))).toBe(true);
    expect(passed(await run("GET", "/api/learn/lectures"))).toBe(true);
    const studio = await run("GET", "/studio");
    expect(new URL(studio.headers.get("location")!).pathname).toBe("/login");
  });
});

describe("원장 세션은 학생 관문을 안 탄다", () => {
  it("원장이 /learn 을 열어도 학생 로그인으로 보내지 않는다 (원장 갈래가 판정한다)", async () => {
    session.mockReturnValue({
      user: {
        id: "u1",
        role: "director",
        approvalStatus: "approved",
        menus: ALL_WORKSPACE_MENUS,
      },
    });
    const res = await run("GET", "/learn");
    expect(res.headers.get("location")).toBeNull();
    // 원장 API 는 원장 갈래 그대로
    expect((await run("POST", "/api/tests/generate")).status).toBe(200);
  });
});

void readFileSync;
