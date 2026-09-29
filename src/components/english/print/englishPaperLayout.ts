/**
 * 오늘의 영어 지면 — 쪽 나눔 (D-148 · 25 §5 · 브리프 english-print §1).
 *
 * 영어 지면은 **1단**이고 장당 문항 수가 정해져 있지 않다 — 수학의 2단 폭(`PAPER_COLUMN_WIDTH`)·
 * 장당 2문항(D-28)·`.paperParity` 를 쓰지 않는다. 대신 `useMeasuredPages` 의 결을 따라
 * 지문 문단과 문항을 **블록**으로 두고, 숨은 틀에서 높이를 잰 뒤 순서대로 채운다.
 *
 * 순수 함수다. 재는 쪽(`useEnglishPages`)과 그리는 쪽(`EnglishPaper`)이 **같은 블록 순서**를 쓴다 —
 * 한쪽만 바꾸면 잰 높이가 엉뚱한 블록에 붙는다.
 */
import type { EnglishSet } from "@/contracts/english.contract";

/** 블록(지문 상자 · 문항) 사이 세로 간격(px) — `EnglishPaper` 본문의 `gap` 과 같은 값 */
export const ENGLISH_BLOCK_GAP = 14;
/** 지문 상자 안 문단 사이 간격(px) — `EnglishPaper` 가 둘째 문단부터 `marginTop` 으로 준다 */
export const ENGLISH_PARAGRAPH_GAP = 10;

export type EnglishPaperBlock =
  | { kind: "passage"; paragraph: number; text: string }
  | { kind: "question"; index: number };

/**
 * 지문을 **빈 줄**에서 문단으로 나눈다(CRLF 허용 · 공백만 있는 줄도 빈 줄). 문단 안 줄바꿈은
 * 지면이 `white-space: pre-wrap` 으로 그대로 살린다. 빈 줄이 없으면 문단 하나 — 그 문단이
 * 한 쪽보다 길면 `packEnglishBlocks` 가 `oversized` 로 알린다(조용히 잘리지 않는다).
 */
export function splitPassageParagraphs(passage: string): string[] {
  const parts = passage
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [passage.trim()];
}

/** 지문 문단이 먼저, 문항이 뒤 — 지면 순서 그대로 */
export function englishPaperBlocks(
  set: Pick<EnglishSet, "passage" | "questions">,
): EnglishPaperBlock[] {
  return [
    ...splitPassageParagraphs(set.passage).map((text, paragraph) => ({
      kind: "passage" as const,
      paragraph,
      text,
    })),
    ...set.questions.map((_, index) => ({ kind: "question" as const, index })),
  ];
}

export interface EnglishPackInput {
  /** `englishPaperBlocks` 순서대로 잰 높이(px) */
  blocks: readonly { kind: EnglishPaperBlock["kind"]; height: number }[];
  /** 본문(머리·꼬리를 뺀 자리)의 높이 — 첫 쪽은 머리가 커서 더 작다 */
  avail: { first: number; cont: number };
  /**
   * 지문 상자의 테두리·안쪽 여백·제목 높이 — 문단 높이 합에 **쪽마다 한 번** 더해진다.
   * 상자가 다음 쪽으로 이어지면 그 쪽에도 상자(«지문 (이어짐)»)가 서므로 다시 센다.
   */
  passageChrome: number;
}

export interface EnglishPackResult {
  /** 쪽마다 블록 번호(`englishPaperBlocks` 순) */
  pages: number[][];
  /** 혼자서도 한 쪽에 안 들어가는 블록 — 지면에서 잘릴 수 있어 미리보기가 알린다 */
  oversized: number[];
}

/**
 * 순서대로 채우고, 안 들어가면 다음 쪽. 한 쪽보다 큰 블록은 **혼자** 한 쪽을 차지한다
 * (줄이거나 빼지 않는다 — 어느 블록인지 `oversized` 에 적어 미리보기가 말하게 한다).
 */
export function packEnglishBlocks({
  blocks,
  avail,
  passageChrome,
}: EnglishPackInput): EnglishPackResult {
  const pages: number[][] = [];
  const oversized: number[] = [];
  let page: number[] = [];
  let used = 0;
  let pageHasPassage = false;

  const limit = () =>
    Math.max(1, pages.length === 0 ? avail.first : avail.cont);
  const flush = () => {
    pages.push(page);
    page = [];
    used = 0;
    pageHasPassage = false;
  };
  /** 지금 쪽에 이 블록을 더할 때 드는 높이 — 간격·지문 상자 여분 포함 */
  const cost = (kind: EnglishPaperBlock["kind"], height: number) => {
    const passage = kind === "passage";
    const gap =
      page.length === 0
        ? 0
        : passage && pageHasPassage
          ? ENGLISH_PARAGRAPH_GAP
          : ENGLISH_BLOCK_GAP;
    const chrome = passage && !pageHasPassage ? passageChrome : 0;
    return gap + chrome + Math.max(0, height);
  };

  blocks.forEach((block, index) => {
    let need = cost(block.kind, block.height);
    if (page.length > 0 && used + need > limit()) {
      flush();
      need = cost(block.kind, block.height);
    }
    if (page.length === 0 && need > limit()) oversized.push(index);
    page.push(index);
    used += need;
    pageHasPassage ||= block.kind === "passage";
  });
  flush();
  return { pages, oversized };
}
