// @vitest-environment node
/**
 * 🔴 한 걸음 문항 격리 울타리 (원장님 2026-09-27 — «이 전용 문제들이 문제은행 및 다른 곳에 포함되지
 *    않도록 각별히 신경 쓸 것»).
 *
 * 모바일 «한 걸음» 문항(`src/lib/math-srs/quick/**`)은 **모바일 복습(math-srs 미션) 안에서만** 산다.
 * 문항 표·문제은행·담기·시험지·매일 자동 출제·오늘의 시험·작업실·내보내기·AI 해설 채우기·
 * 중등/초등 엔진 등록부·`/elem-gen`·`/middle-gen` 어디에도 들어가면 안 된다.
 *
 * 두 겹으로 잰다.
 *  ⑴ **직접 가져가기** — quick 을 import(정적·타입·재수출·동적 `import()`·`require`)하거나 경로 글자로
 *     부르는 파일은 허용 목록 안에만 있어야 한다. quick 을 `export … from` 으로 다시 내보내는 파일은
 *     quick 과 같은 «운반책»으로 보고, 그 파일을 가져가는 곳도 같은 울타리에 넣는다.
 *  ⑵ **돌아서 닿기** — 문제은행·시험지·엔진 쪽 뿌리에서 import 사슬을 몇 단계 따라가도 quick 에
 *     닿지 않아야 한다(허용된 파일을 거쳐 가도 안 된다).
 *
 * 허용 목록을 넓히려면 **이유를 여기 적고** 원장님 격리 지시에 비춰 본다.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const QUICK_DIR = path.join(ROOT, "src/lib/math-srs/quick");
const SCAN_ROOTS = ["src", "scripts", "e2e", ".claude"];
const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "coverage"]);

const rel = (abs: string) => path.relative(ROOT, abs).split(path.sep).join("/");

/**
 * quick 을 가져가도 되는 곳.
 * - quick 폴더 자신
 * - `src/lib/math-srs/` 바로 아래의 미션·어댑터 파일(미션 생성·채점·DTO) — 단 종이 엔진 카탈로그
 *   `engineCatalog.ts` 는 뺀다(아래 `NEVER`)
 * - 원장님 확인용 시안 화면 `src/app/dev/quick-items/**`(개발 전용 — 운영에서 404)
 * - 시험(`src/__tests__/**`, `e2e/**`)
 */
function allowed(file: string): boolean {
  if (NEVER.some((n) => file === n || file.startsWith(n))) return false;
  return (
    file.startsWith("src/lib/math-srs/quick/") ||
    /^src\/lib\/math-srs\/[^/]+\.(ts|tsx)$/.test(file) ||
    file.startsWith("src/app/dev/quick-items/") ||
    file.startsWith("src/__tests__/") ||
    file.startsWith("e2e/")
  );
}

/** 허용 목록 규칙에 걸려도 절대 안 되는 곳 — 종이 시험지 엔진 카탈로그 */
const NEVER = ["src/lib/math-srs/engineCatalog.ts"];

/**
 * ⑵ 의 뿌리 — 여기서 출발한 import 사슬이 quick 에 닿으면 빨갛다.
 * 문제은행·담기·시험지·확인테스트·매일 자동 출제·오늘의 시험·작업실·내보내기·AI 해설·
 * 중등/초등/고등 엔진·생성기·검수, 그리고 저장소 스크립트와 스킬 전부.
 */
const FORBIDDEN_ROOTS = [
  "src/lib/middle/",
  "src/lib/elementary/",
  "src/lib/high/",
  "src/lib/problem/",
  "src/lib/exam/",
  "src/lib/export/",
  "src/lib/basket/",
  "src/lib/studio-ai/",
  "src/lib/ai/",
  "src/lib/dev-ai/",
  "src/lib/daily/",
  "src/lib/predictor/",
  "src/lib/generator/",
  "src/lib/engine/",
  "src/lib/mathgen/",
  "src/lib/mathgen-engine/",
  "src/lib/testchanger/",
  "src/lib/import/",
  "src/lib/review/",
  "src/lib/print/",
  "src/lib/tests/",
  "src/lib/testResults/",
  "src/lib/classify/",
  "src/lib/problemPool.ts",
  "src/lib/findEligibleProblems.ts",
  "src/lib/unifiedBankSelection.ts",
  "src/lib/problemEligibility.ts",
  "src/lib/math-srs/engineCatalog.ts",
  "src/app/api/problems/",
  "src/app/api/exam/",
  "src/app/api/exports/",
  "src/app/api/studio/",
  "src/app/api/basket/",
  "src/app/api/tests/",
  "src/app/api/review/",
  "src/app/api/library/",
  "src/app/api/predictions/",
  "src/app/api/units/",
  "src/app/(main)/exam/",
  "src/app/(main)/problems/",
  "src/app/(main)/tests/",
  "src/app/studio/",
  "src/app/review/",
  "src/components/exam/",
  "src/components/problem/",
  "src/components/print/",
  "src/components/review/",
  "src/components/unified/",
  "src/components/test/",
  "scripts/",
  ".claude/",
];

/**
 * ⑵ 에서 빼는 시험 하네스 — `scripts/` 아래에 있지만 `src/__tests__/**` 와 같은 **시험**이다.
 * 메모리 DB mock 위에 학생 복습 라우트를 띄우는 브라우저 QA 서버(2026-10-03 선수 학습 흐름 검증)라
 * 그 라우트를 거쳐 quick 에 닿는다. 운영 스크립트가 아니어서 문제은행 · 시험지로 나가는 길이 없다 —
 * 같은 까닭으로 `mathSrsRecordIsolation.test.ts` 의 `TEST_FIXTURES` 도 이 파일 하나를 뺀다.
 * 폴더째 빼지 않는다. 이름 하나만.
 */
const TEST_HARNESSES = new Set(["scripts/qa/math-prerequisite/server.test.ts"]);

/**
 * 6bc01b85b: 원장 승인 읽기 측정 브리프가 이 파일을 명시한다
 * (docs/planning/tracks/brief-browser-sweep-perf-codex.md 규칙 2).
 * READ ONLY 거래 안의 교사 dashboard reader를 비교하고 집계만 출력하는 QA 진입점이다.
 * mathSrsRecordIsolation도 같은 예외를 갖는다. 승인된 원문 SHA에만 적용하므로
 * 스크립트가 한 글자라도 달라지면 재검토 없이 통과할 수 없다.
 * 이 진입점을 import하는 다른 금지 뿌리나 quick 직접 import는 계속 금지한다.
 */
const READ_ONLY_QA_ENTRYPOINTS = new Map([
  [
    "scripts/qa/measure-sweep-20261020.ts",
    "7b61f93ae5ba0712f43ce68d2099cb2a9f8da68648ec2ea5c89ec08f204abeb8",
  ],
]);

/**
 * 🔴 원장님 연구실(`/lab/math-srs/algebra`, 브라우저 기록 · 글자 입력칸뿐)은 숫자형 그대로다(2026-09-27).
 * 연구실 화면과 그것이 쓰는 미션·생성기·브라우저 기록 모듈에서 import 사슬이 quick 에 닿으면 빨갛다 —
 * 한 걸음 공급은 `serverState.ts` 가 `createMission` 에 넘기고, `mission.ts` 는 quick 을 모른다.
 */
const LAB_ROOTS = [
  "src/app/lab/",
  "src/components/math-srs/MathSrsApp.tsx",
  "src/components/math-srs/PracticeSession.tsx",
  "src/components/math-srs/useSrsStore.ts",
  "src/lib/math-srs/mission.ts",
  "src/lib/math-srs/generator.ts",
  "src/lib/math-srs/storage.ts",
];

function walk(dir: string, out: string[]) {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = path.join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (CODE.test(name)) out.push(abs);
  }
}

/** 파일 글에서 모듈 지정자와 «다시 내보내기» 여부를 뽑는다. 주석 속 import 도 센다(보수적). */
function importSpecifiers(text: string): { spec: string; reexport: boolean }[] {
  const out: { spec: string; reexport: boolean }[] = [];
  const add = (spec: string, reexport = false) => out.push({ spec, reexport });
  for (const m of text.matchAll(
    /\bimport\s+(?:type\s+)?[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  ))
    add(m[1]!);
  for (const m of text.matchAll(
    /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\}|\*\s+as\s+\w+)\s*from\s*['"]([^'"]+)['"]/g,
  ))
    add(m[1]!, true);
  for (const m of text.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) add(m[1]!);
  for (const m of text.matchAll(/\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g))
    add(m[1]!);
  for (const m of text.matchAll(
    /\brequire(?:\.resolve)?\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  ))
    add(m[1]!);
  for (const m of text.matchAll(
    /\bvi\.(?:mock|doMock|importActual)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  ))
    add(m[1]!);
  return out;
}

const EXTS = [
  "",
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".mjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];

/** 지정자를 저장소 안 파일로. 패키지면 null. */
function resolveSpec(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith("."))
    base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const ext of EXTS) {
    const cand = base + ext;
    try {
      if (statSync(cand).isFile()) return cand;
    } catch {
      // 다음 확장자
    }
  }
  // 없는 파일이어도 quick 안을 가리키면 그렇다고 본다(폴더 자체 · 오타 경로)
  return base;
}

const inQuick = (abs: string) => {
  const r = path.relative(QUICK_DIR, abs);
  return r === "" || (!r.startsWith("..") && !path.isAbsolute(r));
};

/** 경로를 글자로 부르는 곳(`src("lib/math-srs/quick/…")` 같은 도우미 · 문자열 조립) */
const NAMES_QUICK_PATH = /['"`][^'"`\n]*math-srs\/quick(?:[/'"`])/;

function scan() {
  const files: string[] = [];
  for (const r of SCAN_ROOTS) walk(path.join(ROOT, r), files);
  const graph = new Map<string, { target: string; reexport: boolean }[]>();
  const namesPath = new Set<string>();
  for (const abs of files) {
    const text = readFileSync(abs, "utf8");
    const edges: { target: string; reexport: boolean }[] = [];
    for (const { spec, reexport } of importSpecifiers(text)) {
      const target = resolveSpec(abs, spec);
      if (target) edges.push({ target: path.normalize(target), reexport });
    }
    graph.set(path.normalize(abs), edges);
    if (!inQuick(abs) && NAMES_QUICK_PATH.test(text))
      namesPath.add(path.normalize(abs));
  }
  // 운반책: quick 파일 + quick(또는 운반책)을 `export … from` 으로 다시 내보내는 파일
  const carriers = new Set<string>([...graph.keys()].filter(inQuick));
  for (let changed = true; changed;) {
    changed = false;
    for (const [file, edges] of graph) {
      if (carriers.has(file)) continue;
      if (
        edges.some(
          (e) => e.reexport && (inQuick(e.target) || carriers.has(e.target)),
        )
      ) {
        carriers.add(file);
        changed = true;
      }
    }
  }
  const importers = new Set<string>(namesPath);
  for (const [file, edges] of graph) {
    if (inQuick(file)) continue;
    if (edges.some((e) => inQuick(e.target) || carriers.has(e.target)))
      importers.add(file);
  }
  return { files, graph, carriers, importers };
}

const SCAN = scan();

/** `start` 에서 import 사슬을 따라 quick 에 닿는 길(없으면 null) */
function pathToQuick(start: string): string[] | null {
  const prev = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    if (inQuick(cur)) {
      const chain: string[] = [];
      for (let at: string | null = cur; at; at = prev.get(at) ?? null)
        chain.unshift(rel(at));
      return chain;
    }
    for (const { target } of SCAN.graph.get(cur) ?? []) {
      if (prev.has(target)) continue;
      prev.set(target, cur);
      queue.push(target);
    }
  }
  return null;
}

describe("한 걸음 문항 격리 울타리", () => {
  it("스캐너가 눈멀지 않았다 — import 모양 여섯을 다 잡는다", () => {
    const text = [
      `import { a } from "@/lib/math-srs/quick/types";`,
      `import type { QuickItem } from "../quick/types";`,
      `import {\n  b,\n  c,\n} from "./quick/generate";`,
      `export { generateQuickItem } from "./quick/types";`,
      `export * from "../math-srs/quick";`,
      `const m = await import("@/lib/math-srs/quick/generate");`,
      `const r = require("../../src/lib/math-srs/quick/width");`,
    ].join("\n");
    const specs = importSpecifiers(text);
    expect(specs.map((s) => s.spec)).toEqual(
      expect.arrayContaining([
        "@/lib/math-srs/quick/types",
        "../quick/types",
        "./quick/generate",
        "./quick/types",
        "../math-srs/quick",
        "@/lib/math-srs/quick/generate",
        "../../src/lib/math-srs/quick/width",
      ]),
    );
    expect(
      specs
        .filter((s) => s.reexport)
        .map((s) => s.spec)
        .sort(),
    ).toEqual(["../math-srs/quick", "./quick/types"].sort());
    expect(NAMES_QUICK_PATH.test(`src("lib/math-srs/quick/generate.ts")`)).toBe(
      true,
    );
    expect(NAMES_QUICK_PATH.test(`// math-srs/quick 는 격리한다`)).toBe(false);
  });

  it("저장소를 실제로 훑었다 — 알려진 사용처(시안 화면·시험)를 찾는다", () => {
    // 0 을 «없다»로 읽지 않으려고(20-lessons 2026-08-21) 있어야 할 것을 먼저 센다
    expect(SCAN.files.length).toBeGreaterThan(1000);
    const found = [...SCAN.importers].map(rel);
    expect(found).toContain("src/__tests__/unit/mathSrsQuickItems.test.ts");
    expect(found.some((f) => f.startsWith("src/app/dev/quick-items/"))).toBe(
      true,
    );
  });

  it("quick 을 가져가는 파일은 모두 허용 목록 안이다 (정적·타입·재수출·동적·경로 글자)", () => {
    const outside = [...SCAN.importers].map(rel).filter((f) => !allowed(f));
    expect(outside).toEqual([]);
  });

  it("quick 을 다시 내보내는 운반책도 허용 목록 안이다", () => {
    const carriers = [...SCAN.carriers]
      .filter((f) => !inQuick(f))
      .map(rel)
      .filter((f) => !allowed(f));
    expect(carriers).toEqual([]);
  });

  it("문제은행·시험지·엔진·스크립트 쪽에서는 몇 단계를 돌아가도 quick 에 닿지 않는다", () => {
    const leaks: string[] = [];
    for (const file of SCAN.graph.keys()) {
      const r = rel(file);
      if (!FORBIDDEN_ROOTS.some((root) => r === root || r.startsWith(root)))
        continue;
      if (TEST_HARNESSES.has(r) || READ_ONLY_QA_ENTRYPOINTS.has(r)) continue;
      const chain = pathToQuick(file);
      if (chain) leaks.push(chain.join(" → "));
    }
    expect(leaks).toEqual([]);
  });

  it("빼 둔 시험 하네스는 실제로 있고 시험 파일이다 — 지워졌거나 스크립트로 바뀌면 여기서 운다", () => {
    const scanned = new Set([...SCAN.graph.keys()].map(rel));
    for (const harness of TEST_HARNESSES) {
      expect(scanned.has(harness), harness).toBe(true);
      expect(harness).toMatch(/\.test\.tsx?$/);
    }
  });

  it("읽기 측정 예외는 승인된 원문 그대로인 QA 진입점 하나뿐이다", () => {
    expect(READ_ONLY_QA_ENTRYPOINTS.size).toBe(1);
    for (const [entrypoint, approvedHash] of READ_ONLY_QA_ENTRYPOINTS) {
      const abs = path.join(ROOT, entrypoint);
      expect(SCAN.graph.has(abs), entrypoint).toBe(true);
      // Git's LF blob and a Windows autocrlf checkout have the same approved content.
      const source = readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
      expect(createHash("sha256").update(source).digest("hex"), entrypoint).toBe(approvedHash);
      expect(source).toContain("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
      expect(source).toContain('assert.equal(flags[0]?.readOnly, "on")');
      expect(source).toContain("next.loadCourseDashboard(viewer, now)");
      // It is not a general-purpose quick consumer or a reusable production module.
      expect(allowed(entrypoint)).toBe(false);
      expect([...SCAN.graph.values()].flat().filter((edge) => edge.target === abs)).toEqual([]);
    }
  });

  it("원장님 연구실 쪽(화면·미션·생성기·브라우저 기록)은 quick 에 닿지 않는다", () => {
    const leaks: string[] = [];
    let roots = 0;
    for (const file of SCAN.graph.keys()) {
      const r = rel(file);
      if (!LAB_ROOTS.some((root) => r === root || r.startsWith(root))) continue;
      roots += 1;
      const chain = pathToQuick(file);
      if (chain) leaks.push(chain.join(" → "));
    }
    expect(roots).toBeGreaterThanOrEqual(LAB_ROOTS.length);
    expect(leaks).toEqual([]);
  });

  it("종이 엔진 카탈로그(ENGINE_CATALOG)는 quick 을 모른다", () => {
    const catalog = path.normalize(
      path.join(ROOT, "src/lib/math-srs/engineCatalog.ts"),
    );
    expect(SCAN.graph.has(catalog)).toBe(true);
    expect(pathToQuick(catalog)).toBeNull();
    expect(allowed("src/lib/math-srs/engineCatalog.ts")).toBe(false);
  });
});
