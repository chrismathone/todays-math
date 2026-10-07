/**
 * `/dev` 화면은 **하나도 빠짐없이** production 가드를 갖는다.
 *
 * `src/proxy.ts` 는 `/dev/` 를 **인증 없이 공개**로 둔다 — 화면을 가리는 것은 각 페이지의
 * 가드 한 겹뿐이다(`src/lib/devPageAccess.ts`). 그런데 그 한 겹을 **페이지마다 손으로** 넣다 보니
 * 2026-10-07 검수에서 61화면 가운데 8화면에 가드가 없었고, 그중 6화면이 DB 를 읽었다.
 * 운영에서 로그인 없이 문항의 정답·해설·학교명과 반 이름이 내려가고 있었다
 * (`/dev/review-wire` · `/dev/ui-wire` · `/dev/card-states` · `/dev/content-damaged` …).
 * 로그인한 직원은 관문이 막는데(`accountRouteAccess.ts`) **로그인 안 한 사람만 통과**했다.
 *
 * 🔴 **목록을 손으로 적지 않는다** — `src/app/dev` 를 훑는다. 손 목록은 새고, 새면 안 적힌
 *    화면이 조용히 열린다(`devPageAccess.ts` 머리말이 같은 말을 한다).
 * 🔴 «가드가 있다»만 보지 않는다 — DB 를 읽는 화면은 **실제로 불러서** 로그인 안 한 production
 *    요청이 `notFound()` 로 끝나고 **그 전에 DB 를 한 번도 안 건드리는지** 본다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const DEV_ROOT = path.join(process.cwd(), "src", "app", "dev");

/** DB 를 건드리면 표시가 남는다 — 가드보다 조회가 먼저면 여기서 드러난다. */
let dbTouched: string[] = [];

vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        dbTouched.push(String(prop));
        throw new Error(`가드보다 먼저 DB 를 읽었다: db.${String(prop)}`);
      },
    },
  ),
}));

// 로그인 안 한 요청.
vi.mock("@/lib/auth", () => ({ auth: () => Promise.resolve(null) }));

// `connection()` 은 요청 밖에서 던진다 — 가드보다 앞에 둔 화면도 가드까지는 가게 한다.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: () => Promise.resolve(),
}));

function pageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(full);
    return entry.name === "page.tsx" ? [full] : [];
  });
}

const rel = (file: string) =>
  path.relative(process.cwd(), file).split(path.sep).join("/");

/** 주석 속 낱말을 가드로 세지 않는다. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * production 에서 닫는 길이 있는가 — `notFound()` 를 부르고, 그 조건이 `devPageVisible`
 * 이거나 `NODE_ENV` 다(이 저장소의 `/dev` 화면이 쓰는 두 꼴).
 */
function hasProductionGuard(source: string): boolean {
  const code = stripComments(source);
  return (
    /\bnotFound\(\)/.test(code) &&
    (/\bdevPageVisible\(/.test(code) || /process\.env\.NODE_ENV\b/.test(code))
  );
}

const FILES = pageFiles(DEV_ROOT);
const DB_PAGES = FILES.filter((file) =>
  /from "@\/lib\/db"/.test(stripComments(readFileSync(file, "utf8"))),
);

afterEach(() => {
  vi.unstubAllEnvs();
  dbTouched = [];
});

describe("[/dev 접근] 가드를 안 단 화면이 없다", () => {
  it("판정기의 눈금 — 가드 없는 화면을 «없다»고 읽고, 주석 속 낱말에 속지 않는다", () => {
    expect(
      hasProductionGuard("export default function P() { return null; }"),
    ).toBe(false);
    expect(
      hasProductionGuard(
        "// notFound() devPageVisible(\n/* process.env.NODE_ENV notFound() */\nexport default function P() { return null; }",
      ),
    ).toBe(false);
    expect(
      hasProductionGuard(
        "export default async function P() { if (!(await devPageVisible({ directorOnly: true }))) notFound(); }",
      ),
    ).toBe(true);
    expect(
      hasProductionGuard(
        'export default function P() { if (process.env.NODE_ENV === "production") notFound(); }',
      ),
    ).toBe(true);
  });

  it("🔴 `src/app/dev` 의 모든 page.tsx 에 production 가드가 있다", () => {
    // 폴더가 옮겨져 0개를 훑으면 «빠진 것 없음»이 거짓으로 나온다 — 분모부터 본다.
    expect(FILES.length).toBeGreaterThan(0);
    const unguarded = FILES.filter(
      (file) => !hasProductionGuard(readFileSync(file, "utf8")),
    ).map(rel);
    expect(unguarded).toEqual([]);
  });
});

describe("[/dev 접근] DB 를 읽는 화면은 로그인 없는 production 요청에 아무것도 안 읽는다", () => {
  it("대상이 있다 — 0개면 아래 시험이 헛돈다", () => {
    expect(DB_PAGES.length).toBeGreaterThan(0);
  });

  it.each(DB_PAGES.map((file) => [rel(file), file] as const))(
    "🔴 %s — notFound() 로 끝나고 DB 를 안 건드린다",
    async (_name, file) => {
      const page = (await import(/* @vite-ignore */ file)) as {
        default: (props: {
          params: Promise<Record<string, string>>;
          searchParams: Promise<Record<string, string>>;
        }) => unknown;
      };
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("ENABLE_RENDER_QA", "");
      dbTouched = [];

      let thrown: unknown;
      try {
        await page.default({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({}),
        });
      } catch (error) {
        thrown = error;
      }

      expect(dbTouched).toEqual([]);
      // Next 의 notFound() 는 digest 에 404 를 실어 던진다.
      expect(
        String((thrown as { digest?: unknown } | undefined)?.digest),
      ).toMatch(/(^|;)404$|NEXT_NOT_FOUND/);
    },
    60_000,
  );
});
