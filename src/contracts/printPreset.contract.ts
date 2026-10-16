import { z } from "zod";
import type { PrintMeta, PrintOptions } from "@/components/unified/print/types";

/**
 * 시험지 만들기 3단계 «내 양식»(W6 · Hi-fi 1안 — 원장님 2026-10-16).
 *
 * 담는 것은 **서식 설정 전부**(`PrintOptions` — 템플릿 · 폰트 · 색 · 배치 · 간격 · 보기 번호 · 표시 옵션(날짜 표시 포함) · 정답지)와
 * 학원에서 잘 안 바뀌는 머리 정보 일곱(학교/기관명 · 과목 · 시험 시간 · 출제자 · 총점 · 학원명 · 강사명)뿐이다.
 * 문항 · 문제 순서 · 제목 · 시험일 · 학년 · 학기 · 오늘의 목표 · 개념 정리 · 유형명 · 핵심 전략 · 태그는 담지 않는다.
 *
 * 저장 자리는 `workspace_document`(kind `printPreset` — 늘 비공개 · 주인만)이고 자료 목록에는 나오지 않는다.
 * 판(`v`)을 올릴 때는 옛 판을 읽는 길을 같이 둔다 — 모르는 판 · 모르는 칸은 버리지 않고 거절한다(strict).
 */

export const PRINT_PRESET_VERSION = 1 as const;
/** 한 사람이 둘 수 있는 양식 수 — W5 «저장한 조건»과 같은 규칙. */
export const PRINT_PRESET_LIMIT = 50;
export const PRINT_PRESET_NAME_MAX = 40;
const TEXT_MAX = 200;

export const printPresetNameSchema = z
  .string()
  .trim()
  .min(1, "양식 이름을 적어 주세요.")
  .max(
    PRINT_PRESET_NAME_MAX,
    `양식 이름은 ${PRINT_PRESET_NAME_MAX}자까지입니다.`,
  );

/** 서식 설정 — `PrintOptions` 의 칸 전부(빠진 칸 · 모르는 칸 모두 거절). 허용 값은 `parsePrintOptions` 와 같다. */
export const printPresetOptionsSchema = z.strictObject({
  template: z.enum([
    "pyeongga",
    "jeongtong",
    "modern",
    "workbook",
    "jaseup",
    "yuhyung",
  ]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  columns: z.union([z.literal(1), z.literal(2)]),
  layoutMode: z.enum(["spacing", "count"]),
  problemsPerColumn: z.number().int().min(2).max(4),
  spacing: z.number().finite().min(0).max(150),
  showAnswers: z.boolean(),
  quickAnswerOnly: z.boolean(),
  showDate: z.boolean(),
  showChapter: z.boolean(),
  showDifficulty: z.boolean(),
  hideScores: z.boolean(),
  columnDivider: z.boolean(),
  choiceLayout: z.enum(["5x1", "2x3", "3x2", "auto"]),
  solvingArea: z.enum(["off", "blank", "ruled", "chalkboard"]),
  fontPack: z.enum(["system", "nanum", "noto", "gowun", "pretendard"]),
  marginPreset: z.enum(["narrow", "normal", "wide"]),
});
export type PrintPresetOptions = z.infer<typeof printPresetOptionsSchema>;

/** 양식이 담는 머리 정보 — 차례는 저장 창 · 목록의 차례다. */
export const PRINT_PRESET_HEAD = [
  ["schoolName", "학교/기관명"],
  ["subject", "과목"],
  ["examDuration", "시험 시간"],
  ["examiner", "출제자"],
  ["totalScore", "총점"],
  ["academyName", "학원명"],
  ["instructorName", "강사명"],
] as const satisfies readonly (readonly [keyof PrintMeta, string])[];
export type PrintPresetHeadKey = (typeof PRINT_PRESET_HEAD)[number][0];

const text = z.string().max(TEXT_MAX);
export const printPresetHeadSchema = z.strictObject({
  schoolName: text,
  subject: text,
  examDuration: text,
  examiner: text,
  /** 비운 총점은 칸이 없다(지면이 기본 100 을 쓴다). */
  totalScore: z.number().finite().min(0).max(100000).optional(),
  academyName: text,
  instructorName: text,
});
export type PrintPresetHead = z.infer<typeof printPresetHeadSchema>;

const presetFields = {
  v: z.literal(PRINT_PRESET_VERSION),
  name: printPresetNameSchema,
  options: printPresetOptionsSchema,
  head: printPresetHeadSchema,
};

/** 화면이 보내는 양식 — 이름과 담는 것. 기본 여부 · 날짜는 서버가 정한다. */
export const printPresetInputSchema = z.strictObject(presetFields);
export type PrintPresetInput = z.infer<typeof printPresetInputSchema>;

/** 저장된 꼴(`workspace_document.payload`). 기본 양식은 한 사람에 하나 — 서버가 지킨다. */
export const printPresetPayloadSchema = z.strictObject({
  ...presetFields,
  /** 새 시험지가 이 양식으로 열린다. */
  isDefault: z.boolean(),
  lastUsedAt: z.iso.datetime(),
  savedAt: z.iso.datetime(),
});
export type PrintPresetPayload = z.infer<typeof printPresetPayloadSchema>;

export const printPresetIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

export const printPresetSchema = z.strictObject({
  id: printPresetIdSchema,
  revision: z.number().int().min(1),
  preset: printPresetPayloadSchema,
});
export type PrintPreset = z.infer<typeof printPresetSchema>;

/** 저장(새로 · 같은 이름을 바꿔). `replace` 는 화면이 «바꿀까요?»를 물은 뒤에만 싣는다. */
export const savePrintPresetSchema = z.strictObject({
  preset: printPresetInputSchema,
  /** «새 시험지의 기본 양식으로» — 켜면 다른 양식의 기본이 풀린다. */
  makeDefault: z.boolean().optional(),
  replace: z
    .strictObject({
      id: printPresetIdSchema,
      expectedRevision: z.number().int().min(1),
    })
    .optional(),
});
export type SavePrintPresetRequest = z.infer<typeof savePrintPresetSchema>;

/** 이름 바꾸기 · 적용(마지막 사용을 지금으로) · 기본으로 / 기본 해제. */
export const patchPrintPresetSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("rename"),
    name: printPresetNameSchema,
    expectedRevision: z.number().int().min(1),
  }),
  z.strictObject({ action: z.literal("touch") }),
  z.strictObject({ action: z.literal("default"), isDefault: z.boolean() }),
]);
export type PatchPrintPresetRequest = z.infer<typeof patchPrintPresetSchema>;

export const printPresetListResponseSchema = z.object({
  data: z.array(printPresetSchema),
  meta: z.object({ limit: z.number().int() }),
});

export const PRINT_PRESET_ERROR = {
  NAME_TAKEN: "PRINT_PRESET_NAME_TAKEN",
  LIMIT: "PRINT_PRESET_LIMIT",
} as const;

/** 지금 시험지에서 양식이 담는 값만 떼어 낸다(저장 창 · 같은지 견주기). */
export function presetContentOf(
  options: PrintOptions,
  meta: PrintMeta,
): Pick<PrintPresetInput, "options" | "head"> {
  const head = Object.fromEntries(
    PRINT_PRESET_HEAD.flatMap(([key]): [string, string | number][] => {
      const value = meta[key];
      if (key === "totalScore")
        return typeof value === "number" ? [[key, value]] : [];
      return [[key, typeof value === "string" ? value : ""]];
    }),
  ) as PrintPresetHead;
  return { options: { ...options } as PrintPresetOptions, head };
}

/** 적용 — 담긴 값을 통째로 덮는다(서식 전부 · 머리 정보 일곱). 담지 않는 칸은 그대로다. */
export function applyPresetTo(
  preset: Pick<PrintPresetInput, "options" | "head">,
  meta: PrintMeta,
): { options: PrintOptions; meta: PrintMeta } {
  return {
    options: { ...preset.options },
    meta: {
      ...meta,
      ...preset.head,
      totalScore: preset.head.totalScore,
    },
  };
}

/** 서식 · 머리 정보 가운데 양식과 다른 칸이 있나 — 있으면 «직접 정함». 색은 대소문자를 가리지 않는다. */
export function presetDiffers(
  preset: Pick<PrintPresetInput, "options" | "head">,
  options: PrintOptions,
  meta: PrintMeta,
): boolean {
  const now = presetContentOf(options, meta);
  for (const key of Object.keys(preset.options) as (keyof PrintOptions)[]) {
    const a = preset.options[key];
    const b = now.options[key];
    const same =
      typeof a === "string" && typeof b === "string"
        ? a.toLowerCase() === b.toLowerCase()
        : a === b;
    if (!same) return true;
  }
  return PRINT_PRESET_HEAD.some(
    ([key]) => (preset.head[key] ?? "") !== (now.head[key] ?? ""),
  );
}
