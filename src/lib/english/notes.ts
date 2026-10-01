/**
 * 오늘의 영어 — 편집 화면의 «확인해 볼 곳» (D-151 · 3자 합의 25 §12.13). **관측 사실과 자리만** — 결함 판정이 아니고,
 * 저장을 막지 않는다. 판정은 결정적 검사(`quality.ts`)의 것을 그대로 쓴다 — 벤치가 잰 것과 화면이 보이는 것이 같다.
 *
 * 문항 줄(그 자리 아래): ⓐ 해설의 정답 표기 ≠ 정답 칸(정답 줄) · ⓑ «모두 옳다 / 정답 없음» 꼴 보기(보기 아래) ·
 *   ⓒ 글자 그대로의 `\n` · `\t` 찌꺼기(그 칸 아래).
 * 머리 줄(세트 카드): ⓔ 절대어가 오답에만(문항에 딸린다) · ⓕ 정답 번호 쏠림(세트 단위).
 * ⓓ(정답 보기만 김)는 내지 않는다 — 채점관 판정과 연관이 보이지 않아 사람 감사 전까지 보류.
 *
 * `key` 는 기각(«확인함») 열쇠 — 검사 · 판 · 문항 · **관련 글**만으로 짓는다. 무관한 칸을 고쳐도 그대로이고,
 * 관련 글이 바뀌거나 판(`ENGLISH_NOTES_VERSION`)이 오르면 다시 선다. 순수 함수다.
 */
import {
  ENGLISH_OPEN_TYPES,
  type EnglishQuestion,
} from "@/contracts/english.contract";

import { ENGLISH_CHOICE_MARKS } from "./options";
import {
  ENGLISH_SURFACE_CUE_TYPES,
  absoluteOnlyDistractors,
  absoluteWords,
  answerSpread,
  aotaMatch,
  explanationNumber,
} from "./quality";

/** 검사의 판 — 판정이나 문구를 바꾸면 올린다(전에 «확인함»한 것이 다시 선다) */
export const ENGLISH_NOTES_VERSION = "1";

export type EnglishNoteCode =
  "answer-explanation" | "aota" | "escape" | "absolute-only" | "answer-spread";

/** 줄이 서는 자리 — head 는 세트 카드, 나머지는 그 문항의 그 칸 아래 */
export type EnglishNotePlace =
  "head" | "prompt" | "options" | "answer" | "explanation";

export interface EnglishQualityNote {
  code: EnglishNoteCode;
  /** 문항(0부터) — 세트 단위면 null */
  question: number | null;
  place: EnglishNotePlace;
  text: string;
  key: string;
}

const mark = (index: number) => ENGLISH_CHOICE_MARKS[index] ?? `${index + 1}`;

/** 짧은 지문(FNV-1a 32비트) — 기각 열쇠에 관련 글을 줄여 넣는다 */
function digest(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

const keyOf = (
  code: EnglishNoteCode,
  question: number | null,
  related: unknown,
) => `${code}:${ENGLISH_NOTES_VERSION}:${question ?? "set"}:${digest(related)}`;

/** 글자 그대로의 이스케이프 — 첫 것 하나(`\n` · `\t` · `\r`) */
const ESCAPE = /\\[ntr]/;
function escapeSentence(where: string, found: string): string {
  return found === "\\t"
    ? `${where} 글자 \\t 가 있습니다. 칸 띄움이 아니어서 인쇄하면 그대로 찍힙니다.`
    : `${where} 글자 ${found} 이 있습니다. 줄바꿈이 아니어서 인쇄하면 그대로 찍힙니다.`;
}

function questionNotes(
  question: EnglishQuestion,
  index: number,
): EnglishQualityNote[] {
  const out: EnglishQualityNote[] = [];
  const open = ENGLISH_OPEN_TYPES.includes(question.type);

  // ⓒ 글자 찌꺼기 — 칸마다
  const prompt = ESCAPE.exec(question.prompt)?.[0];
  if (prompt)
    out.push({
      code: "escape",
      question: index,
      place: "prompt",
      text: escapeSentence("발문에", prompt),
      key: keyOf("escape", index, ["prompt", question.prompt]),
    });
  const optionAt = question.options.findIndex((option) => ESCAPE.test(option));
  if (optionAt >= 0)
    out.push({
      code: "escape",
      question: index,
      place: "options",
      text: escapeSentence(
        `보기 ${mark(optionAt)} 에`,
        ESCAPE.exec(question.options[optionAt]!)![0],
      ),
      key: keyOf("escape", index, ["options", question.options]),
    });
  const answer = open ? ESCAPE.exec(question.answer)?.[0] : undefined;
  if (answer)
    out.push({
      code: "escape",
      question: index,
      place: "answer",
      text: escapeSentence("정답에", answer),
      key: keyOf("escape", index, ["answer", question.answer]),
    });
  const explanation = ESCAPE.exec(question.explanation)?.[0];
  if (explanation)
    out.push({
      code: "escape",
      question: index,
      place: "explanation",
      text: escapeSentence("해설에", explanation),
      key: keyOf("escape", index, ["explanation", question.explanation]),
    });

  // ⓐ 해설의 정답 표기 ≠ 정답 칸
  if (!open) {
    const said = explanationNumber(question.explanation);
    if (said !== null && said !== question.answer)
      out.push({
        code: "answer-explanation",
        question: index,
        place: "answer",
        text: `정답 칸은 ${mark(Number(question.answer) - 1)}, 해설의 정답 표기는 ${mark(Number(said) - 1)}입니다.`,
        key: keyOf("answer-explanation", index, [
          question.answer,
          question.explanation,
        ]),
      });
  }

  if (ENGLISH_SURFACE_CUE_TYPES.includes(question.type)) {
    // ⓑ «모두 옳다 / 정답 없음»
    const found = question.options.flatMap((option, i) => {
      const hit = aotaMatch(option);
      return hit ? [{ i, hit }] : [];
    });
    if (found.length)
      out.push({
        code: "aota",
        question: index,
        place: "options",
        text: `보기 ${found.map(({ i }) => mark(i)).join(" · ")} 에 ${found.map(({ hit }) => `«${hit}»`).join(" · ")}라는 표현이 있습니다.`,
        key: keyOf("aota", index, question.options),
      });

    // ⓔ 절대어가 오답에만 — 머리 줄
    const distractors = absoluteOnlyDistractors(question);
    if (distractors) {
      const words = [
        ...new Set(
          distractors.flatMap((i) =>
            absoluteWords(question.options[i]!).map((w) => w.toLowerCase()),
          ),
        ),
      ];
      out.push({
        code: "absolute-only",
        question: index,
        place: "head",
        text: `${index + 1}번 ${question.type} — 오답 보기 ${distractors.map(mark).join(" · ")} 에만 ${words.join(" · ")} 가 있습니다.`,
        key: keyOf("absolute-only", index, [question.options, question.answer]),
      });
    }
  }
  return out;
}

export function englishQualityNotes(
  questions: readonly EnglishQuestion[],
): EnglishQualityNote[] {
  const notes = questions.flatMap(questionNotes);
  // ⓕ 정답 번호 쏠림 — 세트 단위. 열쇠는 객관식 문항의 구성과 정답(codex 3차 조건)
  const spread = answerSpread(questions);
  if (spread)
    notes.push({
      code: "answer-spread",
      question: null,
      place: "head",
      text: `정답 번호 — 객관식 ${spread.total}문항 가운데 ${spread.count}문항의 정답 칸이 ${mark(Number(spread.answer) - 1)}입니다.`,
      key: keyOf(
        "answer-spread",
        null,
        questions
          .filter((question) => !ENGLISH_OPEN_TYPES.includes(question.type))
          .map((question) => [question.type, question.answer]),
      ),
    });
  // 머리 줄이 먼저(세트 카드는 문항보다 위다), 그 안에서는 문항 순서
  return [
    ...notes.filter((note) => note.place === "head"),
    ...notes.filter((note) => note.place !== "head"),
  ];
}
