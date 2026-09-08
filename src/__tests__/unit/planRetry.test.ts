/**
 * 🟢 **오답 복습 계획** — 「틀린 문항 → 같은 유형의 다른 문항」.
 *
 * ## 왜 이 함수가 따로 있나
 *
 * 출제(`selectProblems`)는 «범위에서 고루»가 목적이고, 이쪽은 «틀린 그 유형»이
 * 목적이다. 규칙이 정반대인 자리가 하나 있다 — **D-20(최근 14일 중복 제외)**.
 * 출제에서 그것은 「같은 문제가 우연히 또 나오는 것」을 막는 규칙인데, 복습은
 * **일부러** 그 유형을 다시 낸다. 한 함수에 두 뜻을 담으면 한쪽이 반드시 진다.
 *
 * ## 이 시험이 지키는 것
 *
 * 이 저장소가 반복해서 낸 결함 둘을 여기서 미리 막는다:
 *  · **조용히 0줄** — 오답보다 요청이 많으면 부족을 «찍어야» 한다. 안 찍으면
 *    「복습지를 냈다」가 되면서 실제로는 빈 종이가 나간다.
 *  · **«없다»와 «못 냈다»의 혼동** — 형제가 없는 갈래(실측 15건)는 원문을 그대로
 *    다시 내고 그 사실을 이유로 남긴다. 조용히 빼면 그 유형은 영영 복습이 안 된다.
 */
import { describe, expect, it } from "vitest";

import { planRetry, type RetryCandidate } from "@/lib/generator/planRetry";

const p = (
  id: string,
  unitId: string,
  familyKey: string | null,
  difficulty: RetryCandidate["difficulty"] = "기본",
): RetryCandidate => ({
  id,
  unitId,
  familyKey,
  difficulty,
  directUseAllowed: true,
});

describe("오답 복습 계획 — 같은 갈래의 다른 문항", () => {
  it("틀린 문항과 **같은 갈래의 다른 문항**을 낸다", () => {
    const wrong = [p("w1", "U1", "일차방정식-이항")];
    const pool = [
      p("w1", "U1", "일차방정식-이항"),
      p("s1", "U1", "일차방정식-이항"),
      p("x1", "U1", "다른유형"),
      p("y1", "U2", "일차방정식-이항"), // 단원이 다르면 **다른 갈래**다
    ];

    const r = planRetry({ wrong, pool, count: 1, seed: "t1" });

    expect(r.picked).toHaveLength(1);
    expect(r.picked[0]!.problem.id).toBe("s1");
    expect(r.picked[0]!.origin).toBe("형제");
  });

  it("🔴 **단원이 다르면 같은 키라도 형제가 아니다** — 그 문항을 뽑으면 안 된다", () => {
    const wrong = [p("w1", "U1", "일차방정식-이항")];
    // 같은 키인데 단원만 다른 문항 하나뿐 — 형제가 «없는» 상태다.
    const pool = [
      p("w1", "U1", "일차방정식-이항"),
      p("y1", "U2", "일차방정식-이항"),
    ];

    const r = planRetry({ wrong, pool, count: 1, seed: "t1" });

    expect(r.picked[0]!.problem.id).toBe("w1");
    expect(r.picked[0]!.origin).toBe("원문");
  });

  it("형제가 없으면 **원문을 그대로** 다시 내고 이유를 남긴다", () => {
    const wrong = [p("w1", "U1", "혼자뿐인유형")];
    const pool = [p("w1", "U1", "혼자뿐인유형")];

    const r = planRetry({ wrong, pool, count: 1, seed: "t1" });

    expect(r.picked).toHaveLength(1);
    expect(r.picked[0]!.problem.id).toBe("w1");
    expect(r.picked[0]!.origin).toBe("원문");
    expect(r.picked[0]!.wrongProblemId).toBe("w1");
  });

  it("`familyKey` 가 없는 문항도 **혼자 한 갈래**다 — 남의 형제를 데려오지 않는다", () => {
    const wrong = [p("w1", "U1", null)];
    const pool = [p("w1", "U1", null), p("other", "U1", null)];

    const r = planRetry({ wrong, pool, count: 1, seed: "t1" });

    // 둘 다 키가 없다고 한 무리로 접으면 `other` 가 나온다 — D-105 위반.
    expect(r.picked[0]!.problem.id).toBe("w1");
    expect(r.picked[0]!.origin).toBe("원문");
  });
});

describe("한 갈래는 한 번만", () => {
  it("같은 갈래를 두 문항 틀리면 **한 자리로 접고** 접힌 수를 찍는다", () => {
    const wrong = [p("w1", "U1", "F"), p("w2", "U1", "F")];
    const pool = [p("w1", "U1", "F"), p("w2", "U1", "F"), p("s1", "U1", "F")];

    const r = planRetry({ wrong, pool, count: 5, seed: "t1" });

    expect(r.picked).toHaveLength(1);
    expect(r.foldedWrong).toBe(1);
  });

  it("**한 복습지에 같은 갈래가 둘 나오지 않는다**", () => {
    const wrong = [p("w1", "U1", "F"), p("w2", "U1", "G")];
    const pool = [
      p("w1", "U1", "F"),
      p("w2", "U1", "G"),
      p("s1", "U1", "F"),
      p("s2", "U1", "G"),
    ];

    const r = planRetry({ wrong, pool, count: 5, seed: "t1" });

    const families = r.picked.map(
      (x) => `${x.problem.unitId}|${x.problem.familyKey}`,
    );
    expect(new Set(families).size).toBe(families.length);
  });
});

describe("🔴 부족을 조용히 넘기지 않는다", () => {
  it("요청보다 오답 갈래가 적으면 **있는 만큼 내고 부족을 찍는다**", () => {
    const wrong = [p("w1", "U1", "F")];
    const pool = [p("w1", "U1", "F"), p("s1", "U1", "F")];

    const r = planRetry({ wrong, pool, count: 8, seed: "t1" });

    expect(r.picked).toHaveLength(1);
    expect(r.shortfall).toBe(7);
  });

  it("오답이 하나도 없으면 **빈 계획**이고 그 사실이 드러난다", () => {
    const r = planRetry({
      wrong: [],
      pool: [p("s1", "U1", "F")],
      count: 8,
      seed: "t1",
    });

    expect(r.picked).toHaveLength(0);
    expect(r.shortfall).toBe(8);
  });

  it("요청보다 오답이 많으면 **시험지 순서대로 앞에서** 자른다 — 무작위가 아니다", () => {
    const wrong = [p("w1", "U1", "A"), p("w2", "U1", "B"), p("w3", "U1", "C")];
    const pool = wrong;

    const r = planRetry({ wrong, pool, count: 2, seed: "t1" });

    expect(r.picked.map((x) => x.wrongProblemId)).toEqual(["w1", "w2"]);
    expect(r.shortfall).toBe(0);
  });
});

describe("자격과 제외", () => {
  it("격리된 문항(`directUseAllowed:false`)은 형제로 안 쓴다 (D-26)", () => {
    const wrong = [p("w1", "U1", "F")];
    const pool = [
      p("w1", "U1", "F"),
      { ...p("s1", "U1", "F"), directUseAllowed: false },
    ];

    const r = planRetry({ wrong, pool, count: 1, seed: "t1" });

    expect(r.picked[0]!.problem.id).toBe("w1"); // 형제가 «없는» 것과 같다
    expect(r.picked[0]!.origin).toBe("원문");
  });

  it("`excludeIds` 로 준 문항은 형제에서 뺀다 — 지난 복습지와 겹치지 않게", () => {
    const wrong = [p("w1", "U1", "F")];
    const pool = [p("w1", "U1", "F"), p("s1", "U1", "F"), p("s2", "U1", "F")];

    const r = planRetry({
      wrong,
      pool,
      count: 1,
      seed: "t1",
      excludeIds: ["s1"],
    });

    expect(r.picked[0]!.problem.id).toBe("s2");
  });

  it("🔴 `excludeIds` 가 형제를 **다 지워도** 원문으로 떨어질 뿐, 그 오답이 사라지지 않는다", () => {
    const wrong = [p("w1", "U1", "F")];
    const pool = [p("w1", "U1", "F"), p("s1", "U1", "F")];

    const r = planRetry({
      wrong,
      pool,
      count: 1,
      seed: "t1",
      excludeIds: ["s1"],
    });

    expect(r.picked).toHaveLength(1);
    expect(r.picked[0]!.origin).toBe("원문");
  });
});

describe("결정론", () => {
  it("같은 씨앗이면 같은 결과다", () => {
    const wrong = [p("w1", "U1", "F")];
    const pool = [
      p("w1", "U1", "F"),
      p("s1", "U1", "F"),
      p("s2", "U1", "F"),
      p("s3", "U1", "F"),
    ];

    const a = planRetry({ wrong, pool, count: 1, seed: "같은씨앗" });
    const b = planRetry({ wrong, pool, count: 1, seed: "같은씨앗" });
    expect(a.picked[0]!.problem.id).toBe(b.picked[0]!.problem.id);
  });

  it("🔴 씨앗이 다르면 **다른 형제**가 나온다 — 안 그러면 매번 같은 문항이 복습으로 간다", () => {
    const wrong = [p("w1", "U1", "F")];
    const pool = [
      p("w1", "U1", "F"),
      ...Array.from({ length: 12 }, (_, i) => p(`s${i}`, "U1", "F")),
    ];

    const seen = new Set(
      ["씨앗1", "씨앗2", "씨앗3", "씨앗4", "씨앗5"].map(
        (s) =>
          planRetry({ wrong, pool, count: 1, seed: s }).picked[0]!.problem.id,
      ),
    );
    // 다섯 씨앗이 전부 같은 문항을 내면 그 함수는 씨앗을 **안 보고 있다**.
    expect(seen.size).toBeGreaterThan(1);
  });
});
