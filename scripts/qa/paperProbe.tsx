/**
 * 지면 실측 하네스 — **진짜 A4 지면**을 Chromium 에 그려 높이를 재는 공용 도구 (읽기 전용).
 *
 * 왜 필요한가: `printOverflow.ts` 의 줄 수 추정은 근사다. 「잘렸는가」는 근사로 답할 수
 * 없고, jsdom 은 높이를 주지 않는다. 그래서 실제 CSS 로 그려서 잰다.
 *
 * 무엇을 쓰는가 (셋 다 **제품이 쓰는 것 그대로**여야 한다)
 *  1. `katex/dist/katex.min.css` — 화면·인쇄가 `src/app/layout.tsx` 에서 로드하는 것.
 *  2. Tailwind 산출물 — `src/app/globals.css` 를 postcss 로 실제 빌드한다. 손으로
 *     유틸리티 값을 옮겨 적으면 그 순간부터 측정이 지면과 갈린다.
 *  3. `TestPrint.module.css` **원문** — 클래스 이름을 해시하지 않고 그대로 쓰므로
 *     아래 `renderPage` 가 만드는 DOM(=JaseupTemplate 의 DOM)과 그대로 맞는다.
 *
 * ⚠️ 측정이 조용히 거짓이 되는 함정 — 넷 다 실제로 밟았다.
 *  (1) `page.setContent` 는 about:blank 라 `file://` 스타일시트가 막힌다 → 파일로 써서 `goto`.
 *  (2) Tailwind v4 는 CSS 파일 위치 기준으로 소스를 훑는다 → `@source` 를 명시하지 않으면
 *      `mt-4`·`grid-cols-2` 가 **한 줄도 안 나온다**(그러면 지면이 통째로 낮아 보인다).
 *  (3) `page.evaluate` 안에서 **이름 붙은 함수**를 만들면 esbuild 가 `__name` 헬퍼를
 *      끼워 넣어 ReferenceError 로 죽는다. 배열/바인딩으로 이름을 피한다.
 *  (4) 문항 칸의 «남은 공간»을 `questionArea.clientHeight` 로 재면 **영원히 0이 나온다** —
 *      grid row 는 내용이 넘치면 같이 늘어난다. `article` 의 content box 로 재야 한다.
 *
 * 화면과 인쇄가 다르므로 `emulateMedia({ media: "print" })` 를 쓸지 반드시 정할 것
 * (그림 상한이 화면 360px · 인쇄 70mm=264.6px 라 실제로 다르다).
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";

import { ProblemContent } from "../../src/components/math/ProblemContent";
import { PAPER_CSS_VARIABLES } from "../../src/components/print/tokens";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, "node_modules/.cache/paper-probe");

export const PAPER_VARS = Object.entries(PAPER_CSS_VARIABLES)
  .map(([key, value]) => `${key}:${value}`)
  .join(";");

/**
 * 🔴 **속성에 그대로 끼워 넣으면 잘린다.** 글꼴 스택에 큰따옴표가 있어
 * (`"KoPubBatang", "Nanum Myeongjo", …`) `style="${PAPER_VARS}"` 는 그 첫 따옴표에서
 * **속성이 끝난다.** 그러면 지면이 `--paper-font-serif`·`--paper-font-sans` 를 잃고
 * 본문이 명조가 아니라 상위의 고딕으로 그려진다 — 줄바꿈이 달라지므로 **잰 높이가
 * 통째로 딴 지면 것**이 된다. 에러도 경고도 없고, 잰 값은 그럴듯하다.
 *
 * 2026-09-05 에 기출 탐침 대조(`examPaperProbeParity`)가 잡았다. 자습 탐침도 같은 줄이었다.
 */
export const PAPER_VARS_ATTR = PAPER_VARS.replaceAll('"', "&quot;");

/** `public/` 아래 그림을 file:// 로 읽게 만든다 — 인쇄 지면은 그림이 빠지면 안 된다. */
export const FIGURE_ROOT = pathToFileURL(path.join(ROOT, "public")).href;

const fileUrl = (rel: string) => pathToFileURL(path.join(ROOT, rel)).href;

/**
 * 지면 명조 — 제품이 `next/font/local` 로 싣는 **그 파일 · 그 변수**(`src/app/fonts.ts` 의 `notoSerifKR`).
 *
 * 🔴 2026-10-21(D-164 ② · Codex 검토)까지 이 탐침에는 둘 다 없었다. 지면 글꼴 스택은
 *    `var(--font-noto-serif-kr), "KoPubBatang", …` 인데, 정의 안 된 변수를 가리키는 `var()` 는 선언 **전체**를 무효로
 *    만든다(뒤의 이름으로 넘어가지 않는다 — `fonts.ts` 주석의 가정과 다르다). 그래서 탐침의 본문은 브라우저 기본 서체로
 *    그려졌고, 높이 캐시 · 넘침 전수가 제품과 다른 서체로 잰 값이었다. Chrome 시험(`helpers/paperChrome.ts`)은 이것을
 *    싣고 있었다 — 이제 둘이 이 한 벌을 쓴다.
 */
export const PAPER_FONT_CSS = `
@font-face{font-family:"TM Noto Serif KR";src:url(${fileUrl("public/fonts/NotoSerifKR-subset.woff2")}) format("woff2");font-weight:100 900}
:root{--font-noto-serif-kr:"TM Noto Serif KR"}`;

/**
 * KaTeX CSS — 글꼴 주소를 **절대 경로로** 바꿔 싣는다. 원문의 `url(fonts/…)` 는 `<style>` 로 붙이면 탐침 HTML 자리
 * (`node_modules/.cache/paper-probe/`)에서 풀려 글꼴이 하나도 안 실린다(2026-10-21 — 수식이 대체 글꼴로 그려졌다).
 */
export function katexCss(): string {
  const dir = path.join(ROOT, "node_modules/katex/dist");
  return readFileSync(path.join(dir, "katex.min.css"), "utf8").replace(
    /url\((fonts\/[^)]+)\)/g,
    (_, file: string) => `url(${pathToFileURL(path.join(dir, file)).href})`,
  );
}

/**
 * 실측 상수. 값을 **여기 적어 두지 말고** `measure-paper-units.tsx` 로 다시 뽑을 것 —
 * 아래는 2026-08-18 인쇄 매체 기준 기록이다(지면 CSS 를 바꾸면 달라진다).
 */
export const MEASURED = {
  /** 이어지는 장 문항 칸 높이 */
  slotContinuationPx: 484,
  /** 첫 장 문항 칸 높이 (머리글 + 핵심 개념 상자만큼 좁다) */
  slotFirstPagePx: 405,
  /** 본문 행높이 12.5px × leading-relaxed 1.625 */
  linePx: 20.3125,
  /** 문항번호 + 정답란 — 본문과 무관하게 늘 붙는 세로 */
  fixedChromePx: 62.5,
} as const;

/**
 * Tailwind 가 훑는 원문의 열쇠 — 작업트리 자리 · `globals.css` 원문 · 클래스를 쓰는 파일들의 (경로 · 크기 · 수정 시각).
 *
 * 🔴 2026-10-21(D-164 ②) 전의 열쇠는 «`globals.css` 가 캐시보다 새것인가» 하나였다. 둘이 샜다.
 *  - 컴포넌트에 **새 클래스**를 달아도(`[word-break:keep-all]`) `globals.css` 는 그대로라 낡은 산출물이 쓰였다 —
 *    그 클래스의 규칙이 없는 지면을 재고 «높이가 안 바뀌었다»가 나온다.
 *  - 캐시 자리가 `node_modules/.cache` 인데 워크트리의 `node_modules` 는 본 작업트리로 가는 **링크**다 — 가지마다
 *    같은 파일을 나눠 써서, 전후를 나란히 재면 한쪽이 남의 CSS 를 읽는다.
 * 그래서 열쇠를 파일 이름에 넣는다. 훑는 범위는 지면 DOM 을 만드는 곳(`src` · `scripts/qa`)이다 — 다른 곳의 클래스는
 * 규칙을 보탤 뿐 이 DOM 의 어느 요소에도 안 붙는다. `._*` 는 exFAT 가 만드는 그림자 파일이라 뺀다.
 * ⚠️ 못 보는 것: 크기 · 수정 시각을 그대로 둔 채 바뀐 파일, 한 프로세스 안에서 빌드한 뒤의 수정(한 번만 짓는다).
 */
function tailwindSourceKey(): string {
  const hash = createHash("sha256");
  hash.update(`${ROOT}\u0000`);
  hash.update(readFileSync(path.join(ROOT, "src/app/globals.css")));
  // 산출물을 짓는 쪽의 판도 열쇠다 — 올리면 같은 원문에서 다른 CSS 가 나온다.
  for (const pkg of ["tailwindcss", "@tailwindcss/postcss"]) {
    const manifest = path.join(ROOT, "node_modules", pkg, "package.json");
    hash.update(
      `${pkg}@${existsSync(manifest) ? (JSON.parse(readFileSync(manifest, "utf8")) as { version?: string }).version : "?"}\u0000`,
    );
  }
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const entry of entries) {
      if (entry.name.startsWith("._") || entry.name === "node_modules")
        continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const stat = statSync(full);
        hash.update(
          `${path.relative(ROOT, full)}\u0000${stat.size}\u0000${stat.mtimeMs}\u0001`,
        );
      }
    }
  };
  walk(path.join(ROOT, "src"));
  walk(path.join(ROOT, "scripts/qa"));
  return hash.digest("hex").slice(0, 16);
}

let tailwindBuild: Promise<string> | null = null;

/** Tailwind 산출물을 실제로 빌드한다(캐시 — 프로세스 안에서는 한 번). 손으로 옮겨 적지 않는다. */
export function buildTailwindCss(): Promise<string> {
  tailwindBuild ??= buildTailwindCssUncached();
  return tailwindBuild;
}

async function buildTailwindCssUncached(): Promise<string> {
  const cached = path.join(CACHE_DIR, `tailwind-${tailwindSourceKey()}.css`);
  const source = path.join(ROOT, "src/app/globals.css");
  if (existsSync(cached) && statSync(cached).size > 0) {
    return readFileSync(cached, "utf8");
  }
  const postcss = (await import("postcss")).default;
  const tailwind = (await import("@tailwindcss/postcss")).default;
  const css = readFileSync(source, "utf8").replace(
    '@import "tailwindcss";',
    // ⚠️ 함정 (2) — 이 줄이 없으면 유틸리티가 한 줄도 안 나온다.
    '@import "tailwindcss";\n@source "../../src";',
  );
  const result = await postcss([tailwind()]).process(css, { from: source });
  if (!result.css.includes(".mt-4"))
    throw new Error("Tailwind 유틸리티가 비었다 — 측정 중단(거짓 측정 방지)");
  mkdirSync(CACHE_DIR, { recursive: true });
  // 다른 측정이 같은 열쇠를 동시에 읽을 수 있다 — 반쯤 쓴 파일을 읽지 않게 다 쓴 뒤 이름을 바꾼다.
  const partial = `${cached}.${process.pid}.tmp`;
  writeFileSync(partial, result.css, "utf8");
  renameSync(partial, cached);
  return result.css;
}

export async function paperStyles(): Promise<string> {
  const tailwind = await buildTailwindCss();
  const moduleCss = readFileSync(
    path.join(ROOT, "src/components/print/TestPrint.module.css"),
    "utf8",
  );
  return `<style>${PAPER_FONT_CSS}</style><style>${katexCss()}</style><style>${tailwind}</style><style>${moduleCss}</style>`;
}

export interface SlotInput {
  id: string;
  content: string;
  figureUrls?: string[];
  /**
   * 그림 **원본 픽셀 치수** `[w1,h1,…]` — 비율의 근거.
   * ⚠️ 제품 인쇄 경로(`ProblemBody` → `PaperProblemView`)가 넘기는 값이다.
   *    여기서 안 넘기면 탐침만 다른 지면을 그린다.
   */
  figureDims?: number[];
  /**
   * 그림 **원본 지면 물리 폭(mm)** — 「얼마로 그린다」의 근거.
   *
   * 🔴 이걸 안 넘기면 그림이 `w-auto max-w-[70mm]`, 곧 **원본 픽셀 크기**로 그려진다.
   *    제품은 mm 로 못 박으므로 지면이 갈린다 — 2026-08-20 에 실제로 그랬고,
   *    갈아 끼운 그림 1,249문항 중 519건의 높이가 −313 ~ +661px 어긋났다.
   *    `paperProbeParity.test.tsx` 가 잠근다.
   */
  figureSourceMm?: number[];
  /**
   * 보기 그림의 짝(0 = 발문 그림 · 1 ~ = 그 번호 보기의 그림). 알면 제품이 그림을 **번호 칸 안**에 넣어
   * 지면 높이가 달라진다(2026-10-03 B1) — 안 넘기면 탐침만 «여섯 장이 발문 아래에 선» 옛 지면을 잰다.
   * `probeChoiceFigureParity.test.tsx` 가 잠근다.
   */
  choiceFigureIndex?: number[];
  /**
   * 엔진이 그린 인라인 SVG(`Problem.figureSvg`) — 제품 인쇄 경로(`PaperProblemView`)가 넘기는 그림이다.
   * 🔴 안 넘기면 탐침만 그림 없는 지면을 잰다 — SVG 그림 문항 1만 9천여 행의 높이가 그림만큼 비었다(D-164 ② · 2026-10-21).
   */
  figureSvg?: string | null;
  /** 「서술형 n」 배지 번호. 없으면 배지를 안 그린다. */
  essayNumber?: number | null;
}

/** `JaseupTemplate` 의 문항 DOM 과 같은 모양. 한 글자라도 다르면 측정이 지면과 갈린다. */
export function renderSlot(row: SlotInput, number: number): string {
  const body = renderToStaticMarkup(
    <ProblemContent
      content={row.content}
      figureUrls={(row.figureUrls ?? []).map((url) =>
        url.startsWith("/") ? FIGURE_ROOT + url : url,
      )}
      figureDims={row.figureDims}
      figureSourceMm={row.figureSourceMm}
      choiceFigureIndex={row.choiceFigureIndex}
      figureSvg={row.figureSvg ?? null}
      className="problemText"
      // 인쇄 지면은 지연 로딩을 쓰지 않는다(PaperProblemView 와 같다).
      deferFigures={false}
    />,
  );
  return `<article class="problemItem" data-problem-number="${number}" data-pid="${row.id}">
  <div class="questionArea">
    <div class="questionNumber">문 ${number}${
      row.essayNumber
        ? `<span class="essayBadge">서술형 ${row.essayNumber}</span>`
        : ""
    }</div>
    <div data-paper-view>${body}</div>
    <div class="answerBlank"><strong>내 정답</strong><span class="answerLine"></span><span>채점</span><span class="checkBox"></span></div>
  </div>
  <div class="scratchPad"><span>SCRATCH PAD</span></div>
</article>`;
}

const SECTION = "이차방정식";
const TITLE = `일일테스트 · ${SECTION}`;

/** 첫 장/이어지는 장 — `JaseupTemplate` 과 같은 머리·꼬리를 붙인다. */
export function renderPage(
  kind: "first" | "continuation",
  slots: string[],
  pageNumber: number,
): string {
  const head =
    kind === "first"
      ? `<header class="firstHeader"><div><div class="academyName">오늘 수학</div><div class="englishLabel">SELF-STUDY</div><h1 class="testTitle">${TITLE}</h1><div class="todayGoal">오늘의 목표 · ${SECTION}의 핵심 개념을 확인하고 문제에 적용한다.</div></div><div class="studentMeta"><div class="dateLabel">학습일</div><div class="dateValue">2026.08.18</div><div class="nameLine">이름 ________ · 반 ______</div></div></header>
<section class="conceptBox"><h2 class="conceptTitle">◆ 핵심 개념 정리</h2><div class="conceptText">${SECTION}의 정의와 계산 원리를 확인한 뒤 풀이 과정에 적용한다.</div></section>`
      : `<header class="continuationHeader"><span>오늘 수학 · ${TITLE}</span><span>p. ${pageNumber}</span></header>`;
  return `<section class="a4Page ${kind === "first" ? "jaseupFirst" : "jaseupContinuation"}" data-page-kind="questions" data-page-number="${pageNumber}" style="${PAPER_VARS_ATTR}">
${head}
<div class="problemList">${slots.join("\n")}</div>
<footer class="pageFooter"><strong>오늘의 메모</strong><span class="memoLine"></span><span>p. ${pageNumber}</span></footer>
</section>`;
}

export async function paperDocument(pages: string[]): Promise<string> {
  return `<!doctype html><html><head><meta charset="utf-8">${await paperStyles()}
<style>body{margin:0;background:#c9c9c7}.pageGallery{display:flex;flex-direction:column;align-items:center;gap:28px}</style>
</head><body><div class="pageGallery">${pages.join("\n")}</div></body></html>`;
}

/** 측정 전에 스타일시트가 실제로 붙었는지 확인한다 — 안 붙으면 값이 통째로 거짓이다. */
/**
 * 글꼴 적재 — `document.fonts.ready` 를 기다린 **뒤에** 읽는다. 실패한 글꼴(주소가 안 풀린 KaTeX 따위)과 지면 명조가
 * 실제로 실렸는지 · 본문이 그 이름으로 풀리는지를 같이 낸다. 크기(12.5px)만 보던 예전 가드는 서체가 통째로 바뀐 지면을
 * 통과시켰다(2026-10-21). 지면 명조가 안 쓰이는 문서(본문이 없는 장)에서는 `serifUsed` 가 거짓이라 묻지 않는다.
 */
export const FONT_GUARD = `
  const faces = [...document.fonts];
  const family = text ? getComputedStyle(text).fontFamily : "";
  const fonts = {
    fontsFailed: faces.filter((f) => f.status === "error").map((f) => f.family.replace(/"/g, "")),
    serifUsed: Boolean(text),
    serifLoaded: faces.some((f) => f.family.replace(/"/g, "") === "TM Noto Serif KR" && f.status === "loaded"),
    family,
  };`;

export const GUARD_SCRIPT = `(() => {
  const katex = document.querySelector(".katex-mathml");
  const a4 = document.querySelector(".a4Page");
  const text = document.querySelector(".problemText");${FONT_GUARD}
  return {
    katexOk: katex ? getComputedStyle(katex).position === "absolute" : true,
    a4Height: a4 ? a4.getBoundingClientRect().height : 0,
    fontSize: text ? getComputedStyle(text).fontSize : "",
    ...fonts,
  };
})()`;

/** 글꼴 가드의 결과. 손으로 가드 값을 짓는 옛 호출을 깨지 않으려고 칸은 선택이다 — `GUARD_SCRIPT` 는 늘 채운다. */
export interface FontGuard {
  fontsFailed?: string[];
  serifUsed?: boolean;
  serifLoaded?: boolean;
  family?: string;
}

/** 글꼴이 제품 지면과 같은가 — 기출 탐침(`examPaperProbe.assertExamSane`)도 이것을 부른다. */
export function assertFontsLoaded(guard: FontGuard) {
  if (guard.fontsFailed?.length)
    throw new Error(
      `글꼴을 못 실었다(${[...new Set(guard.fontsFailed)].join(", ")}) — 측정 중단(거짓 측정 방지)`,
    );
  if (guard.serifUsed && guard.serifLoaded === false)
    throw new Error(
      "지면 명조(TM Noto Serif KR)가 안 실렸다 — 측정 중단(거짓 측정 방지)",
    );
  if (
    guard.serifUsed &&
    guard.family !== undefined &&
    !/^"?TM Noto Serif KR/.test(guard.family)
  )
    throw new Error(`본문이 지면 명조로 안 풀린다: ${guard.family}`);
}

export function assertPaperSane(
  guard: {
    katexOk: boolean;
    a4Height: number;
    fontSize: string;
  } & FontGuard,
) {
  if (!guard.katexOk) throw new Error("KaTeX CSS 미적용 — 측정 중단");
  if (Math.abs(guard.a4Height - 1122.5) > 2)
    throw new Error(`A4 높이가 297mm 가 아니다: ${guard.a4Height}`);
  if (guard.fontSize !== "12.5px")
    throw new Error(`본문 글꼴이 지면과 다르다: ${guard.fontSize}`);
  assertFontsLoaded(guard);
}

/**
 * 탐침 HTML 을 써서 `file://` URL 로 돌려준다.
 *
 * ⚠️ **이름에 프로세스 번호를 넣는다.** 측정이 둘 이상 동시에 돌면 같은 파일을
 *    서로 덮어써서, Windows 에서는 `EBUSY` 로 죽고 (실제로 죽었다) 다른 OS 에서는
 *    **한쪽이 남의 지면을 재고도 조용히 성공한다.** 이 저장소는 오르카 다중 세션이
 *    기본이라(절대 규칙 9) 언제든 겹칠 수 있다.
 */
export function writeProbe(name: string, html: string): string {
  mkdirSync(CACHE_DIR, { recursive: true });
  const unique = name.replace(/(\.[^.]+)?$/, `-${process.pid}$1`);
  const file = path.join(CACHE_DIR, unique);
  writeFileSync(file, html, "utf8");
  return pathToFileURL(file).href;
}
