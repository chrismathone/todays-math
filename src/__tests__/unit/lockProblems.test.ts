/**
 * 출제에서 빼기(잠금)의 판단 — DB 없이 시험한다.
 *
 * 잠금은 지우는 것이 아니다. 한 칸(`directUseAllowed`)만 내리고, 되돌릴 때는 «내가 내린 것»만 올린다.
 * 지킬 것은 넷이다: 이미 내려간 행을 원장에 «내가 내렸다»고 적지 않는다 · 없는 행을 조용히 넘기지 않는다 ·
 * 되돌릴 때 남이 올린 행을 건드리지 않는다 · 같은 행을 두 번 적지 않는다.
 */
import { describe, expect, it } from "vitest";

import { planLock, planUnlock } from "../../../scripts/qa/lockProblemsCore";

const row = (externalId: string, directUseAllowed: boolean) => ({
  id: `id-${externalId}`,
  externalId,
  directUseAllowed,
});

describe("planLock", () => {
  it("출제 허용인 행만 잠근다 — 이미 내려간 행은 원장에 넣지 않는다", () => {
    const plan = planLock(
      ["a", "b"],
      [row("a", true), row("b", false)],
      "수치가 서로 맞지 않는다",
    );
    expect(plan.lock.map((r) => r.externalId)).toEqual(["a"]);
    expect(plan.lock[0]).toMatchObject({
      problemId: "id-a",
      before: true,
      reason: "수치가 서로 맞지 않는다",
    });
    expect(plan.already).toEqual(["b"]);
    expect(plan.missing).toEqual([]);
  });

  it("DB 에 없는 행은 «없다»로 따로 낸다 — 조용히 넘기면 «잠갔다»가 거짓말이 된다", () => {
    const plan = planLock(["a", "ghost"], [row("a", true)], "사유");
    expect(plan.missing).toEqual(["ghost"]);
    expect(plan.lock).toHaveLength(1);
  });

  it("같은 행을 두 번 적어도 한 번만 잠근다", () => {
    const plan = planLock(["a", "a"], [row("a", true)], "사유");
    expect(plan.lock).toHaveLength(1);
  });

  it("사유가 비면 던진다 — 까닭 없는 잠금은 되살릴 근거도 없다", () => {
    expect(() => planLock(["a"], [row("a", true)], "  ")).toThrow(/사유/);
  });
});

describe("planUnlock", () => {
  const ledger = [
    { problemId: "id-a", externalId: "a", before: true, reason: "사유" },
    { problemId: "id-b", externalId: "b", before: true, reason: "사유" },
  ];

  it("지금도 내려가 있는 행만 올린다 — 그 사이 누가 올린 행은 건너뛴다", () => {
    const plan = planUnlock(ledger, [row("a", false), row("b", true)]);
    expect(plan.unlock.map((r) => r.externalId)).toEqual(["a"]);
    expect(plan.skipped).toEqual(["b"]);
  });

  it("행이 사라졌으면 건너뛴 쪽에 적는다", () => {
    const plan = planUnlock(ledger, [row("a", false)]);
    expect(plan.unlock).toHaveLength(1);
    expect(plan.skipped).toEqual(["b"]);
  });
});
