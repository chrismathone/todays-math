/**
 * 학생 계정 라우트들이 같이 쓰는 응답 — 발급 실패 갈래 · 다른 사이트 거부 · 캐시 금지.
 * 원장 발급 라우트 둘(`/api/students/{id}/account/**`)과 학생 라우트(`/api/learn/**`)가 같은 문구를 쓰게 한 곳에 둔다.
 */
import "server-only";

import { STUDENT_LOGIN_MESSAGES } from "@/contracts/studentAccount.contract";
import { forbiddenError, jsonError, notFoundError } from "@/lib/apiResponse";

import type { IssueFailure } from "./issueStudentAccount";

/** 존재하지 않으면 404, 남의 반이면 403 — 기존 `requireOwnedStudent` 와 같은 갈래·같은 문구 */
export function issueFailureResponse(reason: IssueFailure): Response {
  switch (reason) {
    case "student_not_found":
      return notFoundError("학생");
    case "not_owner":
      return forbiddenError();
    case "account_exists":
      return jsonError("CONFLICT", STUDENT_LOGIN_MESSAGES.accountExists, 409);
    case "login_id_taken":
      return jsonError("CONFLICT", STUDENT_LOGIN_MESSAGES.loginIdTaken, 409);
    case "no_account":
      return notFoundError("학생 계정");
  }
}

export function crossSiteError(): Response {
  return jsonError("FORBIDDEN", "같은 사이트에서 요청해 주세요.", 403);
}

/** 🔴 초기 비밀번호가 실린 응답 — 브라우저·중간 캐시에 남지 않게 */
export function noStore<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
