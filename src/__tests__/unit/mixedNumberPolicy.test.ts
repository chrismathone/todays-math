/**
 * 지면 표기 정책 — **가분수를 대분수로 자동으로 바꾸지 않는다.**
 *
 * 원장님 확정(2026-08-24): 「중등은 대분수 변환하지 말 것」.
 *
 * ## 왜 이 검사가 있나
 *
 * `preprocessMathText` 가 렌더 경로에서 정수 가분수를 대분수로 바꾸고 있었다
 * (mathgen 전처리를 통째로 이식하며 딸려 온 규칙, `aed9b430`). 그래서 **DB 값은
 * 그대로인데 종이에 다른 수가 찍혔다** — 실측으로 공유 DB 문항 7,724 · 자리 26,376,
 * 중1부터 고3까지 전 학년이었다. 재현: `npx tsx scripts/qa/census-mixed-number.ts`.
 *
 * 이 결함은 **스스로 신고하지 않는다.** KaTeX 는 초록이고(유효한 수식이다),
 * 수학적으로 같은 값이라 검산도 통과하며, DB 본문을 세는 지표는 구조적으로 0 이다.
 * 그래서 지면을 **실제로 전처리해 보는** 이 검사가 필요하다.
 *
 * 판정의 «참» 은 제품 함수에서 온다 — 규칙을 여기 옮겨 적지 않고
 * `preprocessMathText` 를 그대로 부른다.
 */
import { describe, expect, it } from "vitest";

import { renderKatexSafe as renderEditorKatex } from "../../components/math/editor/katexRender";
import { repairEditorSource } from "../../components/math/editor/sourceRepair";
import { applyMathInnerNormalization as normalizeEditorMath } from "../../components/math/editor/textPreprocess";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../lib/elementary/generate";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";

// 판정의 열쇠는 **계량기와 한 벌**이다 — 두 벌이 되면 한쪽만 고쳐도 아무도 모른다
// (2026-08-18 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이 쓰게 하라」).

import { countRewrites } from "../../../scripts/qa/census-mixed-number";

/** 대분수 모양 — 숫자 바로 뒤에 분수가 붙은 것. */
const MIXED =
  /(?:^|[^0-9.])([0-9]{1,4})\\d?frac[{]([0-9]{1,4})[}][{]([0-9]{1,4})[}]/g;
const countMixed = (s: string) => [...s.matchAll(MIXED)].length;

describe("지면 표기 — 가분수를 대분수로 바꾸지 않는다", () => {
  it("이 검사의 «대분수 찾기» 가 살아 있다 (0 은 «깨끗»과 «못 셈»을 안 가른다)", () => {
    // ⚠️ 살아 있음은 **제품을 거치지 않고** 확인해야 한다. `countRewrites` 는
    //    「제품이 무엇을 바꾸나」를 재는 자다 — 규칙을 없앤 지금은 **구조적으로 0** 이라
    //    그것으로는 자를 못 잰다(이 검사를 처음 그렇게 짰다가 빨갛게 났다).
    //    그래서 «이미 대분수인 글»을 손으로 만들어 찾기가 걸리는지 본다.
    expect(countMixed(String.raw`1\dfrac{1}{3}`)).toBe(1);
    expect(countMixed(String.raw`\dfrac{4}{3}`)).toBe(0);
  });

  it("구의 부피 공식이 대분수가 되지 않는다", () => {
    const before = String.raw`부피는 $\dfrac{4}{3}\pi r^{3}$이다.`;
    expect(countRewrites(before)).toEqual({ mixed: 0, fold: 0 });
    expect(countMixed(preprocessMathText(before))).toBe(0);
  });

  it("해설의 계산 단계가 사라지지 않는다 — 355/5 가 접히면 «71=71» 이 된다", () => {
    const before = String.raw`(평균)$=\dfrac{355}{5}=71$(점)`;
    expect(countRewrites(before).fold).toBe(0);
    expect(preprocessMathText(before)).toContain("355");
  });

  it("중학 유형 엔진이 내는 지면을 전처리가 고쳐 쓰지 않는다", () => {
    const bad: string[] = [];
    for (const e of registeredTypes()) {
      for (let s = 0; s < 3; s += 1) {
        const p = generateMiddleProblem(e.key, s * 7919 + 13);
        for (const field of [p.content, p.answer, p.solution]) {
          const text = String(field ?? "");
          if (!text) continue;
          const r = countRewrites(text);
          if (r.mixed || r.fold) {
            bad.push(
              e.key + " [" + r.mixed + "/" + r.fold + "]: " + text.slice(0, 80),
            );
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("초등 「가분수를 대분수로 나타내시오」 발문이 정답을 보여 주지 않는다", () => {
    const bad: string[] = [];
    let asked = 0;
    for (const u of elementaryUnits()) {
      for (let s = 0; s < 6; s += 1) {
        let p;
        try {
          p = generateElementaryProblem(u, 20260821 + s * 7919);
        } catch {
          continue;
        }
        const body = String(p.content ?? "");
        if (!/(대분수|가분수)로 (나타|고치|바꾸)/.test(body)) continue;
        asked += 1;
        if (countMixed(preprocessMathText(body)) > countMixed(body)) {
          bad.push(u.grade + " " + u.chapter + ": " + body.slice(0, 70));
        }
      }
    }
    // 그런 발문이 표본에 있어야 이 검사가 무엇이든 잰다.
    expect(asked).toBeGreaterThan(0);
    expect(bad.slice(0, 3)).toEqual([]);
  });
});

/**
 * 🔴 **원본 편집기(2026-09-14 이식, `c0bf4551`)에 옛 전처리가 한 벌 딸려 왔다.**
 *
 * `components/math/editor/textPreprocess.ts` 는 08-24 에 규칙을 뺀 `lib/math` 판이 아니라
 * 그 전 판을 옮겨 온 것이라 `improperToMixed` 가 살아 있었다. 편집기 렌더러
 * (`renderKatexSafe`)는 **보이는 식마다** 이것을 불러, 작업실 검수 칸의 본문 미리보기와
 * 편집 칸이 학년과 상관없이 — 중1·고1 도 — `\frac{10}{3}` 을 3⅓ 로 그렸다. 편집 칸의
 * 원문은 가분수 그대로라 값 시험은 다 초록이었다.
 *
 * 초등 대분수는 보여 줄 때 **한 함수**(`fractionViewFor`, 학년을 안다)만 한다 — 렌더러는
 * 학년을 모르므로 바꾸지 않는다(원장님 2026-09-19 «모든 화면이 일치하도록»).
 */
describe("편집기 렌더러도 가분수를 대분수로 바꾸지 않는다", () => {
  /** 렌더된 KaTeX 의 보이는 글자 — 대분수로 그렸으면 분자 10 이 없다. */
  const visible = (tex: string) =>
    renderEditorKatex(tex, false).replace(/<[^>]+>/g, "");

  it("보이는 식의 정규화가 가분수를 그대로 둔다", () => {
    for (const tex of [String.raw`\frac{10}{3}`, String.raw`-\dfrac{5}{2}x`]) {
      expect(countMixed(normalizeEditorMath(tex))).toBe(0);
    }
    expect(normalizeEditorMath(String.raw`\frac{10}{3}`)).toContain("{10}{3}");
    // 정수로 떨어지는 분수도 접지 않는다 — 계산 단계가 사라진다(위 355/5).
    expect(normalizeEditorMath(String.raw`\dfrac{355}{5}=71`)).toContain("355");
  });

  it("편집 칸·본문 미리보기가 그리는 식에 분자가 남는다", () => {
    expect(visible(String.raw`\frac{10}{3}`)).toContain("10");
    expect(visible(String.raw`\frac{1}{3}`)).toContain("1");
  });

  // 편집기의 문서 단위 전처리 사본은 2026-09-26 에 걷었다 — 지금 편집기 문서 단계는 입구 후보정을
  // 수식 밖에만 거는 `repairEditorSource` 다. 그것도 수를 고쳐 쓰지 않는다.
  it("편집기 판 문서 복구도 지면의 수를 고쳐 쓰지 않는다", () => {
    const before = String.raw`부피는 $\dfrac{4}{3}\pi r^{3}$이다. $\frac{10}{3}$`;
    expect(countMixed(repairEditorSource(before))).toBe(0);
  });
});
