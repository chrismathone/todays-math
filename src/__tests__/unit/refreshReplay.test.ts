// @vitest-environment node
/**
 * 계획 밖 승인 행 되만들기(`scripts/qa/refreshReplay.ts` · D-164 3회차) — 적재기와 **글자까지 같은 행**을 내는가,
 * 그리고 되만든 객관식이 보기 다섯까지 맞아야 지나가는가(`choicesRisk`).
 */
import { describe, expect, it } from "vitest";

import { buildElemRows } from "../../../scripts/import/load-engine-problems";
import { choicesRisk } from "../../../scripts/qa/refreshEngineContentCore";
import { pinnedElemRow, replayRequestedIds, replayRows } from "../../../scripts/qa/refreshReplay";

const quiet = <T,>(f: () => T): T => {
  const log = console.log;
  console.log = () => {};
  try {
    return f();
  } finally {
    console.log = log;
  }
};

/** 한 문항류의 적재기 출력 — 변형 번호(남은 변형 가운데 몇째)를 단답의 차례로 붙인다. */
function planRows(target: Parameters<typeof buildElemRows>[0], seedBase: number) {
  const rows = quiet(() => buildElemRows(target, seedBase));
  const order = new Map<string, number>();
  for (const r of rows) if (!order.has(r.variantKey)) order.set(r.variantKey, order.size);
  return rows.map((r) => ({ row: r, variant: order.get(r.variantKey)! }));
}

describe("pinnedElemRow — 씨앗 · 변형 번호를 고정해도 적재기와 같은 행", () => {
  it("파생 객관식(보기 섞기 씨앗이 변형 번호에 묶인 문형) · 단답", () => {
    const got = planRows({ engine: "elem", grade: "초3", chapter: "1-1 덧셈과 뺄셈", sections: ["1-1-1 받아올림이 없는, 한 번 있는 (세 자리 수)+(세 자리 수)"], formIds: ["07"], perTier: 4 }, 20260827);
    expect(got.some((g) => g.row.questionType === "객관식")).toBe(true);
    for (const { row, variant } of got) expect(pinnedElemRow(row.externalId, variant)).toEqual(row);
  });

  it("처음부터 보기가 있는 객관식 문형(초5 2-1-1 f21)", () => {
    const got = planRows({ engine: "elem", grade: "초5", chapter: "2-1 수의 범위와 어림하기", sections: ["2-1-1 이상과 이하 알아보기"], formIds: ["21"], perTier: 3 }, 20261118);
    expect(got.length).toBeGreaterThan(0);
    for (const { row, variant } of got) expect(pinnedElemRow(row.externalId, variant)).toEqual(row);
  });

  it("변형 번호를 0 으로 눌러 버리면(«perTier: 1» 꼼수) 둘째 변형부터 보기가 달라진다 — 번호가 실제로 뜻을 가진다", () => {
    const got = planRows({ engine: "elem", grade: "초3", chapter: "1-1 덧셈과 뺄셈", sections: ["1-1-1 받아올림이 없는, 한 번 있는 (세 자리 수)+(세 자리 수)"], formIds: ["07"], perTier: 4 }, 20260827);
    const mcq = got.filter((g) => g.row.questionType === "객관식" && g.variant > 0);
    expect(mcq.length).toBeGreaterThan(0);
    expect(mcq.some(({ row }) => pinnedElemRow(row.externalId, 0).content !== row.content)).toBe(true);
  });
});

describe("replayRows — 승인된 계획에서 승인된 열쇠만", () => {
  it("고른 열쇠만 내고, 계획이 안 내는 열쇠는 까닭과 함께 못 되만듦으로", () => {
    const target = { engine: "elem" as const, grade: "초3", chapter: "1-1 덧셈과 뺄셈", sections: ["1-1-1 받아올림이 없는, 한 번 있는 (세 자리 수)+(세 자리 수)"], formIds: ["07"], perTier: 3 };
    const all = quiet(() => buildElemRows(target, 20260827));
    const pick = [all[0]!.externalId, all[all.length - 1]!.externalId];
    const ghost = all[0]!.externalId.replace(/\|s\d+$/, "|s1");
    const { made, missing } = replayRows({ version: 1, label: "t", entries: [{ kind: "plan", source: "시험", plan: { seedBase: 20260827, targets: [target] }, selectedExternalIds: [...pick, ghost] }] });
    expect([...made.keys()].sort()).toEqual([...pick].sort());
    expect(made.get(pick[0]!)).toMatchObject({ ...all[0], replaySource: "시험" });
    expect(missing.map((m) => m.externalId)).toEqual([ghost]);
  });

  it("요청 열쇠 전부 — 되만들었든 못 했든(계획과의 겹침을 이것으로 본다)", () => {
    expect(replayRequestedIds({ version: 1, label: "t", entries: [{ kind: "plan", source: "a", plan: { seedBase: 1, targets: [] }, selectedExternalIds: ["x", "y"] }, { kind: "pinned", source: "b", externalId: "z", variant: 0 }] })).toEqual(["x", "y", "z"]);
  });

  it("같은 열쇠가 목록에 둘이면 멈춘다", () => {
    const row = quiet(() => buildElemRows({ engine: "elem", grade: "초3", chapter: "1-1 덧셈과 뺄셈", sections: ["1-1-1 받아올림이 없는, 한 번 있는 (세 자리 수)+(세 자리 수)"], formIds: ["07"], perTier: 1 }, 20260827))[0]!;
    expect(() => replayRows({ version: 1, label: "t", entries: [{ kind: "pinned", source: "a", externalId: row.externalId, variant: 0 }, { kind: "pinned", source: "b", externalId: row.externalId, variant: 0 }] })).toThrow(/같은 열쇠가 둘/);
  });
});

describe("choicesRisk — 보기 다섯을 하나하나", () => {
  const db = { content: "몇 개입니까?\n① $3$개\n② $4$개\n③ $5$개\n④ $6$개\n⑤ $7$개", answer: "②", solution: "" };
  it("같으면 null · 띄어쓰기 · 조사만 다르면 null", () => {
    expect(choicesRisk(db, { ...db })).toBeNull();
    expect(choicesRisk(db, { ...db, content: db.content.replace("$3$개", "$3$ 개") })).toBeNull();
  });
  it("오답 보기 하나가 다르거나, 차례가 바뀌었거나, 정답 번호가 다르면 «보기»", () => {
    expect(choicesRisk(db, { ...db, content: db.content.replace("$7$개", "$8$개") })).toBe("보기");
    expect(choicesRisk(db, { ...db, content: "몇 개입니까?\n① $4$개\n② $3$개\n③ $5$개\n④ $6$개\n⑤ $7$개" })).toBe("보기");
    expect(choicesRisk(db, { ...db, answer: "③" })).toBe("보기");
  });
  it("수의 자리 · 차례가 바뀐 오답 보기도 «보기» — 정렬 · 수 지우기로 견주지 않는다", () => {
    const sub = { content: "식은?\n① $3-2$\n② $5-1$\n③ $4-2$\n④ $6-3$\n⑤ $7-4$", answer: "②", solution: "" };
    expect(choicesRisk(sub, { ...sub, content: sub.content.replace("$3-2$", "$2-3$") })).toBe("보기");
    const frac = { content: "분수는?\n① $\\frac{2}{3}$\n② $\\frac{1}{4}$\n③ $\\frac{3}{5}$\n④ $\\frac{1}{2}$\n⑤ $\\frac{5}{6}$", answer: "④", solution: "" };
    expect(choicesRisk(frac, { ...frac, content: frac.content.replace("\\frac{2}{3}", "\\frac{3}{2}") })).toBe("보기");
  });
  it("단답은 보기가 없어 null(정답의 값은 identityRisk 가 본다)", () => {
    expect(choicesRisk({ content: "몇 개입니까?", answer: "$4$", solution: "" }, { content: "몇 개입니까?", answer: "$4$", solution: "" })).toBeNull();
  });
});
