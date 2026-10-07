/**
 * 출처 책 · 출처 자료 — 교과서 · 문제집에서 옮긴 문항의 메타데이터 계약 (D-160, 2026-10-07).
 *
 * 원장님 2026-10-07: 「출판사 학년 학기 단원 유형 등 모든 곳에 메타데이터가 있어야 문제은행을 이용하기 용이함」.
 *
 *   SourceBook      책 한 권 — 「천재교육 · 중학 수학1 · 김동재 · 2022 개정」
 *     └ SourceMaterial  그 책에 딸린 자료 한 편(파일 하나) — 「형성평가 1-1-1 1회」
 *         └ Problem.sourceMaterialId
 *
 * DB 는 `prisma/schema.prisma` 의 `SourceBook` · `SourceMaterial` — 책의 갈래 · 학기 · 회차는 DB CHECK 가 같이 지킨다
 * (`prisma/migrations/20261007130100_source_book_material`). 자료 종류는 여기 목록이 정본이고 DB 에는 CHECK 가 없다
 * (새 종류가 생기면 여기에 더한다 — 목록 밖의 값은 적재기가 거절한다).
 */
import { z } from "zod";

/** 책의 갈래 — DB CHECK `source_book_kind_valid` 와 같은 값. */
export const SOURCE_BOOK_KINDS = ["school_textbook", "workbook"] as const;
export const sourceBookKindSchema = z.enum(SOURCE_BOOK_KINDS);
export type SourceBookKind = z.infer<typeof sourceBookKindSchema>;

/** 화면에 보이는 책의 갈래 이름. */
export const SOURCE_BOOK_KIND_LABEL: Record<SourceBookKind, string> = {
  school_textbook: "교과서",
  workbook: "문제집",
};

/**
 * 자료 종류 — 출판사마다 다른 이름을 우리가 맞춘 것. 원문(`kindRaw`)은 따로 보존한다.
 *
 * 차례는 「쉬운 것 → 넓은 것 → 그 밖」이다 — 거르기 목록이 이 차례로 그린다.
 * 🔴 이 목록에 값을 더하면 `SOURCE_MATERIAL_KIND_RULES`(자료 이름 → 종류)에도 규칙을 더한다 —
 *    안 더하면 그 종류로 분류되는 자료가 영영 0 이다(시험이 종류마다 예 하나를 요구한다).
 */
export const SOURCE_MATERIAL_KINDS = [
  "기초 연산",
  "형성 평가",
  "소단원 평가",
  "중단원 평가",
  "대단원 평가",
  "수준별 문제",
  "쌍둥이 문제",
  "시험 대비",
  "서술형 평가",
  "진단 평가",
  "수행 과제",
  "수업 자료",
  "기타",
] as const;
export const sourceMaterialKindSchema = z.enum(SOURCE_MATERIAL_KINDS);
export type SourceMaterialKind = z.infer<typeof sourceMaterialKindSchema>;

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const sourceBookSchema = z.object({
  /** 다시 적재해도 같은 줄이 되게 하는 열쇠 — `2022/천재교육/중1/김동재` */
  externalKey: trimmed(120),
  kind: sourceBookKindSchema,
  publisher: trimmed(30),
  author: trimmed(30).nullable(),
  title: trimmed(80),
  /** 우리 교육과정 트리의 학년 키 — `Unit.grade` 와 같은 값 */
  grade: trimmed(10),
  /** 교육과정 고시 연도 */
  curriculum: z.string().regex(/^\d{4}$/),
});
export type SourceBookInput = z.infer<typeof sourceBookSchema>;

const unitNumber = z.number().int().min(1).max(99).nullable();

export const sourceMaterialSchema = z
  .object({
    /** 원본 파일 경로의 sha1 앞 16자에 `tb-` 를 붙인 것 */
    externalKey: trimmed(120),
    kind: sourceMaterialKindSchema,
    /** 출판사가 부른 이름 그대로 */
    kindRaw: trimmed(60),
    title: trimmed(200),
    /** 교과서의 단원 번호 — 첫째 · 둘째 · 셋째 단. 책마다 두 단인 것과 세 단인 것이 있다 */
    chapterNo: unitNumber,
    middleNo: unitNumber,
    sectionNo: unitNumber,
    unitRaw: trimmed(120).nullable(),
    semester: z.union([z.literal(1), z.literal(2)]).nullable(),
    round: z.enum(["중간", "기말"]).nullable(),
    levelRaw: trimmed(20).nullable(),
    sequence: unitNumber,
    sourceFile: trimmed(500).nullable(),
  })
  // DB CHECK `source_material_numbers_valid` 와 같은 말 — 아랫단 번호는 윗단 번호 없이 있을 수 없다
  .refine((m) => m.middleNo === null || m.chapterNo !== null, {
    message: "둘째 단 번호는 첫째 단 번호 없이 있을 수 없습니다.",
    path: ["middleNo"],
  })
  .refine((m) => m.sectionNo === null || m.middleNo !== null, {
    message: "셋째 단 번호는 둘째 단 번호 없이 있을 수 없습니다.",
    path: ["sectionNo"],
  });
export type SourceMaterialInput = z.infer<typeof sourceMaterialSchema>;
