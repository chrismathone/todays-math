/**
 * `<보기>` · `<조건>` 상자 머리 표기 — **읽기 하나, 쓰기 하나**.
 *
 * 정본은 `<보기:cols=N>`(N = 2·3)이고 1열·모름은 맨 `<보기>` 다. 편집기(`visualDocument` conditionBox)
 * ·인식(`sourcePrompts`)·지면 파서(`renderBoxSegment`)가 모두 이것을 쓴다.
 *
 * 옛 지면 표기 `<보기2>` 는 **읽기만** 한다. 지면 파서가 한때 정본 대신 이것을 썼다 —
 * `preprocessMathText` 가 `cols=2` 를 수식으로 감싸 버려서였다(그 자리는 이제 지면 렌더러가
 * 전처리 직전에만 잠깐 옮겨 적는다, `MarkdownRenderer`). 표기가 두 벌이던 탓에 편집기가 쓴
 * `<보기:cols=3>` 이 지면에 `cols=3` 수식으로 찍혔다(트랙 42 §7).
 *
 * `나열`·`상자` 는 라벨 머리를 그리지 않는 상자다(`MarkdownRenderer` HEADERLESS_LABELS).
 *
 * `나란히` 는 **상자가 아니라 칸 묶음**이다(원장님 2026-09-22 확정) — 제목도 테두리도 없이, 서답형 소문항
 * (1)~(4) 처럼 그림을 단 항목을 1~4열로 세운다. 칸 규칙(한 줄 = 한 칸)·좁은 단 열 줄이기(`boxFit`)는 상자와
 * 같다. 4열은 **나란히만** 받는다 — 〈보기〉·〈조건〉 은 예전처럼 1~3열이다(`<보기:cols=4>` 는 머리가 아니다).
 */

export type BoxColumns = 1 | 2 | 3 | 4;
export type BoxHeaderLabel = "보기" | "조건" | "상자" | "나열" | "나란히";

/** 칸 묶음의 이름 — 제목·테두리 없이 칸만 세운다. */
export const SIDE_BY_SIDE_LABEL = "나란히";

export interface BoxHeader {
  label: BoxHeaderLabel;
  /** 적힌 열 수. 안 적혔거나 `auto` 면 null — 기본값(1열)은 읽는 쪽이 정한다. */
  cols: BoxColumns | null;
  /** 머리 표기의 글자 수 — 뒤에 붙은 글을 잘라 낼 때 쓴다. */
  length: number;
}

/**
 * 줄머리의 상자 머리. 편집기가 `<`·`>` 를 역슬래시로 감싸 적는 일이 있어 그것도 받는다.
 * 열 수는 상자 1~3 · 나란히 1~4 — **정규식이 가른다**(이 식을 직접 쓰는 곳도 같은 답을 내게).
 * 무리: 1 상자 이름 · 2·3 상자 열 수 · 4 `나란히` · 5·6 나란히 열 수. 읽을 때는 `parseBoxHeader` 로.
 */
export const BOX_HEADER_RE =
  /^\\?<(?:(보기|조건|상자|나열)(?::cols=(auto|[1-3])|([1-3]))?|(나란히)(?::cols=(auto|[1-4])|([1-4]))?)\\?>/;

export function parseBoxHeader(text: string): BoxHeader | null {
  const match = BOX_HEADER_RE.exec(text);
  if (!match) return null;
  const written = match[2] ?? match[3] ?? match[5] ?? match[6];
  return {
    label: (match[1] ?? match[4]) as BoxHeaderLabel,
    cols:
      written === undefined || written === "auto"
        ? null
        : (Number(written) as BoxColumns),
    length: match[0].length,
  };
}

/** 이 머리의 열 수 상한 — 나란히 4, 상자 3. */
export const maxColumnsFor = (label: BoxHeaderLabel): BoxColumns =>
  label === SIDE_BY_SIDE_LABEL ? 4 : 3;

/** 정본 머리 — 2열 이상만 `:cols=N` 을 적는다. 상한을 넘는 열 수는 상한으로 적는다. */
export function boxHeaderMarkdown(
  label: BoxHeaderLabel,
  cols: BoxColumns | null,
): string {
  const written = cols === null ? null : Math.min(cols, maxColumnsFor(label));
  return written !== null && written >= 2
    ? `<${label}:cols=${written}>`
    : `<${label}>`;
}
