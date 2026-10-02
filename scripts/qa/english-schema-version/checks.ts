/**
 * 오늘의 영어 — «형식 판» SQL 초안의 검사 (자료 개선 M0 · docs/planning/english-material-upgrade-20261002.md §C).
 *
 * 초안: `prisma/drafts/english-set-schema-version/draft.sql` — 🔴 미적용. 여기 있는 것은 그 초안을 재는 자다.
 *
 *   ⑴ 정적 검사(`lintAdditiveDraft`) — DB 없이. 초안이 **더하기만** 하는가(칸 둘 · CHECK 하나, 그 표 하나에만).
 *   ⑵ 적용 뒤 확인(`verifyApplied`) — 칸의 형 · NULL · 기본값, CHECK 정의문, 기존 행 무변경.
 *   ⑶ CHECK 의 동작(`probeConstraints`) — DB 에 들어간 제약의 식을 표본 값에 대고 셈한다. 행을 넣지 않는다(읽기뿐).
 *
 * ⑵⑶ 은 `SqlRunner` 하나에만 기댄다 — 운영 도구는 Prisma 트랜잭션을, 로컬 검증은 메모리 Postgres 를 꽂는다.
 * 🔴 영어 울타리: 이 파일은 `scripts/` 라 `src/lib/english/**` 를 import 하지 않는다. 표 이름만 안다(울타리 허용 목록).
 */

export const DRAFT_PATH = "prisma/drafts/english-set-schema-version/draft.sql";
export const TABLE = "english_question_set";
export const NEW_COLUMNS = ["schema_version", "payload_v2"] as const;
/**
 * CHECK 하나가 «판은 1 · 2 뿐»과 «판과 본문이 맞는다»를 같이 잰다. 판만 재는 CHECK 를 따로 두면 이 CHECK 에 가려
 * 한 번도 울지 않는다(2026-10-02 로컬 드라이런의 변이 — 판 3 을 허용하게 고쳐도 표본이 다 통과했다).
 */
export const NEW_CHECKS = [
  "english_question_set_payload_matches_version",
] as const;
/** 칸 2 · CHECK 1 */
export const EXPECTED_STATEMENTS = 3;

/** 되돌리기 — 2판 행이 없을 때만(부르는 쪽이 먼저 센다) */
export const REVERT_STATEMENTS = [
  `ALTER TABLE "${TABLE}" DROP CONSTRAINT IF EXISTS "${NEW_CHECKS[0]}"`,
  `ALTER TABLE "${TABLE}" DROP COLUMN IF EXISTS "payload_v2"`,
  `ALTER TABLE "${TABLE}" DROP COLUMN IF EXISTS "schema_version"`,
] as const;

export interface SqlRunner {
  query<Row = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<Row[]>;
  execute(sql: string): Promise<void>;
}

/** 주석 줄을 걷고 `;` 로 나눈다 — 본문에 `;` 가 드는 꼴(`$$`)은 받지 않는다 */
export function splitSqlStatements(sql: string): string[] {
  if (sql.includes("$$"))
    throw new Error("$$ 본문이 있다 — 단순 분할로는 안 된다");
  return sql
    .replaceAll("\r", "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const ADD_ONLY = new RegExp(
  `^ALTER TABLE "${TABLE}" ADD (COLUMN|CONSTRAINT) "([a-z0-9_]+)"`,
);
/** 더하기가 아닌 말 — 문장 어디에 있어도 초안이 아니다 */
const DESTRUCTIVE =
  /\b(DROP|DELETE|UPDATE|TRUNCATE|INSERT|RENAME|CREATE|GRANT|REVOKE|ALTER\s+COLUMN|SET\s+DATA\s+TYPE|DISABLE)\b/i;

export interface DraftLint {
  statements: string[];
  added: { kind: "COLUMN" | "CONSTRAINT"; name: string }[];
  problems: string[];
}

/** 초안이 더하기만 하는가 — 그 표 하나에 칸 둘과 CHECK 하나, 그것뿐 */
export function lintAdditiveDraft(sql: string): DraftLint {
  const statements = splitSqlStatements(sql);
  const problems: string[] = [];
  const added: DraftLint["added"] = [];
  statements.forEach((statement, index) => {
    const head = ADD_ONLY.exec(statement);
    if (!head)
      problems.push(
        `${index + 1}번 문장이 «${TABLE} 에 칸이나 제약을 더하기»가 아니다`,
      );
    else
      added.push({ kind: head[1] as "COLUMN" | "CONSTRAINT", name: head[2]! });
    const bad = DESTRUCTIVE.exec(statement);
    if (bad) problems.push(`${index + 1}번 문장에 «${bad[0]}» 가 있다`);
  });
  if (statements.length !== EXPECTED_STATEMENTS)
    problems.push(
      `문장이 ${EXPECTED_STATEMENTS}(칸 2 · CHECK 1)이 아니다: ${statements.length}`,
    );
  const names = added.map((entry) => entry.name);
  for (const name of [...NEW_COLUMNS, ...NEW_CHECKS])
    if (!names.includes(name)) problems.push(`«${name}» 를 더하는 문장이 없다`);
  if (new Set(names).size !== names.length)
    problems.push("같은 이름을 두 번 더한다");
  return { statements, added, problems };
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export async function tableColumns(runner: SqlRunner): Promise<ColumnInfo[]> {
  return runner.query<ColumnInfo>(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    TABLE,
  );
}

export async function rowCount(runner: SqlRunner): Promise<number> {
  const [row] = await runner.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM "${TABLE}"`,
  );
  return row!.n;
}

/** 기존 행의 지문 · 문항 · meta 를 한 줄로 — 적용 전후가 같아야 한다 */
export async function contentFingerprint(runner: SqlRunner): Promise<string> {
  const [row] = await runner.query<{ fp: string | null }>(
    `SELECT md5(coalesce(string_agg(
              id::text || '|' || revision::text || '|' || md5(passage) || '|' ||
              md5(questions::text) || '|' || coalesce(md5(meta::text), 'NULL') || '|' ||
              status || '|' || source, ',' ORDER BY id), '')) AS fp
       FROM "${TABLE}"`,
  );
  return row!.fp ?? "";
}

export interface Precondition {
  columnsBefore: number;
  rowsBefore: number;
  nullMetaBefore: number;
  fingerprintBefore: string;
}

/** 앞 조건 — 표가 있고, 새 칸은 아직 없다 */
export async function checkPrecondition(
  runner: SqlRunner,
): Promise<Precondition> {
  const [found] = await runner.query<{ found: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS found`,
    `public.${TABLE}`,
  );
  if (!found?.found)
    throw new Error(`${TABLE} 표가 없다 — 영어 표 마이그레이션부터`);
  const columns = await tableColumns(runner);
  const already = NEW_COLUMNS.filter((name) =>
    columns.some((column) => column.column_name === name),
  );
  if (already.length)
    throw new Error(
      `이미 있는 칸: ${already.join(", ")} — 누가 언제 만들었는지 먼저 확인할 것`,
    );
  const [nulls] = await runner.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM "${TABLE}" WHERE meta IS NULL`,
  );
  return {
    columnsBefore: columns.length,
    rowsBefore: await rowCount(runner),
    nullMetaBefore: nulls!.n,
    fingerprintBefore: await contentFingerprint(runner),
  };
}

/** 적용 뒤 확인 — 읽기만. 어긋나면 던진다. 돌려주는 줄은 화면에 찍을 요약 */
export async function verifyApplied(
  runner: SqlRunner,
  before: Precondition,
): Promise<string[]> {
  const lines: string[] = [];
  const after = await tableColumns(runner);
  if (after.length !== before.columnsBefore + NEW_COLUMNS.length)
    throw new Error(
      `칸이 정확히 ${NEW_COLUMNS.length}개 늘지 않았다: ${before.columnsBefore} → ${after.length}`,
    );
  const version = after.find((c) => c.column_name === "schema_version");
  const payload = after.find((c) => c.column_name === "payload_v2");
  if (
    !version ||
    version.data_type !== "smallint" ||
    version.is_nullable !== "NO" ||
    !/^1(::smallint)?$/.test(version.column_default ?? "")
  )
    throw new Error(
      "schema_version 이 smallint · NOT NULL · DEFAULT 1 이 아니다",
    );
  if (
    !payload ||
    payload.data_type !== "jsonb" ||
    payload.is_nullable !== "YES" ||
    payload.column_default !== null
  )
    throw new Error("payload_v2 가 jsonb · NULL 허용 · 기본값 없음이 아니다");
  lines.push(
    `칸 ${before.columnsBefore} → ${after.length} · schema_version smallint NOT NULL DEFAULT 1 · payload_v2 jsonb NULL`,
  );

  const checks = await runner.query<{ conname: string; def: string }>(
    `SELECT k.conname, pg_get_constraintdef(k.oid) AS def FROM pg_constraint k
      WHERE k.conrelid = $1::regclass AND k.contype = 'c'`,
    `public.${TABLE}`,
  );
  for (const name of NEW_CHECKS) {
    const check = checks.find((entry) => entry.conname === name);
    if (!check) throw new Error(`CHECK ${name} 이 없다`);
    lines.push(`CHECK ${name} — ${check.def.replace(/\s+/g, " ")}`);
  }
  // 옛 CHECK 넷(status · source · questions 배열 · revision)과 meta 객체 CHECK 가 그대로 있어야 한다
  for (const kept of [
    "english_question_set_status_check",
    "english_question_set_source_check",
    "english_question_set_questions_array",
    "english_question_set_positive_revision",
    "english_question_set_meta_object",
  ])
    if (!checks.some((entry) => entry.conname === kept))
      throw new Error(`옛 CHECK ${kept} 이 사라졌다`);

  const rowsAfter = await rowCount(runner);
  const [state] = await runner.query<{
    v1: number;
    filled: number;
    nulls: number;
  }>(
    `SELECT count(*) FILTER (WHERE schema_version = 1)::int AS v1,
            count(*) FILTER (WHERE payload_v2 IS NOT NULL)::int AS filled,
            count(*) FILTER (WHERE meta IS NULL)::int AS nulls
       FROM "${TABLE}"`,
  );
  if (rowsAfter !== before.rowsBefore)
    throw new Error(`행 수가 바뀌었다: ${before.rowsBefore} → ${rowsAfter}`);
  if (state!.v1 !== rowsAfter || state!.filled !== 0)
    throw new Error("기존 행이 1판 · 2판 본문 없음이 아니다");
  if (state!.nulls !== before.nullMetaBefore)
    throw new Error(
      `meta 가 NULL 인 행 수가 바뀌었다: ${before.nullMetaBefore} → ${state!.nulls}`,
    );
  const fingerprintAfter = await contentFingerprint(runner);
  if (fingerprintAfter !== before.fingerprintBefore)
    throw new Error(
      "기존 행의 지문 · 문항 · meta · 상태 · 출처 · revision 이 바뀌었다",
    );
  lines.push(
    `행 ${before.rowsBefore} → ${rowsAfter} · 전부 1판 · 2판 본문 0 · meta NULL ${state!.nulls}행 그대로 · 내용 지문(md5) 같음`,
  );

  const [rls] = await runner.query<{ on: boolean }>(
    `SELECT relrowsecurity AS on FROM pg_class WHERE oid = $1::regclass`,
    `public.${TABLE}`,
  );
  if (!rls?.on) throw new Error("RLS 가 꺼져 있다");
  lines.push("RLS 켜짐 그대로");
  return lines;
}

const V2_PAYLOAD = `'{"schemaVersion":2}'::jsonb`;
const V1_QUESTIONS = `'[{"type":"주제"}]'::jsonb`;
const EMPTY_QUESTIONS = `'[]'::jsonb`;

export interface ConstraintProbe {
  name: string;
  /** 칸 → SQL 값. 안 적은 칸은 새 칸의 기본값(옛 코드의 INSERT 처럼 — 판 1 · 2판 본문 NULL) */
  values: { schema_version?: string; payload_v2?: string; questions: string };
  /** DB 가 받아야 하나 */
  pass: boolean;
}

export const CONSTRAINT_PROBES: readonly ConstraintProbe[] = [
  {
    name: "1판 행 — 새 칸을 안 적은 옛 코드의 INSERT",
    values: { questions: V1_QUESTIONS },
    pass: true,
  },
  {
    name: "2판 행 — 본문이 있고 1판 문항이 비었다",
    values: {
      schema_version: "2",
      payload_v2: V2_PAYLOAD,
      questions: EMPTY_QUESTIONS,
    },
    pass: true,
  },
  {
    name: "판만 2 이고 2판 본문이 없다",
    values: { schema_version: "2", questions: EMPTY_QUESTIONS },
    pass: false,
  },
  {
    // 옛 코드(칸을 모르는 빌드)의 PUT 이 2판 행에 1판 문항 배열을 덮어쓴 뒤의 모습
    name: "2판 행인데 1판 문항 배열이 남아 있다(옛 코드의 PUT)",
    values: {
      schema_version: "2",
      payload_v2: V2_PAYLOAD,
      questions: V1_QUESTIONS,
    },
    pass: false,
  },
  {
    name: "1판 행인데 2판 본문이 들었다",
    values: { payload_v2: V2_PAYLOAD, questions: V1_QUESTIONS },
    pass: false,
  },
  {
    name: "행은 2판인데 본문이 1판이라 한다",
    values: {
      schema_version: "2",
      payload_v2: `'{"schemaVersion":1}'::jsonb`,
      questions: EMPTY_QUESTIONS,
    },
    pass: false,
  },
  {
    // 🔴 `->` 로 견주면 칸이 없을 때 NULL 이 되고, CHECK 는 NULL 을 «통과»로 본다 — 그래서 초안은 `@>` 로 잰다
    name: "2판 본문에 판 표지가 없다(빈 객체)",
    values: {
      schema_version: "2",
      payload_v2: `'{}'::jsonb`,
      questions: EMPTY_QUESTIONS,
    },
    pass: false,
  },
  {
    name: "2판 본문의 판 표지가 글자 «2» 다",
    values: {
      schema_version: "2",
      payload_v2: `'{"schemaVersion":"2"}'::jsonb`,
      questions: EMPTY_QUESTIONS,
    },
    pass: false,
  },
  {
    // 판 표지가 든 객체를 배열로 감싼 것 — 객체 여부를 따로 재지 않으면 통과할 수 있는 꼴
    name: "2판 본문이 객체가 아니다(판 표지가 든 객체의 배열)",
    values: {
      schema_version: "2",
      payload_v2: `'[{"schemaVersion":2}]'::jsonb`,
      questions: EMPTY_QUESTIONS,
    },
    pass: false,
  },
  {
    // 판만 3 이고 나머지는 2판 행처럼 다 갖췄다 — 판 갈래만 재는 표본
    name: "모르는 판 3(나머지는 2판 행과 같다)",
    values: {
      schema_version: "3",
      payload_v2: V2_PAYLOAD,
      questions: EMPTY_QUESTIONS,
    },
    pass: false,
  },
  {
    name: "모르는 판 0(나머지는 1판 행과 같다)",
    values: { schema_version: "0", questions: V1_QUESTIONS },
    pass: false,
  },
];

/**
 * CHECK 의 동작을 본다 — DB 에 **들어가 있는** 제약의 식(`pg_get_constraintdef`)을 표본 값에 대고 그대로 셈한다.
 * 행을 넣지 않는다(실제 표에도 임시 표에도) — 읽기뿐이다. CHECK 는 식이 FALSE 일 때만 거절하고 **NULL 은 통과**시키므로
 * «받음»은 `IS NOT FALSE` 로 센다(TRUE 만 세면 NULL 구멍을 못 본다).
 * 🔴 처음에는 임시 표에 INSERT 해 보고 실패를 SAVEPOINT 로 되돌렸다 — Prisma 트랜잭션 안에서 실패한 문장 뒤에 연결이
 *    끊겼다(P1017, 2026-10-02 로컬 서버). 실패하는 문장에 기대지 않는 지금 꼴은 Prisma 와 메모리 Postgres 에서 같이 돈다.
 */
export async function probeConstraints(runner: SqlRunner): Promise<string[]> {
  const [constraint] = await runner.query<{ def: string }>(
    `SELECT pg_get_constraintdef(k.oid) AS def FROM pg_constraint k
      WHERE k.conrelid = $1::regclass AND k.conname = $2 AND k.contype = 'c'`,
    `public.${TABLE}`,
    NEW_CHECKS[0],
  );
  const expression = /^CHECK\s*\(([\s\S]*)\)$/.exec(constraint?.def ?? "")?.[1];
  if (!expression)
    throw new Error(`CHECK ${NEW_CHECKS[0]} 의 식을 읽지 못했다`);

  const lines: string[] = [];
  for (const probe of CONSTRAINT_PROBES) {
    // 안 적은 칸은 초안의 기본값 — 옛 코드의 INSERT 가 받는 값
    const row = `SELECT ${probe.values.schema_version ?? "1"}::smallint AS schema_version,
                        ${probe.values.payload_v2 ?? "NULL::jsonb"} AS payload_v2,
                        ${probe.values.questions} AS questions`;
    const [result] = await runner.query<{ accepted: boolean }>(
      `SELECT ((${expression}) IS NOT FALSE) AS accepted FROM (${row}) AS probe`,
    );
    if (result!.accepted !== probe.pass)
      throw new Error(
        `CHECK 동작이 다르다 — «${probe.name}»: ${probe.pass ? "받아야 하는데 거절" : "거절해야 하는데 받음"}`,
      );
    lines.push(`${probe.pass ? "받음" : "거절"} — ${probe.name}`);
  }
  return lines;
}
