// @vitest-environment node
/**
 * 행 고침 묶음(`scripts/qa/rowRepairsCore.ts` · `apply-row-repairs.ts`) — 쓰는 순간 «앞» 값일 때만 쓰는가(D-164 §4 · Codex H).
 */
import { describe, expect, it } from "vitest";

import {
  casWhere,
  classifyRow,
  unwrittenRows,
  validateRepairRows,
  writeRowsCas,
  type Fields,
  type RepairRow,
} from "../../../scripts/qa/rowRepairsCore";

const ID = "fe14180e-f327-441b-a8ca-e70c45e32aa5";
const ID2 = "833f329d-e537-4ba5-aafe-68002f1c5b45";
const lock = (id = ID): RepairRow => ({ id, code: "E1", reasons: ["잠금"], before: { directUseAllowed: true }, after: { directUseAllowed: false } });
const text = (id = ID2): RepairRow => ({
  id,
  code: "T1",
  reasons: ["글"],
  before: { content: "오른쪽 그림", solution: null, figureUrls: ["a.png"] },
  after: { content: "다음 그림", solution: "풀이", figureUrls: ["a.png"] },
});

/** 칸 전부가 조건과 같을 때만 고치는 가짜 DB. */
function fakeDb(rows: Record<string, Fields & { other?: string }>) {
  return {
    rows,
    problem: {
      async updateMany({ where, data }: { where: Record<string, unknown>; data: Fields }) {
        const now = rows[where.id as string];
        if (!now) return { count: 0 };
        for (const [k, v] of Object.entries(where)) {
          if (k === "id") continue;
          const want = v && typeof v === "object" && !Array.isArray(v) && "equals" in v ? (v as { equals: unknown }).equals : v;
          if (JSON.stringify((now as Record<string, unknown>)[k] ?? null) !== JSON.stringify(want ?? null)) return { count: 0 };
        }
        Object.assign(now, data);
        return { count: 1 };
      },
    },
  };
}

describe("validateRepairRows — 쓰기 전에 묶음의 꼴", () => {
  it("맞는 묶음은 그대로", () => {
    expect(validateRepairRows([lock(), text()])).toHaveLength(2);
  });
  it("앞뒤 칸이 다르거나 · 모르는 칸 · 같은 id · 앞=뒤 · 빈 묶음은 던진다", () => {
    expect(() => validateRepairRows([])).toThrow(/비었/);
    expect(() => validateRepairRows([{ ...lock(), after: { content: "x" } }])).toThrow(/칸이 다르다/);
    expect(() => validateRepairRows([{ ...lock(), before: { figureSvg: "a" }, after: { figureSvg: "b" } }])).toThrow(/모르는 칸/);
    expect(() => validateRepairRows([lock(), lock()])).toThrow(/같은 id/);
    expect(() => validateRepairRows([{ ...lock(), after: { directUseAllowed: true } }])).toThrow(/앞과 뒤가 같다/);
    expect(() => validateRepairRows([{ ...lock(), id: "x" }])).toThrow(/uuid/);
  });
  it("칸마다 자료형 — 연산자 객체(«{ set }») · 문자열 아닌 본문 · 불 아닌 출제 허용은 던진다", () => {
    expect(() => validateRepairRows([{ ...text(), after: { ...text().after, content: { set: "x" } } }])).toThrow(/자료형/);
    expect(() => validateRepairRows([{ ...lock(), after: { directUseAllowed: "false" } }])).toThrow(/자료형/);
  });
  it("그림 주소는 바꾸지 않는다 — 대조용(앞뒤 같음)으로만", () => {
    expect(() => validateRepairRows([{ ...text(), after: { ...text().after, figureUrls: ["b.png"] } }])).toThrow(/그림 주소/);
    expect(validateRepairRows([text()])).toHaveLength(1);
  });
});

describe("classifyRow — 지금 값이 묶음의 어느 쪽인가", () => {
  it("앞 · 뒤 · 어긋남 · 없음, 되돌림은 거꾸로", () => {
    expect(classifyRow({ directUseAllowed: true }, lock(), "apply")).toBe("ready");
    expect(classifyRow({ directUseAllowed: false }, lock(), "apply")).toBe("done");
    expect(classifyRow(undefined, lock(), "apply")).toBe("missing");
    expect(classifyRow({ content: "남이 고침", solution: null, figureUrls: ["a.png"] }, text(), "apply")).toBe("drift");
    expect(classifyRow({ directUseAllowed: false }, lock(), "revert")).toBe("ready");
  });
  it("배열 칸은 차례까지 본다", () => {
    expect(classifyRow({ content: "오른쪽 그림", solution: null, figureUrls: ["a.png"] }, text(), "apply")).toBe("ready");
    expect(classifyRow({ content: "다음 그림", solution: "풀이", figureUrls: ["b.png", "a.png"] }, text(), "apply")).toBe("drift");
  });
  it("unwrittenRows — 되읽은 값이 «뒤»가 아닌 행", () => {
    const back = new Map<string, Fields>([[ID, { directUseAllowed: false }], [ID2, { content: "다음 그림", solution: null, figureUrls: ["a.png"] }]]);
    expect(unwrittenRows(back, [lock(), text()], "apply").map((r) => r.code)).toEqual(["T1"]);
    expect(unwrittenRows(new Map(), [lock()], "apply")).toHaveLength(1);
  });
});

describe("casWhere · writeRowsCas — 쓰는 순간 칸 전부가 «앞»일 때만", () => {
  it("조건은 바꾸는 칸 전부(배열은 equals · null 그대로)", () => {
    expect(casWhere(ID2, text().before)).toEqual({ id: ID2, content: "오른쪽 그림", figureUrls: { equals: ["a.png"] }, solution: null });
  });
  it("앞 값이면 쓰고 쓴 수를 돌려준다 · 바꾸지 않는 칸은 그대로", async () => {
    const db = fakeDb({ [ID]: { directUseAllowed: true, other: "그대로" }, [ID2]: { content: "오른쪽 그림", solution: null, figureUrls: ["a.png"] } });
    await expect(writeRowsCas(db, [lock(), text()], "apply")).resolves.toBe(2);
    expect(db.rows[ID]).toEqual({ directUseAllowed: false, other: "그대로" });
    expect(db.rows[ID2]).toEqual(text().after);
  });
  it("그 사이 한 칸이라도 바뀌었으면 던진다(거래가 되돌린다)", async () => {
    const db = fakeDb({ [ID]: { directUseAllowed: true }, [ID2]: { content: "오른쪽 그림", solution: "남이 쓴 풀이", figureUrls: ["a.png"] } });
    await expect(writeRowsCas(db, [lock(), text()], "apply")).rejects.toThrow(/CAS_MISMATCH T1/);
  });
  it("되돌림도 같은 검사 — 쓴 값일 때만 처음 값으로", async () => {
    const db = fakeDb({ [ID]: { directUseAllowed: false } });
    await expect(writeRowsCas(db, [lock()], "revert")).resolves.toBe(1);
    expect(db.rows[ID]!.directUseAllowed).toBe(true);
    await expect(writeRowsCas(db, [lock()], "revert")).rejects.toThrow(/CAS_MISMATCH/);
  });
});
