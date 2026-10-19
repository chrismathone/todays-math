import { describe, expect, it } from "vitest";
import { reportFixture } from "@/app/dev/exam-report-hifi/fixtures";
import { scoreTo100 } from "@/lib/examReport/score100";
import { recentExamHistory } from "@/lib/examReport/trend";
import { planReportBlocks, reviewUnits } from "@/lib/examReport/blocks";
import { studentExamReportSchema } from "@/contracts/examReport.contract";

describe("성적표 100점 환산", () => {
  it.each([
    [0, 20, 0],
    [20, 20, 100],
    [16, 20, 80],
    [70, 85, 82],
    [2, 3, 67],
    [85, 100, 85],
  ])("%s / %s → %s점", (value, maximum, expected) => {
    expect(scoreTo100(value, maximum)).toBe(expected);
  });
  it.each([
    [null, 20],
    [0, 0],
    [16, null],
    [-1, 20],
    [21, 20],
    [NaN, 20],
    [1, Infinity],
  ])(
    "값·만점이 유효하지 않으면 0점을 지어내지 않는다 (%s / %s)",
    (value, maximum) => {
      expect(scoreTo100(value, maximum)).toBeNull();
    },
  );
});

describe("선택 이력 계약과 최근 여섯 회", () => {
  const history = Array.from({ length: 8 }, (_, i) => ({
    date: `2026-0${i + 1}-24`,
    title: `${i + 1}월`,
    score100: i === 5 ? null : i * 10,
  }));
  it("기존 입력을 유지하고 이력은 선택 칸으로만 받는다", () => {
    const report = reportFixture("normal").student;
    expect(studentExamReportSchema.parse(report)).toEqual(report);
    expect(
      studentExamReportSchema.parse({ ...report, history }).history,
    ).toEqual(history);
    expect(
      studentExamReportSchema.safeParse({
        ...report,
        history: [{ ...history[0], score100: 101 }],
      }).success,
    ).toBe(false);
  });
  it("2회 미만이면 칸을 없애고, 날짜순 최근 6회에 결시를 남긴다", () => {
    expect(recentExamHistory()).toEqual([]);
    expect(recentExamHistory(history.slice(0, 1))).toEqual([]);
    const reversed = [...history].reverse();
    expect(recentExamHistory(reversed)).toEqual(history.slice(2));
    expect(reversed[0]).toEqual(history[7]);
  });
});

describe("스타일과 독립인 블록 선택·쪽 나누기", () => {
  const report = () => reportFixture("zero").student;
  it("입력 순서대로 블록을 통째로 옮긴다", () => {
    const input = { blocks: ["teacherNote", "score", "correctCount"] as const };
    const before = JSON.stringify(input);
    const pages = planReportBlocks(report(), input, () => ({ heightMm: 40 }), {
      capacityMm: 90,
      gapMm: 5,
    });
    expect(pages.map((page) => page.blocks.map((block) => block.id))).toEqual([
      ["teacherNote", "score"],
      ["correctCount"],
    ]);
    expect(pages.map((page) => page.usedMm)).toEqual([85, 40]);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("표는 머리를 반복하며 행 단위로만 이어지고 내용·차례를 보존한다", () => {
    const pages = planReportBlocks(
      report(),
      { blocks: ["score", "wrongTable", "teacherNote"] },
      (id) =>
        id === "wrongTable"
          ? { heightMm: 10, rowsMm: [20, 20, 20, 20] }
          : { heightMm: 30 },
      { capacityMm: 80, gapMm: 5 },
    );
    expect(
      pages.map((page) =>
        page.blocks.map(({ id, from, to, continued }) => [
          id,
          from,
          to,
          continued,
        ]),
      ),
    ).toEqual([
      [
        ["score", 0, 1, false],
        ["wrongTable", 0, 1, false],
      ],
      [["wrongTable", 1, 4, true]],
      [["teacherNote", 0, 1, false]],
    ]);
    expect(pages.every((page) => page.usedMm <= 80)).toBe(true);
  });
  it("안 들어가는 첫 행은 빈 표 머리를 남기지 않고 다음 쪽으로 보낸다", () => {
    const pages = planReportBlocks(
      report(),
      { blocks: ["score", "wrongTable"] },
      (id) =>
        id === "wrongTable" ? { heightMm: 10, rowsMm: [30] } : { heightMm: 55 },
      { capacityMm: 80, gapMm: 5 },
    );
    expect(pages.map((page) => page.blocks.map((b) => b.id))).toEqual([
      ["score"],
      ["wrongTable"],
    ]);
    expect(pages[1].blocks[0].continued).toBe(false);
  });
  it("선택 해제·빈 문장·이력 한 회·없는 평균을 지면에서 뺀다", () => {
    const pages = planReportBlocks(
      { ...report(), teacherNote: " " },
      {
        blocks: [
          "score",
          "wrongTable",
          "teacherNote",
          "trend",
          "retries",
          "classAverage",
        ],
        wrong: false,
        retry: false,
      },
      () => ({ heightMm: 10 }),
    );
    expect(pages.flatMap((p) => p.blocks.map((b) => b.id))).toEqual(["score"]);
  });
  it("한 쪽보다 큰 블록·표 행과 잘못된 치수는 조용히 자르지 않는다", () => {
    expect(() =>
      planReportBlocks(report(), { blocks: ["teacherNote"] }, () => ({
        heightMm: 1000,
      })),
    ).toThrow(/teacherNote/);
    expect(() =>
      planReportBlocks(report(), { blocks: ["wrongTable"] }, () => ({
        heightMm: 10,
        rowsMm: [1000],
      })),
    ).toThrow(/wrongTable/);
    expect(() =>
      planReportBlocks(report(), { blocks: ["score"] }, () => ({
        heightMm: NaN,
      })),
    ).toThrow();
  });
  it("다시 볼 단원은 오답이 있는 단원 중 덜 맞힌 순서로 최대 세 개다", () => {
    const base = report();
    const marks = [
      ["가", true],
      ["가", false],
      ["나", false],
      ["다", true],
      ["다", true],
      ["다", false],
      ["라", true],
      ["마", false],
    ] as const;
    const questions = marks.map(([unitName, isCorrect], i) => ({
      ...base.questions[i],
      unitName,
      isCorrect,
    }));
    expect(reviewUnits({ ...base, questions })).toEqual(["나", "마", "가"]);
    expect(reviewUnits({ ...base, status: "absent" })).toEqual([]);
  });
});
