/**
 * **판정형 등록 전체** — 2단계까지의 열여섯(1단계 셋 + 2단계 열셋)이 지면 · 정답지 · 적재에서 같이 서는가
 * (2026-10-08 엔진 보강 2단계).
 *
 * 문형별 진위 · 꼴 · 해설은 문형마다의 시험이 잰다(`judgeAddSub` · `judgeMulDiv` · `judgeValue` · `judgeCompare`).
 * 여기는 등록부를 통째로 훑는 자리다.
 *
 * ```
 * ㉠ 등록 — 열여섯의 차례(앞의 것부터 실렸다 — 차례를 바꾸지 않는다) · 차시 이름이 단원 시드와 글자 그대로
 *          · 원천이 같은 차시의 등록 유형 · 난이도 근거
 * ㉡ 지면 — KaTeX · 죽은 역슬래시 · 보기 다섯 · 객관식 틀 그대로
 * ㉢ 정답지 — 제품의 정답지 자로 재서 해설이 통째로 빠지지 않는다(한 쪽 8문항)
 * ㉣ 적재 — 2단계 계획 파일의 행 · 열쇠 · 미적재 빚
 * ```
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import katex from "katex";
import { describe, expect, it } from "vitest";

import {
  buildTargetRows,
  type Target,
} from "../../../scripts/import/load-engine-problems";
import {
  loadedFragments,
  unloaded,
} from "../../../scripts/qa/checkUnloadedTypes";
import { deadBackslashHits } from "../../../scripts/qa/probe-middle-raw-latex";
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import type { TestPrintProblem } from "@/components/print/types";
import { registeredTypes } from "@/lib/middle/generate";
import { parseJudgeExternalId } from "@/lib/middle/judge/contract";
import {
  generateJudgeProblem,
  judgementDefinitions,
} from "@/lib/middle/judge/registry";
import { JASEUP_GEOMETRY, JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import { assessAnswerKeyRisk, estimateSolutionPx } from "@/lib/printOverflow";
import { classifyFormat } from "@/lib/problem/provenance";

const MARKS = ["①", "②", "③", "④", "⑤"];
const SEED0 = 20261008;
const STEP = 7919;

/** 등록 차례 — 🔴 앞의 것부터 실렸다. 새 등록은 끝에 붙인다(`definitions.ts` 머리말). */
const ORDER = [
  // 1단계 — 실린 36행
  "중1|유리수의 덧셈과 뺄셈|calc-add2",
  "중1|유리수의 덧셈과 뺄셈|calc-sub2",
  "중1|유리수의 덧셈과 뺄셈|calc-mix4",
  // 2단계 — 계산 판정
  "중1|유리수의 곱셈|calc-mul2",
  "중1|유리수의 곱셈|calc-pow",
  "중1|유리수의 나눗셈|calc-div2",
  "중1|유리수의 나눗셈|calc-muldiv",
  "중1|문자의 사용과 식의 값|calc-value",
  // 2단계 — 비교형
  "중1|유리수의 덧셈과 뺄셈|odd-addsub2",
  "중1|유리수의 덧셈과 뺄셈|max-addsub2",
  "중1|유리수의 곱셈|odd-pow",
  "중1|유리수의 곱셈|max-mul2",
  "중1|유리수의 나눗셈|odd-div2",
  "중1|유리수의 나눗셈|max-div2",
  "중1|문자의 사용과 식의 값|odd-value",
  "중1|문자의 사용과 식의 값|max-value",
];
const STEP2 = ORDER.slice(3);
const PLAN = "scripts/import/plans/2026-10-08-중1-판정형-2단계.json";

describe("㉠ 등록 — 열여섯", () => {
  it("차례가 그대로다 — 1단계 셋이 맨 앞, 2단계 열셋이 그 뒤", () => {
    expect(judgementDefinitions().map((d) => d.key)).toEqual(ORDER);
  });

  it("차시 이름이 단원 시드와 글자 그대로이고, 원천은 같은 차시에 등록된 RPM 유형이다", () => {
    const types = new Map(registeredTypes().map((t) => [t.key, t]));
    const seeded = new Set(
      CURRICULUM_UNITS.map((u) => `${u.grade}|${u.section}`),
    );
    for (const d of judgementDefinitions()) {
      expect(seeded.has(`${d.grade}|${d.unitSection}`), d.key).toBe(true);
      expect(new Set(d.sources).size, d.key).toBe(d.sources.length);
      for (const s of d.sources) {
        const t = types.get(s);
        expect(t, `${d.key} 의 원천 ${s} 가 등록부에 없다`).toBeDefined();
        expect(`${t!.grade}|${t!.unitSection}`, `${d.key} ← ${s}`).toBe(
          `${d.grade}|${d.unitSection}`,
        );
      }
    }
  });

  it("난이도는 꼴마다 직접 선언하고 근거를 적는다 — 기본이 아닌 것은 «원장님 확인 대상»이라 적혀 있다", () => {
    const want: Record<string, string> = {
      "calc-add2": "기본",
      "calc-sub2": "기본",
      "calc-mix4": "응용",
      "calc-mul2": "기본",
      "calc-pow": "응용",
      "calc-div2": "기본",
      "calc-muldiv": "응용",
      "calc-value": "기본",
      "odd-addsub2": "기본",
      "max-addsub2": "응용",
      "odd-pow": "응용",
      "max-mul2": "응용",
      "odd-div2": "기본",
      "max-div2": "응용",
      "odd-value": "응용",
      "max-value": "기본",
    };
    for (const d of judgementDefinitions()) {
      expect(d.difficulty, d.key).toBe(want[d.familyId]);
      expect(d.difficultyBasis.length, d.key).toBeGreaterThan(40);
      if (d.difficulty !== "기본")
        expect(d.difficultyBasis, d.key).toContain("원장님 확인 대상");
      expect(d.ruleVersion, d.key).toBe(1);
    }
  });
});

describe("㉡ 지면 — 기존 객관식 틀 그대로", () => {
  it("발문 한 줄 + 보기 ①~⑤ · 정답은 번호 하나 · 수식이 전부 그려진다 · 죽은 역슬래시 없음", () => {
    for (const key of STEP2) {
      for (let s = 0; s < 60; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 4);
        const lines = p.content.split("\n");
        expect(lines, p.content).toHaveLength(6);
        expect(lines.slice(1).map((l) => l[0])).toEqual(MARKS);
        expect(MARKS).toContain(p.answer);
        // 새 형식이 아니다 — 출처 판정이 기존 «객관식»으로 읽는다.
        expect(
          classifyFormat({
            familyKey: p.familyKey,
            answer: p.answer,
            questionType: null,
            problemType: "계산",
            content: p.content,
          }),
          p.content,
        ).toBe("multiple_choice");
        // 보기마다 수식 한 덩어리 — 글이 섞이지 않는다.
        for (const l of lines.slice(1))
          expect(l.slice(1).trim(), p.content).toMatch(/^\$[^$]+\$$/);
        for (const text of [p.content, p.solution]) {
          expect(deadBackslashHits(text), text).toEqual([]);
          for (const m of text.matchAll(/\$([^$]+)\$/g))
            expect(
              () => katex.renderToString(m[1]!, { throwOnError: true }),
              m[1],
            ).not.toThrow();
        }
        // 해설은 넉 줄 이하 — 문장 가운데의 마침표로 줄이 잘리지 않게(`solutionForDisplay`).
        const sol = p.solution.split("\n");
        expect(sol.length, p.solution).toBeLessThanOrEqual(4);
        for (const line of sol) expect(line.endsWith("."), line).toBe(true);
      }
    }
  });
});

describe("㉢ 정답지 — 제품의 정답지 자로 재서 해설이 통째로 빠지지 않는다", () => {
  /**
   * 정답지(`PrintAnswerKeyPage`)는 한 쪽에 8문항 · 2단이고, 두 단을 넘친 해설은 셋째 단으로 밀려 **통째로
   * 사라진다**(`assessAnswerKeyRisk` 머리말 · 1단계 보고서 §3.1). 자를 옮겨 적지 않는다 — 제품 함수를 그대로 부른다.
   */
  const SHARE =
    (JASEUP_MEASURED_PX.answerSolutionsFull *
      JASEUP_MEASURED_PX.solutionColumns) /
    JASEUP_GEOMETRY.answerEntriesPerPage;
  const short = (i: number): TestPrintProblem => ({
    id: `s${i}`,
    orderIndex: i,
    content: "다음을 계산하시오.",
    answer: "$1$",
    solution: "답은 $1$이다.",
    questionType: "단답형",
  });
  const judgeRow = (
    key: string,
    seed: number,
    v: number,
    i: number,
  ): TestPrintProblem => {
    const p = generateJudgeProblem(key, seed, v);
    return {
      id: `j${i}`,
      orderIndex: i,
      content: p.content,
      answer: p.answer,
      solution: p.solution,
      questionType: "객관식",
    };
  };
  const bySection = new Map<string, string[]>();
  for (const key of ORDER) {
    const section = key.split("|")[1]!;
    bySection.set(section, [...(bySection.get(section) ?? []), key]);
  }

  it("해설 한 건이 정답지 한 칸의 평균 몫(2단 × 높이 ÷ 8)을 넘지 않는다 — 씨앗 300 × 열셋", () => {
    expect(SHARE).toBeGreaterThan(200); // 몫이 무너지면(기하가 바뀌면) 여기부터 본다
    for (const key of STEP2)
      for (let s = 0; s < 300; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        expect(estimateSolutionPx(p.solution), p.solution).toBeLessThanOrEqual(
          SHARE,
        );
      }
  });

  it("차시마다 — 그 차시의 판정형만 8문항이 둘째 쪽(빠른 정답 상자 없음)에 다 들어간다 × 40벌", () => {
    for (const [section, keys] of bySection)
      for (let set = 0; set < 40; set += 1) {
        const rows = Array.from({ length: 8 }, (_, i) => short(i));
        for (let i = 8; i < 16; i += 1)
          rows.push(
            judgeRow(
              keys[(set + i) % keys.length]!,
              SEED0 + set * 1009 + i * STEP,
              i % 4,
              i,
            ),
          );
        expect(assessAnswerKeyRisk(rows), `${section} 벌 ${set}`).toEqual([]);
      }
  });

  it("차시마다 — 첫 쪽(빠른 정답 상자 있음)에 그 차시의 판정형을 문항류 하나씩 전부 × 40벌", () => {
    // 한 차시에 판정형이 가장 많은 곳은 «유리수의 덧셈과 뺄셈» 다섯이다.
    expect(Math.max(...[...bySection.values()].map((k) => k.length))).toBe(5);
    for (const [section, keys] of bySection)
      for (let set = 0; set < 40; set += 1) {
        const rows = Array.from({ length: 20 }, (_, i) => short(i));
        keys.forEach((k, j) => {
          let at = (set + j) % 8;
          while (rows[at]!.id.startsWith("j")) at = (at + 1) % 8;
          rows[at] = judgeRow(k, SEED0 + set * 7 + j, (set + j) % 2, at);
        });
        expect(
          rows.slice(0, 8).filter((r) => r.id.startsWith("j")),
        ).toHaveLength(keys.length);
        expect(assessAnswerKeyRisk(rows), `${section} 벌 ${set}`).toEqual([]);
      }
  });
});

describe("㉣ 적재 — 2단계 계획 파일", () => {
  const plan = JSON.parse(
    readFileSync(path.join(process.cwd(), PLAN), "utf8"),
  ) as { label: string; seedBase: number; targets: Target[] };
  const rows = plan.targets.flatMap((t) => buildTargetRows(t, plan.seedBase));

  it("계획은 2단계 열셋만 싣는다 — 1단계 셋(이미 실린 36행)은 건드리지 않는다", () => {
    expect(plan.targets).toHaveLength(1);
    const target = plan.targets[0] as { engine: string; keys: string[] };
    expect(target.engine).toBe("judge");
    expect([...target.keys].sort()).toEqual([...STEP2].sort());
    expect(plan.seedBase).toBe(SEED0);
  });

  it("행 — 열셋 × 12벌 = 156, 전부 객관식 · 열쇠가 계약 그대로 · 본문이 서로 다르다", () => {
    expect(rows).toHaveLength(156);
    const perKey = new Map<string, number>();
    for (const r of rows) {
      expect(r.questionType).toBe("객관식");
      const parts = parseJudgeExternalId(r.externalId);
      expect(parts, r.externalId).not.toBeNull();
      expect(STEP2).toContain(parts!.judgeKey);
      expect(parts).toMatchObject({
        ruleVersion: 1,
        seed: SEED0,
        questionType: "객관식",
      });
      expect(r.familyKey).toBe(`mid:judge:${parts!.judgeKey}`);
      expect(r.grade).toBe("중1");
      expect(r.section).toBe(parts!.judgeKey.split("|")[1]);
      expect(r.figureSpec).toBeNull();
      perKey.set(parts!.judgeKey, (perKey.get(parts!.judgeKey) ?? 0) + 1);
      // 적재 행은 등록부가 낸 그 문항이다.
      const p = generateJudgeProblem(parts!.judgeKey, SEED0, parts!.variant);
      expect([r.content, r.answer, r.solution, r.difficulty]).toEqual([
        p.content,
        p.answer,
        p.solution,
        p.difficulty,
      ]);
    }
    expect([...perKey.values()]).toEqual(Array(13).fill(12));
    expect(new Set(rows.map((r) => r.externalId)).size).toBe(156);
    expect(new Set(rows.map((r) => r.content)).size).toBe(156);
  });

  it("미적재 빚 — 등록 열여섯이 적재 전에는 전부 «안 나감»이고, 1단계 셋만 실리면 열셋이 남는다", () => {
    const debt = (ids: string[]) =>
      unloaded(loadedFragments(ids), [], [])
        .map((e) => e.key)
        .sort();
    expect(debt([])).toEqual([...ORDER].sort());
    const step1 = ORDER.slice(0, 3).map(
      (key) => `engine-mid-judge:${key}|r1|s${SEED0}|v0|객관식`,
    );
    expect(debt(step1)).toEqual([...STEP2].sort());
    // 계획대로 실으면 빚이 0 이다.
    expect(debt([...step1, ...rows.map((r) => r.externalId)])).toEqual([]);
  });
});
