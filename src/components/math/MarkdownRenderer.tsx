/**
 * mathgen 렌더링 하네스 이식 — 정본: `mathgen-ai/components/MarkdownRenderer.tsx`.
 *
 * mathgen 과 동일한 파이프라인(react-markdown + remark-math + rehype-katex)을 그대로 쓴다.
 * 새로 만들지 말 것 — 이미 검증된 렌더러를 가져와 쓰는 것이 이 파일의 존재 이유다.
 *
 * 원본과의 차이(우리 데이터 사정):
 *  1. 입력이 OCR 이관본이라 `decodeHtmlEntities` + `preprocessMathText`(유니코드 수학기호,
 *     `\dfrac`→`\frac` 등)를 먼저 태운다. mathgen 입력은 모델 생성물이라 필요 없었다.
 *  2. 인라인 문맥(`as="span"`)에서 문단(`<p>`)이 나오면 HTML 이 깨지므로 span 으로 낮춘다.
 *  3. `<보기>`·`<조건>` 상자는 문단 단위로 항목을 잡는다 (아래 `BoxQuote` 주석).
 *
 * ⚠️ KaTeX CSS 는 `src/app/layout.tsx`가 한 번만 로드한다 (mathgen 은 index.html 의 CDN link).
 *
 * ── 성능 (2026-08-17) ────────────────────────────────────────────────────────
 * 이 파일은 문제은행 20카드·검수 30문항·인쇄 지면이 모두 지나가는 목이다.
 * react-markdown v10 은 렌더마다 unified 프로세서를 새로 조립해(createProcessor)
 * 마크다운 파싱 + KaTeX 를 전부 다시 돈다. 그래서 아래 셋을 지킨다 —
 * **성능 수리로는 출력 HTML 이 한 글자도 달라지지 않는다**
 * (`renderParity.test.tsx` 가 잠근다. 상자 렌더처럼 **의도한** 변경은 그 파일의
 *  변경 이력에 무엇이 왜 달라졌는지 적고 새 케이스를 추가한 뒤에만 갱신한다).
 *  (1) 플러그인 배열·`components` 맵·인라인 style 은 모듈 스코프 상수.
 *      특히 `components` 는 매 렌더 새 함수를 넘기면 React 가 `<p>`/`<blockquote>`
 *      를 **다른 타입**으로 보고 그 아래 KaTeX DOM 을 통째로 버렸다 다시 만든다.
 *  (2) 전처리 결과는 모듈 캐시(입력 문자열 → 결과).
 *  (3) 컴포넌트 자체를 `React.memo`.
 */
import {
  Children,
  cloneElement,
  isValidElement,
  memo,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { PluggableList } from "unified";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import {
  remarkEmptyBlockquotes,
  remarkNativeContent,
} from "./remarkNativeContent";
import { remarkFormulaLines } from "./remarkFormulaLines";
import { figureWidthStyle } from "@/lib/figurePrintSize";
import { BoxQuoteCard } from "./BoxQuoteCard";
import { StaticBoxQuoteCard } from "./StaticBoxQuoteCard";

import {
  BOX_HEADER_RE as SHARED_BOX_HEADER_RE,
  parseBoxHeader,
  SIDE_BY_SIDE_LABEL,
  type BoxColumns,
} from "@/lib/math/boxHeader";
import { UI_KATEX_OPTIONS } from "@/lib/math/katexRender";
import { preprocessMarkdown } from "@/lib/math/markdownPreprocess";

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** 인라인 문맥이면 문단 대신 span 으로 렌더한다 (인쇄 정답란 등). */
  inline?: boolean;
  /** Numbered source figures are replaced in-place, including inside choices. */
  nativeFigures?: ReadonlyArray<{
    src: string;
    sourceMm?: number;
    maxWidthMm?: number;
  }>;
  /** Decorate a native anchor using its original zero-based source index. */
  renderNativeFigure?: (index: number, image: ReactNode) => ReactNode;
  emphasizeNegation?: boolean;
  /** 서버/인쇄 공통 고정 지면에서는 상자 열 수를 DOM으로 다시 재지 않는다. */
  staticLayout?: boolean;
  /**
   * 발문의 «글 뒤 식만 있는 문단»을 가운데 + 한 줄 여백으로(원장님 2026-10-20 — `lib/math/formulaLine.ts`).
   * 발문(`ProblemContent`)만 켠다. 보기 · 상자 · 정답 · 해설은 끈 채다.
   */
  formulaLines?: boolean;
}

/** 렌더마다 새 배열을 넘기면 react-markdown 이 프로세서를 새로 조립한다. */
const REMARK_PLUGINS = [remarkMath, remarkEmptyBlockquotes];
const REMARK_PLUGINS_FORMULA = [...REMARK_PLUGINS, remarkFormulaLines];
/**
 * ⚠️ **옵션을 반드시 넘긴다.** 안 넘기면 `trust` 가 없어 KaTeX 가 `\htmlClass` 를
 * 거부하는데, 예외가 아니라 **붉은 날문자**(`color:#cc0000`)로 그린다.
 * 그런데 `\htmlClass` 는 **우리 전처리가 스스로 만든다**(순환마디 점·호 ⌒) —
 * 즉 우리가 만든 글자를 우리 렌더가 거부하고 있었다. 실측 320행 · 수식 787곳.
 * 근거와 옵션 내용은 `katexRender.ts` 의 `UI_KATEX_OPTIONS` 주석.
 */
const REHYPE_PLUGINS: PluggableList = [[rehypeKatex, UI_KATEX_OPTIONS]];

/* ──────────────────────────────────────────────────────────────────────────
 * `<보기>` · `<조건>` 상자 카드 — mathgen MarkdownRenderer 1011~1028행 이식.
 *
 * 정본과 같은 판정: **명시적 마커가 첫 줄에 있을 때만** 그리드로 바꾼다.
 * 마커가 없는 인용문(다단계 계산식 등)은 종전 테두리 div 그대로다 —
 * 그래야 상자 아닌 문항의 렌더가 한 글자도 안 바뀐다.
 *
 * 정본과 다른 두 가지, 이유:
 *  1. **항목을 `<br>` 이 아니라 «문단» 단위로 잡는다.** 정본은 `remark-breaks` 로
 *     부드러운 줄바꿈을 `<br>` 로 만든 뒤 그걸 잘라 항목을 센다. 이 저장소는
 *     remark-breaks 를 안 쓰고(새 의존성 금지) 넣을 이유도 없다 —
 *     `parseProblemContent` 가 항목마다 빈 `>` 줄을 넣어 문단으로 만들어 준다.
 *  2. **정본 표기 `<보기:cols=N>` 는 수식 전처리 직전에만 `<보기N>` 으로 옮겨 적는다.**
 *     `preprocessMathText`(Step 9 자동 wrap)가 `cols=2` 를 수식으로 감싸 KaTeX 로
 *     그려 버리기 때문이다(실측). 숫자만 붙인 형태는 전처리를 그대로 통과한다.
 *     그 옮김은 이 파일 안에서만 일어난다 — 원문·편집기·인식의 표기는 정본 하나다(`boxHeader.ts`).
 *  3. **열 수와 칸은 `layoutQuotedBoxes` 가 정한다** — 검수 카드와 같은 규칙이다(트랙 46).
 *     여러 열이면 칸마다 문단이 되어 온다. 이 파일은 «문단 하나 = 칸 하나» 만 안다.
 *  4. **좁은 단에서 그리는 열 수·여백은 `BoxQuoteCard` 가 실제 조판에서 고른다**(트랙 51) —
 *     칸이 한 줄에 안 들면 여백을 줄여 보고, 그래도 안 되면 열을 줄여 그린다. 적힌 열 수는 그대로다.
 *  5. **`<나란히:cols=N>` 은 같은 칸 규칙의 «칸 묶음»이다**(원장님 2026-09-22) — 제목·테두리 없이
 *     1~4열. 서답형 소문항 (1)~(4) 처럼 그림을 단 항목을 나란히 세운다. 칸 안 그림은 칸 폭에 맞춰 준다.
 * ────────────────────────────────────────────────────────────────────────── */

/** 인용문 첫 문단의 상자 머리 — 정본·옛 표기 모두(`boxHeader.ts`). 숫자 없으면 1열. */
const BOX_HEADER_RE = SHARED_BOX_HEADER_RE;

// 머리 줄 `<보기:cols=N>` 옮겨 적기(`protectBoxHeaders`)는 전처리와 함께 `lib/math/markdownPreprocess.ts` 로 갔다.

/**
 * 라벨 머리를 그리지 않는 상자. 원장님(2026-08-18) "다음 작은 수를 네모 박스 안에
 * 넣으면 더 깔끔할텐데" — 발문 뒤 **나열 대상**은 «보기»도 «조건»도 아니라서
 * 머리에 라벨을 얹으면 없던 이름이 생긴다. 테두리만 두른다.
 *
 * 🔴 `상자` 도 여기 있다 — 그 낱말은 **라벨이 아니라 «상자다»라는 표시**다.
 *    라벨로 그리면 지면에 〈상자〉라는 없던 이름이 찍힌다. 2026-09-06 에 기출 문3 이
 *    실제로 그렇게 나갔고 **원장님이 화면에서 찾으셨다** — 원본에는 테두리만 있고
 *    라벨이 없다(원본 지면을 렌더해 확인했다).
 *
 * ⚠️ **고칠 자리가 여기인 까닭.** 처음엔 적재기가 `<상자>` 대신 `<나열>` 을 넣게 고쳤는데,
 *    `나열` 은 **입력 마커가 아니라** `renderBoxSegment` 가 내부에서 만드는 표기다
 *    (`boxBlock` 이 아는 입력은 `보기|조건|상자` 셋뿐이다). 그래서 상자가 아예 안 서고
 *    **`<나열>` 이 날 글자로 지면에 찍혔다** — 스크린샷으로 잡았다. 본문에는 `boxBlock` 이
 *    아는 마커를 넣고, **머리를 안 그리는 일은 여기서** 한다. 그러면 이미 실린 행도
 *    함께 나아진다.
 */
const HEADERLESS_LABELS = new Set(["나열", "상자"]);

const QUOTE_CLASS =
  "my-4 border border-[#8A8A88] bg-white p-4 not-italic print:border-black";
/** 넓은 수식이 카드를 밀어내지 않게 — 정본 1040행의 오버플로 보정과 같은 취지. */
const BOX_CARD_CLASS = `${QUOTE_CLASS} max-w-full overflow-hidden print:break-inside-avoid [&_.katex-display]:overflow-x-auto`;
/**
 * «나란히» 칸 묶음 — 테두리·배경·안쪽 여백·제목이 **없다**(원장님 2026-09-22). 칸만 선다.
 * 위아래 `my-2` 는 인쇄 높이 자(`SIDE_BY_SIDE_CHROME_PX`)가 같은 값으로 센다 — 바꾸면 거기도.
 */
const SIDE_CARD_CLASS =
  "my-2 max-w-full overflow-hidden not-italic print:break-inside-avoid [&_.katex-display]:overflow-x-auto";

/**
 * 열 수별 격자 — Tailwind 가 읽도록 **글자 그대로** 적는다(`md:grid-cols-${n}` 로 짜면 클래스가 안 생긴다).
 * 격자 칸은 기준선 맞춤(`items-baseline`), 그림 칸만 위쪽(`has-[img]:self-start`) — 트랙 51.
 */
const GRID_CLASS: Record<BoxColumns, string> = {
  1: "space-y-1",
  2: "grid grid-cols-1 items-baseline gap-x-6 gap-y-1 md:grid-cols-2 print:grid-cols-2",
  3: "grid grid-cols-1 items-baseline gap-x-6 gap-y-1 md:grid-cols-3 print:grid-cols-3",
  4: "grid grid-cols-1 items-baseline gap-x-6 gap-y-1 md:grid-cols-4 print:grid-cols-4",
};

/** 문단 안의 글자만 이어 붙인다. 헤더 판정은 **맨 앞** 글자만 보면 되므로 충분하다. */
function textOf(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return textOf(props.children);
  }
  return "";
}

/**
 * 지면에 찍히는 라벨의 괄호 — **홑화살괄호**다(D-108, 2026-08-25).
 *
 * 본문 규약은 여전히 ASCII `<보기>` 이고(파서·DB·`BOX_HEADER_RE` 전부 그대로),
 * **지면에 그리는 순간에만** 바꾼다. ASCII `<>` 를 그대로 찍으면 태그처럼 읽히고,
 * 실제로 이 저장소에서 `<나열1>` 이 날문자로 지면에 나간 사고가 있었다.
 */
const LABEL_OPEN = "〈";
const LABEL_CLOSE = "〉";

/** Remove only the marker; old OCR quotes may put body lines in this paragraph. */
function stripBoxMarker(node: ReactNode): ReactNode {
  if (typeof node === "string") return node.replace(BOX_HEADER_RE, "");
  if (Array.isArray(node)) return node.map(stripBoxMarker);
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    if (props.children === undefined) return node;
    return cloneElement(
      node as ReactElement<{ children?: ReactNode }>,
      undefined,
      stripBoxMarker(props.children),
    );
  }
  return node;
}

/** Keep KaTeX/media nodes intact while splitting old compact header paragraphs. */
function headerBodyLines(node: ReactNode): ReactNode[] {
  const lines: ReactNode[][] = [[]];
  for (const child of Children.toArray(stripBoxMarker(childrenOf(node)))) {
    if (isValidElement(child) && child.type === "br") lines.push([]);
    else lines[lines.length - 1].push(child);
  }
  return lines
    .filter((line) =>
      line.some((child) => typeof child !== "string" || child.trim()),
    )
    .map((line, index) => (
      <p key={index} className="leading-relaxed">
        {line}
      </p>
    ));
}

function childrenOf(node: ReactNode): ReactNode {
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return props.children;
  }
  return node;
}

function BoxQuote({
  children,
  staticLayout = false,
}: {
  children?: ReactNode;
  staticLayout?: boolean;
}) {
  // 인용문 자식에는 문단 사이의 개행 문자열이 섞여 온다 — 그것부터 걸러야
  // 첫 문단이 헤더 자리에 온다(안 거르면 헤더 판정이 항상 빗나간다).
  const blocks = Children.toArray(children).filter(
    (block) => !(typeof block === "string" && block.trim() === ""),
  );
  const header = parseBoxHeader(textOf(blocks[0]).trim());
  // 마커가 없으면 예전 인용문 그대로 — 여기서 갈라야 렌더 회귀가 없다.
  if (!header) return <div className={QUOTE_CLASS}>{children}</div>;

  const { label } = header;
  // «나란히» 는 상자가 아니라 칸 묶음이다 — 제목·테두리 없이 칸만(원장님 2026-09-22).
  const side = label === SIDE_BY_SIDE_LABEL;
  const headerless = side || HEADERLESS_LABELS.has(label);
  const columns = header.cols ?? 1;
  // Older native serializers emitted label + contents in one paragraph. A
  // heading is only the label; never center or bold those continuation lines.
  const items = [...headerBodyLines(blocks[0]), ...blocks.slice(1)];

  // 좁은 단에서 그리는 열 수·여백은 카드가 실제 조판에서 고른다(`BoxQuoteCard`, 트랙 51).
  const Card = staticLayout ? StaticBoxQuoteCard : BoxQuoteCard;
  return (
    <Card
      className={side ? SIDE_CARD_CLASS : BOX_CARD_CLASS}
      label={headerless ? null : `${LABEL_OPEN}${label}${LABEL_CLOSE}`}
      columns={columns}
      sideBySide={side}
      gridClassName={GRID_CLASS[columns]}
      itemClassName="min-w-0 break-words text-left font-normal has-[img]:self-start [&>p]:my-0"
      items={items}
    />
  );
}

/**
 * 식 문단의 여백은 **인라인 스타일**이다 — 인쇄 지면의 `.document p{margin:0}`(WorksheetPrint.module.css)를 이겨야 한다.
 * 한 줄 = `1lh`(그 문단의 줄 높이). 높이 자는 같은 규칙으로 `line` 한 줄씩 더한다(`formulaGapLines`).
 */
const FORMULA_LINE_STYLE: CSSProperties = {
  textAlign: "center",
  marginBlockStart: "1lh",
};

const BLOCK_COMPONENTS: Components = {
  p: ({ children, node }) => {
    return node?.properties?.dataFormulaLine !== undefined ? (
      <p className="leading-relaxed" data-formula-line="" style={FORMULA_LINE_STYLE}>
        {children}
      </p>
    ) : (
      <p className="leading-relaxed">{children}</p>
    );
  },
  blockquote: ({ children }) => <BoxQuote>{children}</BoxQuote>,
};

const INLINE_COMPONENTS: Components = {
  p: ({ children }) => <span>{children}</span>,
  blockquote: BLOCK_COMPONENTS.blockquote,
};

const STATIC_BLOCK_COMPONENTS: Components = {
  ...BLOCK_COMPONENTS,
  blockquote: ({ children }) => <BoxQuote staticLayout>{children}</BoxQuote>,
};
const STATIC_INLINE_COMPONENTS: Components = {
  ...INLINE_COMPONENTS,
  blockquote: STATIC_BLOCK_COMPONENTS.blockquote,
};

const INLINE_STYLE: CSSProperties = { display: "inline" };

/**
 * 전처리(상자 머리 옮김 · 수식 후보정 · lim 첨자 · 하드 브레이크, 모듈 캐시)는
 * `lib/math/markdownPreprocess.ts` 에 있다 — 코퍼스 판정 자(`testchanger/mathRenderQa.ts`)가
 * **같은 함수**로 재도록 옮겼다(2026-09-26, 후보정 조사 J). 이 렌더러가 부르는 것은 그 하나다.
 */
const preprocess = preprocessMarkdown;

/**
 * 이 저장소의 첫 `React.memo` 다. 여기에 쓰는 이유:
 * props 가 전부 원시값(문자열/불리언)이라 얕은 비교가 정확하고, 막아 주는 일이
 * 마크다운 파싱 + KaTeX 조판이라 한 번 막을 때 아끼는 양이 크다. 문제은행은
 * 패널·안내문 상태 하나만 바뀌어도 20카드가 다시 렌더되는 구조라 실제로 막힌다.
 * (장식용 컴포넌트에 memo 를 뿌리지 말 것 — 비교 비용만 늘어난다.)
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = "",
  inline = false,
  nativeFigures,
  renderNativeFigure,
  emphasizeNegation = false,
  staticLayout = false,
  formulaLines = false,
}: MarkdownRendererProps) {
  const processed = preprocess(content ?? "");
  const components = staticLayout
    ? inline
      ? STATIC_INLINE_COMPONENTS
      : STATIC_BLOCK_COMPONENTS
    : inline
      ? INLINE_COMPONENTS
      : BLOCK_COMPONENTS;
  const nativeComponents: Components = nativeFigures
    ? {
        ...components,
        img: ({ src, alt }) => {
          const index =
            typeof src === "string"
              ? /^#mathgen-figure-(\d+)$/.exec(src)
              : null;
          const figure = index
            ? nativeFigures[Number(index[1]) - 1]
            : undefined;
          // Data URLs stay image resources; never insert editable SVG markup as HTML.
          const image = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={figure?.src ?? src}
              alt={alt ?? "문항 그림"}
              className="mx-auto block h-auto max-w-full mix-blend-multiply"
              style={figureWidthStyle(figure?.sourceMm, figure?.maxWidthMm)}
            />
          );
          return figure && renderNativeFigure
            ? renderNativeFigure(Number(index![1]) - 1, image)
            : image;
        },
      }
    : components;

  return (
    <div
      className={`prose prose-slate max-w-none prose-p:my-2 prose-headings:my-3 ${className}`}
      style={inline ? INLINE_STYLE : undefined}
    >
      <ReactMarkdown
        remarkPlugins={
          nativeFigures || emphasizeNegation
            ? [
                ...(formulaLines ? REMARK_PLUGINS_FORMULA : REMARK_PLUGINS),
                [
                  remarkNativeContent,
                  {
                    figureCount: nativeFigures?.length ?? 0,
                    emphasizeNegation,
                  },
                ],
              ]
            : formulaLines
              ? REMARK_PLUGINS_FORMULA
              : REMARK_PLUGINS
        }
        rehypePlugins={REHYPE_PLUGINS}
        components={nativeComponents}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
});
