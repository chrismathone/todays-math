import { describe, expect, it } from "vitest";
import { visibleStudioWarnings } from "@/components/unified/studioHelpers";

/** 2026-09-19 원장님 작업실 피드백(트랙 1)의 판정 함수들 — 화면 여러 곳이 같은 기준을 쓴다. */
describe("8 · 옛 «원본 대조 확인 필요» 멘트", () => {
  it("저장된 초안에 남은 원본 대조 멘트만 거르고 나머지 경고는 그대로 둔다", () => {
    expect(
      visibleStudioWarnings([
        "원본 대조 확인 필요: 각의 크기가 다릅니다.",
        "보기 5번을 확인해 주세요.",
        "원본 대조 확인 필요",
        "  원본 대조 확인 필요: 앞 공백",
      ]),
    ).toEqual(["보기 5번을 확인해 주세요."]);
  });
  it("경고가 없으면 빈 목록", () => {
    expect(visibleStudioWarnings(undefined)).toEqual([]);
  });
});
