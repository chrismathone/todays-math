/**
 * 오늘의 영어 — 어법의 밑줄 표기 (D-151 · 25 §12.11 3자 합의 «다»).
 *
 * 생성 프롬프트는 어법의 밑줄을 `①<u>표현</u>` 로 적게 한다(`englishExam.ts`). 지면은 그 표기를 지금까지 **글자 그대로** 찍었다 —
 * 꺾쇠가 종이에 보였다. 여기서 글자 `<u>` · `</u>` 표기**만** 밑줄 구간으로 가른다.
 *
 * 🔴 글을 HTML 로 넣지 않는다 — 다른 꺾쇠(`<b>` · 부등호)는 글자로 남는다. 그래서 `dangerouslySetInnerHTML` 이 아니라 구간 목록이다.
 * 🔴 밑줄형 어법 문항은 밑줄이 곧 발문이다 — 짝이 안 맞거나 밑줄 구간이 하나도 없으면 학생용 인쇄를 막는다(`findEnglishUnderlineProblems`).
 *    다른 유형에 섞인 표기는 글자로 찍고 알리기만 한다.
 * 🔴 어법 문항이 모두 밑줄형은 아니다 — 발문에 번호 ①~⑤ 도 «밑줄»이라는 말도 없이 보기에서 고르는 문항(붙여넣기 · 손으로 만든 세트)은
 *    «밑줄 구간 없음»으로 막지 않는다. 그것까지 막으면 멀쩡한 세트가 선다(3자 합의 3차 «정정»).
 *
 * 순수 함수다(서버 · 클라이언트 같이).
 */
import type { EnglishQuestion } from "@/contracts/english.contract";

/** 밑줄을 그리는 유형 — 어법과 어휘가 같은 지면 규칙을 쓴다 */
export const ENGLISH_UNDERLINE_TYPES = ["어법", "어휘"] as const;

export function isEnglishUnderlineType(
  type: string,
): type is (typeof ENGLISH_UNDERLINE_TYPES)[number] {
  return (ENGLISH_UNDERLINE_TYPES as readonly string[]).includes(type);
}

export interface EnglishUnderlinePart {
  text: string;
  underline: boolean;
}

const TAG = /<(\/?)u>/gi;
/** 구간 맨 앞의 번호 — 선 밖으로 뺀다 */
const LEADING_MARK = /^\s*[①-⑤]\s*/;
/** 밑줄을 친다고 말하는 발문 — 번호 ①~⑤ 가 있거나 «밑줄»이라는 말이 있다 */
const CLAIMS_UNDERLINE = /[①-⑤]|밑줄/;

/**
 * 글을 밑줄 구간과 나머지로 가른다. 표기가 없으면 글 전체가 한 구간(밑줄 아님).
 * 짝이 안 맞으면(닫히지 않음 · 열리지 않음 · 겹침) `null` — 어디까지가 밑줄인지 알 수 없다.
 */
export function splitEnglishUnderline(
  text: string,
): EnglishUnderlinePart[] | null {
  const parts: EnglishUnderlinePart[] = [];
  const push = (value: string, underline: boolean) => {
    if (!value) return;
    const last = parts[parts.length - 1];
    if (last && last.underline === underline) last.text += value;
    else parts.push({ text: value, underline });
  };
  let at = 0;
  let open = false;
  for (const match of text.matchAll(TAG)) {
    const closing = match[1] === "/";
    if (closing !== open) return null;
    const chunk = text.slice(at, match.index);
    if (open) {
      const mark = LEADING_MARK.exec(chunk);
      if (mark) push(mark[0], false);
      push(mark ? chunk.slice(mark[0].length) : chunk, true);
    } else push(chunk, false);
    open = !closing;
    at = match.index + match[0].length;
  }
  if (open) return null;
  push(text.slice(at), false);
  return parts.length ? parts : [{ text, underline: false }];
}

export type EnglishUnderlineIssue =
  /** 밑줄 구간이 하나도 없다 */
  | "none"
  /** 시작 · 끝 표기의 짝이 안 맞는다 */
  | "unbalanced";

export interface EnglishUnderlineProblems {
  /** 학생용 인쇄를 막는 어법 문항(0부터) */
  blocking: { question: number; issue: EnglishUnderlineIssue }[];
  /** 다른 유형인데 표기가 섞인 문항(0부터) — 글자로 찍힌다 */
  warnings: number[];
}

export function findEnglishUnderlineProblems(
  questions: readonly Pick<EnglishQuestion, "type" | "prompt">[],
): EnglishUnderlineProblems {
  const problems: EnglishUnderlineProblems = { blocking: [], warnings: [] };
  questions.forEach((question, index) => {
    if (!isEnglishUnderlineType(question.type)) {
      TAG.lastIndex = 0;
      if (TAG.test(question.prompt)) problems.warnings.push(index);
      TAG.lastIndex = 0;
      return;
    }
    const parts = splitEnglishUnderline(question.prompt);
    if (!parts)
      problems.blocking.push({ question: index, issue: "unbalanced" });
    else if (
      CLAIMS_UNDERLINE.test(question.prompt) &&
      !parts.some((part) => part.underline && part.text.trim())
    )
      problems.blocking.push({ question: index, issue: "none" });
  });
  return problems;
}

export interface EnglishUnderlineNotices {
  /** 학생용 인쇄를 막는 줄 — 원인마다 하나, 해당 문항 번호를 모두 적는다 */
  errors: string[];
  /** 다른 유형에 섞인 표기 — 막지 않는다 */
  warning: string | null;
  /** 교사용 머리의 «밑줄 표기» 값 — 밑줄 구간이 아예 없는 오류는 종이에서 스스로 보이지 않는다 */
  teacherNote: string | null;
}

const ISSUE_NAME: Record<EnglishUnderlineIssue, string> = {
  none: "밑줄 구간 없음",
  unbalanced: "시작 · 끝 표기가 맞지 않음",
};
const list = (questions: readonly number[]) =>
  questions.map((index) => `${index + 1}번`).join(" · ");

export function englishUnderlineNotices(
  problems: EnglishUnderlineProblems,
): EnglishUnderlineNotices {
  const of = (issue: EnglishUnderlineIssue) =>
    problems.blocking
      .filter((item) => item.issue === issue)
      .map((item) => item.question);
  const none = of("none");
  const unbalanced = of("unbalanced");
  const errors: string[] = [];
  if (none.length)
    errors.push(
      `${list(none)} 밑줄 문항(어법 · 어휘)에 밑줄 구간이 없습니다. 발문에서 밑줄 칠 곳을 <u> 와 </u> 로 감싼 뒤 학생용을 인쇄하십시오.`,
    );
  if (unbalanced.length)
    errors.push(
      `${list(unbalanced)} 밑줄 문항(어법 · 어휘)의 밑줄 시작 · 끝 표기가 맞지 않습니다. 문항을 고친 뒤 학생용을 인쇄하십시오.`,
    );
  return {
    errors,
    warning: problems.warnings.length
      ? `${list(problems.warnings)} 문항의 발문에 밑줄 표기(<u>)가 있습니다. 밑줄 문항(어법 · 어휘)이 아니어서 글자 그대로 찍힙니다.`
      : null,
    teacherNote: problems.blocking.length
      ? problems.blocking
          .map((item) => `${item.question + 1}번: ${ISSUE_NAME[item.issue]}`)
          // 항목 사이는 마침표 — «시작 · 끝»의 가운뎃점과 겹치지 않게(3자 합의 3차 소수 의견)
          .join(". ")
      : null,
  };
}
