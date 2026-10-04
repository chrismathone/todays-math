/**
 * **학생 계정 계약** — 원장님이 발급한 아이디 + 비밀번호 (D-124 ⑶⑷ · D-125 ⑵⑶⑷, 2026-09-15).
 *
 * 학생 로그인은 절대 규칙 7 의 **유일한 예외**다(이메일 대신 아이디). 발급·새 비밀번호는 숫자 4자리이며
 * 로그인·현재 비밀번호 확인은 기존 번호와 별도로 설정한 8~72자 비밀번호도 받는다. 소셜/OAuth 는 학생에게도 없다.
 * 학생 로그인은 «오늘의 개념» 영상 시청 하나만 연다(D-123 ⑵) — 응시·성적·오답은 이 계약 밖이다.
 *
 * 대응 경로:
 *   원장(발급 — D-124 ⑷ 한 명씩)
 *     GET   /api/students/{id}/account           계정 상태 (없으면 data: null)
 *     POST  /api/students/{id}/account           발급 — 초기 비밀번호는 **이 응답에 한 번만**
 *     PATCH /api/students/{id}/account           끄기·켜기 (`disabledAt` 만 찍는다 — 지우지 않는다)
 *     POST  /api/students/{id}/account/password  다시 발급 — 비밀번호만 새로
 *   학생(D-125 ⑷ 전용 주소 — 화면은 `/learn/**`, API 는 `/api/learn/**`)
 *     POST  /api/learn/login · /api/learn/logout · /api/learn/password
 *     GET   /api/learn/lectures · /api/learn/lectures/{id}
 *     POST  /api/learn/watch                      (본문은 `conceptWatchReportSchema` — 그 계약을 그대로 쓴다)
 *
 * ## 한 곳에 두는 것 (브리프 §2.3 — «상수 한 곳에 두고 보고에 적는다»)
 *
 * - 아이디 규칙 `STUDENT_LOGIN_ID_RULE` — 기존 영문·숫자·`-`·`_` 4~20자와 한글 이름(50자 이내)을
 *   지원한다. NFC·앞뒤 공백·대소문자를 정규화한다. 기본 아이디는 실제 학생 이름이며 동명이인은 개별 조정한다.
 * - 초기 발급 비밀번호는 등록된 전화번호 끝 4자리다. 연락처가 없으면 임의 번호로 발급하지 않는다.
 *   동기화·학생 등록은 계정을 만들지 않으며, 관리자가 반별 전체 생성 또는 개별 발급을 눌렀을 때만 만든다.
 * - 비밀번호 판정은 `src/lib/concept/pinRules.ts` 의 `isPinFormat` · `isEasyPin` 을 **부른다**(다시 적지
 *   않는다 — 브리프 §7). 발급(`initialPassword.ts`)과 변경이 같은 함수를 지난다.
 * - 잠금 `STUDENT_LOGIN_LOCK` · 문구 `STUDENT_LOGIN_MESSAGES` — D-125 ⑶ 의 **리드 제안**이다.
 *   원장님이 다르게 정하시면 여기만 바꾼다.
 *
 * ⚠️ 이 파일은 화면(클라이언트 폼 검증)에서도 읽힌다 — `node:` 모듈을 끌고 오면 안 된다
 *    (그래서 `initialPassword.ts` 가 아니라 `pinRules.ts` 를 부른다. `studentAccountContract.test.ts` 가 잠근다).
 */
import { z } from "zod";

import { isEasyPin, isPinFormat } from "@/lib/concept/pinRules";

import { conceptLectureForStudentSchema } from "./conceptLecture.contract";
import {
  dataResponseSchema,
  isoDateSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common.contract";

// ── 한 곳에 두는 규칙 ────────────────────────────────────────────

const LOGIN_ID_MIN = 1;
const LOGIN_ID_MAX = 50;

/** 아이디 규칙 — 정규화(`normalizeLoginId`) **뒤의** 모양이다. */
export const STUDENT_LOGIN_ID_RULE = {
  minLength: LOGIN_ID_MIN,
  maxLength: LOGIN_ID_MAX,
  pattern:
    /^(?:[a-z0-9_-]{4,20}|(?=[가-힣a-z0-9 _-]{1,50}$)(?=.*[가-힣])[가-힣a-z0-9 _-]+)$/u,
} as const;

/** 연속 실패 잠금 (D-125 ⑶ — 리드 제안) */
export const STUDENT_LOGIN_LOCK = {
  maxFailures: 5,
  lockMs: 10 * 60 * 1000,
} as const;

/**
 * 학생·원장 화면에 나가는 문구 (D-08 — 간결·사무적).
 * 🔴 `invalid` 는 **하나다** — 없는 아이디·틀린 번호·꺼진 계정을 가르지 않는다(아이디 존재를 흘리지
 *    않는다). `locked` 도 없는 아이디에 **똑같이** 낸다(D-125 ⑶ · 브리프 §6).
 */
export const STUDENT_LOGIN_MESSAGES = {
  invalid: "아이디 또는 비밀번호가 맞지 않습니다.",
  locked: "잠시 뒤 다시 시도하세요.",
  loginIdTaken: "이미 쓰는 아이디입니다.",
  accountExists: "이미 계정이 있습니다.",
  easyPin: "쉬운 번호는 쓸 수 없습니다.",
  samePin: "지금 번호와 다른 번호를 적어 주세요.",
  wrongCurrentPin: "지금 비밀번호가 맞지 않습니다.",
} as const;

/**
 * 퇴원한 학생에게 발급 API 가 내는 409 문구 (D-127 · 리드 결정 — learn-screens 보고서 §7-3).
 * 발급 칸은 퇴원 학생에게 단추를 안 그린다 — 서버가 **같은 판정**을 한다는 표지다. 끄기는 막지 않는다.
 */
export const STUDENT_ACCOUNT_WITHDRAWN_MESSAGES = {
  issue: "퇴원한 학생은 계정을 만들 수 없습니다.",
  reissue: "퇴원한 학생은 비밀번호를 다시 발급할 수 없습니다.",
  enable: "퇴원한 학생은 계정을 켤 수 없습니다.",
} as const;

/** 앞뒤 공백을 걷고 소문자로 접는다 — 저장·비교·유일성 모두 이 모양으로 한다. */
export function normalizeLoginId(raw: string): string {
  return raw.normalize("NFC").trim().toLowerCase();
}

// ── 원자 스키마 ─────────────────────────────────────────────────

export const studentLoginIdSchema = z
  .string()
  .transform(normalizeLoginId)
  .pipe(
    z.string().regex(STUDENT_LOGIN_ID_RULE.pattern, {
      error: "아이디는 한글 이름(50자 이내) 또는 영문·숫자·-·_ 4~20자입니다.",
    }),
  );

/** 새로 발급하거나 설정하는 학생 비밀번호는 네 자리 숫자다. */
export const studentPinSchema = z
  .string()
  .refine(isPinFormat, { error: "비밀번호는 숫자 4자리입니다." });

/** 기존 4자리 번호와 별도로 설정한 긴 비밀번호도 로그인·현재 비밀번호 확인에 쓸 수 있다. */
export const studentLoginPasswordSchema = z
  .string()
  .refine(
    (password) =>
      isPinFormat(password) || (password.length >= 8 && password.length <= 72),
    { error: "비밀번호는 숫자 4자리 또는 8~72자입니다." },
  );

/** 새로 정하는 번호 — 형식 + 쉬운 번호 제외(`isEasyPin`, 발급과 같은 규칙 — D-125 ⑶). */
export const studentNewPinSchema = studentPinSchema.refine(
  (pin) => !isEasyPin(pin),
  { error: STUDENT_LOGIN_MESSAGES.easyPin },
);

// ── 학생 요청 · 응답 ────────────────────────────────────────────

export const studentLoginRequestSchema = z.strictObject({
  loginId: studentLoginIdSchema,
  password: studentLoginPasswordSchema,
});
export type StudentLoginRequest = z.infer<typeof studentLoginRequestSchema>;

export const studentLoginResponseSchema = dataResponseSchema(
  z.strictObject({ mustChangePassword: z.boolean() }),
);

/** 나가기 — 학생 로그인 화면으로 (원장님 `/login` 이 아니다 — D-125 ⑷) */
export const studentLogoutResponseSchema = dataResponseSchema(
  z.strictObject({ redirectTo: z.literal("/learn/login") }),
);

export const studentPasswordChangeRequestSchema = z
  .strictObject({
    currentPassword: studentLoginPasswordSchema,
    newPassword: studentNewPinSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    error: STUDENT_LOGIN_MESSAGES.samePin,
    path: ["newPassword"],
  });

export const studentPasswordChangeResponseSchema = dataResponseSchema(
  z.strictObject({ mustChangePassword: z.literal(false) }),
);

/**
 * 세션에 실리는 학생 — `session.student`. 🔴 **`session.user` 는 없다**(브리프 §2.1): 기존 코드는
 * `session.user.id` 가 있으면 원장으로 믿는다. 학생은 이 칸으로만 알아본다.
 */
export const studentSessionSchema = z.strictObject({
  accountId: uuidSchema,
  studentId: uuidSchema,
  name: z.string(),
  mustChangePassword: z.boolean(),
});
export type StudentSession = z.infer<typeof studentSessionSchema>;

/**
 * 학생 목록이 차시로 묶을 때 쓰는 차시 머리.
 * `taughtOn` = **그 학생에게 그 차시가 기록된 가장 최근 날**(반 진도 ∪ 개인 진도 — 서버의
 * `progressDatesOf`, 열린 차시의 판정과 같은 행·같은 셈). 학생 목록은 이 날짜로 묶는다(브리프 §1.1 · 시안 `sList`).
 */
export const learnUnitSchema = z.strictObject({
  id: uuidSchema,
  grade: z.string(),
  chapter: z.string(),
  section: z.string(),
  orderIndex: z.number().int(),
  taughtOn: isoDateSchema,
});
export type LearnUnit = z.infer<typeof learnUnitSchema>;

/** 학생 화면 윗줄 — 이름 · 반(시안 `sTop` «김도윤 · 중1 A반 · 나가기») */
export const learnStudentSchema = z.strictObject({
  name: z.string(),
  className: z.string(),
});
export type LearnStudent = z.infer<typeof learnStudentSchema>;

export const learnLectureListResponseSchema = dataResponseSchema(
  z.strictObject({
    student: learnStudentSchema,
    units: z.array(learnUnitSchema),
    lectures: z.array(conceptLectureForStudentSchema),
  }),
);
export type LearnLectureList = z.infer<
  typeof learnLectureListResponseSchema
>["data"];

export const learnLectureResponseSchema = dataResponseSchema(
  z.strictObject({
    student: learnStudentSchema,
    unit: learnUnitSchema,
    lecture: conceptLectureForStudentSchema,
  }),
);
export type LearnLectureDetail = z.infer<
  typeof learnLectureResponseSchema
>["data"];

export const learnWatchResponseSchema = dataResponseSchema(
  z.strictObject({
    watch: z.strictObject({
      maxSeconds: z.number().int().min(0),
      percent: z.number().int().min(0).max(100),
      completed: z.boolean(),
    }),
  }),
);

// ── 원장 — 발급 · 상태 ──────────────────────────────────────────

export const studentAccountIssueRequestSchema = z.strictObject({
  loginId: studentLoginIdSchema,
});

/** 발급·다시 발급 응답 — **초기 비밀번호가 실리는 유일한 모양**. 서버에는 해시만 남는다. */
export const studentAccountIssueResponseSchema = dataResponseSchema(
  z.strictObject({
    studentId: uuidSchema,
    loginId: z.string(),
    initialPassword: studentLoginPasswordSchema,
    mustChangePassword: z.literal(true),
    issuedAt: isoDateTimeSchema,
  }),
);

export type StudentAccountIssued = z.infer<
  typeof studentAccountIssueResponseSchema
>["data"];

/** 계정 상태 — 비밀번호·해시 칸이 **아예 없다**. */
export const studentAccountStatusSchema = z.strictObject({
  studentId: uuidSchema,
  loginId: z.string(),
  issuedAt: isoDateTimeSchema,
  /** 발급한 사람이 **지금 보는 원장님**인가 — 발급 칸의 «9월 15일 · 원장님»(시안 `issue()`) */
  issuedByViewer: z.boolean(),
  lastLoginAt: isoDateTimeSchema.nullable(),
  passwordChangedAt: isoDateTimeSchema.nullable(),
  disabledAt: isoDateTimeSchema.nullable(),
  mustChangePassword: z.boolean(),
  locked: z.boolean(),
  /**
   * 잠금이 끝나는 시각(없으면 null) — 발급 칸의 «잠김 — N분 뒤 풀림»(D-127 Q5). 화면은 «지금보다 뒤인가»만 본다.
   * 끝난 잠금도 다음 시도 전까지는 값이 남는다(`resetExpiredLock`) — 그래서 `locked` 와 따로 준다.
   */
  lockedUntil: isoDateTimeSchema.nullable(),
});
export type StudentAccountStatus = z.infer<typeof studentAccountStatusSchema>;

/** 끄기 · 켜기(PATCH) 응답 — 계정이 있을 때만 온다 */
export const studentAccountStatusResponseSchema = dataResponseSchema(
  studentAccountStatusSchema,
);

/**
 * 발급 칸(원장님 «수업 · 학생 관리 › 학생»)이 읽는 모양 — `GET /api/students/{id}/account`.
 * 계정이 없어도 **퇴원 여부**는 알아야 한다 — 퇴원한 학생은 로그인이 막히므로(D-126 ⑺) 칸은 발급 대신
 * «퇴원 — 로그인 막힘» 한 줄을 그린다(learn-screens 브리프 §1.3).
 */
export const studentAccountPanelSchema = z.strictObject({
  withdrawn: z.boolean(),
  account: studentAccountStatusSchema.nullable(),
});
export type StudentAccountPanel = z.infer<typeof studentAccountPanelSchema>;

export const studentAccountPanelResponseSchema = dataResponseSchema(
  studentAccountPanelSchema,
);

export const studentAccountUpdateRequestSchema = z.strictObject({
  disabled: z.boolean(),
});
