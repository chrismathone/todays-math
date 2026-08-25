/**
 * 반 진도가 없을 때 **차시이동이 살아 있는가** (원장님 지적 2026-08-25 「차시이동이
 * 작동하지 않음」).
 *
 * 🔴 급소 둘:
 *  ⑴ 제안이 **없을 수도 있다**(학생 진도가 하나도 없으면). 그때 지어내면 안 된다.
 *  ⑵ 같은 수로 갈리면 **뒤처진 쪽**을 고른다. 앞선 자리를 제안했다가 원장님이
 *     그대로 기록하면 뒤처진 학생이 못 푸는 시험지가 나간다 — 되돌리기 쉬운 쪽으로.
 */
import { describe, expect, it } from "vitest";

import {
  suggestStartUnit,
  type LatestRow,
} from "@/lib/progress/suggestStartUnit";

const UNITS = [
  { id: "u1", orderIndex: 10 },
  { id: "u2", orderIndex: 20 },
  { id: "u3", orderIndex: 30 },
];

/** 최신순으로 이미 정렬된 입력 — 라우트의 `orderBy` 와 같은 약속. */
const rows = (...pairs: Array<[string, string]>): LatestRow[] =>
  pairs.map(([studentId, unitId]) => ({ studentId, unitId }));

describe("[진도] 시작점 제안", () => {
  it("가장 많은 학생이 있는 차시를 고른다", () => {
    const got = suggestStartUnit(
      rows(["s1", "u3"], ["s2", "u3"], ["s3", "u1"]),
      UNITS,
    );
    expect(got).toEqual({ unitId: "u3", agree: 2, students: 3 });
  });

  it("🔴 같은 수면 **뒤처진 쪽**을 고른다 — 앞선 자리를 기록하면 못 푸는 시험지가 된다", () => {
    expect(
      suggestStartUnit(rows(["s1", "u3"], ["s2", "u1"]), UNITS).unitId,
    ).toBe("u1");
  });

  it("🔴 학생 진도가 하나도 없으면 **제안하지 않는다** — 지어내면 안 된다", () => {
    expect(suggestStartUnit([], UNITS)).toEqual({
      unitId: null,
      agree: 0,
      students: 0,
    });
  });

  it("한 학생의 이력이 여럿이어도 **최신 하나**만 센다", () => {
    // 최신순이므로 u3 가 먼저 온다 — 뒤의 u1 은 옛 이력이다.
    const got = suggestStartUnit(rows(["s1", "u3"], ["s1", "u1"]), UNITS);
    expect(got).toEqual({ unitId: "u3", agree: 1, students: 1 });
  });

  it("반 진도 행(studentId=null)은 세지 않는다 — 그건 «반 진도가 없다»의 전제다", () => {
    const got = suggestStartUnit(
      [{ studentId: null, unitId: "u2" }, ...rows(["s1", "u1"])],
      UNITS,
    );
    expect(got).toEqual({ unitId: "u1", agree: 1, students: 1 });
  });

  it("순서를 모르는 단원은 동점에서 **뒤로 민다** — 모르는 것을 «앞선다»고 단정하지 않는다", () => {
    const got = suggestStartUnit(rows(["s1", "몰라"], ["s2", "u2"]), UNITS);
    expect(got.unitId).toBe("u2");
  });
});
