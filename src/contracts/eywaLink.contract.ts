/**
 * eywa 계정 연결 (D-139 ⑹, 원장님 2026-09-26) — 확인 화면·연결 API 의 계약과 문구 SSOT.
 *
 * eywa 이메일은 본인 확인 값이 아니다. 그래서 바뀌지 않는 eywa 사용자 id(`sub`)를, 계정 주인이 비밀번호로
 * 로그인한 뒤 확인 화면에서 [연결]을 눌러야만 계정에 묶는다. 연결은 로그인(authorize) 안에서 일어나지 않는다.
 *
 * 🔴 `eywaLinkLoginNotice` · `eywaLinkConfirmBody` · 제목 · 버튼은 **원장님 확정 문구**다 — 한 글자도 바꾸지 말 것.
 *    («로그인하면 연결»이라 적혀 있지만 실제 연결은 확인 화면의 [연결]에서 일어난다 — 문구는 확정이라 그대로 둔다.)
 * API 거절 문구(`EYWA_LINK_MESSAGES`)는 리드 작성이다(D-08 간결·사무적).
 */
import { z } from "zod";

export const EYWA_LINK_PAGE_PATH = "/account/eywa-link";
export const EYWA_LINK_API_PATH = "/api/account/eywa-link";

/** Fixed login notices only; query values never create or authorize a link. */
export function eywaSsoLoginNotice(
  reason: string | string[] | undefined,
): string | undefined {
  switch (reason) {
    case "not-linked":
      return "에이와 자동 로그인 대상이 아닙니다. 오늘 수학 계정으로 로그인해 주세요.";
    case "retry":
      return "에이와 자동 로그인 요청이 만료되었거나 완료되지 않았습니다. 다시 이동하거나 오늘 수학 계정으로 로그인해 주세요.";
    case "unavailable":
      return "에이와 자동 로그인 연결을 확인할 수 없습니다. 오늘 수학 계정으로 로그인해 주세요.";
    default:
      return undefined;
  }
}

/** 본문은 이것뿐이다 — 계정 id·sub 는 세션과 연결 대기 쿠키에서만 온다(몸에 실어 보내면 400) */
export const eywaLinkRequestSchema = z.strictObject({
  action: z.enum(["link", "dismiss"]),
});
export type EywaLinkRequest = z.infer<typeof eywaLinkRequestSchema>;

export const EYWA_LINK_MESSAGES = {
  invalid: "요청 형식을 확인해 주세요.",
  expired: "연결 요청이 없거나 만료됐습니다. eywa에서 다시 들어와 주세요.",
  accountLinked: "이 계정은 이미 다른 eywa 계정과 연결돼 있습니다.",
  eywaLinked: "이 eywa 계정은 이미 다른 오늘 수학 계정과 연결돼 있습니다.",
  // 비밀번호 바꾸기(`/api/account/password`)의 경주 문구와 같다
  changed: "계정 정보가 변경됐습니다. 다시 로그인해 주세요.",
  notLinked: "연결된 eywa 계정이 없습니다.",
} as const;

/** 표시용 eywa 사람 — 연결 대기 쿠키의 이름·이메일(비밀 아님, 위조 불가) */
export type EywaLinkPerson = { name: string; email: string };

export const EYWA_LINK_TITLE = "eywa 계정 연결";
export const EYWA_LINK_BUTTONS = {
  link: "연결",
  dismiss: "연결 안 함",
} as const;

/** 로그인 화면 — 기존 초록 안내 줄 자리 (원장님 확정) */
export function eywaLinkLoginNotice({ name, email }: EywaLinkPerson): string {
  return `처음 한 번만: 오늘 수학 비밀번호로 로그인하면 eywa ${name}(${email}) 계정과 연결됩니다. 본인이 아니면 로그인하지 마세요.`;
}

/** 확인 화면 본문 (원장님 확정) */
export function eywaLinkConfirmBody(
  { name, email }: EywaLinkPerson,
  accountEmail: string,
): string {
  return `eywa 계정 «${name}(${email})»을 이 계정(${accountEmail})에 연결할까요? 연결하면 다음부터 eywa에서 바로 들어옵니다. 본인 eywa 계정이 아니면 «연결 안 함»을 누르세요.`;
}
