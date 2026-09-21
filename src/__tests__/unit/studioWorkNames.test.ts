import { describe, expect, it } from "vitest";
import {
  studioCropWorkKind,
  studioWorkName,
  type StudioWorkKind,
} from "@/components/unified/studioWorkNames";

/**
 * 원장님 2026-09-21 «그냥 라벨을 만들어 버리면 어때? 페이지 자동 인식 → 페이지 / 문제인식중 → 문제».
 * 좁은 칸에는 짧은 이름표, 읽는 이름·마우스 올림에는 긴 이름. 이름을 짓는 자리가 여럿이라
 * (진행 띠·펼친 칸·쪽 대기열·검수 카드·선택 상태) 한 함수에서만 짓는다 — 한 곳만 고치면 화면마다 갈린다.
 */
describe("studioWorkName — 작업실 작업 이름표", () => {
  it.each<[StudioWorkKind, string, string]>([
    ["pages", "페이지", "페이지 자동 인식"],
    ["ocr", "문제", "문제 인식"],
    ["solution", "해설", "해설 생성"],
    ["figures", "도형 인식", "도형 인식"],
    ["svg", "도형", "SVG 도형 생성"],
    ["digital", "디지털화", "디지털화"],
  ])("%s → 짧게 «%s», 길게 «%s»", (kind, short, long) => {
    expect(studioWorkName(kind)).toEqual({
      short,
      long,
      running: `${long} 중`,
    });
  });

  // 짧은 이름표는 상태를 싣지 않는다 — 상태는 돌림표·경과 시간·요약 줄이 따로 말한다.
  it("짧은 이름표에는 «중»·«완료»·«실패» 가 붙지 않는다", () => {
    for (const kind of [
      "pages",
      "ocr",
      "solution",
      "figures",
      "svg",
      "digital",
    ] as const) {
      expect(studioWorkName(kind).short).not.toMatch(/중$|완료|실패/);
    }
  });

  // 진행 띠 칸은 좁다(검수 줄에서 150~300px). 넉 자를 넘는 이름표는 다시 쪼개진다.
  it("짧은 이름표는 넉 자 이하다", () => {
    for (const kind of [
      "pages",
      "ocr",
      "solution",
      "figures",
      "svg",
      "digital",
    ] as const) {
      expect(
        studioWorkName(kind).short.replace(/\s/g, "").length,
      ).toBeLessThanOrEqual(4);
    }
  });
});

// 문항 단위 AI 작업(진행 칸 · 진행 띠 · 검수 카드)이 같은 삼항식을 세 자리에서 따로 쓰고 있었다.
describe("studioCropWorkKind — 문항 작업 동작 → 이름", () => {
  it.each([
    ["ocr", "ocr"],
    ["page-ocr", "ocr"],
    ["solution", "solution"],
    ["figures", "figures"],
  ] as const)("%s → %s", (action, kind) => {
    expect(studioCropWorkKind(action)).toBe(kind);
  });
});
