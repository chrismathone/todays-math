/**
 * 개념 카드(탐험) 기록의 **교사 보기** — 읽기 전용 응답 둘 (27번 문서 §4 공백 1 · 2).
 *
 *   GET /api/classes/{id}/math-srs/explorers   — 반 학생마다 요약(카드 목록 없음)
 *   GET /api/students/{id}/math-srs/explorers  — 학생 한 명(카드 목록 포함)
 *
 * 🔴 D-141 ⑵ — 문항 글 · 보기 · 학생이 고른 답은 이 응답에 **들어갈 수 없다**. 전부 strict 객체라 모르는 키는
 *    내보내는 자리(`jsonOk`)에서 걸리고, `mathExplorersTeacherContract.test.ts` 가 키 이름으로 잠근다.
 *    카드 이름 · 단원 이름은 교육과정 내용이라 싣는다.
 *
 * 값을 만드는 곳은 `src/lib/math-explorers/teacherSummary.ts` 하나다(순수 투영 — 저장 없음).
 */
import { z } from "zod";
import {
  dataResponseSchema,
  isoDateSchema,
  uuidSchema,
} from "./common.contract";

const id = z.string().min(1).max(200);
const label = z.string().max(200);
const count = z.number().int().nonnegative();
const grade = z.number().int().min(3).max(9);
const route = z.enum(["unit", "memory", "repair"]);

/**
 * 도움 사유는 **두 목록**이다(27번 문서 §4.2 v1.1 — 한 순위로 합치지 않는다).
 * 학습 개입 = 교사가 학생과 이야기할 일 · 차례는 이 배열 그대로. 운영 확인 = 계정 · 시작 여부.
 */
export const EXPLORER_TEACHER_LEARNING_FLAG_CODES = [
  "unresolved", // 1 미해결을 남기고 끝냄
  "review-stuck", // 2 최근 복습에서 막힘(이미 모은 카드)
  "overdue", // 3 복습이 밀림
  "carried-over", // 4 임무가 날을 넘김
  "idle", // 5 오래 쉼
] as const;
export const EXPLORER_TEACHER_OPERATION_FLAG_CODES = [
  "not-started", // 시작 전(계정은 있는데 탐험 기록 없음)
  "no-account", // 계정 없음(없거나 꺼짐)
] as const;

const cardRef = z.strictObject({ id, name: label });

/**
 * 학습 개입 사유 하나 — 사유 코드 · 근거 값 · 근거 날짜 · 관련 카드.
 * `value` 의 뜻은 사유마다 다르다: unresolved = 남은 활동 수 · review-stuck = 카드 수 · overdue = 가장 오래 밀린 날 수 ·
 * carried-over = 넘긴 날 수 · idle = 쉰 날 수.
 */
export const explorerTeacherLearningFlagSchema = z.strictObject({
  code: z.enum(EXPLORER_TEACHER_LEARNING_FLAG_CODES),
  value: count,
  date: isoDateSchema,
  cards: z.array(cardRef).max(230),
});
export type ExplorerTeacherLearningFlag = z.infer<
  typeof explorerTeacherLearningFlagSchema
>;
/**
 * 운영 확인 사유 하나. not-started 는 계정을 만든 날(`date`)과 그 뒤 지난 날 수(`value`) — 만든 날을 모르면 둘 다 null.
 * no-account 는 둘 다 null.
 */
export const explorerTeacherOperationFlagSchema = z.strictObject({
  code: z.enum(EXPLORER_TEACHER_OPERATION_FLAG_CODES),
  value: count.nullable(),
  date: isoDateSchema.nullable(),
});
export type ExplorerTeacherOperationFlag = z.infer<
  typeof explorerTeacherOperationFlagSchema
>;

const unitRow = z.strictObject({
  id,
  title: label,
  grade,
  /** 이 단원에서 모은 카드(레벨 1 이상) 수 */
  collected: z.number().int().min(0).max(5),
  total: z.literal(5),
});

const sessionRow = z.strictObject({
  date: isoDateSchema,
  route,
  unitId: id,
  unitTitle: label,
  /** 회복 길의 대상 카드 이름 — 그 길이 아니면 null */
  targetCardName: label.nullable(),
  /** 첫 시도 정답 수 — 재도전은 올리지 않는다 */
  first: z.number().int().min(0).max(15),
  total: z.literal(15),
  unresolved: z.number().int().min(0).max(15),
  stars: z.number().int().min(0).max(5),
});

const openSession = z.strictObject({
  startedOn: isoDateSchema,
  route,
  unitId: id,
  unitTitle: label,
  /** active = 풀고 있음(재도전 연장 포함) · retry = 끝냈지만 미해결이 남아 «남은 문제 다시 풀기»를 기다림 */
  status: z.enum(["active", "retry"]),
  /** 해결한 활동 수 */
  solved: z.number().int().min(0).max(15),
  total: z.literal(15),
  round: z.number().int().min(0).max(3),
  /** «남은 문제 다시 풀기»를 연 횟수 */
  continuation: count,
  unresolved: z.number().int().min(0).max(15),
});

export const explorerTeacherSummarySchema = z.strictObject({
  /** 탐험 기록이 있나 — 없으면 아래 숫자는 전부 0 · 목록은 빈 배열 */
  started: z.boolean(),
  collected: z.number().int().min(0).max(230),
  total: z.literal(230),
  /** 카드 기록이 하나라도 있는 단원만(학년 순) */
  units: z.array(unitRow).max(46),
  /** 오늘 복습할 카드 수(만기 ≤ 오늘) — 학생 화면의 만기 목록과 같은 함수 */
  dueToday: z.number().int().min(0).max(230),
  /** 밀린 카드(만기 < 오늘) 수와 가장 오래 밀린 날 수 */
  overdue: z.strictObject({
    cards: z.number().int().min(0).max(230),
    maxDays: count,
  }),
  /** 이력 끝에서 10건 — 최근 것부터 */
  recentSessions: z.array(sessionRow).max(10),
  openSession: openSession.nullable(),
  /** 마지막으로 하루를 끝낸 날 — 개념 세션을 끝낸 날과 통합 탐험에서 칸을 얻은 날(은행 날 포함) 가운데 늦은 날 */
  lastCompletedDate: isoDateSchema.nullable(),
  /** 학습 개입 — 차례대로(사유마다 많아야 하나) */
  learningFlags: z.array(explorerTeacherLearningFlagSchema).max(5),
  /** 운영 확인 — 시작 전 · 계정 없음 가운데 많아야 하나 */
  operationFlags: z.array(explorerTeacherOperationFlagSchema).max(1),
});
export type ExplorerTeacherSummary = z.infer<
  typeof explorerTeacherSummarySchema
>;

const cardRow = z.strictObject({
  id,
  name: label,
  unitId: id,
  unitTitle: label,
  grade,
  level: z.number().int().min(0).max(3),
  due: isoDateSchema,
  lastRecall: z.enum(["new", "remembered", "supported", "retry"]).nullable(),
  /** 마지막 세션이 끝났을 때 이 카드에 남은 활동 수(0~3) — 세션을 걸친 반복의 수가 아니다 */
  missed: z.number().int().min(0).max(3),
  reviewStep: z.number().int().min(0).max(4),
  /** 만기가 지난 날 수 — 안 밀렸으면 0 */
  overdueDays: count,
});
export type ExplorerTeacherCard = z.infer<typeof cardRow>;

export const explorerTeacherDetailSchema = explorerTeacherSummarySchema.extend({
  /** 기록이 있는 카드만(단원 순 — 학생 도감과 같은 차례) */
  cards: z.array(cardRow).max(230),
});
export type ExplorerTeacherDetail = z.infer<typeof explorerTeacherDetailSchema>;

const flagPolicy = z.number().int().positive();

export const explorerTeacherClassSchema = z.strictObject({
  class: z.strictObject({ id: uuidSchema, name: z.string() }),
  /** 서버가 정한 오늘(KST) */
  today: isoDateSchema,
  /** 도움 사유 문턱의 정책 판(`TEACHER_FLAG_POLICY`) */
  policy: flagPolicy,
  students: z.array(
    z.strictObject({
      id: uuidSchema,
      name: z.string(),
      hasAccount: z.boolean(),
      summary: explorerTeacherSummarySchema,
    }),
  ),
});
export type ExplorerTeacherClass = z.infer<typeof explorerTeacherClassSchema>;
export const explorerTeacherClassResponseSchema = dataResponseSchema(
  explorerTeacherClassSchema,
);

export const explorerTeacherStudentSchema = z.strictObject({
  student: z.strictObject({
    id: uuidSchema,
    name: z.string(),
    classId: uuidSchema,
    className: z.string(),
    hasAccount: z.boolean(),
  }),
  today: isoDateSchema,
  policy: flagPolicy,
  detail: explorerTeacherDetailSchema,
});
export type ExplorerTeacherStudent = z.infer<
  typeof explorerTeacherStudentSchema
>;
export const explorerTeacherStudentResponseSchema = dataResponseSchema(
  explorerTeacherStudentSchema,
);
