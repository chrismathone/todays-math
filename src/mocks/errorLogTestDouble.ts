/**
 * 오류 기록 표(`error_log` · `error_log_image`)의 인메모리 대역 — `prismaTestDouble` 에 펼쳐 넣는다.
 *
 * 따로 둔 까닭: 오류 기록은 **모든 라우트**의 거절 응답에서 쓰인다(`withErrorLog`). 대역에 이 모델이 없으면
 * 기존 라우트 시험 전부가 기록 실패 경고를 찍는다. 그리고 다른 트랙(지점 분리)이 `prismaTestDouble.ts` 를
 * 같이 고치고 있어 한 파일에 몰면 병합이 겹친다.
 *
 * 트랜잭션 스냅숏에는 넣지 않는다 — 기록은 트랜잭션 밖에서 쓴다(응답 뒤 `after()`).
 */
import { randomUUID } from "node:crypto";

type ErrorLogRow = {
  id: string;
  createdAt: Date;
  source: string;
  kind: string;
  route: string | null;
  method: string | null;
  status: number | null;
  action: string | null;
  message: string | null;
  detail: string | null;
  context: unknown;
  userId: string | null;
  release: string | null;
  requestId: string | null;
  durationMs: number | null;
};
type ErrorLogImageRow = {
  errorLogId: string;
  mimeType: string;
  byteSize: number;
  data: Uint8Array;
};
type Where = {
  createdAt?: { lt?: Date; gte?: Date };
  route?: string;
  action?: string;
  kind?: string;
  source?: string;
  id?: string;
};

let rows: ErrorLogRow[] = [];
let images: ErrorLogImageRow[] = [];

export function resetErrorLogTestDouble() {
  rows = [];
  images = [];
}

function toRow(data: Record<string, unknown>): ErrorLogRow {
  if (typeof data.source !== "string" || typeof data.kind !== "string")
    throw new Error("error_log: source·kind 는 필수다");
  return {
    id: typeof data.id === "string" ? data.id : randomUUID(),
    createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(),
    source: data.source,
    kind: data.kind,
    route: (data.route as string | null | undefined) ?? null,
    method: (data.method as string | null | undefined) ?? null,
    status: (data.status as number | null | undefined) ?? null,
    action: (data.action as string | null | undefined) ?? null,
    message: (data.message as string | null | undefined) ?? null,
    detail: (data.detail as string | null | undefined) ?? null,
    context: structuredClone(data.context ?? {}),
    userId: (data.userId as string | null | undefined) ?? null,
    release: (data.release as string | null | undefined) ?? null,
    requestId: (data.requestId as string | null | undefined) ?? null,
    durationMs: (data.durationMs as number | null | undefined) ?? null,
  };
}

function matches(row: ErrorLogRow, where: Where = {}) {
  if (where.id !== undefined && row.id !== where.id) return false;
  if (where.route !== undefined && row.route !== where.route) return false;
  if (where.action !== undefined && row.action !== where.action) return false;
  if (where.kind !== undefined && row.kind !== where.kind) return false;
  if (where.source !== undefined && row.source !== where.source) return false;
  if (where.createdAt?.lt && !(row.createdAt < where.createdAt.lt))
    return false;
  if (where.createdAt?.gte && !(row.createdAt >= where.createdAt.gte))
    return false;
  return true;
}

const withImage = (row: ErrorLogRow, include?: { image?: unknown }) =>
  include?.image
    ? { ...row, image: images.find((i) => i.errorLogId === row.id) ?? null }
    : { ...row };

export const errorLogModels = {
  errorLog: {
    async create({
      data,
    }: {
      data: Record<string, unknown> & {
        image?: { create?: Omit<ErrorLogImageRow, "errorLogId"> };
      };
      select?: unknown;
    }) {
      const { image, ...rest } = data;
      const row = toRow(rest);
      if (rows.some((r) => r.id === row.id))
        throw Object.assign(new Error("Unique constraint failed on id"), {
          code: "P2002",
        });
      rows.push(row);
      if (image?.create)
        images.push({
          errorLogId: row.id,
          ...image.create,
          data: new Uint8Array(image.create.data),
        });
      return { ...row };
    },
    async createMany({ data }: { data: Record<string, unknown>[] }) {
      const next = data.map(toRow);
      rows.push(...next);
      return { count: next.length };
    },
    async findMany({
      where,
      include,
      take,
    }: {
      where?: Where;
      include?: { image?: unknown };
      orderBy?: unknown;
      take?: number;
    } = {}) {
      const found = rows.filter((row) => matches(row, where));
      return (take === undefined ? found : found.slice(0, take)).map((row) =>
        withImage(row, include),
      );
    },
    async count({ where }: { where?: Where } = {}) {
      return rows.filter((row) => matches(row, where)).length;
    },
    async deleteMany({ where }: { where?: Where } = {}) {
      const gone = rows.filter((row) => matches(row, where));
      const ids = new Set(gone.map((row) => row.id));
      rows = rows.filter((row) => !ids.has(row.id));
      // FK ON DELETE CASCADE 흉내 — 딸린 이미지도 같이
      images = images.filter((image) => !ids.has(image.errorLogId));
      return { count: gone.length };
    },
  },
  /** 시험용 — 줄을 직접 들여다본다(시각 옮기기 등). */
  __errorLogRows: () => rows,
  __errorLogImageRows: () => images,
};
