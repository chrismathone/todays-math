import "server-only";

/** Parameterized SQL shared by Prisma production and local PostgreSQL verification. */
export interface ScanSql {
  query<T extends object>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<T[]>;
}
export interface ScanDatabase extends ScanSql {
  transaction<T>(run: (tx: ScanSql) => Promise<T>): Promise<T>;
}

export class ScanUnavailableError extends Error {
  readonly status = 503;
  constructor() {
    super(
      "사진 채점 저장소가 준비되지 않았습니다. DB 적용 후 다시 이용해 주세요.",
    );
    this.name = "ScanUnavailableError";
  }
}

/** Never turn arbitrary provider/network failures into a misleading migration notice. */
export function scanDatabaseError(error: unknown): never {
  const e = error as { code?: string; meta?: { code?: string } };
  if (
    ["42P01", "42703", "P2021", "P2022"].includes(e?.code ?? "") ||
    ["42P01", "42703"].includes(e?.meta?.code ?? "")
  )
    throw new ScanUnavailableError();
  throw error;
}
