/**
 * AI 응답 텍스트 → JSON 파싱 보조 유틸.
 *
 * 알려진 함정 목록(참조: F:\mathlab-lab-p1\src\lib\lab\problem-gen.ts — 읽기 전용 참조,
 * 코드는 이 프로젝트 컨벤션에 맞춰 새로 작성했으며 그대로 옮긴 것이 아니다):
 *  - JSON이 마크다운 코드펜스(```json ... ```)로 감싸져 오거나 앞뒤에 잡담(prose)이 붙는 경우
 *  - LaTeX 명령(\frac, \times, \sqrt 등)의 백슬래시가 JSON 문자열 이스케이프 규칙과 충돌해
 *    JSON.parse가 실패하거나(예: `\t`가 탭으로 먹혀버림) 조용히 다른 값으로 깨지는 경우
 *  - 응답 문자열 리터럴 안에 이스케이프되지 않은 리터럴 줄바꿈이 그대로 섞여 들어오는 경우
 *  - `\dfrac`(인라인 위치에서 과도하게 큰 분수로 렌더링됨)을 `\frac`으로 정규화해야 하는 경우
 *
 * 참조: docs/planning/06-tasks.md T3.2 ("JSON 잘림 방지, LaTeX 백슬래시/줄바꿈 salvage")
 */
import type { z, ZodType } from "zod";

import {
  normalizeMathgenAnswer,
  normalizeMathgenText,
} from "@/lib/math/normalizeMathgenText";

import { AiParseError } from "./errors";

/** JSON 문자열 리터럴에서 백슬래시 다음에 와도 되는 유효한 이스케이프 문자 집합. */
const VALID_JSON_ESCAPES = new Set([
  '"',
  "\\",
  "/",
  "b",
  "f",
  "n",
  "r",
  "t",
  "u",
]);

/**
 * `\b`, `\f`, `\n`, `\r`, `\t`, `\u`로 시작하는 LaTeX 명령은 JSON 이스케이프와
 * 충돌한다(예: `\frac`은 JSON.parse에서 form-feed + "rac"으로 조용히 손상된다).
 * 뒤에 영문 명령명이 이어지면 LaTeX로 보고, `\u` 뒤 4자리가 16진수인 경우만 정상
 * JSON 유니코드 이스케이프로 유지한다.
 */
function isAmbiguousLatexCommand(text: string, slashIndex: number): boolean {
  const escape = text[slashIndex + 1];
  const following = text[slashIndex + 2];

  if (escape === "u") {
    return !/^[0-9a-fA-F]{4}$/.test(text.slice(slashIndex + 2, slashIndex + 6));
  }

  return (
    escape !== undefined &&
    ["b", "f", "n", "r", "t"].includes(escape) &&
    following !== undefined &&
    /[a-zA-Z]/.test(following)
  );
}

/** `\dfrac` → `\frac` 정규화(인라인 위치 과대 렌더링 방지, 07-coding-convention.md 참조). */
export function normalizeLatex(text: string): string {
  return text.replace(/\\dfrac/g, "\\frac");
}

/**
 * 문제은행에 들어갈 AI 글(본문·해설)의 저장 전 후보정 — 작업실 입구
 * (`src/lib/dev-ai/tasks.ts`)와 **같은 함수**를 거친다(2026-09-26 후보정 감사 K).
 * 화면은 렌더 때 다시 후보정하지만 DB 값이 날것이면 DB 를 읽는 다른 자리가 다른 글을
 * 본다. 후보정은 멱등이라 렌더가 한 번 더 돌려도 모양이 안 바뀐다.
 */
export function normalizeAiText(text: string): string {
  return normalizeMathgenText(normalizeLatex(text));
}

/** 정답 칸 — 작업실 입구의 정답 후보정(목록 쉼표 띄어쓰기 포함)과 같다. */
export function normalizeAiAnswer(text: string): string {
  return normalizeMathgenAnswer(normalizeLatex(text));
}

/** 마크다운 코드펜스(```json ... ``` 또는 ``` ... ```)를 제거하고 내용만 남긴다. */
function stripCodeFence(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1]! : raw).trim();
}

/** 앞뒤 잡담(prose)을 잘라내고 최외곽 JSON 배열/객체 구간만 남긴다. */
function extractJsonSpan(text: string): string {
  const starts = [text.indexOf("["), text.indexOf("{")].filter((i) => i >= 0);
  if (starts.length === 0) return text;
  const start = Math.min(...starts);
  const openChar = text[start];
  const closeChar = openChar === "[" ? "]" : "}";
  const end = text.lastIndexOf(closeChar);
  if (end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

/**
 * JSON 문자열 리터럴 "내부"에서만: 유효하지 않은 이스케이프(LaTeX 백슬래시)를 이중
 * 백슬래시로 보정해 리터럴 백슬래시로 살리고, 리터럴 줄바꿈/캐리지리턴을 `\n`으로
 * 치환한다. 문자열 밖(구조 문자: `{`, `}`, `[`, `]`, `,`, `:`)은 건드리지 않는다.
 */
function escapeInsideStrings(text: string, latex = true): string {
  let result = "";
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (!inString) {
      result += ch;
      if (ch === '"') inString = true;
      continue;
    }

    if (ch === '"') {
      result += ch;
      inString = false;
      continue;
    }
    if (ch === "\\") {
      const next = text[i + 1];
      if (
        next !== undefined &&
        VALID_JSON_ESCAPES.has(next) &&
        !(latex && isAmbiguousLatexCommand(text, i))
      ) {
        result += ch + next;
        i++;
      } else {
        // LaTeX 백슬래시(\frac, \times 등) — 이중 백슬래시로 보정해 리터럴 백슬래시로 살린다.
        result += "\\\\";
      }
      continue;
    }
    if (ch === "\n") {
      result += "\\n";
      continue;
    }
    if (ch === "\r") {
      continue; // "\r\n"의 \r은 버리고 다음 "\n"만 \n으로 남긴다.
    }
    if (ch.charCodeAt(0) < 0x20) {
      // Literal tabs and other control characters invalidate JSON strings too.
      // Escape them without deleting source text or changing the JSON structure.
      result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
      continue;
    }
    result += ch;
  }

  return result;
}

/** 끝 콤마(trailing comma) 제거 — JSON 문자열 내부의 `,]` / `,}`는 보존한다. */
function stripTrailingCommas(text: string): string {
  let result = "";
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (ch === "\\" && inString && text[i + 1] !== undefined) {
      result += ch + text[i + 1];
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (ch === "," && !inString) {
      let nextIndex = i + 1;
      while (/\s/.test(text[nextIndex] ?? "")) nextIndex++;
      if (text[nextIndex] === "]" || text[nextIndex] === "}") continue;
    }

    result += ch;
  }

  return result;
}

/**
 * AI 응답 텍스트에서 흔한 손상을 복구해 `JSON.parse`가 통과할 형태로 만든다.
 * 완벽한 파서가 아니라 salvage(구조는 보존, 내용만 복구)에 집중한 실용적 복구다.
 *
 * `latex: false` — LaTeX 가 없는 글(오늘의 영어)용. `
`·`	` 뒤에 영문자가 와도 LaTeX 명령으로 보지 않는다.
 * 🔴 켠 채로 영어를 읽으면 줄바꿈 뒤 영어 단어(`
Many`)마다 역슬래시가 글자로 남는다(2026-09-30 모델 벤치).
 */
export function repairJsonString(
  raw: string,
  { latex = true }: { latex?: boolean } = {},
): string {
  const withoutFence = stripCodeFence(raw);
  const jsonSpan = extractJsonSpan(withoutFence);
  const withEscapedStrings = escapeInsideStrings(jsonSpan, latex);
  return stripTrailingCommas(withEscapedStrings);
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * AI 응답 텍스트를 JSON 배열로 파싱하고 각 원소를 `itemSchema`로 검증한다.
 * 먼저 `repairJsonString`을 적용한다. `\frac`처럼 JSON.parse 자체는 성공하지만 의미가
 * 손상되는 LaTeX/JSON 이스케이프 충돌도 있기 때문이다. 보정본 파싱이 실패하면 원문을
 * 한 번 더 시도한다. 둘 다 실패하거나 배열이 아니거나 스키마를 통과하지 못하면
 * `AiParseError`를 던진다 —
 * "재시도 1회" 여부는 호출자(src/lib/ai/retry.ts)가 결정한다(이 함수 자체는 재시도하지 않음).
 */
export function parseAiJsonArray<T extends ZodType>(
  raw: string,
  itemSchema: T,
): z.infer<T>[] {
  const repaired = repairJsonString(raw);
  const parsedJson = tryParseJson(repaired) ?? tryParseJson(raw);

  if (parsedJson === undefined) {
    throw new AiParseError("AI 응답이 유효한 JSON이 아닙니다.");
  }
  if (!Array.isArray(parsedJson)) {
    throw new AiParseError("AI 응답이 JSON 배열 형태가 아닙니다.");
  }

  const result = itemSchema.array().safeParse(parsedJson);
  if (!result.success) {
    throw new AiParseError(
      `AI 응답이 예상한 형태와 다릅니다: ${result.error.issues
        .map((issue) => issue.message)
        .join(", ")}`,
      { cause: result.error },
    );
  }
  return result.data;
}

/**
 * 최외곽 JSON **객체** 구간 — 첫 `{` 부터 마지막 `}` 까지.
 * `extractJsonSpan` 은 `[` 와 `{` 가운데 먼저 나온 것을 잡아, 잡설에 대괄호(«[참고]»)가 있으면
 * 객체를 놓친다. 객체를 기대하는 자리에서만 이 구간을 한 번 더 시도한다.
 */
function extractObjectSpan(text: string): string | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return undefined;
  return text.slice(start, end + 1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * AI 응답(또는 ChatGPT 에서 붙여 넣은 글)에서 **JSON 객체 하나**를 읽는다 — 오늘의 영어(D-148 · 25 §4.3)가
 * 세트 초안을 배열이 아니라 객체로 받기 때문이다. 복구 단계는 `parseAiJsonArray` 와 같되 **LaTeX 규칙은 끈다**
 * (`repairJsonString(…, {latex:false})`: 코드펜스 · 앞뒤 잡설 · 문자열 안 백슬래시·줄바꿈 · 후행 쉼표), 배열 함수는 손대지 않는다.
 *
 * 순서: 보정본 → 원문 → (코드펜스 벗긴 글의) 객체 구간 보정본 → 그 원문. 후보를 **끝까지** 돌아 처음 **객체로**
 * 풀리는 것을 쓴다 — 잡설의 `[1]` 같은 대괄호 토큰이 배열로 먼저 풀려도 그 뒤 객체 구간이 살아 있다(리드 검토 D5).
 * 객체가 하나도 없으면: 배열·문자열·null 로 풀린 후보가 있었으면 «객체 형태가 아닙니다», 아무것도 안 풀렸으면
 * «유효한 JSON 이 아닙니다». (객체 하나를 감싼 배열 `[{…}]` 은 객체 구간이 안의 객체를 건진다 — 내용은 어차피
 * 검증기가 본다.) `schema` 를 주면 그 스키마로 잠그고 위반은 `AiParseError` 다 — 재시도 여부는 호출자
 * (`withOneRetryOnParseFailure`)가 정한다.
 */
export function parseAiJsonObject(raw: string): Record<string, unknown>;
export function parseAiJsonObject<T extends ZodType>(
  raw: string,
  schema: T,
): z.infer<T>;
export function parseAiJsonObject(raw: string, schema?: ZodType): unknown {
  // 객체 파서는 오늘의 영어만 쓴다 — LaTeX 규칙을 끈 복구(위 `repairJsonString` 머리말의 🔴)
  const repair = (text: string) => repairJsonString(text, { latex: false });
  const candidates = [repair(raw), raw];
  const span = extractObjectSpan(stripCodeFence(raw));
  if (span !== undefined) candidates.push(repair(span), span);

  let object: Record<string, unknown> | undefined;
  let sawNonObject = false;
  for (const candidate of candidates) {
    const value = tryParseJson(candidate);
    if (value === undefined) continue;
    if (!isPlainObject(value)) {
      sawNonObject = true;
      continue;
    }
    object = value;
    break;
  }
  if (!object) {
    throw new AiParseError(
      sawNonObject
        ? "AI 응답이 JSON 객체 형태가 아닙니다."
        : "AI 응답이 유효한 JSON이 아닙니다.",
    );
  }
  if (!schema) return object;

  const result = schema.safeParse(object);
  if (!result.success) {
    throw new AiParseError(
      `AI 응답이 예상한 형태와 다릅니다: ${result.error.issues
        .map((issue) => issue.message)
        .join(", ")}`,
      { cause: result.error },
    );
  }
  return result.data;
}
