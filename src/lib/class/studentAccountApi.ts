/**
 * 원장님 발급 칸이 부르는 API — student-auth 가 만든 `/api/students/{id}/account` · `/password` 그대로
 * (learn-screens 브리프 §1.3 «새로 만들지 않는다»). 계약 스키마는 응답이 온 뒤에 불러온다(`classApi.ts` 와 같다).
 *
 * 🔴 초기 비밀번호는 **돌려주기만** 한다 — 저장소·URL·로그에 적지 않는다(부르는 쪽 화면 상태에만 산다).
 * 실패 문구는 서버 문구 그대로(겹치는 아이디 · 이미 계정 — student-auth §2.4).
 */
import type {
  StudentAccountIssued,
  StudentAccountPanel,
  StudentAccountStatus,
} from "@/contracts/studentAccount.contract";

const contract = () => import("@/contracts/studentAccount.contract");
const FAILED = "처리하지 못했습니다. 다시 시도해 주세요.";

/** 401 · 403(남의 반) · 404(없는 학생)는 칸을 안 그린다 — 서버가 거부한 학생이다 */
export type PanelLoad =
  { ok: true; data: StudentAccountPanel } | { ok: false; hidden: boolean };

export async function fetchAccountPanel(studentId: string): Promise<PanelLoad> {
  try {
    const res = await fetch(`/api/students/${studentId}/account`, {
      cache: "no-store",
    });
    if ([401, 403, 404].includes(res.status))
      return { ok: false, hidden: true };
    if (!res.ok) return { ok: false, hidden: false };
    const { studentAccountPanelResponseSchema } = await contract();
    return {
      ok: true,
      data: studentAccountPanelResponseSchema.parse(await res.json()).data,
    };
  } catch {
    return { ok: false, hidden: false };
  }
}

export type Done<T> = { ok: true; data: T } | { ok: false; message: string };

async function send<T>(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
  parse: (json: unknown) => Promise<T>,
): Promise<Done<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: unknown; details?: { message?: unknown }[] };
      } | null;
      const first = json?.error?.details?.[0]?.message;
      const message =
        res.status === 400 && typeof first === "string"
          ? first
          : typeof json?.error?.message === "string"
            ? json.error.message
            : FAILED;
      return { ok: false, message };
    }
    return { ok: true, data: await parse(await res.json()) };
  } catch {
    return { ok: false, message: FAILED };
  }
}

export function issueAccount(
  studentId: string,
  loginId: string,
): Promise<Done<StudentAccountIssued>> {
  return send(
    `/api/students/${studentId}/account`,
    "POST",
    { loginId },
    async (json) =>
      (await contract()).studentAccountIssueResponseSchema.parse(json).data,
  );
}

export function reissuePassword(
  studentId: string,
): Promise<Done<StudentAccountIssued>> {
  return send(
    `/api/students/${studentId}/account/password`,
    "POST",
    undefined,
    async (json) =>
      (await contract()).studentAccountIssueResponseSchema.parse(json).data,
  );
}

export function setAccountDisabled(
  studentId: string,
  disabled: boolean,
): Promise<Done<StudentAccountStatus>> {
  return send(
    `/api/students/${studentId}/account`,
    "PATCH",
    { disabled },
    async (json) =>
      (await contract()).studentAccountStatusResponseSchema.parse(json).data,
  );
}
