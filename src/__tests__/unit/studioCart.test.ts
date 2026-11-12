import { describe, expect, it } from "vitest";
import {
  addToCart,
  forgetRemovals,
  rememberRemoval,
  restoreToCart,
  studioCartAddLabel,
  studioCartLabel,
  studioCartMeaning,
  studioCartPending,
  studioCartRows,
  studioCartState,
  type StudioCartRemoval,
  onlySolutionChanged,
  reconcileStudioPageCart,
} from "@/components/unified/studioCart";
import { applyStudioCropEdit } from "@/components/unified/studioCropEdit";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import type { StudioProblem } from "@/components/unified/types";

/**
 * 담은 문항 장부 — 원장님 2026-09-21 확정(트랙 41 안 D → 트랙 44 구현).
 * 작업실의 «담음»과 시험지의 담은 목록이 **한 장부**(`selected`)에서 나오는지,
 * «고친 뒤 반영 전»이 판 번호로 갈리는지, 뺀 것을 한꺼번에 담기가 건너뛰는지를 못 박는다.
 */

function crop(id: string, patch: Partial<StudioCrop> = {}): StudioCrop {
  return {
    id,
    sourceId: "s1",
    sourceLabel: "예제",
    page: 1,
    rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.3 },
    image: "data:image/png;base64,Y3JvcA==",
    content: "",
    answer: "",
    solution: "",
    level: "secondary",
    grade: "중2",
    mode: "image",
    ...patch,
  };
}
const bank = (id: string): StudioProblem => ({
  id,
  content: "은행 문항",
  answer: "",
  solution: "",
  grade: "중1",
  chapter: "일차방정식",
  section: "일차방정식의 활용",
  difficulty: "중",
  problemCode: "B-1",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
});

describe("쪽 제외와 담은 문항 보존", () => {
  it("연속 제외·복원은 원래 자리와 원본 객체를 보존하며 다른 파일·은행·직접 뺀 문항에 간섭하지 않는다", () => {
    const a = studioProblem(crop("a", { page: 1, solution: "보존할 해설" }));
    const b = studioProblem(crop("b", { page: 2 }));
    const other = studioProblem(crop("other", { sourceId: "s2", page: 1 }));
    const manual = {
      problem: studioProblem(crop("manual", { page: 1 })),
      index: 3,
    };
    const initial = [a, bank("bank"), b, other];
    const order = (out: number[]) =>
      [1, 2].map((page) => ({ sourceId: "s1", page, out: out.includes(page) }));
    const first = reconcileStudioPageCart(initial, [manual], order([1]));
    const both = reconcileStudioPageCart(
      first.picked,
      first.removed,
      order([1, 2]),
    );
    expect(both.picked.map((p) => p.id)).toEqual(["bank", "other"]);
    const partial = reconcileStudioPageCart(
      both.picked,
      both.removed,
      order([1]),
    );
    expect(partial.picked.map((p) => p.id)).toEqual(["bank", "b", "other"]);
    const restored = reconcileStudioPageCart(
      partial.picked,
      partial.removed,
      order([]),
    );
    expect(restored.picked).toEqual(initial);
    expect(restored.picked[0]).toBe(a);
    expect(restored.removed).toEqual([manual]);
    expect(
      reconcileStudioPageCart(restored.picked, restored.removed, order([]))
        .picked,
    ).toBe(restored.picked);
  });

  it("다른 추출 작업을 열어도 제외된 쪽을 임의로 되살리지 않는다", () => {
    const problem = studioProblem(crop("a"));
    const removed = [{ problem, index: 0, pageExcluded: true }];
    expect(
      reconcileStudioPageCart([], removed, [
        { sourceId: "other", page: 1, out: false },
      ]).removed,
    ).toBe(removed);
  });
});

describe("studioCartState — 작업실 한 문항이 시험지에서 어떤 상태인가", () => {
  const a = crop("a");
  it("시험지에 없으면 «안 담음», 뺀 기억이 있으면 «뺌»", () => {
    expect(studioCartState(a, [], [])).toBe("pending");
    expect(
      studioCartState(a, [], [{ problem: studioProblem(a), index: 0 }]),
    ).toBe("removed");
  });
  it("시험지에 같은 판이 있으면 «담음», 판이 다르면 «고친 뒤 반영 전»", () => {
    expect(studioCartState(a, [studioProblem(a)], [])).toBe("picked");
    const edited = applyStudioCropEdit(a, { answer: "3" });
    expect(studioCartState(edited, [studioProblem(a)], [])).toBe("stale");
    // 반영하면(같은 id 를 새 판으로 갈면) 다시 «담음».
    expect(studioCartState(edited, [studioProblem(edited)], [])).toBe("picked");
  });
  it("검수 완료는 내용이 아니라 상태다 — 눌러도 «담음» 그대로 (어긋남 3)", () => {
    const reviewed = applyStudioCropEdit(a, { reviewed: true });
    expect(reviewed.reviewed).toBe(true);
    expect(studioCartState(reviewed, [studioProblem(a)], [])).toBe("picked");
    const undone = applyStudioCropEdit(reviewed, { reviewed: false });
    expect(studioCartState(undone, [studioProblem(a)], [])).toBe("picked");
  });
  it("시험지에 있으면 뺀 기억보다 시험지가 이긴다", () => {
    expect(
      studioCartState(
        a,
        [studioProblem(a)],
        [{ problem: studioProblem(a), index: 0 }],
      ),
    ).toBe("picked");
  });
});

describe("studioCartPending — «N문항 담기»·«담고 내보내기»가 담을 것", () => {
  it("안 담은 것만 — 담은 것·고친 뒤 반영 전·뺀 것은 건너뛴다 (공통 ②)", () => {
    const [a, b, c, d] = ["a", "b", "c", "d"].map((id) => crop(id));
    const picked = [studioProblem(a), studioProblem(b)];
    const staleB = applyStudioCropEdit(b, { answer: "1" });
    const removed: StudioCartRemoval[] = [
      { problem: studioProblem(c), index: 2 },
    ];
    expect(
      studioCartPending([a, staleB, c, d], picked, removed).map(
        (item) => item.id,
      ),
    ).toEqual(["d"]);
  });
  it("새 시험지(목록·기억이 빔)면 전부 다시 담을 수 있다 (어긋남 2)", () => {
    const crops = [crop("a"), crop("b")];
    expect(studioCartPending(crops, [], []).map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("장부 고치기 — 담기·빼기·되돌리기", () => {
  it("담기는 같은 id 를 제자리에서 갈고 새것은 뒤에 붙인다 · 출제 불가는 거른다", () => {
    const a = crop("a");
    const edited = applyStudioCropEdit(a, { answer: "7" });
    const next = addToCart(
      [studioProblem(a), bank("b")],
      [
        studioProblem(edited),
        studioProblem(crop("c")),
        { ...bank("x"), eligible: false },
      ],
    );
    expect(next.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(next[0].answer).toBe("7");
  });
  it("뺀 기억은 같은 id 를 한 번만 두고, 다시 담으면 풀린다", () => {
    const p = bank("b");
    let removed = rememberRemoval([], p, 1);
    removed = rememberRemoval(removed, p, 3);
    expect(removed).toEqual([{ problem: p, index: 3 }]);
    expect(forgetRemovals(removed, ["b"])).toEqual([]);
    expect(forgetRemovals(removed, ["zz"])).toBe(removed);
  });
  it("되돌리기는 뺀 자리로 — 목록이 줄었으면 끝에", () => {
    const [a, b, c] = [bank("a"), bank("b"), bank("c")];
    expect(restoreToCart([a, c], b, 1).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(restoreToCart([a], c, 5).map((item) => item.id)).toEqual(["a", "c"]);
    // 이미 있으면 그대로.
    const list = [a, b];
    expect(restoreToCart(list, b, 0)).toBe(list);
  });
});

describe("studioCartRows — 목록 줄", () => {
  it("담긴 것은 시험지 차례대로 번호, 뺀 것은 뺀 자리에 흐리게(번호 없음)", () => {
    const [a, b, c, d] = ["a", "b", "c", "d"].map(bank);
    const rows = studioCartRows(
      [a, c],
      [
        { problem: b, index: 1 },
        { problem: d, index: 9 },
      ],
    );
    expect(
      rows.map((row) => [row.problem.id, row.removed, row.order ?? null]),
    ).toEqual([
      ["a", false, 1],
      ["b", true, null],
      ["c", false, 2],
      ["d", true, null],
    ]);
  });
});

describe("studioCartLabel — 카드·② 목록 배지가 같은 글자를 쓴다", () => {
  it("담음 · 반영 전 · 뺌, 안 담은 것은 글자 없음", () => {
    expect(studioCartLabel("picked")).toBe("담음");
    // 원장님 2026-09-21 확정 — 카드 바닥에서 «반영» 단추가 둘째 줄로 꺾이지 않게 짧게(트랙 47).
    expect(studioCartLabel("stale")).toBe("반영 전");
    expect(studioCartLabel("removed")).toBe("뺌");
    expect(studioCartLabel("pending")).toBeNull();
  });
  it("긴 뜻은 읽는 이름·마우스 올림에 — 짧게 줄인 «반영 전»만 다르다", () => {
    expect(studioCartMeaning("stale")).toBe("담음 · 고친 내용 반영 전");
    expect(studioCartMeaning("picked")).toBe("담음");
    expect(studioCartMeaning("removed")).toBe("뺌");
    expect(studioCartMeaning("pending")).toBeNull();
  });
});

describe("studioCartAddLabel — 바닥 «담기» 단추 글자", () => {
  const [a, b, c] = ["a", "b", "c"].map((id) => crop(id));
  it("담을 것이 있으면 «N문항 담기», 자른 것이 없으면 «시험지에 담기»", () => {
    expect(studioCartAddLabel([a, b], [studioProblem(a)], [])).toBe(
      "1문항 담기",
    );
    expect(studioCartAddLabel([], [], [])).toBe("시험지에 담기");
  });
  it("다 담겼으면 «모두 담았습니다» — 고친 뒤 반영 전인 것도 시험지에 있으니 «모두»", () => {
    const staleB = applyStudioCropEdit(b, { answer: "9" });
    expect(
      studioCartAddLabel([a, staleB], [studioProblem(a), studioProblem(b)], []),
    ).toBe("모두 담았습니다");
  });
  it("뺀 것이 남았으면 «담을 문항 없음» — 일부러 건너뛴 것이 있어 «모두»가 틀린 말이다", () => {
    const removed: StudioCartRemoval[] = [
      { problem: studioProblem(c), index: 2 },
    ];
    // 나머지는 다 담겼고 뺀 것 하나만 남았다.
    expect(
      studioCartAddLabel(
        [a, b, c],
        [studioProblem(a), studioProblem(b)],
        removed,
      ),
    ).toBe("담을 문항 없음");
    // 전부 뺐다.
    expect(
      studioCartAddLabel([c], [], [{ problem: studioProblem(c), index: 0 }]),
    ).toBe("담을 문항 없음");
    // 다른 원본에서 뺀 기억은 이 원본의 단추 글자와 상관없다.
    expect(
      studioCartAddLabel(
        [a],
        [studioProblem(a)],
        [{ problem: bank("elsewhere"), index: 1 }],
      ),
    ).toBe("모두 담았습니다");
  });
});

describe("onlySolutionChanged — 해설 자동 반영의 문", () => {
  const base = studioProblem(crop("x")).studioCrop!;
  it("해설·답·판 번호만 바뀌면 참", () => {
    expect(
      onlySolutionChanged(base, {
        ...base,
        added: false,
        solution: "새 해설",
        answer: "3",
        revision: 1,
        reviewed: false,
        aiWarnings: ["경고"],
      }),
    ).toBe(true);
  });
  it("본문이 바뀌었으면 거짓 — «반영»을 눌러야 한다", () => {
    expect(
      onlySolutionChanged(base, {
        ...base,
        content: "고친 본문",
        solution: "새 해설",
        revision: 1,
      }),
    ).toBe(false);
  });
});
