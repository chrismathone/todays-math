/**
 * 🔴 편집 칸이 이미 **굳혀 저장한** 누출은 모든 출구에서 같은 모양으로 되살아나야 한다 (2026-09-26, 트랙 합치기).
 *
 * 편집 칸은 한 번 저장하면 글 노드의 `\`·`$` 를 이스케이프한다(`visualDocument.ts`) — 원장님 캡처 모양이
 * 저장되면 `\\displaystyle \$\$이동 거리= …` 로 굳는다(원장님 브라우저 IndexedDB 에 남아 있을 수 있다).
 * 편집기(T1 `sourceRepair.ts`)만 이것을 되살리면 편집 칸은 낫는데 **해설 읽기·정답지·검수**는 역슬래시와 달러를
 * 그린다 — «모든 화면 일치» 위반. 그래서 입구 후보정(`normalizeMathgenText`)도 같은 되살리기를 먼저 부른다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import { SolutionText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";

import { hangulOf, leaksOf, readPaperHtml } from "../helpers/paperView";
import { visibleMath } from "../helpers/visibleMathText";

const R = String.raw;
const L1 = "구간 $[a,b]$에서 속도가 0 이상이므로,";
const FROZEN =
  `${L1}\n` + R`\\displaystyle \$\$이동 거리= $x(b)-x(a) = -4-(-12) = 8.$`;
const FROZEN_SAME_LINE =
  `${L1} ` + R`\\displaystyle \$\$이동 거리= $x(b)-x(a) = -4-(-12) = 8.$`;
const HANGUL = hangulOf("구간에서 속도가 이상이므로 이동 거리");

const exits = {
  "정답지·작업실 해설 읽기(SolutionText)": (text: string) =>
    readPaperHtml(renderToStaticMarkup(<SolutionText text={text} />)),
  "검수·본문(ProblemContent)": (text: string) =>
    readPaperHtml(renderToStaticMarkup(<ProblemContent content={text} />)),
};

describe.each([
  ["줄머리", FROZEN],
  ["같은 줄", FROZEN_SAME_LINE],
])("굳은 저장본(%s)", (_label, frozen) => {
  it("입구 후보정이 이스케이프를 풀고 지시어·가짜 `$$` 를 걷는다", () => {
    const fixed = normalizeMathgenText(frozen);
    expect(fixed).toContain("이동 거리= $x(b)-x(a) = -4-(-12) = 8.$");
    expect(fixed).not.toMatch(/displaystyle|\\\$/);
    expect(normalizeMathgenText(fixed)).toBe(fixed);
  });

  it.each(Object.entries(exits))(
    "%s — 날 글자 0 · 한글 그대로",
    (_exit, render) => {
      const view = render(frozen);
      expect(leaksOf(view)).toEqual([]);
      expect(view.errors).toBe(0);
      expect(view.hangul).toBe(HANGUL);
    },
  );

  it("작업실 편집기 읽기 칸도 같은 모양", () => {
    const view = visibleMath(
      renderToStaticMarkup(<SourceEditorDisplay value={frozen} />),
    );
    expect(view.leaks).toEqual([]);
    expect(view.red).toBe(0);
    expect(view.hangul).toBe(HANGUL);
  });
});

it("대조 — 사람이 친 역슬래시·화폐는 되살리지 않는다", () => {
  for (const kept of [R`C:\\data 폴더`, R`가격은 \$5 이다.`])
    expect(normalizeMathgenText(kept)).toBe(kept);
});
