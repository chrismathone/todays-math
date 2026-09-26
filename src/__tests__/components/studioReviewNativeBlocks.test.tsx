/**
 * 🔴 RED → 🟢 — 작업실 카드가 **날 인식 블록**(`ocr.blocks`)으로 글을 다시 만들 때도 입구와 같은 후보정을 건다.
 *
 * 입구(`normalizeNativeOcr`)는 `content` 만 고쳐 저장하고 `ocr.blocks` 는 인식 그대로 둔다 — 블록은 정본이라
 * 시험지(`NativeProblem`)·HWPX 가 그대로 읽는다. 시험지는 블록을 이어 붙인 글을 렌더러 전처리(→ `normalizeMathgenText`)에
 * 넣어 그린다. 그런데 카드의 읽기·편집 원문(`studioReviewContent`)은 같은 블록을 이어 붙이고 **아무 후보정도 안 걸어**
 * `\displaystyle 5 - \frac{1}{3} …` 가 날것으로, `\(f(x)=x^2\)` 가 괄호 글 `(f(x)=x^2)` 로 보였다(부류표 B·O4).
 *
 * 판정: 카드(`SourceEditorDisplay(studioReviewContent(crop))`)와 시험지(`NativeProblem`)가 **같은 모양**이다 —
 * 보이는 글자(수식은 ⟦수식⟧ 한 덩어리)와 수식 수가 같고, 둘 다 날 TeX 가 없다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import NativeProblem from "@/components/unified/NativeProblem";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import { studioReviewContent } from "@/components/unified/studioReviewContent";
import { NativeOcrItemSchema, normalizeNativeOcr } from "@/lib/mathgen/ocr";

import { hangulCount, visibleMath } from "../helpers/visibleMathText";

const R = String.raw;
type Block = { type: "text" | "equation" | "equation_block"; value: string };

/** 인식 결과 → 입구 → 작업실 카드 한 장(본문만, 보기 없음). */
function cropOf(blocks: Block[]): StudioCrop {
  const item = NativeOcrItemSchema.parse({
    number: 1,
    contents: blocks.map((block) => ({ rows: [], ...block })),
    confidence: "high",
  });
  const { ocr, content } = normalizeNativeOcr(item);
  return {
    id: "c1",
    sourceId: "s1",
    sourceLabel: "시험지",
    page: 1,
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image: "/crop.png",
    content,
    answer: "",
    solution: "",
    level: "secondary",
    grade: "고1",
    mode: "text",
    ocr,
  };
}

/** 문단 경계·공백 차이는 빼고 본다 — 카드는 편집기 틀, 시험지는 지면 틀이다. */
const flat = (text: string) => text.replace(/\s+/g, "");

const card = (crop: StudioCrop) =>
  visibleMath(
    renderToStaticMarkup(
      <SourceEditorDisplay value={studioReviewContent(crop)} />,
    ),
  );
const paper = (crop: StudioCrop) =>
  visibleMath(
    renderToStaticMarkup(<NativeProblem problem={studioProblem(crop)} print />),
  );

/** 감사 탐침 `probe-ocr-blocks.tsx` 의 O1~O5 + 캡처 가설(K1). */
const CASES: Array<[string, Block[]]> = [
  [
    "O1 글 블록에 LaTeX 통째로",
    [
      {
        type: "text",
        value: R`\displaystyle 5 - \frac{1}{3} \times \left[\frac{9}{7}-9\right]의 값은?`,
      },
    ],
  ],
  [
    "O2 글 블록에 `\\displaystyle $$` + 한글",
    [{ type: "text", value: R`\displaystyle $$이동 거리= $x(b)-x(a)=8.$` }],
  ],
  [
    "O4 글 블록에 `\\( \\)` 구분자",
    [{ type: "text", value: R`함수 \(f(x)=x^2\)에 대하여 \(f(2)\)의 값은?` }],
  ],
  [
    "O5 수식 값에 `$` 가 붙어 옴",
    [
      { type: "equation", value: R`$\displaystyle \sum_{k=1}^{n}k$` },
      { type: "text", value: "의 값은?" },
    ],
  ],
  [
    "K1 글 블록에 샌 `\\displaystyle $$` + 수식 블록",
    [
      { type: "text", value: "구간 " },
      { type: "equation", value: "[a,b]" },
      {
        type: "text",
        value: "에서 속도가 0 이상이므로,\n" + R`\displaystyle $$이동 거리= `,
      },
      { type: "equation", value: "x(b)-x(a) = -4-(-12) = 8." },
    ],
  ],
];

describe("🔴 카드가 날 인식 블록으로 그려도 시험지와 같은 모양", () => {
  it.each(CASES)("%s", (_name, blocks) => {
    const crop = cropOf(blocks);
    const onCard = card(crop);
    const onPaper = paper(crop);
    expect(onPaper.leaks).toEqual([]);
    expect(onCard.leaks).toEqual([]);
    expect(onCard.red).toBe(0);
    expect(flat(onCard.text)).toBe(flat(onPaper.text));
    expect(onCard.math).toBe(onPaper.math);
    expect(onCard.hangul).toBe(
      hangulCount(blocks.map((block) => block.value).join("")),
    );
  });

  it("`\\(f(x)=x^2\\)` 가 괄호 글로 조용히 바뀌지 않는다(O4)", () => {
    const crop = cropOf(CASES[2]![1]);
    expect(studioReviewContent(crop)).toBe(
      R`함수 $f(x)=x^2$에 대하여 $f(2)$의 값은?`,
    );
  });

  it("편집 칸이 여는 원문도 입구가 고친 글과 같다 — 고치지 않고 저장하면 «고침»이 아니다", () => {
    for (const [, blocks] of CASES) {
      const crop = cropOf(blocks);
      expect(studioReviewContent(crop)).toBe(crop.content);
    }
  });

  it("손으로 고친 본문(`contentEdited`)은 블록이 아니라 저장된 글 그대로 연다", () => {
    const crop = cropOf(CASES[0]![1]);
    const edited = {
      ...crop,
      content: "고친 본문 $x$",
      ocr: { ...crop.ocr!, contentEdited: true },
    };
    expect(studioReviewContent(edited)).toBe("고친 본문 $x$");
  });
});
