import type {
  ClassEntity,
  ProgressEntity,
  StudentEntity,
} from "@/contracts/class.contract";
import { planDraftBody, type PlanDraft } from "@/lib/class/planDraft";
import { throwServerError } from "@/lib/class/serverError";

/**
 * 계약 스키마를 **런타임 값으로 정적 import 하지 않는다** (성능 수리 C-1).
 *
 * 이 파일의 검증은 전부 `fetch` 응답이 온 뒤에 쓰인다. 그런데 정적 import 면
 * zod + 계약 모듈(279KB)이 클라이언트 진입 청크에 들어가 첫 페인트를 막는다.
 * 검증을 **없애지 않고** 필요한 시점으로 미루는 것이 이 헬퍼의 목적이다.
 * 번들러가 청크를 캐시하므로 두 번째 호출부터는 네트워크 비용이 없다.
 */
const classContract = () => import("@/contracts/class.contract");

async function parseOk<T>(
  res: Response,
  parse: (json: unknown) => T,
): Promise<T> {
  if (!res.ok) throw new Error("요청에 실패했습니다");
  return parse(await res.json());
}

type ReadOptions = { signal?: AbortSignal };
type PageResult<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
};

async function readAllPages<T extends { id: string }>(
  path: string,
  parse: (json: unknown) => PageResult<T>,
  options: ReadOptions,
  firstPage?: PageResult<T>,
): Promise<T[]> {
  const rows = new Map<string, T>();
  let received = 0;
  for (let page = 1; ; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    if (options.signal?.aborted)
      throw new DOMException("Aborted", "AbortError");
    const body =
      page === 1 && firstPage
        ? parse(firstPage)
        : await parseOk(
            await fetch(`${path}${separator}page=${page}&pageSize=100`, {
              signal: options.signal,
            }),
            parse,
          );
    if (body.meta.page !== page) {
      throw new Error("목록 페이지가 변경되었습니다. 다시 불러와 주세요.");
    }
    body.data.forEach((row) => rows.set(row.id, row));
    received += body.data.length;
    if (received >= body.meta.total) return [...rows.values()];
    if (body.data.length === 0) {
      throw new Error("전체 목록을 불러오지 못했습니다. 다시 불러와 주세요.");
    }
  }
}

export async function fetchClasses(
  options: ReadOptions & { firstPage?: PageResult<ClassEntity> } = {},
): Promise<ClassEntity[]> {
  const { classListResponseSchema } = await classContract();
  return readAllPages(
    "/api/classes",
    (json) => classListResponseSchema.parse(json),
    options,
    options.firstPage,
  );
}

export async function fetchStudents(
  classId: string,
  options: ReadOptions = {},
): Promise<StudentEntity[]> {
  const { studentListResponseSchema } = await classContract();
  return readAllPages(
    `/api/students?classId=${encodeURIComponent(classId)}`,
    (json) => studentListResponseSchema.parse(json),
    options,
  );
}

export async function fetchProgress(
  classId: string,
): Promise<ProgressEntity | null> {
  const res = await fetch(`/api/progress?classId=${classId}`);
  if (res.status === 204 || res.status === 404) return null;
  const { progressResponseSchema } = await classContract();
  const body = await parseOk(res, (json) => progressResponseSchema.parse(json));
  return body.data;
}

export async function advanceProgress(
  classId: string,
): Promise<ProgressEntity> {
  const res = await fetch("/api/progress/advance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ classId }),
  });
  const { progressResponseSchema } = await classContract();
  const body = await parseOk(res, (json) => progressResponseSchema.parse(json));
  return body.data;
}

export async function recordProgress(
  classId: string,
  unitId: string,
): Promise<ProgressEntity> {
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ classId, unitId }),
  });
  const { progressResponseSchema } = await classContract();
  const body = await parseOk(res, (json) => progressResponseSchema.parse(json));
  return body.data;
}

export async function createStudent(
  classId: string,
  name: string,
): Promise<StudentEntity> {
  const res = await fetch("/api/students", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ classId, name }),
  });
  const { studentResponseSchema } = await classContract();
  const body = await parseOk(res, (json) => studentResponseSchema.parse(json));
  return body.data;
}

/**
 * 반 만들기 — 계획을 같이 넣을 수 있다(`progressPlan`, D-129 · 반 만들기의 접힌 계획 칸 D-131 ⑷).
 * 계획을 안 주면 본문에 칸이 없다(지금처럼 반만). 응답은 지금 반 모양 그대로 — 계획은 GET 으로 읽는다.
 * 🔴 거절되면 서버 문구로 던진다(`ServerError`) — 400/422 로 가르지 않는다.
 */
export async function createClass(
  name: string,
  grade: string,
  progressPlan?: PlanDraft,
): Promise<ClassEntity> {
  const res = await fetch("/api/classes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      progressPlan
        ? { name, grade, progressPlan: planDraftBody(progressPlan) }
        : { name, grade },
    ),
  });
  if (!res.ok) await throwServerError(res, "요청에 실패했습니다");
  const { classResponseSchema } = await classContract();
  const body = await parseOk(res, (json) => classResponseSchema.parse(json));
  return body.data;
}
