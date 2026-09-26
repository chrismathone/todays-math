/**
 * 🔴 **판정 자는 지면과 같은 것을 본다** — 후보정 조사 J (2026-09-26).
 *
 * 코퍼스 렌더 판정 자(`testchanger/mathRenderQa.ts`)는 문자열 경로(`renderMathHtml` —
 * `tokenizeMath` + KaTeX)로 «안전»을 쟀다. 그런데 운영 화면은 전부 마크다운 지면
 * (`MathText` → react-markdown + remark-math)이다. 두 길은 같은 글을 다르게 읽는다:
 *  - 줄머리 `$$` 뒤 같은 줄 글 — remark-math 는 메타로 **버린다**(한글이 사라짐). 문자열 경로는 `$$` 가 보일 뿐이고,
 *    자는 맨 `$` 를 안 세서 «안전»이라 했다.
 *  - 문자열 경로만 회색 폴백(`math-raw`)으로 떨어지는 식이 지면에서는 멀쩡하다 — 자는 «위험»이라 했다.
 * 자와 지면이 갈리면 **틀린 자가 만점**을 받는다(교훈 «배선을 한쪽만 걸면 자와 지면이 서로 앞뒤가 맞아 아무도 안 운다»).
 *
 * 여기서는 자의 판정을 **실제로 그린 해설 지면**(`SolutionText` 렌더 결과)의 판정과 견준다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SolutionText } from "@/components/math/MathText";
import {
  buildMathRenderQa,
  checkPaperRender,
} from "@/lib/testchanger/mathRenderQa";
import type { MathCorpusInventory } from "@/lib/testchanger/mathCorpusInventory";

import { hangulOf, leaksOf, readPaperHtml } from "../helpers/paperView";

const R = String.raw;
const NL = "\n";

/** 실제 해설 지면이 깨끗한가 — 새는 글자·붉은 KaTeX·사라진 한글이 없다. */
function paperClean(text: string): boolean {
  const view = readPaperHtml(
    renderToStaticMarkup(<SolutionText text={text} />),
  );
  return (
    leaksOf(view).length === 0 &&
    view.errors === 0 &&
    view.mathRaw === 0 &&
    view.hangul >= hangulOf(text)
  );
}

const BATTERY: Array<[string, string]> = [
  ["평범한 해설", R`$\frac{1}{2}$를 소수로 나타내면 $0.5$이다.`],
  ["붙은 인라인", R`값은 $a=1$$b=2$ 이다.`],
  ["인라인 뒤 표시식", R`이동 거리는 $8$ 이고 $$s=8$$ 이다.`],
  [
    "문자열 경로만 회색 폴백 — 지면은 멀쩡",
    R`$$\text{위치} = 3,\ \text{속도} = 2 \\ \text{거리} = 8$$`,
  ],
  [
    "줄머리 짝 없는 `$$` + 한글 — 입구가 고친다(전에는 지면에서 한글이 사라졌다)",
    "구간에서 속도가 양수이므로," + NL + R`$$이동 거리 = x(b)-x(a) = 8.`,
  ],
  ["구분자 밖 명령", R`둘레는 2\pi r 이다.`],
  ["수식 안 \\( \\)", R`값은 $f\(x\)=1$ 이다.`],
  [
    "여러 줄 표시식",
    "따라서" + NL + "$$x(b)-x(a)" + NL + "= 8$$" + NL + "이다.",
  ],
  // 입구·렌더 후보정을 합친 뒤(2026-09-26)에도 지면이 깨지는 모양 — 역슬래시 둘 뒤 `$` 는 원래 뜻을 몰라
  // 손대지 않는다. 이 표본이 있어야 아래 «두 길이 갈린다» 단정이 자를 실제로 시험한다.
  ["역슬래시 둘 + `$` — 여전히 깨짐", R`값은 \\$x=2$ 이다.`],
];

describe("[J] 판정 자의 «안전»은 실제 해설 지면의 «깨끗함»과 같다", () => {
  it.each(BATTERY)("%s", (_label, text) => {
    expect(checkPaperRender(text).safe).toBe(paperClean(text));
  });

  it("🔴 이 표본은 두 길이 실제로 갈리는 자리를 품는다 — 아니면 위 대조는 아무것도 안 지킨다", () => {
    // 지면이 깨끗한 것과 깨진 것이 둘 다 있어야 자가 «늘 예»나 «늘 아니오»여도 들킨다.
    const verdicts = new Set(BATTERY.map(([, text]) => paperClean(text)));
    expect(verdicts).toEqual(new Set([true, false]));
  });
});

describe("[J] buildMathRenderQa 의 표본 판정도 같은 자를 쓴다", () => {
  const inventory = (texts: string[]): MathCorpusInventory => ({
    sourceDir: "",
    files: 1,
    stringsScanned: texts.length,
    unicodeSymbols: [],
    latexCommands: [
      {
        token: R`\text`,
        occurrences: 1,
        files: 1,
        mathContextCount: 1,
        examples: [],
      },
    ] as unknown as MathCorpusInventory["latexCommands"],
    candidates: texts.map((renderText, i) => ({
      id: `c${i}`,
      file: "f.json",
      jsonPath: `$[${i}]`,
      renderText,
      isMath: true,
      commands: [R`\text`],
      unicodeSymbols: [],
    })),
  });

  it("지면에서 멀쩡한 `\\text` 표본은 «안전»으로 센다", () => {
    const text = BATTERY[3]![1];
    expect(paperClean(text)).toBe(true);
    const qa = buildMathRenderQa(inventory([text]));
    expect(qa.missingLatexCommands).toEqual([]);
    expect(qa.specimens).toHaveLength(1);
  });
});
