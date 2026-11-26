import "server-only";

/** Only the first JSON value: never skip a damaged value in favour of a later answer.
 * Scan balanced containers with quoted/escaped braces; do not use a greedy brace regex. */
export function firstScanJson(raw: string): unknown {
  if (raw.length > 1_000_000) return undefined;
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "");
  const start = text.search(/[\[{]/);
  // A leading primitive is a JSON value too; it must not expose a subsequent object.
  if (/^(?:null|true|false|"|-?\d)/.test(text)) {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  if (start < 0) return undefined;
  let quoted = false,
    escaped = false;
  const stack: string[] = [];
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") {
      if (stack.pop() !== (c === "}" ? "{" : "[")) return undefined;
      if (!stack.length) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

export class ScanOutputError extends Error {
  constructor(
    readonly operation: "read" | "grade",
    readonly invalidFields: number,
  ) {
    super(
      `사진 ${operation === "read" ? "읽기" : "채점"} 응답 형식 오류: ${invalidFields}개 항목을 확인해야 합니다.`,
    );
    this.name = "ScanOutputError";
  }
}
export type ScanOutputReporter = (error: ScanOutputError) => Promise<void>;
const string = { type: "string" };
const status = {
  type: "string",
  enum: ["read", "blank", "uncertain", "unreadable"],
};
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
// Native output_config.format through studio-ai jsonSchema (verified 2026-11-25):
// https://platform.claude.com/docs/en/build-with-claude/structured-outputs
export const SCAN_READ_OUTPUT_SCHEMA = object({
  slots: {
    type: "array",
    items: object({
      id: string,
      status,
      text: string,
      tags: {
        type: "array",
        items: {
          type: "string",
          enum: ["clear", "faint", "erased", "outside", "red-overlap", "blank"],
        },
      },
    }),
  },
  written_name: { anyOf: [object({ status, text: string }), { type: "null" }] },
});
export const SCAN_GRADE_OUTPUT_SCHEMA = object({
  grades: {
    type: "array",
    items: object({
      id: string,
      label: {
        type: "string",
        enum: ["correct", "partial", "incorrect", "review"],
      },
      reason: string,
    }),
  },
});
/** 첨삭을 함께 묻는 판(계획 §6.2 4 · 5). 판정 칸은 위와 같고 notes 는 따로 검증한다. */
export const SCAN_GRADE_MARKUP_OUTPUT_SCHEMA = object({
  grades: SCAN_GRADE_OUTPUT_SCHEMA.properties.grades,
  notes: {
    type: "array",
    items: object({
      targetId: string,
      slotId: string,
      kind: { type: "string", enum: ["wrong", "missing", "example"] },
      quote: string,
      say: string,
      fix: string,
    }),
  },
});
