/**
 * **적재본을 지금 엔진으로 덮어도 되는가** — `refresh-engine-content.ts` 의 판정.
 *
 * 그림 갱신(`refreshEngineFigures.test.ts`)과 달리 이 도구는 **본문 · 정답 · 풀이**를 덮는다.
 * 잘못 덮으면 멀쩡한 문항이 다른 문항이 되고, 그 결함은 스스로 신고하지 않는다.
 * 그래서 「무엇이 달라졌나」를 갈래로 가르고, **고치기로 한 문항류 · 고치기로 한 갈래만** 덮는다.
 *
 * 🔴 양방향이다 — 「덮어야 할 것을 덮는가」와 「덮으면 안 되는 것을 안 덮는가」를 같이 문다.
 */
import { describe, expect, it } from "vitest";

import {
  appendLedger,
  brokenChoiceReason,
  classifyDiff,
  shouldApply,
  type Scope,
  type Snapshot,
  figureSourceAfter,
  revertStep,
  snapshotData,
  snapshotWhere,
  wantsFigureRedraw,
  writeSnapshotsCas,
} from "../../../scripts/qa/refreshEngineContentCore";

const STEM =
  "그림과 같이 중심각의 크기가 각각 $20^\\circ$, $30^\\circ$인 두 부채꼴이 있다.";
const SHORT = { content: STEM, answer: "$9$", solution: "풀이" };

describe("[적재본 갱신] classifyDiff — 무엇이 달라졌나", () => {
  it("글자가 같으면 same", () => {
    expect(classifyDiff(SHORT, { ...SHORT })).toBe("same");
  });

  it("공백만 다르면 same — 줄끝 · 겹친 공백은 다름이 아니다", () => {
    expect(
      classifyDiff(SHORT, {
        ...SHORT,
        content: `${STEM}  `,
        solution: "풀이\r",
      }),
    ).toBe("same");
  });

  it("풀이만 다르면 solution", () => {
    expect(classifyDiff(SHORT, { ...SHORT, solution: "다른 풀이" })).toBe(
      "solution",
    );
  });

  it("🔴 발문이 한 글자라도 다르면 stem", () => {
    expect(
      classifyDiff(SHORT, {
        ...SHORT,
        content: STEM.replace("두 부채꼴", "반지름의 길이가 같은 두 부채꼴"),
      }),
    ).toBe("stem");
  });

  it("🔴 단답형의 정답이 다르면 stem — 보기가 없으니 정답이 흔들릴 까닭이 없다", () => {
    expect(classifyDiff(SHORT, { ...SHORT, answer: "$18$" })).toBe("stem");
  });

  const MCQ_DB = {
    content: `${STEM}\n① $7$\n② $9$\n③ $8$\n④ $5$\n⑤ $14$`,
    answer: "②",
    solution: "풀이",
  };

  it("발문이 같고 보기 · 정답 번호만 다르면 choices", () => {
    expect(
      classifyDiff(MCQ_DB, {
        content: `${STEM}\n① $14$\n② $7$\n③ $5$\n④ $6$\n⑤ $9$`,
        answer: "⑤",
        solution: "풀이",
      }),
    ).toBe("choices");
  });

  it("🔴 보기가 한쪽에만 있으면 stem — 형식이 바뀐 것이다", () => {
    expect(classifyDiff(MCQ_DB, SHORT)).toBe("stem");
  });

  it("발문과 보기가 같이 다르면 stem 이 이긴다", () => {
    expect(
      classifyDiff(MCQ_DB, {
        ...MCQ_DB,
        content: MCQ_DB.content.replace(
          "두 부채꼴",
          "반지름의 길이가 같은 두 부채꼴",
        ),
      }),
    ).toBe("stem");
  });
});

describe("[적재본 갱신] brokenChoiceReason — 이 보기는 고쳐야 하는가", () => {
  const mcq = (choices: string[], answer: string) => ({
    content: `물음\n${choices.map((c, i) => `${"①②③④⑤"[i]} ${c}`).join("\n")}`,
    answer,
  });

  it("멀쩡한 정수 보기는 null — 섞인 차례가 다르다고 고치지 않는다", () => {
    expect(
      brokenChoiceReason(mcq(["$7$", "$9$", "$8$", "$5$", "$14$"], "②"), false),
    ).toBeNull();
  });

  it("🔴 정답이 소수면 언제나 다시 만든다 — 소수 오답 표기가 통째로 틀렸었다", () => {
    // `formatRat` 이 나머지를 그대로 소수 자리에 적었다(2026-10-03). 자릿수가 긴 것만 깨진 게 아니다 —
    // 정답 `-0.2` 옆의 `0.1` 은 «부호를 바꾼 0.2» 였다. 모양으로는 못 가른다.
    expect(
      brokenChoiceReason(
        mcq(
          ["$1.0002547$", "$0.7547$", "$0.001887$", "$0.7647$", "$7.000547$"],
          "②",
        ),
        false,
      ),
    ).toBe("소수 정답");
    expect(
      brokenChoiceReason(
        mcq(["$0.31$", "$0.41$", "$0.21$", "$0.32$", "$1.31$"], "①"),
        false,
      ),
    ).toBe("소수 정답");
    expect(
      brokenChoiceReason(
        mcq(
          [
            "$0.5\\,\\mathrm{cm}$",
            "$1.5\\,\\mathrm{cm}$",
            "$2\\,\\mathrm{cm}$",
            "$5\\,\\mathrm{cm}$",
            "$0.6\\,\\mathrm{cm}$",
          ],
          "①",
        ),
        false,
      ),
    ).toBe("소수 정답");
  });

  it("🔴 소수 정답인데 자릿수가 서로 다른 보기 — 모양으로 지워진다", () => {
    expect(
      brokenChoiceReason(
        mcq(["$0.8290$", "$0.829$", "$1.171$", "$0.83$", "$1.829$"], "①"),
        false,
      ),
    ).toBe("같은 값");
  });

  it("🔴 값이 같은 보기 둘 — 글자가 달라도", () => {
    expect(
      brokenChoiceReason(
        mcq(["$0.50$", "$0.5$", "$0.6$", "$0.7$", "$0.8$"], "③"),
        false,
      ),
    ).toBe("같은 값");
  });

  it("🔴 초등인데 음수 보기", () => {
    expect(
      brokenChoiceReason(mcq(["$3$", "$-3$", "$4$", "$5$", "$6$"], "①"), true),
    ).toBe("초등 음수");
  });

  it("중등의 음수 보기는 정상이다 — 부호 실수는 진짜 오답", () => {
    expect(
      brokenChoiceReason(mcq(["$3$", "$-3$", "$4$", "$5$", "$6$"], "①"), false),
    ).toBeNull();
  });

  it("빼기가 든 식은 음수가 아니다 — 앞에 항이 있다", () => {
    expect(
      brokenChoiceReason(
        mcq(
          [
            "$\\triangle=\\square-3$",
            "$\\triangle=\\square+3$",
            "$4$",
            "$5$",
            "$6$",
          ],
          "①",
        ),
        true,
      ),
    ).toBeNull();
  });

  it("정답이 여럿이거나 보기가 다섯이 아니면 판정하지 않는다(null)", () => {
    expect(
      brokenChoiceReason(
        mcq(["$0.5$", "$0.5$", "$4$", "$5$", "$6$"], "①, ②"),
        false,
      ),
    ).toBeNull();
    expect(
      brokenChoiceReason({ content: "물음\n① $1$\n② $2$", answer: "①" }, false),
    ).toBeNull();
  });
});

describe("[적재본 갱신] shouldApply — 고치기로 한 것만 덮는다", () => {
  const scope: Scope = {
    families: new Set(["mid:1-2|원과 부채꼴|02"]),
    solutionEverywhere: false,
  };

  it("고치기로 한 문항류는 어떤 갈래든 덮는다", () => {
    expect(shouldApply("mid:1-2|원과 부채꼴|02", "stem", null, scope)).toBe(
      true,
    );
    expect(shouldApply("mid:1-2|원과 부채꼴|02", "choices", null, scope)).toBe(
      true,
    );
  });

  it("🔴 그 밖의 문항류는 발문이 달라도 안 덮는다 — 내가 모르는 차이다", () => {
    expect(shouldApply("mid:1-2|원과 부채꼴|03", "stem", null, scope)).toBe(
      false,
    );
  });

  it("그 밖의 문항류라도 보기가 깨져 있으면 보기 갈래는 덮는다", () => {
    expect(shouldApply("elem:x", "choices", "소수 정답", scope)).toBe(true);
  });

  it("🔴 보기가 깨져 있어도 발문이 다르면 안 덮는다 — 그건 다른 문항이다", () => {
    expect(shouldApply("elem:x", "stem", "소수 정답", scope)).toBe(false);
  });

  it("🔴 보기가 멀쩡하면 차례만 다른 보기는 안 덮는다", () => {
    expect(shouldApply("elem:x", "choices", null, scope)).toBe(false);
  });

  it("같은 것은 안 덮는다", () => {
    expect(shouldApply("mid:1-2|원과 부채꼴|02", "same", null, scope)).toBe(
      false,
    );
  });

  it("풀이만 다른 것은 켰을 때만", () => {
    expect(shouldApply("elem:x", "solution", null, scope)).toBe(false);
    expect(
      shouldApply("elem:x", "solution", null, {
        ...scope,
        solutionEverywhere: true,
      }),
    ).toBe(true);
  });
});

describe("[적재본 갱신] appendLedger — 누적만", () => {
  const row = (id: string) => ({
    problemId: id,
    externalId: id,
    problemCode: null,
    before: {
      content: "a",
      answer: "b",
      solution: null,
      figureSvg: null,
      directUseAllowed: true,
    },
    after: {
      content: "c",
      answer: "b",
      solution: null,
      figureSvg: null,
      directUseAllowed: true,
    },
  });

  it("앞 회차 뒤에 붙는다", () => {
    const prev = {
      runs: [{ label: "1", at: "t", count: 1 }],
      rows: [row("p1")],
    };
    const next = appendLedger(prev, "2", "t2", [row("p2")]);
    expect(next.rows.map((r) => r.problemId)).toEqual(["p1", "p2"]);
    expect(next.runs).toHaveLength(2);
  });

  it("🔴 빈 회차는 원장을 안 건드린다", () => {
    const prev = { runs: [], rows: [row("p1")] };
    expect(appendLedger(prev, "2", "t2", [])).toBe(prev);
  });
});

describe("[적재본 갱신] wantsFigureRedraw — 글은 같고 그림만 고친 문항류", () => {
  it("엔진이 그림을 그리면 다시 그려 견준다", () => {
    expect(wantsFigureRedraw({ inFigureFamily: true, madeHasFigure: true, dbHasFigure: true })).toBe(true);
    expect(wantsFigureRedraw({ inFigureFamily: true, madeHasFigure: true, dbHasFigure: false })).toBe(true);
  });
  it("🔴 엔진이 그림을 **뺐는데** 적재본에 그림이 있으면 덮을 행이다 — 2026-10-20 세로셈 1,088행이 «same» 으로 빠졌다", () => {
    expect(wantsFigureRedraw({ inFigureFamily: true, madeHasFigure: false, dbHasFigure: true })).toBe(true);
  });
  it("둘 다 그림이 없거나 그림 문항류가 아니면 아니다", () => {
    expect(wantsFigureRedraw({ inFigureFamily: true, madeHasFigure: false, dbHasFigure: false })).toBe(false);
    expect(wantsFigureRedraw({ inFigureFamily: false, madeHasFigure: false, dbHasFigure: true })).toBe(false);
    expect(wantsFigureRedraw({ inFigureFamily: false, madeHasFigure: true, dbHasFigure: true })).toBe(false);
  });
});

describe("[적재본 갱신] writeSnapshotsCas — 쓰는 순간 «앞» 값일 때만 쓴다(D-164 §4)", () => {
  const A: Snapshot = { content: "앞", answer: "$1$", solution: "풀이", figureSvg: null, directUseAllowed: true };
  const B: Snapshot = { content: "뒤", answer: "$1$", solution: "풀이", figureSvg: "<svg/>", directUseAllowed: true };
  /** 행 하나를 든 가짜 DB — 조건의 칸이 전부 같을 때만 고친다. */
  const fakeDb = (rows: Record<string, Snapshot>) => ({
    rows,
    problem: {
      async updateMany({ where, data }: { where: ReturnType<typeof snapshotWhere>; data: ReturnType<typeof snapshotData> }) {
        const now = rows[where.id];
        if (!now || Object.entries(where).some(([k, v]) => k !== "id" && (now as Record<string, unknown>)[k] !== v)) return { count: 0 };
        rows[where.id] = { content: data.content, answer: data.answer, solution: data.solution, figureSvg: data.figureSvg, directUseAllowed: data.directUseAllowed };
        return { count: 1 };
      },
    },
  });

  it("조건이 쓰는 칸 전부를 본다 — 하나라도 빠지면 그 칸의 동시 변경을 덮는다", () => {
    expect(Object.keys(snapshotWhere("p", { ...A, figureSource: "scan" })).sort()).toEqual(["answer", "content", "directUseAllowed", "figureSource", "figureSvg", "id", "solution"]);
    expect(snapshotData({ ...A, figureSource: "scan" }).figureSource).toBe("scan");
    // 그림 출처가 없는 옛 원장 — 그림 유무에서
    expect(Object.keys(snapshotWhere("p", A))).not.toContain("figureSource");
    expect(snapshotData(B).figureSource).toBe("engine");
    expect(snapshotData(A).figureSource).toBeNull();
  });

  it("글만 고친 행은 그림 출처를 그대로 두고, 그림을 다시 그린 행만 엔진으로", () => {
    expect(figureSourceAfter({ ...B, figureSource: "manual" }, "<svg/>")).toBe("manual");
    expect(figureSourceAfter({ ...B, figureSource: "manual" }, "<svg new/>")).toBe("engine");
    expect(figureSourceAfter({ ...B, figureSource: "manual" }, null)).toBeNull();
  });

  it("되돌림 — 거래가 실패한 회차의 «뒤»는 DB 에 없다: 앞 회차의 «뒤»와 같으면 그 회차부터 되돌린다", () => {
    const C: Snapshot = { ...B, content: "셋째" };
    const run1 = { problemId: "p", externalId: "e", problemCode: null, before: A, after: B };
    const run2 = { problemId: "p", externalId: "e", problemCode: null, before: B, after: C };
    // 둘째 회차가 원장에만 적히고 실패 — DB 는 B
    expect(revertStep([run1, run2], B)).toEqual({ from: { ...B, figureSource: undefined }, to: A });
    // 둘째 회차까지 쓰였다 — DB 는 C
    expect(revertStep([run1, run2], C)?.to).toEqual(A);
    // 그 사이 남이 고쳤다
    expect(revertStep([run1, run2], { ...B, content: "남" })).toBeNull();
  });

  it("앞 값이면 쓰고 쓴 수를 돌려준다", async () => {
    const db = fakeDb({ p1: { ...A }, p2: { ...A } });
    await expect(writeSnapshotsCas(db, [{ problemId: "p1", from: A, to: B }, { problemId: "p2", from: A, to: B }])).resolves.toBe(2);
    expect(db.rows.p1).toEqual(B);
  });

  it("그 사이 남이 한 칸이라도 고쳤으면 던진다(거래가 되돌린다)", async () => {
    const db = fakeDb({ p1: { ...A }, p2: { ...A, directUseAllowed: false } });
    await expect(writeSnapshotsCas(db, [{ problemId: "p1", from: A, to: B }, { problemId: "p2", from: A, to: B }])).rejects.toThrow(/CAS_MISMATCH p2/);
  });

  it("행이 없어도 던진다", async () => {
    await expect(writeSnapshotsCas(fakeDb({}), [{ problemId: "x", from: A, to: B }])).rejects.toThrow(/CAS_MISMATCH x/);
  });

  it("되돌림도 같은 검사 — 앞 = 쓴 값, 뒤 = 처음 값", async () => {
    const db = fakeDb({ p1: { ...B } });
    await expect(writeSnapshotsCas(db, [{ problemId: "p1", from: B, to: A }])).resolves.toBe(1);
    expect(db.rows.p1).toEqual(A);
    await expect(writeSnapshotsCas(db, [{ problemId: "p1", from: B, to: A }])).rejects.toThrow(/CAS_MISMATCH/);
  });
});
