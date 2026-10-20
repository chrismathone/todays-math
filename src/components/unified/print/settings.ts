import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "./types";

export const TEMPLATES = [
  { value: "pyeongga", label: "평가원", hint: "수능·모평" },
  { value: "jeongtong", label: "정통", hint: "학교 시험지" },
  { value: "modern", label: "모던", hint: "학교 마케팅" },
  { value: "workbook", label: "워크북", hint: "풀이공간" },
  { value: "jaseup", label: "자습", hint: "개념+모눈" },
  { value: "yuhyung", label: "유형", hint: "유형 컴팩트" },
] as const;
export const COLORS = [
  ["사이언", "#0EA5E9"],
  ["파랑", "#135bec"],
  ["보라", "#8b5cf6"],
  ["핑크", "#ec4899"],
  ["주황", "#F97316"],
  ["노랑", "#eab308"],
  ["초록", "#10b981"],
  ["회색", "#64748b"],
] as const;
/**
 * 보기 번호 배치 — 원장님이 직접 정하신 네 값과 라벨(2026-09-20).
 * 라벨은 원장님 표 그대로 쓴다(D-08). 순서도 그 표의 순서다.
 * 값 어휘는 OCR 계약(`choicesLayout`)과 같은 «행x열» — 두 벌을 만들지 않으려는 것이다.
 */
export const CHOICE_LAYOUTS = [
  ["5x1", "5행"],
  ["2x3", "3열 2행"],
  ["3x2", "2열 3행"],
  ["auto", "자동"],
] as const;
export const SPACING_PRESETS = [
  ["최소", 4],
  ["좁게", 16],
  ["보통", 32],
  ["넓게", 56],
  ["최대", 88],
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Additive v1 migration: reject malformed known fields, preserve legacy spacing values. */
export function parsePrintOptions(
  value: unknown,
  legacy: { columns?: unknown; answers?: unknown } = {},
): PrintOptions {
  if (value !== undefined && !record(value))
    throw new Error("Invalid print options");
  const options = { ...DEFAULT_PRINT_OPTIONS, smartSpacing: false };
  if (legacy.columns === 1 || legacy.columns === 2)
    options.columns = legacy.columns;
  if (typeof legacy.answers === "boolean") options.showAnswers = legacy.answers;
  if (!value) return options;
  const choices: Partial<Record<keyof PrintOptions, readonly unknown[]>> = {
    template: TEMPLATES.map((t) => t.value),
    columns: [1, 2],
    layoutMode: ["spacing", "count"],
    problemsPerColumn: [2, 3, 4],
    fontPack: ["system", "nanum", "noto", "gowun", "pretendard"],
    marginPreset: ["narrow", "normal", "wide"],
    solvingArea: ["off", "blank", "ruled", "chalkboard"],
    choiceLayout: CHOICE_LAYOUTS.map(([value]) => value),
  };
  for (const key of Object.keys(options) as (keyof PrintOptions)[]) {
    const next = value[key];
    if (next === undefined) continue;
    const valid = choices[key]
      ? choices[key]!.includes(next)
      : key === "color"
        ? typeof next === "string" && /^#[0-9a-f]{6}$/i.test(next)
        : key === "spacing"
          ? typeof next === "number" &&
            Number.isFinite(next) &&
            next >= 0 &&
            next <= 150
          : typeof next === "boolean";
    if (!valid) throw new Error(`Invalid print option: ${key}`);
    Object.assign(options, { [key]: next });
  }
  return options;
}

export function parsePrintMeta(value: unknown): PrintMeta {
  if (value !== undefined && !record(value))
    throw new Error("Invalid print metadata");
  const meta = { ...DEFAULT_PRINT_META };
  if (!value) return meta;
  for (const key of Object.keys(meta) as (keyof PrintMeta)[]) {
    const next = value[key];
    if (next === undefined) continue;
    if (
      key === "totalScore"
        ? typeof next !== "number" || !Number.isFinite(next) || next < 0
        : typeof next !== "string"
    )
      throw new Error(`Invalid print metadata: ${key}`);
    Object.assign(meta, { [key]: next });
  }
  return meta;
}
