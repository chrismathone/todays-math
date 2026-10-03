/**
 * 교재 저장 계층이 DB 에 말하는 문 — 문장과 인자, 그것뿐이다.
 *
 * 왜 Prisma 모델 API 가 아니라 SQL 인가: 교재의 불변식은 **DB 에 있다**(트리거 · 복합 FK · 부분 유일 색인 ·
 * `FOR UPDATE` · 조각을 이어 붙이는 `string_agg`). 그 불변식과 맞물려 도는 코드를 손으로 지은 메모리 대역에서
 * 시험하면 «내가 흉내 낸 DB»에서만 초록이다. 이 문은 구현이 둘이다 —
 *   · 제품: `prismaSql.ts`(Prisma 의 원시 질의 · 같은 연결 풀과 트랜잭션)
 *   · 시험: PGlite(실제 Postgres 엔진, 저장소의 마이그레이션 사슬을 전부 적용)
 * 그래서 시험이 도는 SQL 과 제품이 도는 SQL 이 **글자까지 같다.**
 *
 * 두 구현이 값을 다르게 읽지 않도록 지키는 약속:
 *   · 인자에는 형을 적는다(`$1::uuid` · `$2::jsonb` · `$3::int`). Prisma 는 문자열을 text 로 보낸다
 *   · 시각은 SQL 이 글자로 낸다(`isoColumn`) — TIMESTAMP(3) 를 드라이버가 제 시간대로 읽지 않게
 *   · 세는 값은 `::int` 로 낸다 — bigint 는 한쪽에서 BigInt 다
 *   · 목록 인자는 JSON 글자로 넘겨 `jsonb_array_elements_text` 로 편다
 */
export type SqlParam = string | number | boolean | null | Uint8Array | Date;

export interface TextbookSql {
  query<T = Record<string, unknown>>(
    text: string,
    params?: readonly SqlParam[],
  ): Promise<T[]>;
  /** 바뀐 행 수 */
  execute(text: string, params?: readonly SqlParam[]): Promise<number>;
}

export interface TextbookDb extends TextbookSql {
  /** 던지면 전부 되돌린다 */
  transaction<T>(run: (tx: TextbookSql) => Promise<T>): Promise<T>;
}

/** TIMESTAMP(3) 칸을 ISO 글자(UTC)로 — 저장소의 시각 칸은 전부 UTC 로 적혀 있다 */
export const isoColumn = (column: string): string =>
  `to_char(${column}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

/** 지금(UTC) — TIMESTAMP(3) 칸에 넣을 값. 세션 시간대에 기대지 않는다 */
export const SQL_NOW = `(now() AT TIME ZONE 'UTC')`;

/** JSON 글자 인자를 uuid 목록으로 편다: `"id" IN ${uuidList("$1")}` */
export const uuidList = (param: string): string =>
  `(SELECT value::uuid FROM jsonb_array_elements_text(${param}::jsonb))`;

/**
 * 오류에서 SQLSTATE 를 꺼낸다. PGlite 는 `code` 에, Prisma 의 원시 질의는 `meta.code` 에 둔다
 * (Prisma 의 `code` 는 P2010 같은 자기 번호다).
 */
export function sqlState(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { code?: unknown; meta?: { code?: unknown } };
  for (const value of [candidate.meta?.code, candidate.code])
    if (
      typeof value === "string" &&
      /^[0-9A-Z]{5}$/.test(value) &&
      !/^P\d{4}$/.test(value)
    )
      return value;
  return null;
}

/** 교재 트리거가 낸 거절인가 — 글머리 «textbook:» 로 가린다 */
export function isTextbookGuardError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    message?: unknown;
    meta?: { message?: unknown };
  };
  return [candidate.message, candidate.meta?.message].some(
    (text) => typeof text === "string" && text.includes("textbook:"),
  );
}
