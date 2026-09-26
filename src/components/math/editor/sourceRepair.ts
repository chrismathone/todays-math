import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";
import { splitMathSegments } from "./mathSegments";

/**
 * 편집기(작업실 편집 칸·본문 읽기 칸)가 그리는 원문 — 저장된 원문에 **수식 밖만** 입구 후보정을 건다.
 *
 * 🔴 원장님 신고(2026-09-26): 작업실 해설에 `\displaystyle $$이동 거리= …` 가 날 글자로 샜다. 입구 후보정
 * (`normalizeMathgenText`)은 이 모양을 고치는데, 편집기 렌더러는 «편집 토큰은 저장된 수식 그대로»라며 문서 단위
 * 후보정을 통째로 건너뛰었다 — 이 표면에서만 샜다(모든 화면 일치 위반).
 *
 * 경계: 입구 후보정은 수식 **안**도 바꾼다(`frac{`→`\frac{`, `\textcircled{1}`→`①`, JSON 이 먹은 제어문자 복구).
 * 편집 칸의 수식은 원장님이 고치는 «저장된 식»이라(빈 분수 칸 `\frac{}{2}`, 적어 둔 `\displaystyle` …) 그대로여야
 * 한다. 그래서 편집기가 가르는 자(`splitMathSegments`)로 수식 토큰을 자리표로 가리고 한 함수를 돌린 뒤 되돌린다.
 * 되돌린 글에 원래 토큰이 같은 차례로 다 남지 않으면 복구를 버린다(수식을 바꾸느니 오늘처럼 둔다).
 *
 * 고정점: 편집 칸은 보이는 글을 **그대로 저장한다** — 한 번 더 돌려 달라지는 복구는 후보정이 스스로 결함을 만드는
 * 자리라(예: 구분자 밖 `\int … \,dt` 에서 `\,` 의 쉼표를 깎아 `\$` 를 지어낸다) 싣지 않고 원문을 둔다. 실어 저장하면
 * 그 결함이 모든 출구에 굳는다.
 */
export function repairEditorSource(source: string): string {
  if (!source || MARK.test(source)) return source;
  const revived = reviveEscapedStyleLeak(source);
  const once = repairOutsideMath(revived);
  return once !== undefined && repairOutsideMath(once) === once
    ? once
    : revived;
}

/** 수식 토큰을 가리고 입구 후보정을 건 글 — 토큰이 하나라도 달라지면 `undefined`. */
function repairOutsideMath(text: string): string | undefined {
  const tokens: string[] = [];
  const masked = splitMathSegments(text)
    .map((segment) => {
      if (segment.kind === "text") return segment.value;
      const fence = segment.kind === "block" ? "$$" : "$";
      return `${fence}${OPEN}${tokens.push(segment.value) - 1}${CLOSE}${fence}`;
    })
    .join("");
  const repaired = normalizeMathgenText(masked).replace(
    TOKEN,
    (_match, index: string) => tokens[Number(index)] ?? "",
  );
  return keepsTokens(repaired, tokens) ? repaired : undefined;
}

/**
 * 🔴 편집 칸에서 한 번 저장하면 글 노드의 `\`·`$` 가 이스케이프돼(`documentMarkdown`) 누출이
 * `\\displaystyle \$\$이동 거리=` 로 **굳는다** — 그 뒤 모든 출구가 역슬래시와 달러를 그린다.
 * 사람이 글로 `\displaystyle`(뒤에 `$$`)을 칠 리 없으니 이 모양은 편집기 이스케이프가 만든 것이 분명하다 —
 * 이스케이프만 풀어 입구 후보정에 넘긴다(지시어를 지우고 가짜 `$$` 를 걷는 판단은 그쪽이 한다).
 * 역슬래시가 정확히 둘일 때만 — 셋이면 «친 역슬래시 + 진짜 명령»이다. 화폐 `\$` 는 지시어 뒤가 아니면 그대로.
 */
export function reviveEscapedStyleLeak(source: string): string {
  return source.replace(
    ESCAPED_STYLE,
    (_match, word: string, space: string, display: string | undefined) =>
      `\\${word}${space}${display ? "$$" : ""}`,
  );
}

const ESCAPED_STYLE =
  /(?<!\\)\\\\(displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b([ \t]*)(\\\$\\\$)?/g;

/** 사용자 글에 나올 일 없는 사용 영역 글자 — 수식 토큰 자리표. */
const OPEN = String.fromCharCode(0xe000);
const CLOSE = String.fromCharCode(0xe001);
const MARK = new RegExp(`[${OPEN}${CLOSE}]`);
const TOKEN = new RegExp(`${OPEN}(\\d+)${CLOSE}`, "g");

/** 원래 수식 토큰이 같은 차례로 다 남았나(후보정이 새 토큰을 더한 것은 괜찮다). */
function keepsTokens(text: string, tokens: string[]): boolean {
  if (MARK.test(text)) return false;
  let next = 0;
  for (const segment of splitMathSegments(text)) {
    if (segment.kind !== "text" && segment.value === tokens[next]) next++;
  }
  return next === tokens.length;
}
