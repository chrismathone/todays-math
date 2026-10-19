import { describe, expect, it } from "vitest";
import {
  studentCurriculumName,
  studentDateLabel,
  studentDueLabel,
  curriculumName,
  stepNames,
} from "@/components/fading/labels";

describe("student-only display labels", () => {
  it("keeps names and mathematical quantities while removing curriculum identifiers", () => {
    expect(
      studentCurriculumName(
        "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
      ),
    ).toBe("수의 범위와 어림하기 · 이상과 이하 알아보기");
    expect(studentCurriculumName("2-1-1 · 이상과 이하 알아보기")).toBe(
      "이상과 이하 알아보기",
    );
    expect(studentCurriculumName("삼각형의 세 각의 합은 180°")).toBe(
      "삼각형의 세 각의 합은 180°",
    );
    expect(curriculumName("2-1-1 이상과 이하 알아보기")).toBe(
      "2-1-1 · 이상과 이하 알아보기",
    );
    expect(stepNames[1]).toBe("정독");
  });
  it.each([
    ["2026-10-20", "오늘"],
    ["2026-10-21", "내일"],
    ["2026-10-22", "모레"],
    ["2026-10-23", "3일 뒤"],
    ["2026-11-02", "13일 뒤"],
    ["2026-10-19", "1일 전"],
  ])("shows %s as %s without changing dates", (date, label) => {
    expect(studentDateLabel(date, "2026-10-20")).toBe(label);
  });
  it("handles a year boundary and does not echo an invalid date", () => {
    expect(studentDateLabel("2027-01-01", "2026-12-31")).toBe("내일");
    expect(studentDateLabel("not-a-date", "2026-10-20")).toBe("다음에");
    expect(studentDueLabel(1)).toBe("내일 복습");
    expect(studentDueLabel(2)).toBe("모레 복습");
  });
});
