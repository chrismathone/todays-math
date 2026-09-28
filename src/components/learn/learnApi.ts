/**
 * 학생 화면이 부르는 API — 전부 `/api/learn/**`(학생 관문의 허용 목록 — student-auth §2.2). **서버 액션은 없다**
 * (학생 화면에 서버 액션을 넣으면 그 페이지 POST 를 허용 목록에 적어야 열린다 — learn-screens 브리프 §2).
 *
 * - 계약 스키마는 응답이 온 뒤에 불러온다(`src/lib/class/classApi.ts` 와 같은 까닭 — zod 가 첫 페인트를 막지 않게).
 * - 🔴 실패 문구는 **서버 문구 그대로** 보인다(틀림 · 잠금 — student-auth §2.3). 여기서 새로 짓지 않는다.
 *   형식이 틀린 본문(400)이면 첫 칸의 까닭(계약의 문구)을 보인다.
 * - 시청 보고는 실패해도 조용하다(브리프 §1.2 — 다음 보고가 덮는다). 부르는 쪽이 다시 보낸다.
 */
import type { ConceptLectureForStudent } from "@/contracts/conceptLecture.contract";
import { forgetChestSaves } from "@/components/math-explorers/chestSaveLine";
import type {
  LearnLectureDetail,
  LearnLectureList,
} from "@/contracts/studentAccount.contract";

const contract = () => import("@/contracts/studentAccount.contract");

/** 연결이 끊겼을 때 — 서버 문구가 없으니 여기 하나만 둔다 */
export const LEARN_OFFLINE_MESSAGE = "연결되지 않았습니다. 다시 시도하세요.";
const LEARN_FAILED_MESSAGE = "처리하지 못했습니다. 다시 시도하세요.";

export type LoadFailure = "unauthorized" | "mustChange" | "notFound" | "error";
export type Loaded<T> =
  { ok: true; data: T } | { ok: false; failure: LoadFailure };

/** 401 = 학생 세션 없음 · 403 = 첫 비밀번호를 아직 안 바꿈(학생 API 의 403 은 그것뿐) · 404 = 안 열린 강의 */
function loadFailure(status: number): LoadFailure {
  if (status === 401) return "unauthorized";
  if (status === 403) return "mustChange";
  if (status === 404) return "notFound";
  return "error";
}

async function load<T>(
  url: string,
  parse: (json: unknown) => Promise<T>,
): Promise<Loaded<T>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, failure: loadFailure(res.status) };
    return { ok: true, data: await parse(await res.json()) };
  } catch {
    return { ok: false, failure: "error" };
  }
}

export function fetchLectureList(): Promise<Loaded<LearnLectureList>> {
  return load(
    "/api/learn/lectures",
    async (json) =>
      (await contract()).learnLectureListResponseSchema.parse(json).data,
  );
}

export function fetchLectureDetail(
  id: string,
): Promise<Loaded<LearnLectureDetail>> {
  return load(
    `/api/learn/lectures/${encodeURIComponent(id)}`,
    async (json) =>
      (await contract()).learnLectureResponseSchema.parse(json).data,
  );
}

export type Submitted<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string };

async function messageOf(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { message?: unknown; details?: { message?: unknown }[] };
    };
    const first = body.error?.details?.[0]?.message;
    if (res.status === 400 && typeof first === "string") return first;
    if (typeof body.error?.message === "string") return body.error.message;
  } catch {
    // 본문이 JSON 이 아니다 — 아래 한 줄로
  }
  return LEARN_FAILED_MESSAGE;
}

async function submit<T>(
  url: string,
  body: unknown,
  parse: (json: unknown) => Promise<T>,
  keepalive = false,
): Promise<Submitted<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive,
    });
  } catch {
    return { ok: false, status: 0, message: LEARN_OFFLINE_MESSAGE };
  }
  if (!res.ok)
    return { ok: false, status: res.status, message: await messageOf(res) };
  try {
    return { ok: true, data: await parse(await res.json()) };
  } catch {
    return { ok: false, status: res.status, message: LEARN_FAILED_MESSAGE };
  }
}

export function postLogin(loginId: string, password: string) {
  // 로그인 · 로그아웃은 소프트 이동이라 앞 학생의 상자 저장 줄이 살아 있다 — 새 학생 것이 아니다(05 §8.21).
  forgetChestSaves();
  return submit(
    "/api/learn/login",
    { loginId, password },
    async (json) =>
      (await contract()).studentLoginResponseSchema.parse(json).data,
  );
}

export function postPasswordChange(
  currentPassword: string,
  newPassword: string,
) {
  return submit(
    "/api/learn/password",
    { currentPassword, newPassword },
    async (json) =>
      (await contract()).studentPasswordChangeResponseSchema.parse(json).data,
  );
}

export function postLogout() {
  forgetChestSaves();
  return submit(
    "/api/learn/logout",
    undefined,
    async (json) =>
      (await contract()).studentLogoutResponseSchema.parse(json).data,
  );
}

/** 시청 보고 — 서버가 %를 다시 센다(student-auth §2.5). 실패하면 null(조용히) */
export async function postWatch(
  report: { lectureId: string; seconds: number; percent: number },
  opts: { keepalive?: boolean } = {},
): Promise<ConceptLectureForStudent["watch"]> {
  const result = await submit(
    "/api/learn/watch",
    report,
    async (json) =>
      (await contract()).learnWatchResponseSchema.parse(json).data.watch,
    opts.keepalive ?? false,
  );
  return result.ok ? result.data : null;
}
