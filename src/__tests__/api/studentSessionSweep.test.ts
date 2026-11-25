// @vitest-environment node
/**
 * ② **학생 세션 → 기존 API · 서버 액션 전수 401/403** (브리프 `todays-concept-student-auth.md` §2.1 · §4 ②).
 *
 * 🔴 모집단은 **파일 목록에서 스스로** 뽑는다 — `src/app/api/**\/route.ts` 전부(학생 API `/api/learn/**`
 *    만 뺀다 — 거기는 학생이 쓰라고 연 곳이다)와 `"use server"` 파일 전부. 손 목록 금지(2026-08-18 교훈).
 *    관문(`proxy.ts`)은 **거치지 않는다** — 관문이 새는 날에도 라우트가 스스로 막는지를 본다.
 *
 * 판정 — 같은 라우트·같은 메서드를 **로그인 안 한 요청**과 **학생 세션 요청**으로 한 번씩 부른다.
 *   - 로그인 안 한 요청이 401/403 이면 학생도 401/403 이어야 한다.
 *   - 그 밖(공개 라우트 — 가입 · 공유 그림 · 크론 …)이면 학생 응답이 **글자까지 같아야** 한다.
 *     학생은 «로그인 안 한 사람» 이상을 얻으면 안 된다. 어느 라우트가 공개인지 **손으로 적지 않는다** —
 *     로그인 안 한 요청의 응답이 정한다.
 *   - DB 는 **덫**이다: 학생 세션을 읽는 한 줄(`studentAccount.findUnique`)과 감사 기록·오류 기록 말고는 무엇을
 *     건드려도 던진다. 학생 요청이 로그인 안 한 요청보다 DB 를 더 건드리면 빨갛다.
 *
 * 세션은 진짜 Auth.js 가 만든다(helpers/authRequestContext.ts) — 학생 쿠키는 진짜 로그인이 싣는 그
 * 모양(`{ student }` — studentSessionPipeline.test.ts 가 확인)을 진짜 비밀로 암호화한 것이다.
 *
 * 표를 보려면: `SWEEP_TABLE=<저장할 json 경로> npx vitest run src/__tests__/api/studentSessionSweep.test.ts`
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const savedEnv = vi.hoisted(() => {
  const before = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
  };
  process.env.AUTH_SECRET = "student-auth-test-secret-0123456789abcdef";
  process.env.AUTH_URL = "http://localhost:3000";
  return before;
});

const trap = vi.hoisted(() => ({
  calls: [] as string[],
  account: {
    id: "4a000000-0000-4000-8000-000000000001",
    studentId: "30000000-0000-4000-8000-000000000001",
    disabledAt: null as Date | null,
    mustChangePassword: false,
    // 퇴원 칸이 없으면 토큰 판정(꺼짐 ∪ 퇴원)이 닫는 쪽으로 막는다 — 아래 «⓪ 전제»가 그걸 먼저 센다
    student: { name: "이서준", eywaWithdrawnAt: null as Date | null },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock(
  "next/headers",
  async () => (await import("../helpers/authRequestContext")).nextHeadersModule,
);
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<object>()),
  redirect: (await import("../helpers/authRequestContext")).redirectMock,
}));
vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get(_t, method) {
          if (typeof method !== "string" || method === "then") return undefined;
          return async () => {
            trap.calls.push(`${name}.${method}`);
            if (name === "studentAccount" && method === "findUnique")
              return trap.account;
            if (name === "accountAuditLog") return { count: 0 };
            // 오류 기록(withErrorLog 가 거절 응답 뒤에 쓴다) — 감사 기록과 같은 «서버가 남기는 기록»이다.
            // 학생에게 나가는 데이터가 아니고, 응답 뒤 비동기라 덫에 잡히는 시점도 들쭉날쭉하다.
            if (name === "errorLog") return { id: "logged" };
            throw new Error(`DB_TOUCHED ${name}.${method}`);
          };
        },
      },
    );
  const db = new Proxy(
    {},
    {
      get(_t, prop) {
        if (typeof prop !== "string" || prop === "then") return undefined;
        if (prop.startsWith("$"))
          return async () => {
            trap.calls.push(prop);
            throw new Error(`DB_TOUCHED ${prop}`);
          };
        return model(prop);
      },
    },
  );
  return { db };
});

import { auth } from "@/lib/auth";

import {
  cookieHeaderFor,
  RedirectSignal,
  resetRequest,
  TEST_ORIGIN,
} from "../helpers/authRequestContext";

const ROOT = process.cwd();
const APP = path.join(ROOT, "src", "app");
const UUID = "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70";
const HTTP_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join("/");
const toAlias = (f: string) =>
  `@/${path
    .relative(path.join(ROOT, "src"), f)
    .split(path.sep)
    .join("/")
    .replace(/\.tsx?$/, "")}`;

/** 라우트 파일 → 부를 주소와 `params` */
function routeTarget(file: string): {
  url: string;
  params: Record<string, unknown>;
} {
  const params: Record<string, unknown> = {};
  const segs = path
    .relative(APP, path.dirname(file))
    .split(path.sep)
    .filter((s) => s !== "" && !/^\(.*\)$/.test(s))
    .map((s) => {
      const catchAll = /^\[\[?\.\.\.(\w+)\]\]?$/.exec(s);
      if (catchAll) {
        params[catchAll[1]!] = ["a", "b.png"];
        return "a/b.png";
      }
      const one = /^\[(\w+)\]$/.exec(s);
      if (one) {
        params[one[1]!] = UUID;
        return UUID;
      }
      return s;
    });
  return { url: `/${segs.join("/")}`, params };
}

const ROUTE_FILES = walk(path.join(APP, "api"))
  .filter((f) => /[\\/]route\.ts$/.test(f))
  // 학생 API 는 학생이 쓰라고 연 곳이다 — learnRoutes 및 아래 듣기 역할 경계가 본다.
  .filter(
    (f) =>
      !rel(f).startsWith("src/app/api/learn/") &&
      !rel(f).startsWith("src/app/api/english/learn/"),
  );

// These exact methods intentionally accept students. Their current ownerScope and
// publication boundary are exercised by conceptBlankScanRoutes/Submission/Jobs;
// the real encrypted-session path is checked below. Teacher writes stay in the sweep.
const STUDENT_SCAN_METHODS = new Set([
  "GET src/app/api/concept-blank/scan/issued/[id]/route.ts",
  "POST src/app/api/concept-blank/scan/submissions/route.ts",
  "GET src/app/api/concept-blank/scan/submissions/[id]/route.ts",
  "POST src/app/api/concept-blank/scan/submissions/[id]/photos/route.ts",
  "GET src/app/api/concept-blank/scan/submissions/[id]/photos/[photoId]/route.ts",
  "POST src/app/api/concept-blank/scan/submissions/[id]/answers/route.ts",
  "POST src/app/api/concept-blank/scan/submissions/[id]/jobs/route.ts",
]);

const SRC_FILES = walk(path.join(ROOT, "src")).filter(
  (f) =>
    /\.(ts|tsx)$/.test(f) &&
    !rel(f).startsWith("src/__tests__/") &&
    !rel(f).startsWith("src/mocks/"),
);
/**
 * 파일 머리의 지시문이 "use server" 인가 — 앞의 주석만 건너뛰고 본다.
 *
 * 🔴 처음엔 정규식 한 줄(`^\s*(?:\/\/…\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']`)이었다. 겹친 반복이라
 *    머리 주석이 긴 큰 파일(`src/lib/elementary/g4.ts` 841KB)에서 **되돌이가 끝나지 않아** 이 시험이
 *    워커 CPU 를 10분 넘게 잡고 한 줄도 못 찍었다(2026-09-15). 그래서 한 번 훑는 셈으로 바꿨다.
 */
function hasUseServerDirective(text: string): boolean {
  let i = 0;
  for (;;) {
    while (i < text.length && /\s/.test(text[i]!)) i += 1;
    if (text.startsWith("//", i)) {
      const end = text.indexOf("\n", i);
      if (end === -1) return false;
      i = end + 1;
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      if (end === -1) return false;
      i = end + 2;
    } else break;
  }
  return (
    text.startsWith('"use server"', i) || text.startsWith("'use server'", i)
  );
}

const USE_SERVER_FILES = SRC_FILES.filter((f) =>
  hasUseServerDirective(readFileSync(f, "utf8")),
);

type Outcome = { status: number | string; body: string; db: string[] };
type Row = {
  file: string;
  method: string;
  anonymous: Outcome;
  student: Outcome;
  ok: boolean;
};

let studentCookie = "";

beforeAll(async () => {
  studentCookie = await cookieHeaderFor({
    student: {
      accountId: trap.account.id,
      studentId: trap.account.studentId,
      name: trap.account.student.name,
      mustChangePassword: false,
    },
  });
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

/** DB 덫의 흔적 — 학생 세션을 읽는 한 줄과 감사 기록·오류 기록은 빼고 센다 */
const touched = () =>
  trap.calls.filter(
    (c) =>
      c !== "studentAccount.findUnique" &&
      !c.startsWith("accountAuditLog.") &&
      !c.startsWith("errorLog."),
  );

async function callRoute(
  handler: (req: NextRequest, ctx: unknown) => Promise<Response>,
  method: string,
  url: string,
  params: Record<string, unknown>,
  cookie: string | null,
): Promise<Outcome> {
  resetRequest(cookie ? { cookie } : {});
  trap.calls = [];
  const headers: Record<string, string> = {
    origin: TEST_ORIGIN,
    "sec-fetch-site": "same-origin",
    "content-type": "application/json",
    ...(cookie ? { cookie } : {}),
  };
  const req = new NextRequest(`${TEST_ORIGIN}${url}`, {
    method,
    headers,
    ...(method === "GET" || method === "HEAD" ? {} : { body: "{}" }),
  });
  if (process.env.SWEEP_TRACE === "1")
    console.log(`→ ${method} ${url} ${cookie ? "학생" : "로그인 안 함"}`);
  try {
    // 걸린 라우트 하나가 시험 전체를 멈추지 않게 — 시간이 다 되면 «끝나지 않음»으로 적는다(그건 통과가 아니다)
    const res = await withinTime(
      handler(req, { params: Promise.resolve(params) }),
      CALL_LIMIT_MS,
    );
    if (res === TIMED_OUT)
      return { status: "timeout", body: "", db: touched() };
    return { status: res.status, body: await res.text(), db: touched() };
  } catch (error) {
    const e = error as Error;
    return {
      status: `throw ${e.name}`,
      body: e.message.replace(/[0-9a-f-]{36}/g, "<id>"),
      db: touched(),
    };
  }
}

const DENIED = new Set<number | string>([401, 403]);

const CALL_LIMIT_MS = 15_000;
const IMPORT_LIMIT_MS = 90_000;
const TIMED_OUT = Symbol("timed-out");
async function withinTime<T>(
  work: Promise<T>,
  ms: number,
): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  try {
    return await Promise.race([work, limit]);
  } finally {
    clearTimeout(timer);
  }
}

function judge(anonymous: Outcome, student: Outcome): boolean {
  // 끝나지 않은 호출은 «같다»가 아니다 — 둘 다 걸려도 빨갛다
  if (anonymous.status === "timeout" || student.status === "timeout")
    return false;
  if (DENIED.has(anonymous.status))
    return DENIED.has(student.status) && student.db.length === 0;
  return (
    student.status === anonymous.status &&
    student.body === anonymous.body &&
    student.db.join() === anonymous.db.join()
  );
}

describe("⓪ 전제 — 학생 쿠키가 정말 학생 세션으로 선다 (아니면 아래 전수가 «로그인 안 함 vs 로그인 안 함»으로 헛돈다)", () => {
  /**
   * 🔴 2026-09-15 learn-screens: 토큰 판정에 퇴원(`eywaWithdrawnAt`)이 들어오자, 이 파일의 대역 계정 행에 그 칸이 없어
   *    학생 토큰이 **조용히 막혔다**(닫히는 쪽). 그러자 아래 전수는 학생 요청이 전부 «로그인 안 한 사람»이 되어
   *    초록이었다 — 변이 ②f(학생 세션에 원장 모양 user.id)가 **살아남아서야** 드러났다. 세는 쪽이 셀 수 있는지를 먼저 센다.
   */
  it("🔴 학생 쿠키로 auth() 를 부르면 student 가 선다", async () => {
    resetRequest({ cookie: studentCookie });
    trap.calls = [];
    const session = await auth();
    expect(
      session?.student?.accountId,
      "학생 세션이 안 섰다 — 대역 계정 행이 토큰 판정(꺼짐 ∪ 퇴원)을 못 지난다",
    ).toBe(trap.account.id);
  });
});

describe("② 학생 세션 → 기존 API 전수", () => {
  it("listening student APIs accept a real student session while teacher APIs still reject it", async () => {
    const { handleListeningHttp } =
      await import("@/lib/english/listening/runtime/http");
    for (const method of ["GET", "HEAD", "POST"]) {
      const learner = (req: NextRequest) =>
        handleListeningHttp(req, ["a", "b.png"], "student");
      const teacher = (req: NextRequest) =>
        handleListeningHttp(req, ["a", "b.png"], "teacher");
      const anonymous = await callRoute(
        learner,
        method,
        "/api/english/learn/listening/a/b.png",
        {},
        null,
      );
      const student = await callRoute(
        learner,
        method,
        "/api/english/learn/listening/a/b.png",
        {},
        studentCookie,
      );
      const denied = await callRoute(
        teacher,
        method,
        "/api/english/listening/a/b.png",
        {},
        studentCookie,
      );
      expect(anonymous.status).toBe(401);
      // Malformed input is reached only after the genuine student session passes actorFor.
      expect(student.status).toBe(400);
      expect(denied.status).toBe(401);
      expect([...anonymous.db, ...student.db, ...denied.db]).toEqual([]);
    }
  });
  it("scan accepts a real student session for submissions and denies teacher writes before storage", async () => {
    const start = (
      await import("@/app/api/concept-blank/scan/submissions/route")
    ).POST;
    const override = (
      await import("@/app/api/concept-blank/scan/submissions/[id]/override/route")
    ).POST;
    const anonymous = await callRoute(
      start,
      "POST",
      "/api/concept-blank/scan/submissions",
      {},
      null,
    );
    const student = await callRoute(
      start,
      "POST",
      "/api/concept-blank/scan/submissions",
      {},
      studentCookie,
    );
    const denied = await callRoute(
      (request) => override(request, { params: Promise.resolve({ id: UUID }) }),
      "POST",
      `/api/concept-blank/scan/submissions/${UUID}/override`,
      { id: UUID },
      studentCookie,
    );
    expect(anonymous.status).toBe(401);
    expect(student.status).toBe(400);
    expect(denied.status).toBe(403);
    expect([...anonymous.db, ...student.db, ...denied.db]).toEqual([]);
  });
  it("🔴 모든 라우트 × 내보낸 메서드 — 학생은 «로그인 안 한 사람» 이상을 못 얻는다", async () => {
    expect(
      ROUTE_FILES.length,
      "라우트 파일을 못 찾았다",
    ).toBeGreaterThanOrEqual(60);
    const rows: Row[] = [];
    const importFailures: string[] = [];
    let expectedPairs = 0;

    for (const file of ROUTE_FILES) {
      let mod: Record<string, unknown>;
      if (process.env.SWEEP_TRACE === "1") console.log(`import ${rel(file)}`);
      try {
        const loaded = await withinTime(
          import(/* @vite-ignore */ toAlias(file)) as Promise<
            Record<string, unknown>
          >,
          IMPORT_LIMIT_MS,
        );
        if (loaded === TIMED_OUT) {
          importFailures.push(
            `${rel(file)} — 적재가 ${IMPORT_LIMIT_MS}ms 안에 안 끝났다`,
          );
          continue;
        }
        mod = loaded;
      } catch (error) {
        importFailures.push(`${rel(file)} — ${(error as Error).message}`);
        continue;
      }
      const methods = HTTP_METHODS.filter(
        (m) =>
          typeof mod[m] === "function" &&
          !STUDENT_SCAN_METHODS.has(`${m} ${rel(file)}`),
      );
      expectedPairs += methods.length;
      const { url, params } = routeTarget(file);
      for (const method of methods) {
        const handler = mod[method] as (
          r: NextRequest,
          c: unknown,
        ) => Promise<Response>;
        const anonymous = await callRoute(handler, method, url, params, null);
        const student = await callRoute(
          handler,
          method,
          url,
          params,
          studentCookie,
        );
        rows.push({
          file: rel(file),
          method,
          anonymous,
          student,
          ok: judge(anonymous, student),
        });
      }
    }

    // 표는 파일로 — 콘솔은 vitest 가 통과한 시험에서 안 옮길 때가 있다
    if (process.env.SWEEP_TABLE)
      writeFileSync(
        process.env.SWEEP_TABLE,
        JSON.stringify(
          rows.map((r) => ({
            route: r.file.replace("src/app", "").replace(/\/route\.ts$/, ""),
            method: r.method,
            anonymous: r.anonymous.status,
            student: r.student.status,
            ok: r.ok,
          })),
        ),
      );

    expect(
      importFailures,
      "적재에 실패한 라우트 — 이 검사가 그 라우트를 못 본다",
    ).toEqual([]);
    // 들어온 것이 아니라 **살아남은** 것을 센다 — 부른 쌍이 내보낸 메서드 수와 같아야 한다
    expect(rows.length).toBe(expectedPairs);
    expect(rows.length).toBeGreaterThanOrEqual(80);
    const bad = rows
      .filter((r) => !r.ok)
      .map(
        (r) =>
          `${r.method} ${r.file}: 로그인 안 함 ${r.anonymous.status} · 학생 ${r.student.status} ${r.student.db.join(",")}`,
      );
    expect(bad).toEqual([]);
    // 거부된 쌍이 대부분이어야 한다 — 전부 «공개»로 읽혔다면 세션 판정이 통째로 눈을 감은 것이다
    expect(
      rows.filter((r) => DENIED.has(r.student.status)).length,
    ).toBeGreaterThan(rows.length * 0.8);
  }, 480_000);
});

describe("② 학생 세션 → 서버 액션 전수", () => {
  it('🔴 "use server" 파일의 모든 액션 — 학생이 부르면 로그인 안 한 사람과 같은 일만 한다', async () => {
    expect(
      USE_SERVER_FILES.length,
      "서버 액션 파일을 못 찾았다",
    ).toBeGreaterThanOrEqual(1);
    const rows: string[] = [];
    for (const file of USE_SERVER_FILES) {
      const mod = (await vi.importActual(toAlias(file))) as Record<
        string,
        unknown
      >;
      for (const [name, fn] of Object.entries(mod)) {
        if (typeof fn !== "function") continue;
        const run = async (cookie: string | null) => {
          resetRequest(cookie ? { cookie } : {});
          trap.calls = [];
          try {
            await (fn as () => Promise<unknown>)();
            return {
              outcome: "returned",
              audit: trap.calls.filter((c) => c.startsWith("accountAuditLog.")),
              db: touched(),
            };
          } catch (error) {
            return {
              outcome:
                error instanceof RedirectSignal
                  ? `redirect ${error.url}`
                  : `throw ${(error as Error).message}`,
              audit: trap.calls.filter((c) => c.startsWith("accountAuditLog.")),
              db: touched(),
            };
          }
        };
        const anonymous = await run(null);
        const student = await run(studentCookie);
        rows.push(`${rel(file)}#${name}`);
        expect(student, `${rel(file)}#${name}`).toStrictEqual(anonymous);
        // 로그아웃 액션은 원장 계정에만 감사 기록을 남긴다 — 학생 세션으로는 한 줄도 없어야 한다
        expect(student.audit, `${rel(file)}#${name}`).toEqual([]);
      }
    }
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

describe("② 모집단 — auth() 를 부르는 파일은 전부 어딘가에서 시험된다", () => {
  /**
   * 브리프 §2.1: «auth() · getServerSession 류를 부르는 모든 API 라우트와 서버 액션을 목록으로 뽑고».
   * 부르는 파일을 글자로 찾고, 각각이 **어느 시험이 보는 자리인지** 갈래를 매긴다. 갈래를 못 받는
   * 파일이 생기면 빨갛다 — 새 도우미가 `session.user` 만 보고 들어가도 여기서 드러난다.
   */
  it("🔴 갈래를 못 받은 auth() 호출 파일이 없다", () => {
    const callers = SRC_FILES.filter((f) => {
      const text = readFileSync(f, "utf8");
      return (
        /from ["']@\/lib\/auth["']/.test(text) &&
        /\bauth\s*\(|getServerSession/.test(text)
      );
    }).map(rel);
    const HELPERS_TESTED_WITH_REAL_STUDENT_SESSION = new Set([
      // studentSessionPipeline.test.ts «기존 세션 도우미 넷» + 학생 API 의 도우미
      "src/lib/session.ts",
      "src/lib/accountAccess.ts",
      "src/lib/studio-ai/guard.ts",
      "src/lib/devPageAccess.ts",
      "src/lib/learn/studentRequest.ts",
      // Above: genuine encrypted student session, learner/teacher API role boundary.
      "src/lib/english/listening/runtime/http.ts",
      // Above: genuine encrypted session; exact student methods, teacher-only correction denied.
      "src/lib/concept-blank/scan/http.ts",
    ]);
    const uncategorised = callers.filter(
      (f) =>
        !(
          f === "src/proxy.ts" || // ③ proxyStudentGate.test.ts
          f === "src/lib/auth.ts" ||
          /^src\/app\/api\/.+\/route\.ts$/.test(f) || // 위 라우트 전수
          USE_SERVER_FILES.map(rel).includes(f) || // 위 서버 액션 전수
          // 화면 — 학생은 관문이 /learn 밖으로 못 보낸다(③). 🔴 랩실 화면(`src/app/lab/**`)은 뺀다 —
          // 관문이 학생에게도 연다(D-135 ⑼). 랩실은 세션을 안 읽으니, 부르게 되면 여기서 갈래를 못 받아 빨갛다.
          (/^src\/app\/.+\/(page|layout)\.tsx$/.test(f) &&
            !f.startsWith("src/app/lab/")) ||
          HELPERS_TESTED_WITH_REAL_STUDENT_SESSION.has(f)
        ),
    );
    expect(callers.length).toBeGreaterThanOrEqual(8);
    expect(uncategorised).toEqual([]);
  });
});
