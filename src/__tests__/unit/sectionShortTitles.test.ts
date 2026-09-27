// @vitest-environment node
/**
 * 진도판 칸 줄임말 표 (D-142 ⑺, 원장님 2026-09-28 확정 — 그록 · 코덱스 · Claude 합의 + 대단원 표기 맞춤).
 * 칸에서만 쓴다 — 가운데 · 다른 화면 · 기록 · 화면 읽기는 원래 이름. 표의 모든 줄이 칸에 0.9배 이상으로 들어가는지는
 * 실측(`scripts/qa/daily-journey-board.mjs`)이 잰다.
 */
import { describe, expect, it } from "vitest";
import { definitionUnits } from "@/lib/math-explorers/definition-cards";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import {
  SECTION_SHORT_TITLES,
  tileTitle,
} from "@/lib/math-srs/elementary/sectionShortTitles";

const byId = new Map(COURSE_SECTIONS.map((section) => [section.id, section]));
const paren = /\([^()]+\)\s*[×÷+-]\s*\(/;
const bare = /[가-힣0-9]\s*[×÷]\s*[가-힣0-9]/;

describe("칸 줄임말 표", () => {
  it("표의 원래 이름은 교육과정 그 소단원의 이름 그대로이고, 교육과정 · 개념 단원에서 하나뿐이다(이름으로 찾아도 안 헷갈린다)", () => {
    expect(SECTION_SHORT_TITLES).toHaveLength(33);
    for (const row of SECTION_SHORT_TITLES) {
      expect(byId.get(row.id)?.title).toBe(row.original);
      expect(
        COURSE_SECTIONS.filter((s) => s.title === row.original),
      ).toHaveLength(1);
      expect(definitionUnits.some((u) => u.title === row.original)).toBe(false);
      expect(row.short).not.toBe(row.original);
      expect([...row.short].length).toBeLessThan([...row.original].length);
    }
    expect(new Set(SECTION_SHORT_TITLES.map((row) => row.id)).size).toBe(33);
  });
  it("칸에 보일 이름 — 표에 있으면 줄임말, 없으면 원래 이름 그대로", () => {
    expect(
      tileTitle("받아올림이 두 번, 세 번 있는 (세 자리 수)+(세 자리 수)"),
    ).toBe("세 자리 수 덧셈 (받아올림 두·세 번)");
    expect(tileTitle("진분수의 덧셈")).toBe("진분수의 덧셈");
    expect(tileTitle("연립일차방정식")).toBe("연립일차방정식");
  });
  it("한 대단원 안에서는 칸 이름의 수식 표기가 한 꼴 — 괄호 «(소수)÷(자연수)» 와 맨 꼴 «소수÷자연수» 가 섞이지 않는다", () => {
    const mixed = [...new Set(COURSE_SECTIONS.map((s) => s.chapterId))].filter(
      (chapter) => {
        const kinds = new Set(
          COURSE_SECTIONS.filter((s) => s.chapterId === chapter)
            .map((s) => tileTitle(s.title))
            .map((t) => (paren.test(t) ? "괄호" : bare.test(t) ? "맨 꼴" : ""))
            .filter(Boolean),
        );
        return kinds.size > 1;
      },
    );
    expect(mixed).toEqual([]);
  });
});
