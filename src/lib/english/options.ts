/**
 * 오늘의 영어 — 보기 줄 (D-151 · 3자 합의 25 §12.12 「3」). **지면과 편집 화면이 같이 쓴다** — 화면마다 규칙이 다르면
 * 한 곳에서 고친 것이 다른 곳에서 안 보인다(같은 문제는 같은 뷰).
 *
 * 보기 값이 번호 글자뿐인 문항(삽입의 ( ① ) 자리 · 어법의 ①<u>…</u> 밑줄)은 지면이 번호를 한 번 더 붙여 «① ①»로 찍었다.
 *   - 다섯 보기가 모두 자기 번호뿐이고 발문에 ①~⑤ **자리**가 다 있으면 보기 줄을 찍지 않는다(수능 꼴 — 글 속 번호에 표시).
 *     자리는 «( ① )» 꼴 또는 «①<u>» 꼴만 센다 — «①~⑤ 가운데»처럼 번호를 말로만 든 것은 자리가 아니다.
 *   - 자리가 모자라면 번호만 다섯 줄(겹치지 않게).
 *   - 보기 글이 자기 번호로 시작하면(«① grow») 그 번호 하나만 걷는다. 다른 번호 · 글 속 번호는 그대로.
 * 저장되는 값은 바꾸지 않는다 — 그리는 쪽만.
 */
import type { EnglishQuestion } from "@/contracts/english.contract";

export const ENGLISH_CHOICE_MARKS = ["①", "②", "③", "④", "⑤"] as const;

export interface EnglishOptionLine {
  mark: string;
  text: string;
}

export interface EnglishOptionLayout {
  /** 보기 줄을 찍지 않는다 — 발문 속 번호가 곧 보기다 */
  omitted: boolean;
  lines: EnglishOptionLine[];
}

/**
 * 끝의 빈 보기 칸을 걷는다 — 편집 화면은 칸을 늘 다섯 그리므로 비운 끝 칸은 «없는 보기»다.
 * 🔴 가운데 빈 칸은 걷지 않는다: 걷으면 뒤 보기의 번호가 당겨져 정답이 다른 보기를 가리킨다(D-158 검토 #1).
 */
export function trimTrailingBlankOptions(options: readonly string[]): string[] {
  let end = options.length;
  while (end > 0 && !options[end - 1]!.trim()) end -= 1;
  return options.slice(0, end);
}

/** 채운 보기 사이에 빈 칸이 있는가 */
export function englishOptionGap(options: readonly string[]): boolean {
  return trimTrailingBlankOptions(options).some((option) => !option.trim());
}

const markOf = (index: number) =>
  ENGLISH_CHOICE_MARKS[index] ?? `${index + 1}.`;

/** 보기 값이 자기 번호 글자뿐인가 — «③» · «3» · «(3)» · «3.» */
function isOwnMark(option: string, index: number): boolean {
  const text = option.trim();
  return (
    text === ENGLISH_CHOICE_MARKS[index] ||
    new RegExp(`^\\(?${index + 1}\\)?\\.?$`).test(text)
  );
}

/**
 * 발문에 ①~⑤ 자리가 다 있는가 — «( ① )» 꼴(삽입) 또는 «①<u>» 꼴(어법)만 자리다. 글 속에서 번호를 말로 든 것
 * («①~⑤ 가운데» · «① walks»)과 가리려고(3자 합의 3차). 벤치에 쌓인 번호뿐인 보기 문항 465개가 모두 이 두 꼴이었다.
 */
function hasAllPositions(prompt: string): boolean {
  return ENGLISH_CHOICE_MARKS.every((mark) =>
    new RegExp(`\\(\\s*${mark}\\s*\\)|${mark}\\s*<u>`, "i").test(prompt),
  );
}

export function englishOptionLayout(
  question: Pick<EnglishQuestion, "prompt" | "options">,
): EnglishOptionLayout {
  const { options } = question;
  if (!options.length) return { omitted: false, lines: [] };
  const bare =
    options.length === ENGLISH_CHOICE_MARKS.length &&
    options.every((option, index) => isOwnMark(option, index));
  if (bare && hasAllPositions(question.prompt))
    return {
      omitted: true,
      lines: options.map((_, index) => ({ mark: markOf(index), text: "" })),
    };
  return {
    omitted: false,
    lines: options.map((option, index) => {
      const mark = markOf(index);
      if (isOwnMark(option, index)) return { mark, text: "" };
      const own = ENGLISH_CHOICE_MARKS[index];
      const stripped = own
        ? option.replace(new RegExp(`^\\s*${own}\\s*`), "")
        : option;
      return { mark, text: stripped.trim() ? stripped : option };
    }),
  };
}
