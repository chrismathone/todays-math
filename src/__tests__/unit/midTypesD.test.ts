/**
 * 갈래 D — 중등 소단원을 10유형으로 채우는 몫.
 *
 * ## 여기 있는 것 / 여기 없는 것
 *
 * | 무엇 | 어디 |
 * |---|---|
 * | 소단원이 **10유형**인가 | 여기 (`DONE_SECTIONS`) |
 * | 끝낸 소단원의 **지면 글자**(조사·냄새) | 여기 |
 * | 유형 하나의 **값 검산** | 그 모듈의 시험 |
 * | 번호가 RPM 색인과 맞나 | `middleTypeCoverage.test.ts` 가 **전량**으로 |
 *
 * 모듈 시험이 어디인지: `m1Book1`→`middleM1Extra`, `m1Num`→`middleM1Num`,
 * `m1LinearApply`→`middleLinearApply`. **거기가 유형마다 검산식을 요구한다** —
 * 그러니 새 유형을 지으면 그 파일에 검산을 적는다. 여기 또 적지 말 것.
 */

import { describe, expect, it } from "vitest";

import { generateMiddleProblem } from "@/lib/middle/generate";
import { M1_BOOK1 } from "@/lib/middle/m1Book1";
import { M1_LINEAR_APPLY } from "@/lib/middle/m1LinearApply";
import { M1_NUM } from "@/lib/middle/m1Num";

import { josaMismatches, pageSmells } from "../helpers/midPage";

/** 이 갈래에서 **10유형을 채운** 소단원 — 끝낼 때마다 한 줄씩 는다. */
const DONE_SECTIONS = [
  { entries: M1_LINEAR_APPLY, section: "일차방정식의 활용(비율, 시계, 규칙)" },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(증가와 감소, 원가와 정가)",
  },
  { entries: M1_BOOK1, section: "일차식의 뜻Ⅰ" },
  { entries: M1_NUM, section: "공약수와 최대공약수" },
  { entries: M1_BOOK1, section: "소수와 거듭제곱" },
  { entries: M1_NUM, section: "수의 대소관계" },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(나이, 과부족, 예금)",
  },
  { entries: M1_LINEAR_APPLY, section: "일차방정식의 활용(수)" },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(거리, 속력, 시간)",
  },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(도형, 농도, 일)",
  },
  { entries: M1_NUM, section: "공배수와 최소공배수" },
  { entries: M1_NUM, section: "소인수분해" },
  { entries: M1_NUM, section: "최대공약수와 최소공배수의 활용" },
] as const;

describe("중등 유형 갈래 D", () => {
  it.each(DONE_SECTIONS)(
    "$section 소단원은 서로 다른 유형 10개를 갖는다",
    ({ entries, section }) => {
      const selected = entries.filter((entry) => entry.unitSection === section);
      expect(selected).toHaveLength(10);
      expect(new Set(selected.map((entry) => entry.key)).size).toBe(10);
    },
  );

  // ── 지면 글자 — 값 검산이 구조적으로 못 보는 자리 ──────────────
  //
  // 눈금을 먼저 둔다: **이 자가 «아니오»를 낼 수 있는가.** 없으면 「0건」이
  // 「깨끗」인지 「못 셈」인지 안 갈린다(2026-08-21).

  it("판정기 눈금 — 조사·냄새 자가 아니오를 낼 수 있다", () => {
    // 양성
    expect(josaMismatches("$15$과 $3$")).toEqual(["$…15$과 → 와"]);
    expect(josaMismatches("$36$가 된다")).toEqual(["$…36$가 → 이"]);
    expect(pageSmells("$1x+2$")).toContain("계수 1 을 적었다");
    expect(pageSmells("$11^{1}$")).toContain("지수 1 을 적었다");
    // 음성 — 옳은 지면을 잡으면 거짓 경보고, 거짓 경보는 가드를 끈다
    expect(josaMismatches("$15$와 $3$을")).toEqual([]);
    expect(josaMismatches("$5x-3x^2$을")).toEqual([]); // 「제곱」으로 읽는다
    expect(josaMismatches("$5$이다")).toEqual([]); // 서술격 「이다」
    expect(pageSmells("$x+2$")).toEqual([]);
    expect(pageSmells("$2^{3}\\times11$")).toEqual([]);
  });

  it.each(DONE_SECTIONS)(
    "$section 소단원의 지면에 조사·냄새 결함이 없다",
    ({ entries, section }) => {
      for (const entry of entries.filter((e) => e.unitSection === section)) {
        for (let variant = 0; variant < 20; variant += 1) {
          const p = generateMiddleProblem(entry.key, 20260827, variant);
          for (const part of [p.content, p.answer, p.solution]) {
            expect(josaMismatches(part), `${entry.key} ${part}`).toEqual([]);
            expect(pageSmells(part), `${entry.key} ${part}`).toEqual([]);
          }
        }
      }
    },
  );
});
