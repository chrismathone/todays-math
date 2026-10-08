/**
 * 교과서 이관 — 실린 문항을 계획에 맞출 때 «무엇을 고치고 무엇을 건드리지 않나».
 *
 * 🔴 지키는 것: **사람이 문제은행에서 고친 문항을 적재기가 덮어쓰지 않는다.**
 *    원장님이 잠긴 문항을 직접 검수하신다(2026-10-08). 문항 수정 API 는 기록을 남기지 않으므로,
 *    적재기가 «내가 마지막으로 쓴 값»의 지문을 쥐고 있다가 DB 가 그 값이 아니면 손대지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  fingerprintOf,
  planRefresh,
  type RefreshColumns,
} from "@/lib/import/schoolTextbook/refreshPlan";

const base: RefreshColumns = {
  content: "$x+1=3$일 때, $x$의 값을 구하시오.",
  answer: "$2$",
  solution: "$x=3-1=2$이다.",
  solutionSource: "original",
  directUseAllowed: false,
};
const saved = (externalId: string, over: Partial<RefreshColumns> = {}) => ({
  id: `id-${externalId}`,
  externalId,
  ...base,
  ...over,
});
const want = (over: Partial<RefreshColumns> = {}, hold: string[] = []) => ({
  ...base,
  ...over,
  directUseAllowed: hold.length === 0,
  hold,
});

describe("planRefresh", () => {
  it("적재기가 쓴 그대로인 문항은 계획에 맞춘다", () => {
    const row = saved("tb-1");
    const result = planRefresh(
      [row],
      new Map([["tb-1", want({ content: "고친 본문" })]]),
      new Map([["tb-1", fingerprintOf(row)]]),
    );
    expect(result.foreign).toEqual([]);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      id: "id-tb-1",
      externalId: "tb-1",
      before: { content: base.content, directUseAllowed: false },
      after: { content: "고친 본문", directUseAllowed: true },
    });
  });

  it("🔴 사람이 고친 문항은 건드리지 않고 이름을 댄다", () => {
    const written = fingerprintOf(saved("tb-1"));
    // 원장님이 문제은행에서 본문을 고쳤다
    const edited = saved("tb-1", { content: "원장님이 고친 본문" });
    const result = planRefresh(
      [edited],
      new Map([["tb-1", want({ content: "적재기가 쓰려는 본문" })]]),
      new Map([["tb-1", written]]),
    );
    expect(result.changes).toEqual([]);
    expect(result.foreign).toEqual(["tb-1"]);
  });

  it("잠금만 사람이 푼 문항도 사람이 만진 것이다", () => {
    const written = fingerprintOf(saved("tb-1"));
    const released = saved("tb-1", { directUseAllowed: true });
    const result = planRefresh(
      [released],
      new Map([["tb-1", want({}, ["지면 검토: 보기가 겹친다"])]]),
      new Map([["tb-1", written]]),
    );
    expect(result.changes).toEqual([]);
    expect(result.foreign).toEqual(["tb-1"]);
  });

  it("지문이 없는 문항은 누가 썼는지 모른다 — 건드리지 않는다", () => {
    const result = planRefresh(
      [saved("tb-1")],
      new Map([["tb-1", want({ content: "고친 본문" })]]),
      new Map(),
    );
    expect(result.changes).toEqual([]);
    expect(result.foreign).toEqual(["tb-1"]);
  });

  it("이미 계획과 같은 문항은 지문이 없어도 말하지 않는다", () => {
    const result = planRefresh(
      [saved("tb-1")],
      new Map([["tb-1", want({}, ["지면 검토를 아직 받지 않았다"])]]),
      new Map(),
    );
    expect(result.changes).toEqual([]);
    expect(result.foreign).toEqual([]);
  });

  it("계획에서 빠진 문항은 지우지 않고 잠근다 — 사람이 만진 것이면 그것도 두고", () => {
    const open = saved("tb-1", { directUseAllowed: true });
    const mine = planRefresh(
      [open],
      new Map(),
      new Map([["tb-1", fingerprintOf(open)]]),
    );
    expect(mine.changes[0]).toMatchObject({
      before: { directUseAllowed: true },
      after: { content: base.content, directUseAllowed: false },
      hold: ["지금의 계획에 없다 — 검토가 뒤집혔다"],
    });
    const touched = planRefresh(
      [open],
      new Map(),
      new Map([["tb-1", fingerprintOf(saved("tb-1"))]]),
    );
    expect(touched.changes).toEqual([]);
    expect(touched.foreign).toEqual(["tb-1"]);
  });

  it("지문은 다섯 칸의 글자가 다 같을 때만 같다", () => {
    const fingerprint = fingerprintOf(base);
    expect(fingerprintOf({ ...base })).toBe(fingerprint);
    for (const over of [
      { content: `${base.content} ` },
      { answer: "$3$" },
      { solution: null },
      { solutionSource: "ai" as const },
      { directUseAllowed: true },
    ])
      expect(fingerprintOf({ ...base, ...over })).not.toBe(fingerprint);
  });
});
