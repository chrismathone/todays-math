/**
 * **적재기가 「있는 만큼만」 넣는 초등 문형의 목록을 못 박는다.**
 *
 * ## 왜 생겼나 (2026-08-28)
 *
 * 초등 생성기 73자리가 발문 앞에 **아무 뜻 없는 번호**를 붙이고 있었다:
 *
 *     $4$번. 곱셈식 $3\times4=12$ 에서 만들 수 있는 나눗셈식은 몇 개입니까?
 *     $5$번 그림에서 색칠한 조각은 몇 개인지 쓰시오.
 *
 * 시험지는 문항 번호를 **제가 붙인다** — 종이에는 「7. $4$번. 곱셈식…」이 나간다.
 * 「$5$번 그림」이 가리키는 번호 매긴 그림도 지면에 없다. 생성기 주석이 스스로
 * 「**번호를 넣어 변형을 연다**」고 적어 두고 있었다.
 *
 * 걷어내니 **문형 30개가 「씨앗이 무엇이든 한 문항」임이 드러났다.** 그전에는 그
 * 번호가 `content` 를 갈라 세 벌인 척했다. 그리고 적재기는 3개를 못 채우면
 * **그 단원을 통째로 거부**하므로(실측 6개 단원), 이제 `allowShort` 로 있는 만큼
 * 넣는다.
 *
 * ## 🔴 이 시험이 지키는 것 — 「말없는 상한」
 *
 * `allowShort` 는 **덜 내고도 성공으로 보이는** 길이다. 그러니 목록을 여기 박는다.
 *
 * - **늘면 빨강** — 변할 수 있던 문형이 못 변하게 된 회귀다(생성기가 씨앗을 안 쓰게
 *   되었거나, 다름의 열쇠가 좁아졌거나).
 * - **줄어도 빨강** — 좋은 일이지만 목록을 고쳐 「무엇이 좋아졌는지」를 남겨야 한다.
 *
 * ⚠️ 기대 목록은 **리터럴**이다. 엔진에서 다시 뽑아 견주면 언제나 초록인
 *    동어반복이 된다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  listedForms,
} from "@/lib/elementary/generate";
import { collectDistinctVariantsResult } from "@/lib/engine/variants";

/** 적재 계획(`2026-08-27-초등문형-전량.json`)이 쓰는 값 그대로. */
const NEED = 3;
const SEED_BASE = 20260827;

/**
 * **씨앗이 무엇이든 `NEED` 개를 못 채우는 문형** — `학년|소단원|문형|낼 수 있는 수`.
 * 전부 「사다리꼴의 꼭짓점은 몇 개인가?」류의 한 가지 사실을 묻는 물음이다.
 */
const SHORT_FORMS = [
  "초3|2-3-1 원의 중심, 지름, 반지름|f01|2",
  "초4|2-2-2 이등변삼각형의 성질|f05|1",
  "초4|2-2-2 이등변삼각형의 성질|f10|1",
  "초4|2-2-3 정삼각형의 성질|f06|1",
  "초4|2-2-3 정삼각형의 성질|f07|1",
  "초4|2-2-3 정삼각형의 성질|f10|1",
  "초4|2-2-5 삼각형을 두 가지 기준으로 분류하기|f07|1",
  "초4|2-2-5 삼각형을 두 가지 기준으로 분류하기|f09|1",
  "초4|2-2-5 삼각형을 두 가지 기준으로 분류하기|f10|1",
  "초4|2-4-2 평행과 평행선|f05|1",
  "초4|2-4-2 평행과 평행선|f07|1",
  "초4|2-4-2 평행과 평행선|f08|1",
  "초4|2-4-2 평행과 평행선|f10|1",
  "초4|2-4-3 평행선 사이의 거리|f09|1",
  "초4|2-4-4 사다리꼴|f06|1",
  "초4|2-4-4 사다리꼴|f08|1",
  "초4|2-4-4 사다리꼴|f09|1",
  "초4|2-4-4 사다리꼴|f10|1",
  "초4|2-4-5 평행사변형|f09|1",
  "초4|2-4-5 평행사변형|f10|1",
  "초4|2-4-6 마름모|f09|1",
  "초4|2-4-6 마름모|f10|1",
  "초4|2-4-7 여러 가지 사각형|f05|1",
  "초4|2-4-7 여러 가지 사각형|f06|1",
  "초4|2-4-7 여러 가지 사각형|f07|1",
  "초4|2-6-1 다각형|f10|1",
  "초4|2-6-2 정다각형|f07|1",
  "초4|2-6-2 정다각형|f08|1",
  "초4|2-6-2 정다각형|f10|1",
  "초4|2-6-4 모양 만들기와 채우기|f07|1",
] as const;

describe("[초등 문형] 변형 공간", () => {
  it("**열쇠가 살아 있다** — 그림이 다르면 다른 문항이다", () => {
    // 🔴 대조군은 **손으로 지은 것**이다. 엔진을 쓰면 엔진을 고치는 순간
    //    대조군이 사라져 「검출기가 사는가」를 영영 못 잰다.
    const sameStem = (v: number) => ({
      content: "그림에서 색칠한 조각은 몇 개인지 쓰시오.",
      answer: "$3$개",
      figureSpec: { kind: "fracPie", parts: 4 + v },
    });
    expect(
      collectDistinctVariantsResult(sameStem, 3, { allowShort: true }).shortBy,
      "그림이 다른데 «중복»으로 접혔다 — 열쇠가 그림을 안 본다",
    ).toBe(0);

    // 반대쪽 — 그림까지 같으면 한 문항이다.
    const allSame = () => ({
      content: "사다리꼴의 꼭짓점은 몇 개인가?",
      answer: "$4$",
      figureSpec: { kind: "namedShapes", items: [{ shape: "trap" }] },
    });
    const got = collectDistinctVariantsResult(allSame, 3, { allowShort: true });
    expect(got.items).toHaveLength(1);
    expect(got.shortBy).toBe(2);

    // 그리고 `allowShort` 없이는 **던진다** — 조용히 덜 내지 않는다.
    expect(() => collectDistinctVariantsResult(allSame, 3)).toThrow(
      /변형 공간이 좁아/,
    );
  });

  it("🔴 **덜 내는 문형의 목록이 그대로다** — 늘면 회귀, 줄면 목록을 고쳐라", () => {
    const found: string[] = [];
    for (const unit of elementaryUnits())
      for (const f of listedForms(unit)) {
        const got = collectDistinctVariantsResult(
          (v) => {
            const p = generateElementaryForm(unit, SEED_BASE + v * 1009, f.id);
            return {
              content: p.content,
              answer: p.answer,
              figureSpec: p.figureSpec,
            };
          },
          NEED,
          { allowShort: true },
        );
        if (got.shortBy > 0)
          found.push(
            `${unit.grade}|${unit.section}|f${f.id}|${got.items.length}`,
          );
      }
    found.sort();

    const want: string[] = [...SHORT_FORMS].sort();
    const added = found.filter((x) => !want.includes(x));
    const gone = want.filter((x) => !found.includes(x));
    expect(
      found,
      added.length || gone.length
        ? `\n늘어난 것 ${added.length}개 (변할 수 있던 문형이 못 변하게 됐다):\n` +
            added.map((x) => `   + ${x}`).join("\n") +
            `\n사라진 것 ${gone.length}개 (좋아졌으면 목록을 고쳐라):\n` +
            gone.map((x) => `   - ${x}`).join("\n")
        : undefined,
    ).toEqual(want);
  }, 300_000);
});
