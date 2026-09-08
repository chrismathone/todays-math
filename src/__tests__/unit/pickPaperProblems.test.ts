/**
 * 🟢 인쇄 검수 시험지 견본의 **문항 고르기** — 「못 채운 자리를 숨기지 않는다」.
 *
 * 이 도구의 존재 이유는 하나다: `/dev/print-check` 의 미결 16건이 **시험지를
 * 뽑아 봐야** 드러나는데, 출제 엔진이 고른 문항이 그 16건을 다 건드릴 보장이
 * 없다는 것. 서술형이 하나도 안 뽑히면 「서술형 배지」는 영영 못 본다.
 *
 * 그래서 **못 채운 자리가 반드시 밖으로 나와야 한다.** 조용히 넘기면
 * 「뽑아서 검수했다」가 되면서 그 항목은 검수된 척 남는다.
 */
import { describe, expect, it } from "vitest";

import { ITEMS } from "../../app/dev/print-check/items";
import {
  pickPaperProblems,
  SLOTS,
  type Candidate,
  type Slot,
} from "../../app/dev/print-paper/pickPaperProblems";

const c = (over: Partial<Candidate> & { id: string }): Candidate => ({
  problemCode: `X-${over.id}`,
  content: "본문",
  answer: "①",
  solution: null,
  questionType: "객관식",
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  ...over,
});

const SLOT_ESSAY: Slot = {
  forItem: "essay-badge",
  label: "서술형",
  want: (x) => x.questionType === "서술형",
  count: 2,
};
const SLOT_FIG: Slot = {
  forItem: "figures-multi",
  label: "그림 2장",
  want: (x) => x.figureUrls.length >= 2,
  count: 2,
};

describe("자리를 채운다", () => {
  it("자리마다 원하는 종류를 원하는 만큼 넣는다", () => {
    const pool = [
      c({ id: "a", questionType: "서술형" }),
      c({ id: "b", questionType: "서술형" }),
      c({ id: "d", figureUrls: ["/f/1.png", "/f/2.png"] }),
      c({ id: "e", figureUrls: ["/f/3.png", "/f/4.png"] }),
      c({ id: "f" }),
    ];
    const r = pickPaperProblems(pool, 5, [SLOT_ESSAY, SLOT_FIG]);
    expect(r.filled.map((f) => [f.forItem, f.got])).toEqual([
      ["essay-badge", 2],
      ["figures-multi", 2],
    ]);
    expect(r.padding).toBe(1);
    expect(r.picked).toHaveLength(5);
  });

  it("같은 문항을 두 자리에 쓰지 않는다", () => {
    // 서술형이면서 그림이 2장인 문항 하나뿐 — 한 자리만 채워져야 한다.
    const pool = [
      c({
        id: "a",
        questionType: "서술형",
        figureUrls: ["/f/1.png", "/f/2.png"],
      }),
    ];
    const r = pickPaperProblems(pool, 5, [SLOT_ESSAY, SLOT_FIG]);
    expect(r.picked.map((p) => p.id)).toEqual(["a"]);
    expect(r.filled.find((f) => f.forItem === "figures-multi")!.got).toBe(0);
  });
});

describe("🔴 못 채운 자리를 **숨기지 않는다**", () => {
  it("풀에 그 종류가 없으면 got 0 으로 남는다 — 조용히 빠지지 않는다", () => {
    const pool = [c({ id: "a" }), c({ id: "b" })];
    const r = pickPaperProblems(pool, 2, [SLOT_ESSAY, SLOT_FIG]);
    expect(r.filled).toEqual([
      { forItem: "essay-badge", label: "서술형", want: 2, got: 0 },
      { forItem: "figures-multi", label: "그림 2장", want: 2, got: 0 },
    ]);
    // 그래도 시험지는 나온다 — 다만 그 두 항목은 «검수 못 함»이다.
    expect(r.picked).toHaveLength(2);
    expect(r.padding).toBe(2);
  });

  it("정원이 모자라면 뒷자리가 못 채워지고 그게 보인다", () => {
    const pool = [
      c({ id: "a", questionType: "서술형" }),
      c({ id: "b", questionType: "서술형" }),
      c({ id: "d", figureUrls: ["/f/1.png", "/f/2.png"] }),
    ];
    const r = pickPaperProblems(pool, 2, [SLOT_ESSAY, SLOT_FIG]);
    expect(r.picked).toHaveLength(2);
    expect(r.filled.find((f) => f.forItem === "figures-multi")!.got).toBe(0);
  });
});

describe("정원", () => {
  it("자리를 다 채운 뒤 정원까지 평범한 문항으로 메운다", () => {
    // 정답지 1쪽 정원(overflow-first-page)은 **문항 수**가 있어야 드러난다.
    const pool = Array.from({ length: 40 }, (_, i) => c({ id: `p${i}` }));
    const r = pickPaperProblems(pool, 25, []);
    expect(r.picked).toHaveLength(25);
    expect(r.padding).toBe(25);
  });

  it("풀이 정원보다 작으면 있는 만큼만", () => {
    const pool = [c({ id: "a" })];
    expect(pickPaperProblems(pool, 25, []).picked).toHaveLength(1);
  });
});

describe("자리가 가리키는 검수 항목이 실재한다", () => {
  /*
    🔴 `forItem` 은 **문자열**이라 타입이 못 센다. 오타가 나면 그 자리는 아무 항목도
       안 가리키는데, 자리 보고서는 「○ 4/4」라고 찍는다 — 검수된 척하는 자리가
       하나 생기고, 정작 그 검수 항목은 영영 시험지에 안 실린다.
       2026-09-06 에 `<나열>` 이 「입력 마커가 아닌데 아무도 안 울었다」와 같은 부류다.
  */
  const ids = new Set(ITEMS.map((i) => i.id));

  it("눈금 — 이 검사는 «없는 id»를 실제로 잡을 수 있다", () => {
    expect(ids.has("이런-항목은-없다")).toBe(false);
    expect(ids.size).toBeGreaterThan(10);
  });

  it("🔴 모든 자리의 forItem 이 print-check 항목 id 다", () => {
    const orphans = SLOTS.filter((s) => !ids.has(s.forItem)).map(
      (s) => s.forItem,
    );
    expect(orphans).toEqual([]);
  });
});

describe("해설이 갈리는 문항 자리 (solution-line-split)", () => {
  const slot = SLOTS.find((s) => s.forItem === "solution-line-split")!;

  it("그 자리가 있다", () => {
    expect(slot).toBeDefined();
  });

  it("한 문장짜리 해설은 **안** 뽑는다 — 갈릴 것이 없다", () => {
    expect(slot.want(c({ id: "one", solution: "$x=3$ 입니다" }))).toBe(false);
    // 해설이 아예 없는 행도 마찬가지 — `null` 에서 터지지 않는 것까지 함께 본다.
    expect(slot.want(c({ id: "none", solution: null }))).toBe(false);
  });

  it("문장 셋으로 갈리는 해설은 뽑는다", () => {
    const three = "두 삼각형은 닮음입니다. 따라서 $x:6=4:8$ 입니다. ∴ $x=3$";
    expect(slot.want(c({ id: "three", solution: three }))).toBe(true);
  });

  it("⚠️ 두 조각짜리는 안 뽑는다 — 세로가 거의 안 늘어 「넘쳐 사라지나」가 안 보인다", () => {
    expect(slot.want(c({ id: "two", solution: "닮음입니다. ∴ $x=3$" }))).toBe(
      false,
    );
  });
});
