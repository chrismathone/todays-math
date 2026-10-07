// @vitest-environment node
/**
 * 🔴 영어 울타리 (D-148 · 25 §6 · 브리프 english-base §1.7).
 *
 * «오늘의 영어»는 둘째 제품이다 — 문제은행·시험지·엔진·AI 해설·매일 자동 출제·복습·탐험 어디도 영어 모듈을
 * 모른 채로 남아야 한다(문제은행 `Problem` 에 안 넣고, 수학 코드가 영어 표를 안 읽는다). 두 겹으로 잰다.
 *
 *  ⑴ **import 사슬** — 금지 뿌리(아래 `FORBIDDEN_ROOTS`)에서 몇 단계를 돌아가도 `src/lib/english/**` ·
 *     `src/components/english/**` 에 닿지 않는다. 반대 방향(영어 → `src/lib/ai/client.ts` 등)은 허용이다.
 *     🔴 D-141 quick 울타리를 그대로 베끼면 통합 셸(`src/components/unified/**`)까지 막힌다 — 셸과
 *     `src/app/(main)/english/**` · `src/app/api/english/**` 는 영어 컴포넌트를 **불러도 된다**(`NEVER_FORBIDDEN`).
 *     `scripts/` 아래 **영어 탐침 한 파일**(`scripts/qa/probe-english-generate-live.ts` — ai 트랙의 실물 탐침)은 예외다(리드 D1).
 *  ⑵ **DB 식별자** — `english_exam|english_material|english_question_set`(표 이름) ·
 *     `db.englishExam|db.englishMaterial|db.englishQuestionSet`(및 `tx.english…` — 접근자 앞 받침은 가리지 않는다) ·
 *     Prisma 가 만든 모델 형(`Prisma.EnglishExam…` · `@prisma/client` 의 `EnglishExam|EnglishMaterial|EnglishQuestionSet`)은
 *     허용 목록(`TABLE_ALLOWED`)에만. 🔴 리드 정정(2026-09-30): 계약의 타입 이름 `EnglishExam·EnglishMaterial·EnglishQuestionSet`
 *     은 화면(`src/components/english/**` · print)이 쓰므로 **검사 대상이 아니다** — 맨글자로 세지 않는다.
 *
 * 스캐너가 눈멀지 않았는지(20-lessons 2026-08-21 «가드가 0을 내면 못 센다일 수 있다») 자기 시험이 먼저 잰다.
 * 주석 걷기는 `helpers/sourceComments.ts` 한 곳.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { eatenCode, withoutComments } from "../helpers/sourceComments";

const ROOT = path.resolve(__dirname, "../../..");
const ENGLISH_DIRS = ["src/lib/english", "src/components/english"].map((d) =>
  path.join(ROOT, d),
);
const SCAN_ROOTS = ["src", "scripts", "e2e", ".claude"];
const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "coverage"]);

const rel = (abs: string) => path.relative(ROOT, abs).split(path.sep).join("/");

/**
 * ⑴ 의 뿌리 — 여기서 출발한 import 사슬이 영어 모듈에 닿으면 빨갛다.
 * 브리프 목록(문제은행 `src/lib/problem*` · 초등 · 중등 · `ai/` · `daily/` · `math-srs/` · `math-explorers/` ·
 * `api/{problems,tests,basket,exports,studio,learn}` · `scripts/`)에 시험지·엔진·내보내기·검수·예측 쪽 뿌리를 더했다.
 */
const FORBIDDEN_ROOTS = [
  "src/lib/problem",
  "src/lib/elementary",
  "src/lib/middle",
  "src/lib/high/",
  "src/lib/ai/",
  "src/lib/daily/",
  "src/lib/math-srs/",
  "src/lib/math-explorers/",
  "src/lib/exam/",
  "src/lib/export/",
  "src/lib/basket/",
  "src/lib/studio-ai/",
  "src/lib/dev-ai/",
  "src/lib/predictor/",
  "src/lib/generator/",
  "src/lib/engine/",
  "src/lib/mathgen",
  "src/lib/testchanger/",
  "src/lib/import/",
  "src/lib/review/",
  "src/lib/print/",
  "src/lib/tests/",
  "src/lib/testResults/",
  "src/lib/classify/",
  "src/lib/findEligibleProblems.ts",
  "src/lib/unifiedBankSelection.ts",
  "src/app/api/problems/",
  "src/app/api/tests/",
  "src/app/api/basket/",
  "src/app/api/exports/",
  "src/app/api/studio/",
  "src/app/api/learn/",
  "src/app/learn/",
  "src/components/learn/",
  "src/app/api/exam/",
  "src/app/api/review/",
  "src/app/api/library/",
  "src/app/api/predictions/",
  "src/app/api/units/",
  "src/app/(main)/exam/",
  "src/app/(main)/problems/",
  "src/app/(main)/tests/",
  "src/components/exam/",
  "src/components/problem/",
  "src/components/print/",
  "src/components/review/",
  "src/components/test/",
  "scripts/",
  ".claude/",
];

/** 🔴 영어를 불러도 되는 곳 — quick 울타리를 베껴 여기를 막으면 셸이 죽는다 */
const NEVER_FORBIDDEN = [
  "src/components/unified/",
  "src/app/(main)/english/",
  "src/app/api/english/",
  "src/lib/english/",
  "src/components/english/",
  "src/lib/ownership.ts",
  "src/mocks/",
  "src/__tests__/",
  // ai 트랙의 실물 탐침 — 영어 쪽 파일 · 어디서도 import 되지 않음 (리드 D1, 2026-09-30 — HTTP 로 바꾸지 않는다)
  "scripts/qa/probe-english-generate-live.ts",
  // 모델 벤치 — 영어 쪽 도구 폴더(제품 프롬프트 · 파서 · 검증기 · 품질 검사를 그대로 부른다, 25 §12). 어디서도 import 되지 않음
  "scripts/qa/english-bench/",
  "scripts/qa/english-listening/",
];

/** ⑵ 표·모델 접근이 허용되는 곳(브리프 §1.7 ⑵ + `prismaTestDouble.ts` 의 합성 한 줄) */
const TABLE_ALLOWED = [
  "prisma/schema.prisma",
  "prisma/migrations/20260930120000_english_studio/",
  "scripts/qa/apply-english-studio-migration.ts",
  // 세트의 «만든 조건» 칸(2026-10-01 원장님 «메타데이터 기억되게») — 마이그레이션과 그 적용 도구
  "prisma/migrations/20261001120000_english_set_meta/",
  "prisma/migrations/20261003120000_english_listening/",
  // Private listening Storage chunk metadata migration, part of the English product.
  "prisma/migrations/20261004071000_listening_storage_chunks/",
  // Private whole-original ASR transcripts for listening sets (2026-10-05) — creates
  // english_listening_source_transcript only; part of the English product, no math table.
  "prisma/migrations/20261005142000_listening_source_transcripts/",
  "prisma/migrations/20261003160000_english_passage_bank/",
  // The managed identity migration adds branch ownership to English exams;
  // its isolated SQL probe verifies that backfill. Neither imports math logic.
  "prisma/migrations/20261003085222_eywa_managed_sync/migration.sql",
  "scripts/qa/eywa-managed-migration-check.sql",
  "scripts/qa/apply-eywa-managed-migrations.ts",
  // Reviewed roster ownership migration/probe checks the existing English exam
  // owner without importing product logic or exposing records to students.
  "scripts/qa/apply-eywa-owned-roster-migration.ts",
  "scripts/qa/eywa-email-migration-integration.ts",
  "scripts/qa/english-listening/",
  "scripts/qa/apply-english-set-meta-migration.ts",
  // 세트의 «형식 판» 칸 — 🔴 미적용 SQL 초안과 그 검사 도구(자료 개선 M0, 2026-10-02). 영어 모듈을 import 하지 않고 표 이름만 안다
  "prisma/drafts/english-set-schema-version/",
  "scripts/qa/check-english-schema-version-draft.ts",
  "scripts/qa/english-schema-version/",
  "src/lib/english/",
  "src/lib/ownership.ts",
  "src/app/api/english/",
  "src/app/(main)/english/",
  "src/mocks/englishTestDouble.ts",
  "src/mocks/prismaTestDouble.ts",
  "src/__tests__/",
  "docs/",
];
/** 다른 트랙(print)이 만드는 자리 — 아직 없어도 허용 목록에는 미리 둔다(실재 검사에서만 뺀다) */
const TABLE_ALLOWED_PENDING = new Set(["src/app/(main)/english/"]);

function walk(dir: string, out: string[], accept: (name: string) => boolean) {
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
    if (st.isDirectory()) walk(abs, out, accept);
    else if (accept(name)) out.push(abs);
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
  if (spec === "@prisma/client" || spec.startsWith("@prisma/client/"))
    return path.join(ROOT, "node_modules", spec);
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
  // 없는 파일이어도 영어 폴더 안을 가리키면 그렇다고 본다(폴더 자체 · 오타 경로)
  return base;
}

const inEnglish = (abs: string) =>
  ENGLISH_DIRS.some((dir) => {
    const r = path.relative(dir, abs);
    return r === "" || (!r.startsWith("..") && !path.isAbsolute(r));
  });

type Graph = Map<string, { target: string; reexport: boolean }[]>;

function scan() {
  const files: string[] = [];
  for (const r of SCAN_ROOTS)
    walk(path.join(ROOT, r), files, (name) => CODE.test(name));
  const graph: Graph = new Map();
  for (const abs of files) {
    const text = readFileSync(abs, "utf8");
    const edges: { target: string; reexport: boolean }[] = [];
    for (const { spec, reexport } of importSpecifiers(text)) {
      const target = resolveSpec(abs, spec);
      if (target) edges.push({ target: path.normalize(target), reexport });
    }
    graph.set(path.normalize(abs), edges);
  }
  const importers = new Set<string>();
  for (const [file, edges] of graph) {
    if (inEnglish(file)) continue;
    if (edges.some((e) => inEnglish(e.target))) importers.add(file);
  }
  return { files, graph, importers };
}

const SCAN = scan();

/** `start` 에서 import 사슬을 따라 영어 모듈에 닿는 길(없으면 null) */
function pathToEnglish(
  start: string,
  graph: Graph = SCAN.graph,
  sensitive: (abs: string) => boolean = inEnglish,
): string[] | null {
  const prev = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    if (sensitive(cur)) {
      const chain: string[] = [];
      for (let at: string | null = cur; at; at = prev.get(at) ?? null)
        chain.unshift(rel(at));
      return chain;
    }
    for (const { target } of graph.get(cur) ?? []) {
      if (prev.has(target)) continue;
      prev.set(target, cur);
      queue.push(target);
    }
  }
  return null;
}

const isForbidden = (file: string) =>
  !NEVER_FORBIDDEN.some((p) => file === p || file.startsWith(p)) &&
  FORBIDDEN_ROOTS.some((root) => file === root || file.startsWith(root));

function chainLeaks(graph: Graph = SCAN.graph): string[] {
  const leaks: string[] = [];
  for (const file of graph.keys()) {
    const r = rel(file);
    if (!isForbidden(r)) continue;
    const chain = pathToEnglish(file, graph);
    if (chain) leaks.push(chain.join(" → "));
  }
  return leaks;
}

/** 교사 계약은 type-only import도 막는다. 학생 DTO는 독립 계약이다. */
function learnerSensitive(abs: string): boolean {
  const file = rel(abs);
  return (
    inEnglish(abs) ||
    /^src\/contracts\/english(?:V2|Listening(?:Media|Http)?)?\.contract\.ts$/.test(
      file,
    )
  );
}

const learnerDatabase = (abs: string) => {
  const file = rel(abs);
  return (
    file === "src/lib/db.ts" ||
    file === "node_modules/@prisma/client" ||
    file.startsWith("node_modules/@prisma/client/")
  );
};

// Existing server page authentication/theme/test-account reads (not a directory-wide exemption).
// These exact edges may reach DB for existing student account/theme behavior. The
// unfiltered English/teacher-contract graph above is still checked for every edge.
const EXISTING_STUDENT_SERVER_EDGES = new Set([
  "src/app/learn/english-listening/layout.tsx → src/lib/learn/studentRequest.ts",
  // «오늘의 기억»의 학생 페이지(2026-10-06) — 다른 학생 서버 페이지와 같은 세션 읽기 하나다(문이 꺼져 있으면 그 전에 404).
  "src/app/learn/fading/page.tsx → src/lib/learn/studentRequest.ts",
  "src/app/learn/layout.tsx → src/lib/learn/studentRequest.ts",
  // 학생별 추가 메뉴(2026-10-07) — 세션 학생 자신의 허용 메뉴를 읽는 server-only 설정 읽기 하나다(관문도 같은 함수를 부른다).
  "src/app/learn/layout.tsx → src/lib/learn/studentLearningMenusStore.ts",
  "src/app/learn/layout.tsx → src/lib/learn/testConsoleServer.ts",
  "src/app/learn/lectures/page.tsx → src/lib/learn/studentRequest.ts",
  "src/app/learn/math-explorers/page.tsx → src/lib/learn/studentRequest.ts",
  "src/app/learn/math-srs/algebra/page.tsx → src/lib/learn/studentRequest.ts",
  "src/app/learn/math-srs/page.tsx → src/lib/learn/studentRequest.ts",
  "src/app/learn/password/page.tsx → src/lib/learn/studentRequest.ts",
  "src/app/learn/page.tsx → src/lib/learn/studentRequest.ts",
  "src/app/learn/page.tsx → src/lib/journeyThemeStore.ts",
  // Textbook server page authentication and its assignment-checked bookmark.
  // Client components and every English/teacher-contract edge remain checked.
  "src/app/learn/textbook/[editionId]/concepts/[conceptKey]/page.tsx → src/lib/learn/studentRequest.ts",
  "src/components/learn/textbook/TextbookReturnLink.tsx → src/lib/textbook/server/prismaSql.ts",
  "src/components/learn/textbook/TextbookReturnLink.tsx → src/lib/textbook/studentRead.ts",
]);

function learnerLeaks(graph: Graph = SCAN.graph): string[] {
  const leaks: string[] = [];
  const databaseGraph: Graph = new Map(
    [...graph].map(([file, edges]) => [
      file,
      edges.filter(
        (edge) =>
          !EXISTING_STUDENT_SERVER_EDGES.has(
            `${rel(file)} → ${rel(edge.target)}`,
          ),
      ),
    ]),
  );
  for (const file of graph.keys()) {
    if (!/^(src\/app\/learn\/|src\/components\/learn\/)/.test(rel(file)))
      continue;
    const chain =
      pathToEnglish(file, graph, learnerSensitive) ??
      pathToEnglish(file, databaseGraph, learnerDatabase);
    if (chain) leaks.push(chain.join(" → "));
  }
  return leaks;
}

// ── ⑵ 표·모델 접근 글자 ─────────────────────────────────────────

const TABLE_NAME =
  /\b(english_exam|english_material|english_question_set|english_passage(?:_revision|_use|_receipt)?|english_listening_(?:set|publication|assignment|assignment_revision|target|attempt|receipt|release|broadcast|audit|media_asset|media_blob))\b/;
const CLIENT_ACCESS =
  /\.(englishExam|englishMaterial|englishQuestionSet|englishPassage(?:Revision|Use|Receipt)?|englishListening(?:Set|Publication|Assignment|AssignmentRevision|Target|Attempt|Receipt|Release|Broadcast|Audit|MediaAsset|MediaBlob))\b/;
const PRISMA_NAMESPACE =
  /\bPrisma\.(EnglishExam|EnglishMaterial|EnglishQuestionSet|EnglishPassage(?:Revision|Use|Receipt)?|EnglishListening(?:Set|Publication|Assignment|AssignmentRevision|Target|Attempt|Receipt|Release|Broadcast|Audit|MediaAsset|MediaBlob))\w*/;
const PRISMA_IMPORT =
  /\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']@prisma\/client["']/g;
const PRISMA_MODEL =
  /\b(EnglishExam|EnglishMaterial|EnglishQuestionSet|EnglishPassage(?:Revision|Use|Receipt)?|EnglishListening(?:Set|Publication|Assignment|AssignmentRevision|Target|Attempt|Receipt|Release|Broadcast|Audit|MediaAsset|MediaBlob))\b/;

/** 주석을 걷은 글에서 영어 표·모델에 닿는 자리를 찾는다 */
function tableAccess(text: string): string | null {
  if (TABLE_NAME.test(text)) return "표 이름";
  if (CLIENT_ACCESS.test(text)) return "클라이언트 접근";
  if (PRISMA_NAMESPACE.test(text)) return "Prisma 형";
  for (const m of text.matchAll(PRISMA_IMPORT))
    if (PRISMA_MODEL.test(m[1]!)) return "@prisma/client 형";
  return null;
}

const TABLE_SCAN_ROOTS = ["src", "scripts", "prisma", "e2e", ".claude"];
const TABLE_FILE = /\.(tsx?|mts|cts|mjs|cjs|js|jsx|py|sql|prisma)$/;
const COMMENTS = { hash: true } as const;

const tableSources = (() => {
  const files: string[] = [];
  for (const r of TABLE_SCAN_ROOTS)
    walk(path.join(ROOT, r), files, (name) => TABLE_FILE.test(name));
  return files.map((abs) => {
    const raw = readFileSync(abs, "utf8");
    return { path: rel(abs), raw, text: withoutComments(raw, COMMENTS) };
  });
})();

const tableAllowed = (file: string) =>
  TABLE_ALLOWED.some((prefix) => file === prefix || file.startsWith(prefix));

describe("영어 울타리 — 스캐너 자기 시험", () => {
  it("import 모양 여섯을 다 잡는다", () => {
    const text = [
      `import { validateEnglishDraft } from "@/lib/english/validate";`,
      `import type { EnglishDraft } from "../english/cloze";`,
      `import {\n  a,\n} from "./english/serialize";`,
      `export { makeCloze } from "./english/cloze";`,
      `export * from "../lib/english";`,
      `const m = await import("@/components/english/EnglishMakerView");`,
      `const r = require("../../src/lib/english/validate");`,
    ].join("\n");
    const specs = importSpecifiers(text);
    expect(specs.map((s) => s.spec)).toEqual(
      expect.arrayContaining([
        "@/lib/english/validate",
        "../english/cloze",
        "./english/serialize",
        "./english/cloze",
        "../lib/english",
        "@/components/english/EnglishMakerView",
        "../../src/lib/english/validate",
      ]),
    );
    expect(
      specs
        .filter((s) => s.reexport)
        .map((s) => s.spec)
        .sort(),
    ).toEqual(["../lib/english", "./english/cloze"].sort());
  });

  it("저장소를 실제로 훑었다 — 알려진 사용처(영어 라우트 · 시험)를 찾는다", () => {
    expect(SCAN.files.length).toBeGreaterThan(1000);
    const found = [...SCAN.importers].map(rel);
    expect(found).toEqual(
      expect.arrayContaining([
        "src/app/api/english/exams/route.ts",
        "src/app/api/english/sets/[id]/route.ts",
        "src/__tests__/unit/englishValidate.test.ts",
      ]),
    );
    // 금지 뿌리도 실제로 그래프에 있다(분모) — 없으면 «샘 0» 이 «못 셈» 이다
    const roots = [...SCAN.graph.keys()].map(rel).filter(isForbidden);
    expect(roots.length).toBeGreaterThan(200);
    expect(roots).toEqual(
      expect.arrayContaining([
        "src/lib/ai/client.ts",
        "src/app/api/tests/route.ts",
        "scripts/qa/apply-english-studio-migration.ts",
      ]),
    );
  });

  it("자기 변이 — 금지 뿌리에서 영어로 가는 간선을 하나 더하면 사슬 검사가 빨갛다", () => {
    const ai = path.normalize(path.join(ROOT, "src/lib/ai/client.ts"));
    const daily = path.normalize(
      path.join(ROOT, "src/lib/daily/planDailyReview.ts"),
    );
    expect(SCAN.graph.has(ai)).toBe(true);
    expect(SCAN.graph.has(daily)).toBe(true);
    for (const [from, to] of [
      [ai, "src/lib/english/validate.ts"],
      [daily, "src/components/english/EnglishMakerView.tsx"],
    ] as const) {
      const mutated: Graph = new Map(SCAN.graph);
      mutated.set(from, [
        ...(SCAN.graph.get(from) ?? []),
        { target: path.normalize(path.join(ROOT, to)), reexport: false },
      ]);
      const leaks = chainLeaks(mutated);
      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks.some((chain) => chain.startsWith(rel(from)))).toBe(true);
    }
    // 돌아가는 사슬도 잡는다 — ai → (중간 파일) → 영어
    const via = path.normalize(path.join(ROOT, "src/lib/apiResponse.ts"));
    const mutated: Graph = new Map(SCAN.graph);
    mutated.set(via, [
      ...(SCAN.graph.get(via) ?? []),
      {
        target: path.normalize(path.join(ROOT, "src/lib/english/cloze.ts")),
        reexport: false,
      },
    ]);
    expect(
      chainLeaks(mutated).some((chain) =>
        chain.includes("src/lib/apiResponse.ts"),
      ),
    ).toBe(true);
  });

  it("표·모델 접근 글자 — DB 접근 모양은 잡고, 계약 형 이름은 잡지 않는다", () => {
    expect(tableAccess(`const rows = await db.englishExam.findMany({});`)).toBe(
      "클라이언트 접근",
    );
    expect(
      tableAccess(
        `await tx.$executeRawUnsafe('DELETE FROM "english_question_set"');`,
      ),
    ).toBe("표 이름");
    expect(
      tableAccess(`const where: Prisma.EnglishMaterialWhereInput = {};`),
    ).toBe("Prisma 형");
    expect(
      tableAccess(`import type { EnglishExam as Row } from "@prisma/client";`),
    ).toBe("@prisma/client 형");
    // 계약 형 · 화면 컴포넌트 이름은 표 접근이 아니다
    expect(
      tableAccess(
        `import type { EnglishExam, EnglishMaterial } from "@/contracts/english.contract";\nconst a: EnglishExam[] = [];`,
      ),
    ).toBeNull();
    expect(tableAccess(`<EnglishMakerView exam={exam} />`)).toBeNull();
    for (const suffix of ["", "_revision", "_use", "_receipt"]) {
      expect(tableAccess(`SELECT * FROM english_passage${suffix}`)).toBe(
        "표 이름",
      );
    }
    for (const suffix of ["", "Revision", "Use", "Receipt"]) {
      expect(tableAccess(`db.englishPassage${suffix}.findMany({})`)).toBe(
        "클라이언트 접근",
      );
      expect(tableAccess(`Prisma.EnglishPassage${suffix}WhereInput`)).toBe(
        "Prisma 형",
      );
      expect(
        tableAccess(`import { EnglishPassage${suffix} } from "@prisma/client"`),
      ).toBe("@prisma/client 형");
    }
    // 주석 속 이름은 걷힌다
    expect(
      tableAccess(withoutComments(`// english_exam 표를 읽는다\nconst x = 1;`)),
    ).toBeNull();
  });

  it("주석을 걷어도 코드 줄은 안 사라진다 — 걷는 블록 안에 import · const … 줄이 없다", () => {
    const eaten = tableSources.flatMap(({ path: file, raw }) =>
      eatenCode(raw, COMMENTS).map((length) => `${file} (${length}자)`),
    );
    expect(eaten).toEqual([]);
  });
});

describe("영어 울타리 — ⑴ import 사슬", () => {
  it.each([
    "src/lib/textbook/server/prismaSql.ts",
    "src/lib/textbook/studentRead.ts",
  ])(
    "교재 서버 북마크 예외 %s 는 학생 클라이언트와 교사 계약 접근을 열지 않는다",
    (serverPath) => {
      const bookmark = path.join(
        ROOT,
        "src/components/learn/textbook/TextbookReturnLink.tsx",
      );
      const client = path.join(ROOT, "src/components/learn/ListeningView.tsx");
      const server = path.join(ROOT, serverPath);
      const database = path.join(ROOT, "src/lib/db.ts");
      expect(withoutComments(readFileSync(bookmark, "utf8"))).not.toMatch(
        /["']use client["']/,
      );
      expect(importSpecifiers(readFileSync(server, "utf8"))).toContainEqual({
        spec: "server-only",
        reexport: false,
      });
      const graph: Graph = new Map([
        [bookmark, [{ target: server, reexport: false }]],
        [server, [{ target: database, reexport: false }]],
      ]);
      expect(learnerLeaks(graph)).toEqual([]);
      graph.set(client, [{ target: server, reexport: false }]);
      expect(learnerLeaks(graph)).toHaveLength(1);
      graph.delete(client);
      graph.set(server, [
        {
          target: path.join(ROOT, "src/contracts/englishListening.contract.ts"),
          reexport: false,
        },
      ]);
      expect(learnerLeaks(graph)).toHaveLength(1);
    },
  );
  it("학생 화면은 실제 코드에서도 교사 계약·DB에 직접 또는 간접으로 닿지 않는다", () => {
    expect(learnerLeaks()).toEqual([]);
  });

  it("테스트 계정 조회 예외는 서버 레이아웃의 DB 조회에만 적용된다", () => {
    const layout = path.join(ROOT, "src/app/learn/layout.tsx");
    const server = path.join(ROOT, "src/lib/learn/testConsoleServer.ts");
    const student = path.join(ROOT, "src/components/learn/ListeningView.tsx");
    const db = path.join(ROOT, "src/lib/db.ts");
    const teacher = path.join(
      ROOT,
      "src/contracts/englishListening.contract.ts",
    );
    expect(withoutComments(readFileSync(layout, "utf8"))).not.toMatch(
      /["']use client["']/,
    );
    expect(importSpecifiers(readFileSync(server, "utf8"))).toContainEqual({
      spec: "server-only",
      reexport: false,
    });
    const graph: Graph = new Map([
      [layout, [{ target: server, reexport: false }]],
      [server, [{ target: db, reexport: false }]],
    ]);
    expect(learnerLeaks(graph)).toEqual([]);
    graph.set(student, [{ target: server, reexport: false }]);
    expect(learnerLeaks(graph)).toEqual([
      "src/components/learn/ListeningView.tsx → src/lib/learn/testConsoleServer.ts → src/lib/db.ts",
    ]);
    graph.delete(student);
    graph.set(server, [{ target: teacher, reexport: false }]);
    expect(learnerLeaks(graph)).toEqual([
      "src/app/learn/layout.tsx → src/lib/learn/testConsoleServer.ts → src/contracts/englishListening.contract.ts",
    ]);
  });

  it("학생 경계의 자도 DB·교사 계약·재수출 변이를 잡고 순수 학생 계약은 허용한다", () => {
    const student = path.join(ROOT, "src/components/learn/ListeningView.tsx");
    const bridge = path.join(ROOT, "src/lib/aStudentBridge.ts");
    for (const sensitive of [
      "src/lib/db.ts",
      "node_modules/@prisma/client",
      "node_modules/@prisma/client/runtime/library",
      "src/contracts/english.contract.ts",
      "src/contracts/englishV2.contract.ts",
      "src/contracts/englishListening.contract.ts",
      "src/contracts/englishListeningMedia.contract.ts",
      "src/contracts/englishListeningHttp.contract.ts",
    ]) {
      const graph: Graph = new Map([
        [student, [{ target: bridge, reexport: false }]],
        [bridge, [{ target: path.join(ROOT, sensitive), reexport: true }]],
      ]);
      expect(learnerLeaks(graph), sensitive).toHaveLength(1);
    }
    expect(resolveSpec(student, "@prisma/client")).toBe(
      path.join(ROOT, "node_modules/@prisma/client"),
    );
    expect(
      learnerLeaks(
        new Map([
          [
            student,
            [
              {
                target: path.join(
                  ROOT,
                  "src/contracts/englishListeningStudent.contract.ts",
                ),
                reexport: false,
              },
            ],
          ],
        ]),
      ),
    ).toEqual([]);
    // An allowed old authentication path cannot hide a second, unauthorized DB path.
    const oldPage = path.join(ROOT, "src/app/learn/lectures/page.tsx");
    const auth = path.join(ROOT, "src/lib/learn/studentRequest.ts");
    const db = path.join(ROOT, "src/lib/db.ts");
    expect(
      learnerLeaks(
        new Map([
          [
            oldPage,
            [
              { target: auth, reexport: false },
              { target: bridge, reexport: false },
            ],
          ],
          [auth, [{ target: db, reexport: false }]],
          [bridge, [{ target: db, reexport: false }]],
        ]),
      ),
    ).toEqual([
      "src/app/learn/lectures/page.tsx → src/lib/aStudentBridge.ts → src/lib/db.ts",
    ]);
  });

  it("학생 화면에서 교사 영어 직렬화기로 가는 간접 참조도 막는다", () => {
    const student = path.normalize(
      path.join(ROOT, "src/app/learn/english/listening/page.tsx"),
    );
    const helper = path.normalize(
      path.join(ROOT, "src/components/listeningBridge.ts"),
    );
    const teacher = path.normalize(
      path.join(ROOT, "src/lib/english/listening/projection.ts"),
    );
    const graph: Graph = new Map([
      [student, [{ target: helper, reexport: false }]],
      [helper, [{ target: teacher, reexport: true }]],
    ]);
    expect(chainLeaks(graph)).toEqual([
      "src/app/learn/english/listening/page.tsx → src/components/listeningBridge.ts → src/lib/english/listening/projection.ts",
    ]);
    expect(isForbidden("src/components/learn/ListeningView.tsx")).toBe(true);
    expect(isForbidden("src/app/api/learn/listening/route.ts")).toBe(true);
    expect(isForbidden("src/app/api/english/learn/listening/route.ts")).toBe(
      false,
    );
  });

  it("문제은행·시험지·엔진·AI·자동 출제·복습·탐험·스크립트 쪽에서는 몇 단계를 돌아가도 영어 모듈에 닿지 않는다", () => {
    expect(chainLeaks()).toEqual([]);
  });

  it("셸 · 영어 화면 · 영어 API 는 금지 뿌리가 아니다 (quick 울타리를 베끼면 셸이 막힌다)", () => {
    for (const file of NEVER_FORBIDDEN) expect(isForbidden(file)).toBe(false);
    expect(isForbidden("src/components/unified/UnifiedWorkspace.tsx")).toBe(
      false,
    );
    expect(isForbidden("src/app/api/english/exams/route.ts")).toBe(false);
    // ai 트랙의 실물 탐침(이 워크트리에는 없다 — 경로 글자로만 단정) · scripts/ 의 나머지는 그대로 금지
    expect(isForbidden("scripts/qa/probe-english-generate-live.ts")).toBe(
      false,
    );
    expect(isForbidden("scripts/qa/english-bench/generate.ts")).toBe(false);
    expect(isForbidden("scripts/qa/apply-english-studio-migration.ts")).toBe(
      true,
    );
    // 벤치 폴더 이름을 앞글자로 흉내 낸 다른 스크립트는 여전히 금지
    expect(isForbidden("scripts/qa/english-bench-helper.ts")).toBe(true);
    // 그리고 금지 목록은 브리프의 뿌리를 정말 담고 있다
    for (const file of [
      "src/lib/problemPool.ts",
      "src/lib/elementary/index.ts",
      "src/lib/middle/index.ts",
      "src/lib/ai/client.ts",
      "src/lib/daily/planDailyReview.ts",
      "src/lib/math-srs/mission.ts",
      "src/lib/math-explorers/engine.ts",
      "src/app/api/problems/route.ts",
      "src/app/api/tests/route.ts",
      "src/app/api/basket/route.ts",
      "src/app/api/exports/route.ts",
      "src/app/api/studio/ai/route.ts",
      "src/app/api/learn/login/route.ts",
      "scripts/qa/x.ts",
    ])
      expect(isForbidden(file)).toBe(true);
  });
});

describe("영어 울타리 — ⑵ 표·모델 접근 글자", () => {
  it("훑는 파일이 실제로 있고, 알려진 접근처를 잡는다", () => {
    expect(tableSources.length).toBeGreaterThan(500);
    const found = tableSources
      .filter((s) => tableAccess(s.text))
      .map((s) => s.path);
    expect(found).toEqual(
      expect.arrayContaining([
        "prisma/schema.prisma",
        "prisma/migrations/20260930120000_english_studio/migration.sql",
        "scripts/qa/apply-english-studio-migration.ts",
        "src/lib/ownership.ts",
        "src/lib/english/routeSupport.ts",
        "src/app/api/english/exams/route.ts",
      ]),
    );
    // 대역(`englishTestDouble.ts`)은 DB 에 닿지 않아 접근 글자가 없다 — 허용 목록에는 있지만 «접근처»로 세지 않는다
  });

  it("영어 표·모델에 닿는 자리는 허용 목록 안에만 있다", () => {
    const outside = tableSources
      .map((s) => ({ path: s.path, how: tableAccess(s.text) }))
      .filter((s) => s.how && !tableAllowed(s.path))
      .map((s) => `${s.path} (${s.how})`);
    expect(outside).toEqual([]);
  });

  it("허용 목록의 경로가 낡지 않았다 — 적힌 파일·폴더가 실재한다", () => {
    for (const prefix of TABLE_ALLOWED) {
      if (TABLE_ALLOWED_PENDING.has(prefix)) continue;
      const abs = path.join(ROOT, prefix);
      expect(
        statSync(abs).isFile() || statSync(abs).isDirectory(),
        prefix,
      ).toBe(true);
    }
  });
});
