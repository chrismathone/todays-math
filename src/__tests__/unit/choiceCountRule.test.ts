/**
 * 「보기가 있으면 **정확히 다섯 개**」 — 규칙 + 그 규칙이 지금 잡는 집합을 잠근다 (D-80).
 * (원장님 지시 2026-08-25: 「일부 4지선다 문항들이 있는데 전부 5지선다로」)
 *
 * ## 무엇이 이 시험을 «장식»으로 만들 수 있나
 *
 * ㉠ **축이 없으면 변이시킬 수 없다.** 훑기가 보기 있는 문항을 한 건도 못 만나면
 *    「전부 다섯이다」가 공짜로 초록이 된다. 그래서 **몇 건을 만났는지 바닥을 깐다.**
 * ㉡ **참이 제품에서 오면 안 된다.** 기대값 `5` 를 `CHOICE_COUNT` 에서 가져오면
 *    그 상수를 4로 바꿔도 초록이다. 그래서 **숫자 5를 리터럴로 못 박는다.**
 * ㉢ **분모를 정답 모양으로 가르면 안 된다** — 원장님이 지목하신 `J30401-A04-002` 는
 *    보기가 넷인데 정답이 `$3$`(계수)이라 그 열쇠로는 **안 보인다.** 아래에
 *    그 모양을 픽스처로 박아, 분모를 좁히면 빨개지게 한다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  anyChoiceCount,
  assertChoiceCount,
  assertChoiceMarks,
  CHOICE_COUNT,
  CHOICE_MARKS,
  choiceCountOf,
  hasChoices,
  lineHeadMarks,
  markListCount,
} from "@/lib/problem/choiceCountRule";

/** 🔴 기대값은 **리터럴**이다 — 제품 상수를 그대로 쓰면 상수를 바꿔도 초록이다. */
const EXPECTED = 5;

/** 🔴 표식도 **리터럴**이다 — `CHOICE_MARKS` 를 그대로 쓰면 바꿔도 초록이다. */
const EXPECTED_MARKS = ["①", "②", "③", "④", "⑤"];

const SEEDS = 200;
const SEED0 = 20260825;
const SEED_STEP = 7919;

const five = [
  "① $2x+1>3$",
  "② $x=4$",
  "③ $x^2\\ge0$",
  "④ $3x-2$",
  "⑤ $x+1\\le7$",
].join("\n");
const four = ["① $y=3x^2$", "② $y=2x^2$", "③ $y=x^2$", "④ $y=4x^2$"].join("\n");

describe("보기 개수 규칙", () => {
  it("제품 상수가 원장님 확정값과 같다", () => {
    expect(CHOICE_COUNT).toBe(EXPECTED);
  });

  it("개수는 제품 파서가 읽는 그 목록에서 온다", () => {
    expect(choiceCountOf(`다음 중 옳은 것은?\n${five}`)).toBe(5);
    expect(choiceCountOf(`폭이 가장 넓은 것은?\n${four}`)).toBe(4);
    expect(choiceCountOf("연립방정식의 해를 구하시오.")).toBe(0);
  });

  it("분모는 «지면에 보기가 있는가» 하나뿐이다 — 정답 모양으로 안 가른다", () => {
    // 🔴 원장님이 지목하신 그 모양: 보기는 넷인데 정답이 보기 표식이 아니다.
    //    「정답이 표식인 것」만 분모로 잡으면 이 문항이 통째로 안 보인다.
    const content = `다음 보기의 이차함수의 그래프 중 폭이 가장 넓은 것의 $x^2$의 계수를 구하시오.\n${four}`;
    expect(hasChoices(content)).toBe(true);
    expect(choiceCountOf(content)).toBe(4);
    // 서술형·단답형은 지면에 보기가 없으므로 이 분모에 애초에 안 들어온다.
    expect(hasChoices("이 자료의 평균을 구하시오.")).toBe(false);
  });

  it("🔴 «줄머리 표식» 목록도 센다 — 지면 파서만 보면 이 부류가 0이 된다", () => {
    // 제품 렌더러는 개행 뒤 ①~⑮·`1.` 만 보기로 읽는다. 엔진에는 ㉠~㉤ 로 목록을
    // 내는 유형이 있고, 그것들은 `choiceCountOf` 에게 **0개**로 보인다.
    const hangul = [
      "다음 중 $y$가 $x$의 함수인 것은 모두 몇 개인지 구하시오.",
      "㉠ 절댓값이 $x$인 정수 $y$",
      "㉡ $x$보다 $2$만큼 큰 수 $y$",
      "㉢ 자연수 $x$의 약수의 개수 $y$",
      "㉣ 한 개에 $500$원인 물건 $x$개의 값 $y$원",
    ].join("\n");
    expect(choiceCountOf(hangul)).toBe(0); // 지면 파서는 못 본다
    expect(markListCount(hangul)).toBe(4); // 이 축은 본다
    expect(anyChoiceCount(hangul)).toBe(4);
    expect(() => assertChoiceCount(hangul, "시험")).toThrow(/4개짜리/);
  });

  it("🔴 조건·이름표는 보기가 아니다 (음성 대조군)", () => {
    // ㈎㈏㈐ 는 우리말 관행에서 **조건**이다 — 괄호 친 표식은 안 센다.
    const conds = [
      "다음 조건을 모두 만족시키는 입체도형의 모서리의 개수를 구하시오.",
      "",
      "㈎ 두 밑면은 서로 평행하지만 합동은 아니다.",
      "㈏ 옆면의 모양은 모두 사다리꼴이다.",
      "㈐ 면의 개수는 $13$이다.",
    ].join("\n");
    expect(markListCount(conds)).toBe(0);
    expect(() => assertChoiceCount(conds, "시험")).not.toThrow();
    // 상자 이름표가 **한 줄에** 있으면 줄머리가 아니므로 안 센다.
    const boxes =
      "세 상자 ㉠, ㉡, ㉢에 각각 세 개의 수가 들어 있다. ㉠ $6$, $-1$ / ㉡ $1$, $a$ / ㉢ $6$, $b$";
    expect(markListCount(boxes)).toBe(0);
    expect(() => assertChoiceCount(boxes, "시험")).not.toThrow();
  });

  it("관문은 다섯이 아니면 던지고, 보기가 없으면 지나간다", () => {
    expect(() => assertChoiceCount(`발문\n${four}`, "시험")).toThrow(/4개짜리/);
    expect(() => assertChoiceCount(`발문\n${five}`, "시험")).not.toThrow();
    // 음성 대조군 — 보기가 아예 없는 문항은 이 규칙의 대상이 아니다.
    expect(() => assertChoiceCount("평균을 구하시오.", "시험")).not.toThrow();
  });
});

describe("관문이 **엔진 진입점에 배선돼 있다**", () => {
  /**
   * 텍스트 검사인 이유는 `chooseAllRule.test.ts` 와 같다 — 지금은 모든 유형이
   * 규칙을 지키므로 관문이 물 산출물이 하나도 없다. 관문의 **행동**은 위에서
   * 직접 부르며 재고, 여기서는 **나가는 자리에 걸려 있나**만 본다.
   */
  it("중등·초등 엔진이 나가는 자리에서 관문을 부른다", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const middle = readFileSync(
      resolve(__dirname, "../../lib/middle/generate.ts"),
      "utf-8",
    );
    const elem = readFileSync(
      resolve(__dirname, "../../lib/elementary/generate.ts"),
      "utf-8",
    );
    expect(middle).toContain("assertChoiceCount(content,");
    expect(elem).toContain("assertChoiceCount(content,");
    expect(middle).toContain("assertChoiceMarks(content,");
    expect(elem).toContain("assertChoiceMarks(content,");
  });
});

/**
 * 🔴 **표식 축** — 원장님 확정 2026-08-25 「보기번호는 바꾸고」.
 *
 * 이 축은 **개수 축과 다른 것을 잰다.** ㉠~㉤ 다섯 줄은 개수 관문을 **통과한다** —
 * 다섯이니까. 그런데 제품 파서는 그 목록을 보기로 안 읽어서 지면에서 보기 대접을
 * 못 받는다. 개수만 재면 이 부류가 **구조적으로 0** 이다.
 */
describe("보기 표식 규칙", () => {
  const withMarks = (marks: readonly string[]) =>
    ["다음 중 옳은 것을 모두 고르시오."]
      .concat(marks.map((m, i) => `${m} 보기 ${i + 1}`))
      .join("\n");

  it("제품 표식이 원장님 확정값과 같다", () => {
    expect([...CHOICE_MARKS]).toEqual(EXPECTED_MARKS);
  });

  it("줄머리 표식은 **산출물에서 뽑는다** — 손 목록이 아니다", () => {
    // 아무도 목록에 안 적은 표식(❶)도 그대로 잡혀 신고문에 실린다.
    expect(lineHeadMarks(withMarks(["❶", "❷"]))).toEqual(["❶", "❷"]);
    expect(lineHeadMarks("평균을 구하시오.")).toEqual([]);
  });

  it("🔴 ①~⑤ 목록은 지나가고 ㉠~㉤ 목록은 **던진다**", () => {
    expect(() =>
      assertChoiceMarks(withMarks(EXPECTED_MARKS), "시험"),
    ).not.toThrow();
    expect(() =>
      assertChoiceMarks(withMarks(["㉠", "㉡", "㉢", "㉣", "㉤"]), "시험"),
    ).toThrow(/보기 표식/);
  });

  it("개수 관문은 ㉠ 목록을 **통과시킨다** — 그래서 축이 둘이어야 한다", () => {
    // 이 한 줄이 「왜 관문을 하나 더 두는가」의 전부다. 개수 관문만 두면
    // ㉠ 다섯 줄이 조용히 나간다(2026-08-25 실측 DB 6건).
    const hangul = withMarks(["㉠", "㉡", "㉢", "㉣", "㉤"]);
    expect(() => assertChoiceCount(hangul, "시험")).not.toThrow();
    expect(() => assertChoiceMarks(hangul, "시험")).toThrow();
  });

  it("보기가 없는 문항은 지나간다 (음성 대조군)", () => {
    expect(() => assertChoiceMarks("평균을 구하시오.", "시험")).not.toThrow();
    expect(() =>
      assertChoiceMarks("세 상자 ㉠, ㉡, ㉢에 수가 들어 있다.", "시험"),
    ).not.toThrow();
  });

  it("표식 목록을 **손으로 다시 적은 모듈이 없다**", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    // 세 모듈이 각자 적고 있었다. 한 벌만 고치면 나머지는 조용히 남는다.
    for (const rel of ["m2Func.ts", "m2Line.ts", "m3Func.ts"]) {
      const src = readFileSync(
        resolve(__dirname, "../../lib/middle", rel),
        "utf-8",
      );
      const handWritten = /\[\s*"[①-⑮㉠-㉾]"\s*,/.test(src);
      expect(handWritten, `${rel} 가 표식을 손으로 다시 적었다`).toBe(false);
      expect(src).toContain("CHOICE_MARKS");
    }
  });
});

describe(`중등 엔진 — 보기가 있으면 언제나 ${EXPECTED}개 (씨앗 ${SEEDS})`, () => {
  const counts: { key: string; n: number }[] = [];
  /** 표식 축 — 「지면이 이 목록을 보기로 읽는가」. 개수 축과 **다른 것**을 잰다. */
  const marks: { key: string; heads: string; read: number; listed: number }[] =
    [];
  for (const t of registeredTypes()) {
    for (let s = 0; s < SEEDS; s += 1) {
      const p = generateMiddleProblem(t.key, SEED0 + s * SEED_STEP);
      const n = anyChoiceCount(p.content);
      if (n > 0) counts.push({ key: t.key, n });
      const listed = markListCount(p.content);
      if (listed > 0) {
        marks.push({
          key: t.key,
          heads: [...new Set(lineHeadMarks(p.content))].join(""),
          read: choiceCountOf(p.content),
          listed,
        });
      }
    }
  }

  it("표식 훑기가 실제로 목록을 만났다 — 축이 있어야 변이시킬 수 있다", () => {
    // 실측 2026-08-25: 20유형. 유형이 줄면 아래 「어긋난 것 0」이 공짜 초록이 된다.
    expect(new Set(marks.map((m) => m.key)).size).toBeGreaterThanOrEqual(20);
  });

  it("🔴 표식이 전부 ①~⑤ 이고 지면이 **보기로 읽는다**", () => {
    const bad = marks.filter(
      (m) =>
        m.read !== m.listed ||
        [...m.heads].some((c) => !EXPECTED_MARKS.includes(c)),
    );
    const summary = [
      ...new Set(
        bad.map(
          (b) => `${b.key} «${b.heads}» ${b.listed}줄 중 ${b.read}개만 읽힘`,
        ),
      ),
    ].slice(0, 12);
    expect(
      bad.length,
      `어긋난 산출물 ${bad.length}건: ${summary.join(" · ")}`,
    ).toBe(0);
  });

  it("훑기가 실제로 보기 있는 문항을 만났다 — 축이 있어야 변이시킬 수 있다", () => {
    // 실측 2026-08-25: 20유형 × 200씨앗 = 4,000건. 유형이 줄면 여기가 **먼저** 빨개진다.
    expect(new Set(counts.map((c) => c.key)).size).toBeGreaterThanOrEqual(20);
    expect(counts.length).toBeGreaterThanOrEqual(20 * SEEDS);
  });

  it(`보기가 ${EXPECTED}개가 아닌 산출물이 하나도 없다`, () => {
    const bad = counts.filter((c) => c.n !== EXPECTED);
    const summary = [...new Set(bad.map((b) => `${b.key} → ${b.n}개`))].slice(
      0,
      12,
    );
    expect(
      bad.length,
      `어긋난 산출물 ${bad.length}건: ${summary.join(" · ")}`,
    ).toBe(0);
  });
});

describe("초등 엔진 — 보기가 있으면 언제나 다섯", () => {
  it("소단원 전량 × 갈래 × 씨앗 8", () => {
    const seeds = 8;
    const bad: string[] = [];
    let generated = 0;
    for (const unit of elementaryUnits()) {
      const tiers = supportedTiers(unit);
      const asks =
        tiers.length > 0 ? tiers.map((t) => t) : [undefined as undefined];
      for (const tier of asks) {
        for (let s = 0; s < seeds; s += 1) {
          const p = generateElementaryProblem(
            unit,
            SEED0 + s * SEED_STEP,
            tier,
          );
          generated += 1;
          const n = anyChoiceCount(p.content);
          if (n > 0 && n !== EXPECTED) {
            bad.push(`${unit.grade} ${unit.section} ${tier ?? ""} → ${n}개`);
          }
        }
      }
    }
    // 분모를 같이 잠근다 — 훑기가 조용히 줄면 «0건»이 «못 셈»이 된다.
    expect(generated).toBeGreaterThanOrEqual(230 * seeds);
    expect([...new Set(bad)]).toEqual([]);
  });
});
