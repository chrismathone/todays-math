/**
 * 🔴 RED → 🟢 — 검수 콘솔 행 매퍼 (2026-08-24).
 *
 * 잠그는 것: **서버 페이지와 API 가 같은 모양을 낸다.**
 * 예전에는 페이지가 손으로 매핑하고 API 는 `serializeProblem` 을 써서 두 모양이 달랐고,
 * 클라이언트가 `as ConsoleProblem[]` 로 캐스팅해 받아 **타입이 그 차이를 못 잡았다.**
 * 더 불러온 문항부터 그림 치수·단원명이 조용히 사라졌다.
 */
import { describe, expect, it } from "vitest";

import { toConsoleRow, type ProblemWithUnit } from "@/lib/review/consoleRow";

const row = {
  id: "p1",
  problemCode: "J30501-79GN",
  content: "본문",
  answer: "④",
  solution: null,
  questionType: "객관식",
  figureUrls: ["/figures/a.png"],
  figureDims: [10, 20],
  figureSourceMm: [30, 40],
  directUseAllowed: true,
  source: "past_exam",
  sourceFile: "N:/기출/동도중.PDF",
  school: "동도중",
  subject: null,
  examId: "rpm-middle-3-2",
  questionNumber: 5,
  solutionSource: "original",
  unit: { grade: "중3", section: "삼각비의 뜻" },
} as unknown as ProblemWithUnit;

describe("[검수] 콘솔 행 매퍼", () => {
  it("원본 메타데이터를 그대로 실어 보낸다", () => {
    const out = toConsoleRow(row);
    expect(out.source).toBe("past_exam");
    expect(out.sourceFile).toBe("N:/기출/동도중.PDF");
    expect(out.school).toBe("동도중");
    expect(out.examId).toBe("rpm-middle-3-2");
    expect(out.questionNumber).toBe(5);
    expect(out.solutionSource).toBe("original");
  });

  /**
   * 이 검사가 무는 것: 예전에 API 가 떨어뜨리던 필드들이 **매퍼를 거치면 반드시 산다**.
   * 하나라도 빠지면 빨개진다.
   */
  it("예전에 API 가 떨어뜨리던 필드가 전부 산다", () => {
    const out = toConsoleRow(row);
    expect(out.questionType).toBe("객관식");
    expect(out.figureDims).toEqual([10, 20]);
    expect(out.figureSourceMm).toEqual([30, 40]);
    expect(out.unitName).toBe("중3 · 삼각비의 뜻");
  });

  it("단원이 없으면 «—» 로 둔다", () => {
    const out = toConsoleRow({
      ...row,
      unit: null,
    } as unknown as ProblemWithUnit);
    expect(out.unitName).toBe("—");
  });
});
