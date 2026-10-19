/**
 * W7 제목 추천(Hi-fi 1안 — 원장님 2026-10-16) — 시험지에서 읽은 값만 쓴다:
 * 학년 · 과정(학년-학기) · 대단원 · 범위 이름(첫 범위 + «외 n») · 날짜(시험일, 비었으면 오늘) · 시험 종류(W8 태그).
 */
import { describe, expect, it } from "vitest";
import { titleSuggestions } from "@/components/unified/print/suggestTitles";
import { DEFAULT_PRINT_META } from "@/components/unified/print/types";

const q = (grade: string, chapter: string, section: string) => ({
  grade,
  chapter,
  section,
});
const sheet = [
  q("중2", "부등식", "일차부등식의 해와 성질"),
  q("중2", "부등식", "일차부등식의 풀이"),
  q("중2", "부등식", "일차부등식의 풀이"),
  q("중2", "부등식", "일차부등식의 활용"),
];
const today = new Date("2026-10-16T03:00:00Z");

describe("title suggestions (W7)", () => {
  it("builds the three labelled rows from the sheet only", () => {
    expect(
      titleSuggestions({
        problems: sheet,
        meta: {
          ...DEFAULT_PRINT_META,
          semester: "1학기",
          examDate: "2026-10-16",
        },
        tag: "일일TEST",
        today,
      }),
    ).toEqual([
      {
        id: "scope",
        label: "범위 이름",
        text: "중2 일차부등식의 해와 성질 외 2 일일TEST",
      },
      {
        id: "course",
        label: "과정 · 대단원 · 날짜",
        text: "중2-1 부등식 일일TEST 10.16",
      },
      { id: "date", label: "날짜 먼저", text: "10.16 중2 부등식 일일TEST" },
    ]);
  });

  it("leaves the tag out when there is none, and uses today (Seoul) when 시험일 is empty", () => {
    const rows = titleSuggestions({
      problems: sheet.slice(0, 1),
      meta: DEFAULT_PRINT_META,
      today: new Date("2026-10-04T16:30:00Z"),
    });
    expect(rows.map((row) => row.text)).toEqual([
      "중2 일차부등식의 해와 성질",
      "중2 부등식 10.05",
      "10.05 중2 부등식",
    ]);
  });

  it("prefers the sheet's 학년 field and strips unit numbering", () => {
    const rows = titleSuggestions({
      problems: [
        q("중1", "1. 소인수분해", "소인수분해"),
        q("중1", "2. 정수와 유리수", "정수와 유리수의 덧셈"),
      ],
      meta: {
        ...DEFAULT_PRINT_META,
        grade: "중1A",
        semester: "2",
        examDate: "2026-09-03",
      },
      today,
    });
    expect(rows.map((row) => row.text)).toEqual([
      "중1A 소인수분해 외 1",
      "중1A-2 소인수분해 9.03",
      "9.03 중1A 소인수분해",
    ]);
  });

  it("drops rows it cannot fill and never repeats one", () => {
    expect(
      titleSuggestions({
        problems: [q("", "", "")],
        meta: DEFAULT_PRINT_META,
        today,
      }),
    ).toEqual([]);
    const rows = titleSuggestions({
      problems: [q("중2", "", "")],
      meta: DEFAULT_PRINT_META,
      today,
    });
    expect(new Set(rows.map((row) => row.text)).size).toBe(rows.length);
    for (const row of rows) expect(row.text.length).toBeLessThanOrEqual(80);
  });
});
