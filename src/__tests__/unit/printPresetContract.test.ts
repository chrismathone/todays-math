/**
 * 시험지 만들기 3단계 «내 양식»(W6 · 2026-10-16)의 계약 — 서식 전부 + 머리 정보 일곱만 담는다.
 * 문항 · 제목 · 시험일 · 학년 · 학기 · 시험지마다 다른 글 · 태그는 담지 않고, 모르는 칸은 거절한다.
 */
import { describe, expect, it } from "vitest";
import {
  PRINT_PRESET_HEAD,
  PRINT_PRESET_NAME_MAX,
  applyPresetTo,
  patchPrintPresetSchema,
  presetContentOf,
  presetDiffers,
  printPresetInputSchema,
  printPresetOptionsSchema,
  printPresetPayloadSchema,
  savePrintPresetSchema,
} from "@/contracts/printPreset.contract";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
} from "@/components/unified/print/types";

const sheetMeta: PrintMeta = {
  ...DEFAULT_PRINT_META,
  title: "중2 일차부등식 10.16",
  schoolName: "인재원학원",
  grade: "중2",
  semester: "1학기",
  examDate: "2026-10-16",
  examDuration: "20분",
  examiner: "박선생",
  totalScore: 50,
  todayGoal: "부등식 풀기",
  conceptNote: "부등호의 방향",
  patternName: "유형 3",
  patternStrategy: "이항",
};
const input = () => ({
  v: 1 as const,
  name: "일일TEST 2단",
  ...presetContentOf(
    { ...DEFAULT_PRINT_OPTIONS, columns: 2, showAnswers: true },
    sheetMeta,
  ),
});

describe("print preset contract (W6)", () => {
  it("covers every PrintOptions field — a new print option cannot be left out of 양식", () => {
    expect(Object.keys(printPresetOptionsSchema.shape).sort()).toEqual(
      Object.keys(DEFAULT_PRINT_OPTIONS).sort(),
    );
    expect(printPresetOptionsSchema.parse(DEFAULT_PRINT_OPTIONS)).toEqual(
      DEFAULT_PRINT_OPTIONS,
    );
    // 날짜 표시도 서식이다.
    expect(Object.keys(printPresetOptionsSchema.shape)).toContain("showDate");
  });

  it("carries only the seven rarely-changing head fields", () => {
    expect(PRINT_PRESET_HEAD.map(([key]) => key)).toEqual([
      "schoolName",
      "subject",
      "examDuration",
      "examiner",
      "totalScore",
      "academyName",
      "instructorName",
    ]);
    const { head } = presetContentOf(DEFAULT_PRINT_OPTIONS, sheetMeta);
    expect(head).toEqual({
      schoolName: "인재원학원",
      subject: "수학",
      examDuration: "20분",
      examiner: "박선생",
      totalScore: 50,
      academyName: "",
      instructorName: "",
    });
    for (const key of [
      "title",
      "grade",
      "semester",
      "examDate",
      "todayGoal",
      "conceptNote",
      "patternName",
      "patternStrategy",
    ])
      expect(head).not.toHaveProperty(key);
  });

  it("rejects problems, sheet fields, tags, unknown options and other versions", () => {
    expect(printPresetInputSchema.safeParse(input()).success).toBe(true);
    for (const extra of [
      { problems: [] },
      { title: "x" },
      { tag: "일일TEST" },
      { order: [] },
    ])
      expect(
        printPresetInputSchema.safeParse({ ...input(), ...extra }).success,
      ).toBe(false);
    const base = input();
    for (const head of [
      { ...base.head, examDate: "2026-10-16" },
      { ...base.head, grade: "중2" },
      { ...base.head, todayGoal: "x" },
    ])
      expect(printPresetInputSchema.safeParse({ ...base, head }).success).toBe(
        false,
      );
    expect(
      printPresetInputSchema.safeParse({
        ...base,
        options: { ...base.options, ghost: true },
      }).success,
    ).toBe(false);
    expect(
      printPresetInputSchema.safeParse({
        ...base,
        options: { ...base.options, color: "red" },
      }).success,
    ).toBe(false);
    expect(printPresetInputSchema.safeParse({ ...base, v: 2 }).success).toBe(
      false,
    );
  });

  it("trims names to 1–40 characters", () => {
    expect(
      printPresetInputSchema.parse({ ...input(), name: "  주간 확인 " }).name,
    ).toBe("주간 확인");
    expect(
      printPresetInputSchema.safeParse({ ...input(), name: "   " }).success,
    ).toBe(false);
    expect(
      printPresetInputSchema.safeParse({
        ...input(),
        name: "가".repeat(PRINT_PRESET_NAME_MAX + 1),
      }).success,
    ).toBe(false);
  });

  it("stored payload adds the default flag and dates only", () => {
    const stored = {
      ...input(),
      isDefault: true,
      lastUsedAt: "2026-10-16T01:00:00.000Z",
      savedAt: "2026-10-16T01:00:00.000Z",
    };
    expect(printPresetPayloadSchema.safeParse(stored).success).toBe(true);
    expect(
      printPresetPayloadSchema.safeParse({ ...stored, isDefault: undefined })
        .success,
    ).toBe(false);
  });

  it("save and patch requests are strict", () => {
    expect(
      savePrintPresetSchema.safeParse({ preset: input(), makeDefault: true })
        .success,
    ).toBe(true);
    expect(
      savePrintPresetSchema.safeParse({ preset: input(), other: 1 }).success,
    ).toBe(false);
    for (const ok of [
      { action: "touch" },
      { action: "default", isDefault: false },
      { action: "rename", name: "새 이름", expectedRevision: 1 },
    ])
      expect(patchPrintPresetSchema.safeParse(ok).success).toBe(true);
    expect(
      patchPrintPresetSchema.safeParse({ action: "rename", name: "x" }).success,
    ).toBe(false);
  });

  it("applying overwrites every carried value and leaves the sheet's own fields alone", () => {
    const preset = {
      options: {
        ...DEFAULT_PRINT_OPTIONS,
        template: "workbook" as const,
        columns: 2 as const,
        showDate: false,
      },
      head: {
        schoolName: "",
        subject: "수학",
        examDuration: "50분",
        examiner: "",
        academyName: "인재원학원",
        instructorName: "박선생",
      },
    };
    const { options, meta } = applyPresetTo(preset, sheetMeta);
    expect(options).toEqual(preset.options);
    expect(meta).toMatchObject({
      schoolName: "",
      examDuration: "50분",
      examiner: "",
      academyName: "인재원학원",
      instructorName: "박선생",
      totalScore: undefined,
      // 시험지마다 다른 값은 그대로.
      title: sheetMeta.title,
      grade: "중2",
      semester: "1학기",
      examDate: "2026-10-16",
      todayGoal: "부등식 풀기",
      conceptNote: "부등호의 방향",
      patternName: "유형 3",
      patternStrategy: "이항",
    });
    expect(presetDiffers(preset, options, meta)).toBe(false);
  });

  it("any carried edit differs; edits to fields it does not carry do not", () => {
    const preset = presetContentOf(DEFAULT_PRINT_OPTIONS, sheetMeta);
    expect(presetDiffers(preset, DEFAULT_PRINT_OPTIONS, sheetMeta)).toBe(false);
    expect(
      presetDiffers(
        preset,
        {
          ...DEFAULT_PRINT_OPTIONS,
          color: DEFAULT_PRINT_OPTIONS.color.toLowerCase(),
        },
        sheetMeta,
      ),
    ).toBe(false);
    expect(
      presetDiffers(
        preset,
        { ...DEFAULT_PRINT_OPTIONS, showDate: false },
        sheetMeta,
      ),
    ).toBe(true);
    expect(
      presetDiffers(preset, DEFAULT_PRINT_OPTIONS, {
        ...sheetMeta,
        examiner: "김선생",
      }),
    ).toBe(true);
    expect(
      presetDiffers(preset, DEFAULT_PRINT_OPTIONS, {
        ...sheetMeta,
        title: "다른 제목",
        examDate: "2026-10-17",
        grade: "중3",
      }),
    ).toBe(false);
  });
});
