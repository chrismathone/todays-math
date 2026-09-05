/**
 * **기출 2단 지면의 자와 배치.**
 *
 * 자체 자를 만들지 않고 `estimateProblemPx` 에 기출 **치수**만 끼워 넣는다. 그러면
 * 위험이 하나 생긴다 — **인자가 안 쓰여도 아무 시험도 안 빨개진다.** 자습 값이
 * 기본값이라 옛 시험 103건은 그대로 통과한다. 그래서 여기서 **인자가 살아 있는지**를
 * 먼저 묻는다(가드는 망가뜨려 봐야 가드인 줄 안다).
 *
 * 자의 «참»은 여기 없다 — 그것은 지면 실측이고
 * `scripts/qa/eval-exam-ruler.ts` 가 채점한다. 여기서 지키는 것은 **구조**다.
 */
import { describe, expect, it } from "vitest";

import type { TestPrintProblem } from "@/components/print/types";
import {
  EXAM_COLUMN_GEOMETRY,
  EXAM_SAFETY_PX,
  estimateExamProblemPx,
  seatExamProblemPx,
} from "@/lib/print/examRuler";
import { packExamPaper } from "@/lib/print/packExamPaper";
import { EXAM_MEASURED_PX, JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import {
  estimateProblemPx,
  EXAM_RULER,
  JASEUP_RULER,
} from "@/lib/printOverflow";

const 문항 = (over: Partial<TestPrintProblem> = {}): TestPrintProblem => ({
  id: over.id ?? "p1",
  orderIndex: 0,
  content: "다음 그림에서 $x$ 의 값을 구하시오.",
  answer: "3",
  solution: null,
  questionType: "객관식",
  ...over,
});

/** 한 줄에 안 들어갈 만큼 긴 한글 발문 — 단 폭이 좁아지면 줄이 늘어난다. */
const 긴발문 = "가".repeat(120);

describe("기출 자 — 치수만 갈아 끼운다", () => {
  it("🔴 자 인자가 **살아 있다** — 좁은 단에서는 본문이 더 많은 줄을 먹는다", () => {
    // 이 시험이 없으면 `ruler` 인자를 통째로 무시해도 옛 시험 103건이 다 통과한다
    // (자습 값이 기본값이라). 그러면 기출 지면은 자습 폭으로 재어 **덜 세고**,
    // 덜 센 것은 겹쳐 찍힌 시험지로 간다.
    //
    // ⚠️ **총 높이로 물으면 안 된다.** 기출은 정답란이 없어 고정분이 24px 작아서,
    //    폭 효과가 그 차이에 묻힌다(처음에 그렇게 써서 빨갛게 났다).
    //    그래서 고정분을 뺀 **본문 높이**만 견준다.
    // ⚠️ 그리고 **px 로 물어도 안 된다.** 두 지면은 행높이도 다르다(기출 20 ·
    //    자습 20.3125). 줄 수가 같으면 기출이 오히려 낮게 나와, 폭이 제대로
    //    쓰이는데도 빨개진다(두 번째로 그렇게 났다). 폭이 정하는 것은 **줄 수**다.
    // ⚠️ 그리고 **부동소수로 견주면 안 된다.** 줄 수가 똑같이 2.0 인데도
    //    `2.0 < 2.0` 이 참으로 나온다(세 번째로 그렇게 났다). 줄 수는 정수이므로
    //    반올림해서 견준다. — 세 번 다 «재는 쪽»이 틀렸지 코드가 틀린 게 아니었다.
    const body = (text: string, ruler: typeof JASEUP_RULER) =>
      Math.round(
        ((estimateProblemPx(text, [], null, ruler) - ruler.fixedChrome) /
          ruler.line) *
          1e6,
      ) / 1e6;

    expect(EXAM_MEASURED_PX.problemColumn).toBeLessThan(
      JASEUP_MEASURED_PX.problemColumn,
    );

    // 길이를 훑는다 — 한 길이만 보면 마침 두 폭의 줄 수가 같은 자리를 골라
    // «인자가 죽었는데도 초록»이 될 수 있다.
    const lengths = Array.from({ length: 60 }, (_, i) => 20 + i * 5);
    const bodies = lengths.map((n) => {
      const text = "가".repeat(n);
      return { exam: body(text, EXAM_RULER), jaseup: body(text, JASEUP_RULER) };
    });
    // 좁은 단이 **덜 세는 일은 없어야** 한다.
    expect(bodies.every((b) => b.exam >= b.jaseup)).toBe(true);
    // 그리고 적어도 한 자리에서는 실제로 더 세야 한다(안 그러면 폭이 안 쓰인 것이다).
    expect(bodies.some((b) => b.exam > b.jaseup)).toBe(true);
  });

  it("자습 자는 옛 상수 그대로다 — 기출을 넣느라 자습을 흔들지 않는다", () => {
    expect(JASEUP_RULER).toBe(JASEUP_MEASURED_PX);
    // 인자를 안 주면 자습 자다(옛 부르는 자리가 한 글자도 안 바뀐다).
    expect(estimateProblemPx(긴발문)).toBe(
      estimateProblemPx(긴발문, [], null, JASEUP_RULER),
    );
  });

  it("기출 자의 고정분은 **머리띠**다 — 자습의 정답란이 아니다", () => {
    expect(EXAM_RULER.fixedChrome).toBe(EXAM_MEASURED_PX.bandChrome);
    expect(EXAM_RULER.fixedChrome).toBeLessThan(JASEUP_MEASURED_PX.fixedChrome);
  });
});

describe("🔴 문제지에는 서술형 답란이 **없다** (원장님 확정 2026-09-05)", () => {
  // 원본 문18 이 「단, **답안지에** 그림을 그려서 설명할 것」이라 적는다 —
  // 원본 시험은 서술형 답을 별도 답안지로 받았다. 문제지에 답란을 두면 다른 물건이 된다.
  //
  // 이 시험이 지키는 것: **자가 답란을 세지 않는다.** 자만 세고 지면이 안 그리면
  // 지면이 헐거워지고(문항이 덜 들어간다), 반대면 겹쳐 찍힌다.
  it("같은 본문이면 객관식과 서술형의 높이가 같다", () => {
    const content = "다음을 구하시오. $x^2 - 1$";
    const mcq = 문항({ questionType: "객관식", score: 10, content });
    const essay = 문항({ questionType: "서술형", score: 10, content });
    expect(estimateExamProblemPx(essay)).toBe(estimateExamProblemPx(mcq));
  });

  it("배점이 달라도 높이가 안 변한다 — 답란이 배점에 매여 있지 않다", () => {
    const content = "다음을 구하시오.";
    const low = 문항({ questionType: "서술형", score: 2, content });
    const high = 문항({ questionType: "서술형", score: 40, content });
    expect(estimateExamProblemPx(high)).toBe(estimateExamProblemPx(low));
  });
});

describe("기출 배치 — 무엇도 조용히 사라지지 않는다", () => {
  const problems = Array.from({ length: 25 }, (_, i) =>
    문항({
      id: `q${i + 1}`,
      content: `${i + 1}번 발문. ${"가".repeat(40 + ((i * 37) % 200))}`,
      score: 5,
    }),
  );

  it("🔴 넣은 문항이 하나도 안 빠지고, 순서가 그대로다", () => {
    const { pages } = packExamPaper(problems);
    const seen = pages.flatMap((p) =>
      p.columns.flatMap((c) => c.map((x) => x.id)),
    );
    expect(seen).toEqual(problems.map((p) => p.id));
  });

  it("모든 장이 기하가 정한 단 수를 갖는다", () => {
    const { pages } = packExamPaper(problems);
    for (const page of pages)
      expect(page.columns).toHaveLength(EXAM_COLUMN_GEOMETRY.columnsPerPage);
  });

  it("🔴 배치는 **안전여유를 더한** 높이를 쓴다 — 자 자체는 여유가 없다", () => {
    // 여유를 자 안에 섞으면 채점(`eval-exam-ruler.ts`)이 그 여유까지 정답으로 세어
    // 「과소 0건」이 되고, 자가 나빠져도 성적이 안 떨어진다.
    const p = problems[0]!;
    expect(seatExamProblemPx(p) - estimateExamProblemPx(p)).toBe(
      EXAM_SAFETY_PX,
    );
    expect(EXAM_SAFETY_PX).toBeGreaterThan(0);
  });

  it("단 기하는 실측에서 온다 — 손으로 적지 않는다", () => {
    expect(EXAM_COLUMN_GEOMETRY.firstPageColumnPx).toBe(
      EXAM_MEASURED_PX.firstPageColumn,
    );
    expect(EXAM_COLUMN_GEOMETRY.continuationColumnPx).toBe(
      EXAM_MEASURED_PX.continuationColumn,
    );
    expect(EXAM_COLUMN_GEOMETRY.gapPx).toBe(EXAM_MEASURED_PX.itemGap);
    // 첫 장이 좁아야 한다 — 머리말이 얹히기 때문이다. 같으면 실측이 낡은 것이다.
    expect(EXAM_MEASURED_PX.firstPageColumn).toBeLessThan(
      EXAM_MEASURED_PX.continuationColumn,
    );
  });
});
