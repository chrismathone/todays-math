import { describe, expect, it } from "vitest";

import {
  MAIN_ROW_GRID,
  MAIN_ROW_INNER,
  MAIN_ROW_OUTER,
} from "@/lib/main/pipeline";

/**
 * 메인 목록의 칸이 **한 줄로 서는지**를 잠근다.
 *
 * 행을 눌러 반을 고르게 되면서(2026-08-26) 행이 「고르는 버튼 + 액션」 두 조각이 됐다.
 * 그런데 완료 행(`DoneSummaryRow`)과 진행 행(`ClassCard`)이 **다른 상수**를 쓰므로,
 * 한쪽만 고치면 같은 화면에서 칸이 밀린다. 눈으로는 몇 px 라 잘 안 보인다.
 *
 * ⚠️ 기대값을 상수에서 **만들어** 쓰지 않는다. 그러면 상수를 바꿔도 기대값이 같이
 *    움직여 늘 초록이 된다(이 저장소가 여러 번 겪은 「지표의 참이 제품에서 온다」).
 *    그래서 폭을 **리터럴로 못 박고**, 합이 맞는지도 직접 센다.
 */
function cols(cls: string): string[] {
  const m = cls.match(/grid-cols-\[([^\]]+)\]/);
  if (!m) throw new Error(`grid-cols 를 못 찾았다: ${cls}`);
  return m[1]!.split("_");
}

function gap(cls: string): number {
  const m = cls.match(/gap-(\d+)/);
  if (!m) throw new Error(`gap 을 못 찾았다: ${cls}`);
  return Number(m[1]) * 4; // Tailwind gap-4 = 16px
}

describe("메인 행 격자", () => {
  it("네 칸짜리 원본은 44 · 1fr · 232 · 112 이다", () => {
    expect(cols(MAIN_ROW_GRID)).toEqual([
      "44px",
      "minmax(0,1fr)",
      "232px",
      "112px",
    ]);
  });

  it("쪼갠 둘을 합치면 원본과 같은 칸이 된다", () => {
    // 바깥은 「나머지 전부 + 액션 112px」
    expect(cols(MAIN_ROW_OUTER)).toEqual(["minmax(0,1fr)", "112px"]);
    // 안쪽은 「번호 44 + 이름 나머지 + 게이지 232」
    expect(cols(MAIN_ROW_INNER)).toEqual(["44px", "minmax(0,1fr)", "232px"]);

    // 합쳐서 원본 넷과 같은 순서가 나와야 한다.
    const merged = [...cols(MAIN_ROW_INNER), cols(MAIN_ROW_OUTER)[1]!];
    expect(merged).toEqual(cols(MAIN_ROW_GRID));
  });

  it("gap 이 안팎으로 같다 — 다르면 액션 칸만 어긋난다", () => {
    expect(gap(MAIN_ROW_OUTER)).toBe(gap(MAIN_ROW_GRID));
    expect(gap(MAIN_ROW_INNER)).toBe(gap(MAIN_ROW_GRID));
  });

  it("바깥만 좌우 여백을 준다 — 안쪽이 또 주면 이름이 밀린다", () => {
    expect(MAIN_ROW_OUTER).toContain("px-6");
    expect(MAIN_ROW_INNER).not.toContain("px-");
  });
});
