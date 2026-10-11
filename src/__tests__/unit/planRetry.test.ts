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
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { selectProblems } from "@/lib/generator/selectProblems";

import {
  planRetry,
  retryRequestedCount,
  type RetryCandidate,
} from "@/lib/generator/planRetry";

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

const textbook = (
  id = "original",
  familyKey = `solo:${id}`,
): RetryCandidate => ({
  ...p(id, "U1", familyKey),
  source: "school_textbook",
  originProblemId: null,
});
const variant = (
  original: RetryCandidate,
  slot: number,
  id = `${original.id}-${slot}`,
): RetryCandidate => ({
  ...p(id, original.unitId, original.familyKey ?? null),
  source: "transformed",
  originProblemId: original.id,
  externalId: `tb-retry-v1:${original.id}:${slot}`,
});

describe("교과서 원문별 지정 변형 두 문항", () => {
  it("동일한 교과서 원문·변형 쌍도 일반 시험에서는 한 갈래 한 문항이다", () => {
    const original = textbook();
    const pool = [original, variant(original, 1), variant(original, 2)].map(
      (candidate) => ({
        ...candidate,
        problemType: "계산" as const,
      }),
    );
    const exam = selectProblems({
      pool,
      count: 3,
      recentProblemIds: [],
      seed: "exam",
      difficultyRatio: {
        연산: 0,
        기본: 3,
        응용: 0,
        심화하: 0,
        심화중: 0,
        심화상: 0,
      },
    });
    expect(exam.problems).toHaveLength(1);
    expect(exam.shortfall).toEqual([
      {
        unitId: original.unitId,
        difficulty: "기본",
        required: 3,
        available: 1,
      },
    ]);
    expect(
      planRetry({ wrong: [original], pool, seed: "retry" }).picked,
    ).toHaveLength(2);
  });
  it("일반 시험과 같은 갈래의 지정 변형 두 문항을 원문에 직접 연결해 낸다", () => {
    const original = textbook();
    const result = planRetry({
      wrong: [original],
      pool: [original, variant(original, 1), variant(original, 2)],
      seed: "pair",
    });
    expect(result.requestedCount).toBe(2);
    expect(
      result.picked.map((seat) => [
        seat.problem.id,
        seat.wrongProblemId,
        seat.origin,
      ]),
    ).toEqual([
      ["original-1", "original", "형제"],
      ["original-2", "original", "형제"],
    ]);
    expect(result.shortfall).toBe(0);
    expect(result.textbookShortfalls).toEqual([]);
  });

  it("같은 갈래의 서로 다른 교과서 원문 오답을 접지 않고 각각 두 문항을 낸다", () => {
    const wrong = [textbook("a", "F"), textbook("b", "F")];
    const result = planRetry({
      wrong,
      pool: wrong.flatMap((w) => [w, variant(w, 1), variant(w, 2)]),
      seed: "pair",
    });
    expect(result.requestedCount).toBe(4);
    expect(result.picked.map((seat) => seat.wrongProblemId)).toEqual([
      "a",
      "a",
      "b",
      "b",
    ]);
    expect(result.foldedWrong).toBe(0);
    expect(new Set(result.picked.map((seat) => seat.problem.id)).size).toBe(4);
  });

  it.each([0, 1])(
    "사용 가능한 지정 변형이 %i개면 원문으로 메우지 않고 실제 부족을 낸다",
    (available) => {
      const original = textbook();
      const result = planRetry({
        wrong: [original],
        pool: [
          original,
          ...Array.from({ length: available }, (_, i) =>
            variant(original, i + 1),
          ),
        ],
        seed: "pair",
      });
      expect(result.picked).toHaveLength(available);
      expect(result.shortfall).toBe(2 - available);
      expect(result.textbookShortfalls).toEqual([
        { wrongProblemId: original.id, required: 2, available },
      ]);
      expect(
        result.picked.some((seat) => seat.problem.id === original.id),
      ).toBe(false);
    },
  );

  it("같은 단원·갈래라도 다른 부모, 원문, 과거 복구 자식, 잘못된 슬롯을 대신 쓰지 않는다", () => {
    const original = textbook();
    const result = planRetry({
      wrong: [original],
      pool: [
        original,
        textbook("other", original.familyKey!),
        { ...variant(original, 1), originProblemId: "other" },
        {
          ...variant(original, 1, "original-as-variant"),
          source: "school_textbook",
        },
        {
          ...variant(original, 1, "legacy"),
          externalId: "textbook-recovery:old",
        },
        { ...variant(original, 1, "missing-slot"), externalId: null },
        { ...variant(original, 1, "wrong-unit"), unitId: "U2" },
        variant(original, 3),
      ],
      seed: "pair",
    });
    expect(result.picked).toEqual([]);
    expect(result.shortfall).toBe(2);
  });

  it.each([
    { directUseAllowed: false },
    { reviewStatus: "pending" },
    { reviewStatus: "rejected" },
    { pool: "private" },
    { answer: MISSING_ANSWER },
  ])("변형의 출제 자격이 없으면 부족으로 남긴다: %o", (override) => {
    const original = textbook();
    const result = planRetry({
      wrong: [original],
      pool: [{ ...variant(original, 1), ...override }, variant(original, 2)],
      seed: "pair",
    });
    expect(result.picked.map((seat) => seat.problem.id)).toEqual([
      "original-2",
    ]);
    expect(result.shortfall).toBe(1);
  });

  it("중복 후보·중복 오답을 세지 않고 제외한 슬롯은 부족으로 남긴다", () => {
    const original = textbook();
    const child = variant(original, 1);
    const result = planRetry({
      wrong: [original, original],
      pool: [child, child, variant(original, 2)],
      excludeIds: ["original-2"],
      seed: "pair",
    });
    expect(result.requestedCount).toBe(2);
    expect(result.picked).toHaveLength(1);
    expect(result.foldedWrong).toBe(0);
    expect(result.shortfall).toBe(1);
  });

  it("다른 오답 원문의 id로 위장한 변형을 재출제하지 않는다", () => {
    const wrong = [textbook("a"), textbook("b")];
    const result = planRetry({
      wrong,
      pool: [variant(wrong[0]!, 1, "b")],
      seed: "pair",
    });
    expect(result.picked).toEqual([]);
    expect(result.shortfall).toBe(4);
  });

  it("일반 오답은 한 갈래 한 자리·원문 대체를 유지하며 교과서만 두 자리로 늘린다", () => {
    const original = textbook();
    const wrong = [
      p("ordinary1", "U1", "ordinary"),
      p("ordinary2", "U1", "ordinary"),
      original,
    ];
    const result = planRetry({
      wrong,
      pool: [variant(original, 1), variant(original, 2)],
      seed: "pair",
    });
    expect(result.requestedCount).toBe(4);
    expect(result.picked.map((seat) => seat.origin)).toEqual([
      "원문",
      "형제",
      "형제",
    ]);
    expect(result.foldedWrong).toBe(1);
    expect(result.shortfall).toBe(1);
  });

  it("명시된 전체 자리 상한과 시험지 순서를 지킨다", () => {
    const wrong = [textbook("a"), textbook("b")];
    const result = planRetry({
      wrong,
      pool: wrong.flatMap((w) => [variant(w, 1), variant(w, 2)]),
      count: 3,
      seed: "pair",
    });
    expect(result.requestedCount).toBe(3);
    expect(result.picked.map((seat) => seat.problem.id)).toEqual([
      "a-1",
      "a-2",
      "b-1",
    ]);
    expect(result.shortfall).toBe(0);
  });

  it("일반 복습 자리가 교과서 지정 쌍을 먼저 소비하지 않는다", () => {
    const original = textbook("original", "F");
    const result = planRetry({
      wrong: [p("ordinary", "U1", "F"), original],
      pool: [variant(original, 1), variant(original, 2)],
      seed: "pair",
    });
    expect(result.picked.map((seat) => seat.problem.id)).toEqual([
      "ordinary",
      "original-1",
      "original-2",
    ]);
  });

  it("요청 수는 오답 id 중복을 빼고 출처별 할당을 합산한다", () => {
    const original = textbook();
    expect(
      retryRequestedCount([original, original, p("ordinary", "U1", "F")]),
    ).toBe(3);
  });
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
