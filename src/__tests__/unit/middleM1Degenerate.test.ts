/**
 * 중1 세 모듈(`m1Expr`·`m1Book1`·`m1LinearApply`) 전수 — **말이 안 되는 수치가 0 인가.**
 *
 * 원장님이 학생 폰 «오늘의 복습»에서 본 것(2026-09-27): 씨앗에 따라
 * 「비가 $2:2$」·「톱니 수가 각각 $10$개, $10$개」(답이 발문의 $120$바퀴 그대로)·
 * 「A는 $14$일, B는 $14$일」이 나왔다. 값은 맞아서 모듈별 값 검산
 * (`middleLinearApply.test.ts` 의 `VERIFY` 등)이 **구조적으로 못 본다.**
 *
 * 이 엔진은 종이 시험지(`generateMiddleProblem`)와 모바일 복습
 * (`src/lib/math-srs/generator.ts` — 처리기를 `createRng(seed)` 로 바로 부른다) **둘 다**에
 * 나간다. 두 길은 같은 처리기를 다른 난수 흐름으로 부르므로 **둘 다** 돌린다.
 *
 * 판정은 셋이다 — 모두 제품 밖에 산다(규칙을 제품에서 가져오면 동어반복이다).
 *  - `degenerateFindings` (`scripts/qa/census-middle-degenerate.ts`) — 비 $a:a$·기약 아닌 비·
 *    「각각」 뒤 같은 값·나란한 두 자리의 같은 값·「X와 X」·답이 발문에 그대로.
 *  - `pageSmells` (`../helpers/midPage.ts`) — `1x`·`1\left(`·`+-`·`+0` 같은 지면 냄새.
 *  - `josaMismatches` (같은 곳) — `$3$를`·`$6$를` 처럼 수 읽기와 어긋난 조사.
 *
 * 눈금(양성·음성)은 판정기와 **같은 파일**의 `CALIBRATION` 이다 — 여기서 다시 적지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  CALIBRATION,
  calibrationMisses,
  degenerateFindings,
} from "../../../scripts/qa/census-middle-degenerate";
import { createRng } from "../../lib/elementary/rng";
import { generateMiddleProblem } from "../../lib/middle/generate";
import { M1_BOOK1 } from "../../lib/middle/m1Book1";
import { M1_EXPR, M1_EXPR_SUP_B } from "../../lib/middle/m1Expr";
import { M1_LINEAR_APPLY } from "../../lib/middle/m1LinearApply";
import type { MidProblem, TypeEntry } from "../../lib/middle/types";
import { josaMismatches, pageSmells } from "../helpers/midPage";

/**
 * 씨앗 수 — 가장 드문 결함이 1,000번에 7번(0.7%)이었다(`식의 계산|08` 답=발문).
 * 두 길 × 500 = 1,000 표본이면 그런 결함을 놓칠 확률이 0.1% 아래다.
 */
const SEEDS = 500;

const ROWS: { module: string; key: string; entry: TypeEntry }[] = [
  ...[...M1_EXPR, ...M1_EXPR_SUP_B].map((entry) => ({
    module: "m1Expr",
    key: entry.key,
    entry,
  })),
  ...M1_BOOK1.map((entry) => ({ module: "m1Book1", key: entry.key, entry })),
  ...M1_LINEAR_APPLY.map((entry) => ({
    module: "m1LinearApply",
    key: entry.key,
    entry,
  })),
];

function defects(p: MidProblem): string[] {
  const out = degenerateFindings(p.content, p.answer).map(
    (f) => `[${f.rule}] ${f.detail}`,
  );
  for (const [field, text] of [
    ["발문", p.content],
    ["정답", p.answer],
    ["해설", p.solution],
  ] as const) {
    for (const s of pageSmells(text)) out.push(`[냄새 ${field}] ${s}`);
    for (const j of josaMismatches(text)) out.push(`[조사 ${field}] ${j}`);
  }
  return out;
}

describe("판정기 눈금 — 양성은 잡고 음성은 안 잡는다", () => {
  it(`눈금 ${CALIBRATION.length}건이 전부 맞는다`, () => {
    expect(calibrationMisses()).toEqual([]);
    // 양성과 음성이 **둘 다** 있어야 눈금이다 — 한쪽만 있으면 거짓 경보를 못 잰다.
    expect(CALIBRATION.some((c) => c.rules.length > 0)).toBe(true);
    expect(CALIBRATION.some((c) => c.rules.length === 0)).toBe(true);
  });

  it("괄호 앞 계수 1 은 냄새고, 두 자리 수의 끝 1 은 아니다", () => {
    expect(pageSmells("$-1\\left(x-5\\right)=-x+5$")).toContain(
      "괄호 앞에 계수 1 을 적었다",
    );
    expect(pageSmells("$1\\left(x-4\\right)=x-4$")).toContain(
      "괄호 앞에 계수 1 을 적었다",
    );
    expect(pageSmells("$21\\left(x-4\\right)$")).toEqual([]);
    expect(pageSmells("$-\\left(x-5\\right)=-x+5$")).toEqual([]);
  });

  it("말로 쓴 공식의 곱셈표는 비어 있지 않다", () => {
    // 「(속력)$\times$(시간)」은 곱셈표만 수식으로 쓴 것이다 — 뒤가 빈 것이 아니다.
    expect(pageSmells("(거리)$=$(속력)$\\times$(시간)")).toEqual([]);
    expect(pageSmells("$3\\times$")).toContain("곱셈표 뒤가 비었다");
  });
});

describe.each(["종이", "모바일"] as const)(
  "%s 길 — 세 모듈 전 유형 × 씨앗에서 퇴화·냄새·조사 결함 0",
  (path) => {
    it.each(ROWS)("$module $key", ({ key, entry }) => {
      const bad: string[] = [];
      for (let s = 0; s < SEEDS && bad.length < 6; s += 1) {
        const p =
          path === "종이"
            ? generateMiddleProblem(key, 20260927 + s)
            : entry.handler(createRng(s));
        for (const d of defects(p)) {
          if (bad.length < 6) bad.push(`씨앗 ${s} ${d}`);
        }
      }
      expect(bad).toEqual([]);
    });
  },
);
