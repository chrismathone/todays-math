/**
 * Pure memory verification. Use g4-vitest.config.mts + env -i, never the .env-
 * loading project config. No DB, provider, paid API, or generator facts oracle.
 * All expected answers below are reconstructed from the actual question text.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  coreForms,
  elementaryUnits,
  expectedFormCount,
  generateElementaryForm,
  listedForms,
} from "@/lib/elementary/generate";
import { tierKey } from "@/lib/elementary/difficulty";
import { REINFORCEMENT_FORMS_20261018 } from "@/lib/elementary/reinforcementForms20261018";
import { statementForms } from "@/lib/elementary/statementForms";
import type { ElemProblem } from "@/lib/elementary/types";
import {
  collectDistinctVariantsResult,
  distinctKey,
} from "@/lib/engine/variants";
import { expandFamily } from "@/lib/engine/expandEngine";
import { elemProblemType } from "@/lib/elementary/forms";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { ProblemBody } from "@/components/print/templates/ProblemBody";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { JaseupTemplate } from "@/components/print/templates/JaseupTemplate";
import printStyles from "@/components/print/TestPrint.module.css";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { assertChooseAllAnswerCount } from "@/lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";

const REPORT = "docs/planning/tracks/reports/math-bank-reinforcement-20261018/";
const legacy = JSON.parse(
  readFileSync(`${REPORT}g4-legacy-baseline.json`, "utf8"),
);
const candidates = JSON.parse(
  readFileSync(`${REPORT}g4-candidates.json`, "utf8"),
);
const REPAIR_REPORT =
  "docs/planning/tracks/reports/math-question-formats-20261018/";
type LegacyOutputRow = [string, string, string, string, number, ElemProblem];
const approvedRepairs = JSON.parse(
  readFileSync(`${REPAIR_REPORT}g4-approved-repair-baseline.json`, "utf8"),
) as {
  originalLedgerSha256: string;
  approvedRepairManifestSha256: string;
  approvedG4SourceSha256: string;
  changes: {
    familyKey: string;
    beforeRow: LegacyOutputRow;
    afterRowSha256: string;
  }[];
};
/**
 * 둘째 승인 층 — 원장님 2026-10-20 지면 전수 검사(세로셈 중복 · 정답 노출 그림 · 중복 식 줄 · 깨진 TeX).
 * 이 층이 바꾼 행은 «그 전 출력»으로 되돌린 뒤 원래 기준과 견준다. 목록은 기계로 뽑았다(기준 1b3f05e54 ↔ 고친 엔진).
 */
const displayRepairs = JSON.parse(
  readFileSync(
    "docs/planning/tracks/reports/problem-display-dupes-20261020/elem-display-repair-baseline.json",
    "utf8",
  ),
) as {
  sourceSha256: Record<string, string>;
  changes: { familyKey: string; beforeRow: LegacyOutputRow; afterRowSha256: string }[];
};
/**
 * 그 아래 층 — 초5 블라인드 검토 고침(main 2026-10-20). 지면 검사 층을 되돌린 행이 이 층의 «이후»다.
 * 목록은 기계로 뽑았다(740ff82b0 ↔ 1b3f05e54).
 */
const blindRepairs = JSON.parse(
  readFileSync(
    "docs/planning/tracks/reports/g5-blind-fixes-20261020-elem-gate-baseline.json",
    "utf8",
  ),
) as typeof displayRepairs;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const UNITS = elementaryUnits();
const FORMS = UNITS.flatMap((unit) =>
  (REINFORCEMENT_FORMS_20261018[tierKey(unit)] ?? []).map((form) => ({
    unit,
    form,
  })),
);
const SEEDS = Array.from({ length: 100 }, (_, i) => 20261018 + i * 1009);
const EDGE_SEEDS = [0, 1, -1, 2 ** 31 - 1, 2 ** 32 - 1];

vi.stubGlobal("fetch", () => {
  throw new Error("Network/API calls are forbidden in this pure suite");
});

function ints(text: string): number[] {
  return [...text.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
}
function cms(text: string): number[] {
  return [...text.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g)].map((m) =>
    Number(m[1]),
  );
}
function degrees(text: string): number[] {
  return [...text.matchAll(/\$(\d+)\^\\circ\$/g)].map((m) => Number(m[1]));
}

type Point = readonly [number, number];
const length = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const vector = (a: Point, b: Point): Point => [b[0] - a[0], b[1] - a[1]];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];

/** No answer, solution, facts, or production helper enters this solver. */
function solve(content: string, id: string): number[] {
  if (id === "31") {
    expect(content).toContain("한 변 전체끼리 맞붙였습니다");
    expect(content).toContain("맞붙인 변의 서로 반대쪽");
    expect(content).toContain("겹친 부분은 없습니다");
    const [s] = cms(content);
    expect(s).toBeGreaterThan(0);
    // Independently construct two equilateral triangles across their shared side;
    // cancel equal edges, then measure the remaining boundary geometrically.
    const a: Point = [0, 0];
    const b: Point = [s!, 0];
    const c: Point = [s! / 2, (s! * Math.sqrt(3)) / 2];
    const d: Point = [s! / 2, (-s! * Math.sqrt(3)) / 2];
    const edges: [Point, Point][] = [
      [a, b],
      [b, c],
      [c, a],
      [b, a],
      [a, d],
      [d, b],
    ];
    const key = (edge: [Point, Point]) =>
      edge
        .map((p) => p.join(","))
        .sort()
        .join("|");
    const outside = edges.filter(
      (e) => edges.filter((x) => key(x) === key(e)).length === 1,
    );
    expect(outside).toHaveLength(4);
    return [Math.round(outside.reduce((sum, [p, q]) => sum + length(p, q), 0))];
  }
  if (id === "32") {
    expect(content).toContain("그 각의 안쪽");
    const [part] = degrees(content);
    expect(part).toBeGreaterThan(0);
    expect(part).toBeLessThan(60);
    return [180 / 3 - part!];
  }
  if (id === "33") {
    expect(content).toContain("두 변의 길이만 같은");
    expect(content).toContain("정삼각형은 제외합니다");
    const values = degrees(content);
    expect(values).toHaveLength(5);
    expect(new Set(values).size).toBe(5);
    expect(values).toEqual(expect.arrayContaining([45, 60]));
    const wanted = /분류하면 (예각|직각|둔각)삼각형/.exec(content)?.[1];
    expect(wanted).toBeTruthy();
    // Enumerate the possible third angles; equal angles determine equal sides.
    return values
      .filter((base) => {
        const completions = Array.from({ length: 179 }, (_, i) => i + 1).filter(
          (third) => base + base + third === 180 && third !== base,
        );
        return completions.some((third) => {
          const all = [base, base, third];
          return wanted === "예각"
            ? all.every((a) => a < 90)
            : wanted === "직각"
              ? all.includes(90)
              : all.some((a) => a > 90);
        });
      })
      .sort((a, b) => a - b);
  }
  if (id === "34") {
    expect(content).toContain("전체 정삼각형 카드");
    expect(content).toContain("세 변의 길이가 모두 다르면서 예각삼각형인 카드");
    const [acute, equilateral, scalene] = ints(content);
    const possible = Array.from({ length: acute! + 1 }, (_, i) => i).filter(
      (x) => x + equilateral! + scalene! === acute,
    );
    expect(possible).toHaveLength(1);
    return possible;
  }
  if (id === "35") {
    expect(content).toContain("한 평면에 서로 다른 직선");
    expect(content).toContain("모든 직선과 수직");
    expect(content).toContain("순서를 바꾸어도 한 쌍");
    const [first, second] = ints(content);
    const directions: Point[] = [
      ...Array.from({ length: first! }, (): Point => [1, 0]),
      ...Array.from({ length: second! }, (): Point => [0, 1]),
    ];
    let count = 0;
    for (let a = 0; a < directions.length; a += 1)
      for (let b = a + 1; b < directions.length; b += 1)
        if (cross(directions[a]!, directions[b]!) === 0) count += 1;
    return [count];
  }
  if (id === "36") {
    expect(content).toContain("가로 직선은 세로 직선과 모두 수직");
    const [horizontal, vertical] = ints(content);
    const intersections = new Set<string>();
    for (let y = 1; y <= horizontal!; y += 1)
      for (let x = 1; x <= vertical!; x += 1) intersections.add(`${x},${y}`);
    return [intersections.size];
  }
  if (id === "37") {
    expect(content).toContain("둘레를 따라 가, 나, 다, 라");
    expect(content).toContain("가와 나의 각은 모두 직각");
    const [ad, bc, ab] = cms(content);
    expect(ad).toBeLessThan(bc!);
    expect(Math.min(ad!, bc!, ab!)).toBeGreaterThan(0);
    const points: Point[] = [
      [0, 0],
      [ab!, 0],
      [ab!, bc!],
      [0, ad!],
    ];
    const edges = points.map((p, i) => [p, points[(i + 1) % 4]!] as const);
    const pairs = [
      [0, 2],
      [1, 3],
    ].filter(
      ([a, b]) => cross(vector(...edges[a!]!), vector(...edges[b!]!)) === 0,
    );
    expect(pairs).toEqual([[1, 3]]);
    return [pairs[0]!.reduce((sum, e) => sum + length(...edges[e!]!), 0)];
  }
  if (id === "38") {
    expect(content).toContain("적어도 한 쌍이 평행한 사각형을 모두 사다리꼴");
    const [total, trapezoids, two] = ints(content);
    const possible: number[] = [];
    for (let none = 0; none <= total!; none += 1)
      for (let one = 0; one <= total!; one += 1)
        if (none + one + two! === total && one + two! === trapezoids)
          possible.push(one);
    expect(possible).toHaveLength(1);
    return possible;
  }
  if (id === "39") {
    expect(content).toContain("평행한 변이 한 쌍 이상 있음이 확인");
    expect(content).toContain("마주 보는 어느 쌍도 평행하지 않음");
    const [total, confirmed, rejected, unknown] = ints(content);
    expect(confirmed! + rejected! + unknown!).toBe(total);
    expect(content).toContain("다른 한 쌍은 아직 검사하지 않았습니다");
    const possible: number[] = [];
    // Each unknown card may independently have its uninspected opposite pair
    // parallel or nonparallel. Enumerate every completion, including both ends.
    for (let mask = 0; mask < 2 ** unknown!; mask += 1) {
      let count = confirmed!;
      for (let bit = 0; bit < unknown!; bit += 1)
        if (mask & (1 << bit)) count += 1;
      possible.push(count);
    }
    return [Math.min(...possible), Math.max(...possible)];
  }
  throw new Error(`No independent solver for ${id}`);
}

function answerValues(answer: string, id: string): number[] {
  return ["31", "37"].includes(id)
    ? cms(answer)
    : ["32", "33"].includes(id)
      ? degrees(answer)
      : ints(answer);
}

/** Evaluate the small integer arithmetic actually printed in the solution. */
function arithmetic(expression: string): number {
  const flat = expression.replace(/\\times/g, "*").replace(/\\div/g, "/");
  expect(flat).toMatch(/^\d+(?:[+*/-]\d+)*$/);
  const tokens = flat.match(/\d+|[+*/-]/g)!;
  let term = Number(tokens[0]);
  let sum = 0;
  let sign = 1;
  for (let i = 1; i < tokens.length; i += 2) {
    const value = Number(tokens[i + 1]);
    if (tokens[i] === "*") term *= value;
    else if (tokens[i] === "/") term /= value;
    else {
      sum += sign * term;
      term = value;
      sign = tokens[i] === "+" ? 1 : -1;
    }
  }
  return sum + sign * term;
}

function assertCorrect(problem: ElemProblem, id: string) {
  const expected = solve(problem.content, id);
  expect(answerValues(problem.answer, id), problem.content).toEqual(expected);
  expect(problem.figureSpec).toBeNull();
  expect(problem.content).not.toMatch(/그림|도표|표를/);
  expect(problem.solution.trim().length).toBeGreaterThan(20);
  for (const [, math] of problem.solution.matchAll(/\$([^$]*=[^$]*)\$/g)) {
    const values = math!.split("=").map(arithmetic);
    expect(new Set(values).size, `해설 계산식 ${math}`).toBe(1);
  }
  assertChooseAllAnswerCount(problem.content, problem.answer, id);
  assertChoiceCount(problem.content, id);
  assertChoiceMarks(problem.content, id);
}

function assertRendered(html: string) {
  expect(html).not.toMatch(/katex-error|#cc0000|<merror|color:\s*red/i);
  const visible = html
    .replace(/<annotation[\s\S]*?<\/annotation>/g, "")
    .replace(/<[^>]*>/g, "");
  expect(visible).not.toMatch(
    /\$|\\(?:circ|times|div|mathrm|frac)|[\u0000-\u0008]/,
  );
}

describe("초4 2026-10-18 R2 보강 — 정체성 및 기존 출력", () => {
  it("보강 9개와 별도 승인 진술 14개가 등록되고 core10·기존 11/12·초5 21~가 유지된다", () => {
    expect(FORMS).toHaveLength(9);
    expect(FORMS.map(({ form }) => form.id).sort()).toEqual([
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
    ]);
    const entries = [];
    for (const unit of UNITS) {
      const forms = listedForms(unit);
      expect(forms.length).toBe(expectedFormCount(unit));
      expect(new Set(forms.map((f) => f.id)).size).toBe(forms.length);
      expect(coreForms(unit)).toHaveLength(10);
      for (const f of forms.filter((form) => Number(form.id) < 31))
        entries.push({
          grade: unit.grade,
          section: unit.section,
          id: f.id,
          tier: f.tier,
        });
    }
    expect(sha(JSON.stringify(entries))).toBe(legacy.registrySha256);
    expect(entries).toHaveLength(2476);
    expect(UNITS.flatMap(statementForms)).toHaveLength(14);
    expect(UNITS.flatMap(listedForms)).toHaveLength(2476 + 9 + 14);
    expect(
      candidates.targets.map(
        (t: { listedCountAfter: number }) => t.listedCountAfter,
      ),
    ).toEqual([12, 12, 13, 13]);
  });

  it("승인된 5문형의 수정만 허용하며 원래 7428개 기준과 나머지 소스 바이트를 보존한다", () => {
    const rows = UNITS.flatMap((u) =>
      listedForms(u)
        .filter((f) => Number(f.id) < 31)
        .flatMap((f) =>
          legacy.seeds.map(
            (seed: number): LegacyOutputRow => [
              u.grade,
              u.section,
              f.id,
              f.tier,
              seed,
              generateElementaryForm(u, seed, f.id),
            ],
          ),
        ),
    );
    expect(rows).toHaveLength(7428);
    const manifestBytes = readFileSync(
      `${REPAIR_REPORT}content-repair-r3/manifest.json`,
      "utf8",
    );
    const manifest = JSON.parse(manifestBytes) as {
      rows: { familyKey: string }[];
      sourceDigests: Record<string, string>;
    };
    const approval = JSON.parse(
      readFileSync(
        `${REPAIR_REPORT}content-repair-r3/claude-content-approval.json`,
        "utf8",
      ),
    ) as { verdict: string; manifestSha256: string };
    expect(approval.verdict).toBe("approved");
    expect(sha(manifestBytes)).toBe(approval.manifestSha256);
    expect(sha(manifestBytes)).toBe(approvedRepairs.approvedRepairManifestSha256);
    expect(sha(readFileSync(`${REPORT}g4-legacy-baseline.json`, "utf8"))).toBe(
      approvedRepairs.originalLedgerSha256,
    );
    expect(approvedRepairs.approvedG4SourceSha256).toBe(
      manifest.sourceDigests["src/lib/elementary/g4.ts"],
    );
    expect(new Set(approvedRepairs.changes.map((row) => row.familyKey))).toEqual(
      new Set(manifest.rows.map((row) => row.familyKey)),
    );
    const key = (row: LegacyOutputRow) => JSON.stringify(row.slice(0, 5));
    const changes = new Map(
      approvedRepairs.changes.map((change) => [key(change.beforeRow), change]),
    );
    expect(changes.size).toBe(15);
    let repaired = 0;
    const display = new Map(
      displayRepairs.changes.map((change) => [key(change.beforeRow), change]),
    );
    expect(display.size).toBe(displayRepairs.changes.length);
    const blind = new Map(
      blindRepairs.changes.map((change) => [key(change.beforeRow), change]),
    );
    expect(blind.size).toBe(blindRepairs.changes.length);
    // Restore exactly the approved historical outputs for the original digest;
    // the current corrected outputs must match independently pinned digests.
    const originalRows = rows.map((current) => {
      const shown = display.get(key(current));
      if (shown) expect(sha(JSON.stringify(current)), key(current)).toBe(shown.afterRowSha256);
      const middle = shown ? shown.beforeRow : current;
      const fixed = blind.get(key(middle));
      if (fixed) expect(sha(JSON.stringify(middle)), key(middle)).toBe(fixed.afterRowSha256);
      const row = fixed ? fixed.beforeRow : middle;
      const change = changes.get(key(row));
      if (!change) return row;
      repaired += 1;
      expect(sha(JSON.stringify(row)), key(row)).toBe(change.afterRowSha256);
      return change.beforeRow;
    });
    expect(repaired).toBe(15);
    expect(rows.length - repaired).toBe(7413);
    expect(sha(JSON.stringify(originalRows))).toBe(legacy.outputSha256);
    for (const [file, hash] of Object.entries(legacy.sourceSha256)) {
      const expected =
        displayRepairs.sourceSha256[file] ??
        blindRepairs.sourceSha256[file] ??
        (file === "src/lib/elementary/g4.ts"
          ? approvedRepairs.approvedG4SourceSha256
          : hash);
      expect(sha(readFileSync(file, "utf8")), file).toBe(expected);
    }
  });
});

describe("초4 새 문형 — 발문에서 독립 검산", () => {
  it.each(FORMS)(
    "$unit.section f$form.id: 100 결정적 씨앗 및 정수 경계",
    ({ unit, form }) => {
      for (const seed of [...SEEDS, ...EDGE_SEEDS]) {
        const problem = generateElementaryForm(unit, seed, form.id);
        assertCorrect(problem, form.id);
        expect(generateElementaryForm(unit, seed, form.id)).toEqual(problem);
      }
    },
  );

  it.each(FORMS)(
    "$unit.section f$form.id: RNG 양 끝값 및 중간값에서 퇴화하지 않는다",
    ({ unit, form }) => {
      for (const value of [0, 0.5, 1 - Number.EPSILON])
        assertCorrect(
          form.generate(unit, () => value),
          form.id,
        );
    },
  );

  it("45도·60도 경계에서 역분류의 불가능/가능 조건이 갈린다", () => {
    const { unit, form } = FORMS.find(({ form }) => form.id === "33")!;
    const targets = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, form.id);
      const expected = solve(p.content, form.id);
      targets.add(/분류하면 (.*?)이 되어야/.exec(p.content)![1]!);
      expect(expected).not.toContain(60);
      expect(expected.includes(45)).toBe(
        p.content.includes("분류하면 직각삼각형"),
      );
    }
    expect(targets.size).toBe(3);
  });

  it("생성기 정답을 일부러 바꾸면 독립 검산이 실패한다", () => {
    for (const { unit, form } of FORMS) {
      const p = generateElementaryForm(unit, 20261043, form.id);
      const broken = {
        ...p,
        answer: p.answer.replace(/\d+/, (v) => String(Number(v) + 1)),
      };
      expect(() => assertCorrect(broken, form.id)).toThrow();
    }
  });

  it("아홉 문형의 공간이 충분하고 고정 후보 27개·검토 전용 여분 3개가 재생성된다", () => {
    expect(candidates.finalCandidates).toHaveLength(27);
    expect(candidates.reviewOnlySpareCandidates).toHaveLength(3);
    const allKeys = new Set<string>();
    for (const { unit, form } of FORMS) {
      const space = collectDistinctVariantsResult(
        (v) => generateElementaryForm(unit, 20261043 + v * 1009, form.id),
        4,
      );
      expect(space.shortBy).toBe(0);
      const final = candidates.finalCandidates.filter(
        (p: ElemProblem) => p.formId === form.id,
      );
      expect(final).toHaveLength(3);
      expect(new Set(final.map((p: ElemProblem) => p.content)).size).toBe(3);
      if (["35", "36"].includes(form.id)) {
        // Swapping the two unlabeled line groups is the same condition.
        expect(
          new Set(
            final.map((p: ElemProblem) =>
              ints(p.content)
                .sort((a, b) => a - b)
                .join(","),
            ),
          ).size,
        ).toBe(3);
      }
      for (const p of final) {
        expect(p.reviewOnly).toBe(false);
        expect(p.familyKey).toBe(
          `elem:${unit.grade}|${unit.section}|${form.id}`,
        );
        expect(allKeys.has(distinctKey(p))).toBe(false);
        allKeys.add(distinctKey(p));
      }
    }
    for (const p of [
      ...candidates.finalCandidates,
      ...candidates.reviewOnlySpareCandidates,
    ]) {
      const unit = UNITS.find(
        (u) => u.grade === p.grade && u.section === p.section,
      )!;
      const actual = generateElementaryForm(unit, p.seed, p.formId);
      expect([
        actual.content,
        actual.answer,
        actual.solution,
        actual.figureSpec,
      ]).toEqual([p.content, p.answer, p.solution, p.figureSpec]);
      expect(
        sha(
          JSON.stringify([
            actual.content,
            actual.answer,
            actual.solution,
            null,
          ]),
        ),
      ).toBe(p.payloadSha256);
      assertCorrect(actual, p.formId);
    }
    expect(
      candidates.reviewOnlySpareCandidates.every(
        (p: { reviewOnly: boolean; section: string }) =>
          p.reviewOnly && p.section.startsWith("2-4-4"),
      ),
    ).toBe(true);
  });
});

describe("실제 파서·형식 파생·두 렌더 경로", () => {
  it("최종 각3발문의 단답/유효한 객관식만 파생하고 보기는 유일하다", () => {
    let shortCount = 0;
    let mcqCount = 0;
    const rows = [];
    const skipped = [];
    for (const { unit, form } of FORMS) {
      const result = expandFamily(
        (variant) => {
          const seed = candidates.seedBase + variant * 1009;
          return {
            ...generateElementaryForm(unit, seed, form.id),
            seed,
            familyKey: `elem:${unit.grade}|${unit.section}|${form.id}`,
            problemType: elemProblemType(form.tier),
          };
        },
        3,
        { allowMultipleChoice: form.allowMultipleChoice },
      );
      expect(result.shortBy).toBe(0);
      skipped.push({
        formId: form.id,
        count: result.skippedMcq,
        reasons: result.reasons,
      });
      for (const p of result.items) {
        assertChoiceCount(p.content, form.id);
        assertChoiceMarks(p.content, form.id);
        assertChooseAllAnswerCount(p.content, p.answer, form.id);
        const parsed = parseProblemContent(p.content);
        expect(parsed.question.length).toBeGreaterThan(30);
        if (p.questionType === "단답형") {
          shortCount += 1;
          expect(parsed.choices).toHaveLength(0);
          expect(answerValues(p.answer, form.id)).toEqual(
            solve(p.content, form.id),
          );
        } else {
          expect(p.questionType).toBe("객관식");
          mcqCount += 1;
          expect(parsed.choices).toHaveLength(5);
          const normalized = parsed.choices.map((s) => s.replace(/\s+/g, ""));
          expect(new Set(normalized).size).toBe(5);
          const mark = ["①", "②", "③", "④", "⑤"].indexOf(p.answer);
          expect(mark).toBeGreaterThanOrEqual(0);
          const expected = solve(parsed.question, form.id);
          const correct = parsed.choices
            .map((s) => answerValues(s, form.id))
            .map((v, i) =>
              JSON.stringify(v) === JSON.stringify(expected) ? i : -1,
            )
            .filter((i) => i >= 0);
          expect(correct).toEqual([mark]);
          expect(
            new Set(
              parsed.choices.map((s) =>
                JSON.stringify(answerValues(s, form.id)),
              ),
            ).size,
          ).toBe(5);
        }
        for (const text of [p.content, p.answer, p.solution]) {
          assertRendered(
            renderToStaticMarkup(<MarkdownRenderer content={text} />),
          );
          assertRendered(renderMathHtml(text));
        }
        const seed = (p as typeof p & { seed: number }).seed;
        const unitId = candidates.targets.find(
          (t: { section: string }) => t.section === unit.section,
        ).unitId;
        rows.push({
          externalId: `engine-elem:${unit.grade}|${unit.chapter}|${unit.section}|f${form.id}|${p.questionType}|s${seed}`,
          unitId,
          familyKey: p.familyKey,
          formId: form.id,
          seed,
          questionType: p.questionType,
          difficulty: form.tier,
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          figureSvg: null,
          payloadSha256: sha(
            JSON.stringify([p.content, p.answer, p.solution, null]),
          ),
          raw: 0,
          red: 0,
          merror: 0,
        });
      }
    }
    expect(shortCount).toBe(27);
    expect(mcqCount).toBe(21);
    expect(shortCount + mcqCount).toBeLessThanOrEqual(54);
    const held = JSON.parse(
      readFileSync(`${REPORT}g4-hold-candidates.json`, "utf8"),
    );
    expect(
      sha(readFileSync(`${REPORT}g4-recommended-selection.json`, "utf8")),
    ).toBe(held.recommendedListSha256);
    expect(held.held).toHaveLength(4);
    const heldKeys = new Set(
      held.held.map((p: { externalId: string }) => p.externalId),
    );
    expect(heldKeys.size).toBe(4);
    const recommended = rows.filter((p) => !heldKeys.has(p.externalId));
    expect(recommended.length).toBeLessThanOrEqual(50);
    expect(recommended.filter((p) => p.questionType === "단답형")).toHaveLength(
      27,
    );
    for (const h of held.held) {
      expect(h.questionType).toBe("객관식");
      expect(h.status).toBe("quality_hold_do_not_load");
      expect(h.mathematicalReason.length).toBeGreaterThan(40);
      const current = rows.find((p) => p.externalId === h.externalId);
      if (current) expect(current.payloadSha256).toBe(h.payloadSha256);
    }
    // This records the author's exclusions. Only the root loader's separately
    // reviewed frozen-key gate can actually enforce them at DB write time.
    if (process.env.G4_REINFORCEMENT_EVIDENCE === "1")
      writeFileSync(
        `${REPORT}g4-derived-candidates.json`,
        JSON.stringify(
          {
            status:
              "review candidates only; not the final approved root DB batch manifest",
            seedBase: candidates.seedBase,
            shortAnswerCount: shortCount,
            multipleChoiceCount: mcqCount,
            totalRows: rows.length,
            skippedMultipleChoice: skipped,
            rows,
          },
          null,
          2,
        ) + "\n",
      );
  });

  it("최종27발문·정답·해설이 MarkdownRenderer/renderMathHtml 및 실제 인쇄 본문에서 정상이다", () => {
    const evidence = [];
    const htmls: string[] = [];
    for (const p of candidates.finalCandidates) {
      const parsed = parseProblemContent(p.content);
      expect(parsed.choices).toHaveLength(0);
      expect([
        ...cms(parsed.question),
        ...degrees(parsed.question),
        ...ints(parsed.question),
      ]).toEqual([
        ...cms(p.content),
        ...degrees(p.content),
        ...ints(p.content),
      ]);
      const markdown = renderToStaticMarkup(
        <MarkdownRenderer content={p.content} />,
      );
      const math = renderMathHtml(p.content);
      const paper = renderToStaticMarkup(
        <PaperProblemView content={p.content} figureSvg={null} />,
      );
      const secret = `TEACHER_ONLY_${p.formId}_${p.seed}`;
      const print = renderToStaticMarkup(
        <ProblemBody
          problem={{
            ...p,
            id: `${p.formId}-${p.seed}`,
            questionType: "단답형",
            solution: `${p.solution} ${secret}`,
          }}
        />,
      );
      const teacher = renderToStaticMarkup(
        <MarkdownRenderer content={`${p.solution} ${secret}`} />,
      );
      for (const html of [
        markdown,
        math,
        paper,
        print,
        teacher,
        renderMathHtml(p.answer),
        renderMathHtml(p.solution),
        renderToStaticMarkup(<MarkdownRenderer content={p.answer} />),
      ])
        assertRendered(html);
      expect(print).not.toContain(secret);
      expect(paper).not.toContain(secret);
      expect(teacher).toContain(secret);
      evidence.push({
        familyKey: p.familyKey,
        formId: p.formId,
        seed: p.seed,
        independentAnswer: solve(p.content, p.formId),
        raw: 0,
        red: 0,
        merror: 0,
        markdownSha256: sha(markdown),
        mathHtmlSha256: sha(math),
        printBodySha256: sha(print),
        answerLeak: false,
      });
      htmls.push(
        `<article data-case="f${p.formId}-s${p.seed}">${print}</article>`,
      );
    }
    expect(evidence).toHaveLength(27);
    // Explicit opt-in writes local review evidence only; ordinary tests never
    // refresh a golden file. This variable is supplied on the command line,
    // not loaded from .env. No network or API is used.
    if (process.env.G4_REINFORCEMENT_EVIDENCE === "1") {
      writeFileSync(
        `${REPORT}g4-render-evidence.json`,
        JSON.stringify(
          {
            candidates: 27,
            paths: [
              "MarkdownRenderer",
              "renderMathHtml",
              "PaperProblemView",
              "print/templates/ProblemBody",
            ],
            physicalPrint: "대기",
            results: evidence,
          },
          null,
          2,
        ) + "\n",
      );
      mkdirSync(".qa-artifacts/math-bank-reinforcement-20261018/g4", {
        recursive: true,
      });
      writeFileSync(
        ".qa-artifacts/math-bank-reinforcement-20261018/g4/print-bodies.html",
        `<!doctype html><html lang="ko"><meta charset="utf-8"><title>초4 R2 최종27발문 실제 인쇄 본문</title><body>${htmls.join("\n")}</body></html>`,
      );
    }
  });

  it("최종27발문을 기존 자습 A4 양식 14쪽에 넣고 교사용 데이터가 새지 않는다", () => {
    const pages: string[] = [];
    for (
      let offset = 0;
      offset < candidates.finalCandidates.length;
      offset += 2
    ) {
      const problems = candidates.finalCandidates
        .slice(offset, offset + 2)
        .map((p: ElemProblem & { seed: number }) => ({
          ...p,
          id: `f${p.formId}-s${p.seed}`,
          solution: `${p.solution} TEACHER_ONLY_A4`,
          questionType: "단답형",
        }));
      const html = renderToStaticMarkup(
        <JaseupTemplate
          meta={{
            academyName: "수학 문항 검수",
            title: "초4 보강 R2",
            examDate: "2026-10-18",
            todayGoal: "새 문형 표시 확인",
            conceptNote: "문항의 조건을 읽고 답을 쓰세요.",
          }}
          page={offset / 2 + 1}
          problems={problems}
          startingNumber={offset + 1}
        />,
      );
      assertRendered(html);
      expect(html).not.toContain("TEACHER_ONLY_A4");
      pages.push(html);
    }
    expect(pages).toHaveLength(14);
    expect(pages.join("").match(/data-problem-number=/g)).toHaveLength(27);
    if (process.env.G4_REINFORCEMENT_EVIDENCE === "1") {
      // The application's original CSS, adapted only from module names to the
      // names Vitest returned. No product layout or component is changed.
      const css = readFileSync(
        "src/components/print/TestPrint.module.css",
        "utf8",
      )
        .replace(/:global\(\.([\w-]+)\)/g, "GLOBAL_$1_END")
        .replace(
          /\.([A-Za-z_][\w-]*)/g,
          (_, name: string) => `.${printStyles[name]}`,
        )
        .replace(/GLOBAL_([\w-]+)_END/g, ".$1");
      const font = readFileSync(
        "public/fonts/NotoSerifKR-subset.woff2",
      ).toString("base64");
      writeFileSync(
        ".qa-artifacts/math-bank-reinforcement-20261018/g4/a4.html",
        `<!doctype html><html lang="ko"><meta charset="utf-8"><title>초4 R2 A4 검수</title><style>@font-face{font-family:ReviewNoto;src:url(data:font/woff2;base64,${font}) format('woff2')}html{--font-noto-serif-kr:ReviewNoto}body{margin:0}${css}</style><body>${pages.join("\n")}</body></html>`,
      );
    }
  });
});
