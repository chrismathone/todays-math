/**
 * 로그인 직후의 첫 화면 — D-140 ⑶ (원장님 2026-09-26 «강사가 로그인했을 때 자신의 반이 뜨고»).
 *
 * 로그인 화면(`AuthForm`)은 역할을 모른다. 그래서 **기본 목적지(`/`)로 가는 로그인**만 `/` 에 표지
 * (`?entry=login`)를 달아 보내고, `/` 페이지(서버)가 계정을 읽어 첫 화면을 고른다.
 *   · 강사(지점 역할 `teacher`) → `/classes/manage`(내 반 · 학생 명단 · 발급 칸)
 *   · 나머지 → 표지만 떼고 `/` — 원장 · 관리자 · 독립 운영자 · 검수 계정의 로그인 뒤 목적지는 그대로다
 *     (승인 전 → `/approval-pending` · 검수 → `/review` 는 `/` 의 예전 갈래가 표지보다 먼저 본다)
 * 보호 경로에서 로그인으로 온 사람(`callbackUrl` 이 `/` 가 아님)은 표지 없이 그 경로로 간다.
 *
 * 🔴 왜 `/` 에서 **늘** 돌려보내지 않나 — 강사가 작업실로 돌아오는 길이 `/` 다(반 관리 머리 «작업실로 이동» ·
 *    계정 화면 «작업실» · AppChrome «오늘의 작업» · 시험지 화면 «메인»). 늘 돌려보내면 그 이름들이 강사에게
 *    전부 «반 관리»로 가는 거짓말이 된다. 그래서 **표지가 달린 한 번만** 고른다 — 표지 없이 온 `/` 는 누구에게나 작업실이다.
 *
 * 브라우저에서도 읽는다(`AuthForm`) — 서버 전용 모듈을 들이지 말 것.
 */
import type { AccountAccess } from "@/contracts/accountAccess.contract";

/** `/` 가 읽는 표지 칸 */
export const LOGIN_ENTRY_PARAM = "entry";
const LOGIN_ENTRY_VALUE = "login";

/** 기본 목적지로 가는 로그인이 밀고 가는 주소 — `/` + 표지 */
export const LOGIN_LANDING = `/?${LOGIN_ENTRY_PARAM}=${LOGIN_ENTRY_VALUE}`;

/** 강사의 첫 화면 — 내 반 */
export const TEACHER_HOME = "/classes/manage";

/** `/` 의 `entry` 쿼리가 로그인 표지인가 */
export function isLoginEntry(value: string | string[] | undefined): boolean {
  return (Array.isArray(value) ? value[0] : value) === LOGIN_ENTRY_VALUE;
}

/**
 * 로그인 직후 이 계정의 첫 화면. 강사라도 `/classes/manage` 가 받아 주지 않는 계정(수업 메뉴 꺼짐 · 승인 전 ·
 * 검수 역할)은 `/` — 그 화면이 다시 `/` 로 튕기므로 두 번 돌지 않게 여기서 거른다(`classes/manage/page.tsx` 와 같은 조건).
 */
export function landingAfterLogin(
  account: Pick<
    AccountAccess,
    "role" | "branchRole" | "approvalStatus" | "menus"
  >,
): typeof TEACHER_HOME | "/" {
  return account.branchRole === "teacher" &&
    account.approvalStatus === "approved" &&
    account.role !== "reviewer" &&
    account.menus.includes("teaching")
    ? TEACHER_HOME
    : "/";
}
