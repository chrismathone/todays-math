/**
 * 오늘의 영어 표 셋(`english_exam` · `english_material` · `english_question_set`)의 **인메모리 대역** (D-148 · 25 §2).
 *
 * ## 왜 `prismaTestDouble.ts` 에 안 넣었나
 *
 * 트랙 넷(base · shell · ai · print)이 병행한다 — 같은 파일의 같은 자리(행 배열 선언 · reset · snapshot)를
 * 둘이 고치면 병합이 부딪친다(`learnTestDouble.ts` 머리말과 같은 까닭). 영어 라우트는 `$transaction` 을 쓰지
 * 않으므로 되돌리기 스냅샷이 필요 없다. `prismaTestDouble.ts` 에는 `errorLogTestDouble` 처럼 import 한 줄과
 * 모델 합성만 있다(전역 `vitest.setup.ts` 모킹이 그대로 답한다).
 *
 * 쓰는 법: 라우트 시험은 `@/lib/db` 를 `composeEnglishDb(prismaTestDouble)` 로 모킹한다 — 계정(`user`)은
 * 원래 대역이, 영어 표 셋은 여기가 답한다. 소유 범위 판정(`ownedRowsWhere` 의 `{ user: { branchId } }`)이
 * 계정의 지점을 물으므로 `composeEnglishDb` 가 원래 대역의 `user.findUnique` 를 이어 준다.
 *
 * 원칙은 원래 대역과 같다: **모르는 모양(where · select · include · orderBy · data)은 조용히 넘기지 않고 던진다.**
 * `findMany` 는 `where.userId` · `where.user.branchId` · `where.exam.userId` · `where.exam.user.branchId`
 * (`ownedRowsWhere` 모양)를 안다. `englishQuestionSet.update` 는 `where: { id, revision }` CAS 다 — 맞는 행이 없으면
 * 실제 Prisma 처럼 `P2025` 를 던진다.
 */
import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

export interface EnglishExamRow {
  id: string;
  userId: string;
  school: string;
  grade: string;
  title: string;
  examDate: Date | null;
  types: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnglishMaterialRow {
  id: string;
  examId: string;
  name: string;
  mimeType: string;
  size: number;
  bytes: Uint8Array | null;
  content: string | null;
  createdAt: Date;
}

export interface EnglishQuestionSetRow {
  id: string;
  examId: string;
  title: string;
  status: string;
  source: string;
  passage: string;
  questions: unknown;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

let examRows: EnglishExamRow[] = [];
let materialRows: EnglishMaterialRow[] = [];
let setRows: EnglishQuestionSetRow[] = [];

type UserLookup = (id: string) => Promise<{ branchId?: string | null } | null>;
/** 계정의 지점을 읽는 길 — `composeEnglishDb` 가 원래 대역의 `user.findUnique` 로 채운다 */
let userLookup: UserLookup = async () => {
  throw new Error(
    "englishTestDouble: where.user 를 판정하려면 composeEnglishDb(prismaTestDouble) 로 모킹해야 한다",
  );
};

export function resetEnglishTestDouble(): void {
  examRows = [];
  materialRows = [];
  setRows = [];
}

// ── 오류 · 도우미 ──────────────────────────────────────────────

/** 함수 선언이어야 TS 가 호출 뒤를 `never` 로 좁힌다(상수 화살표는 못 좁힌다) */
function fail(message: string): never {
  throw new Error(`englishTestDouble: ${message}`);
}

function notFound(model: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `No record was found for an update. (${model})`,
    { code: "P2025", clientVersion: "6.19.3" },
  );
}

type Where = Record<string, unknown>;

/** `id: "…"` 또는 `id: { in: […] }` */
function matchesId(value: string, cond: unknown): boolean {
  if (typeof cond === "string") return value === cond;
  if (cond && typeof cond === "object") {
    const ops = cond as Record<string, unknown>;
    const keys = Object.keys(ops);
    if (keys.length === 1 && Array.isArray(ops.in))
      return (ops.in as unknown[]).includes(value);
  }
  return fail(`모르는 id 조건 ${JSON.stringify(cond)}`);
}

/** `english_exam` 의 where — `ownedRowsWhere` 모양(`userId` · `user.branchId` · `{}`)과 `id` */
async function examMatches(
  row: EnglishExamRow,
  where?: Where,
): Promise<boolean> {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (key === "id") {
      if (!matchesId(row.id, cond)) return false;
    } else if (key === "userId") {
      if (typeof cond !== "string") fail("where.userId 는 문자열만 안다");
      if (row.userId !== cond) return false;
    } else if (key === "user") {
      const user = cond as Record<string, unknown>;
      const keys = Object.keys(user);
      if (keys.length !== 1 || keys[0] !== "branchId")
        fail(`where.user 는 branchId 하나만 안다: ${keys.join(", ")}`);
      if (typeof user.branchId !== "string")
        fail("where.user.branchId 는 문자열만 안다");
      const owner = await userLookup(row.userId);
      if (!owner || owner.branchId !== user.branchId) return false;
    } else fail(`englishExam 이 모르는 where 칸 '${key}'`);
  }
  return true;
}

/** 자료·세트의 where — `id` · `examId` · `exam`(부모 시험 where) · 표별 칸 */
async function childMatches(
  model: string,
  row: { id: string; examId: string } & Record<string, unknown>,
  where: Where | undefined,
  own: (key: string, cond: unknown) => boolean | null,
): Promise<boolean> {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (key === "id") {
      if (!matchesId(row.id, cond)) return false;
    } else if (key === "examId") {
      if (!matchesId(row.examId, cond)) return false;
    } else if (key === "exam") {
      const exam = examRows.find((e) => e.id === row.examId);
      if (!exam || !(await examMatches(exam, cond as Where))) return false;
    } else {
      const verdict = own(key, cond);
      if (verdict === null) fail(`${model} 이 모르는 where 칸 '${key}'`);
      if (!verdict) return false;
    }
  }
  return true;
}

function sortRows<T extends Record<string, unknown>>(
  model: string,
  rows: T[],
  orderBy: unknown,
): T[] {
  if (orderBy === undefined) return rows;
  if (!orderBy || typeof orderBy !== "object" || Array.isArray(orderBy))
    return fail(`${model} 정렬은 객체 하나만 안다`);
  const entries = Object.entries(orderBy as Record<string, unknown>);
  if (entries.length !== 1) fail(`${model} 정렬은 칸 하나만 안다`);
  const [key, dir] = entries[0]!;
  if (!["createdAt", "updatedAt"].includes(key))
    fail(`${model} 정렬은 createdAt · updatedAt 만 안다 ('${key}')`);
  if (dir !== "asc" && dir !== "desc") fail(`${model} 정렬 방향 '${dir}'`);
  const sign = dir === "desc" ? -1 : 1;
  return [...rows].sort(
    (a, b) => sign * ((a[key] as Date).getTime() - (b[key] as Date).getTime()),
  );
}

/** `select` — `true` 인 칸만. 관계·`_count` 는 부르는 쪽이 따로 다룬다 */
function project<T extends object>(
  model: string,
  row: T,
  select: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const record = row as Record<string, unknown>;
  if (!select) return structuredClone(record);
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(select)) {
    if (spec === false || spec === undefined) continue;
    if (spec !== true) fail(`${model} select 의 '${key}' 는 true 만 안다`);
    if (!(key in record)) fail(`${model} select 에 없는 칸 '${key}'`);
    out[key] = structuredClone(record[key]);
  }
  return out;
}

/** `include: { _count: { select: { materials: true, sets: true } } }` — 시험 요약 수 */
function examWithInclude(
  row: EnglishExamRow,
  include: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = structuredClone(
    row as unknown as Record<string, unknown>,
  );
  if (!include) return out;
  for (const [key, spec] of Object.entries(include)) {
    if (spec === false || spec === undefined) continue;
    if (key !== "_count")
      fail(`englishExam include 는 _count 만 안다 ('${key}')`);
    const select = (spec as { select?: Record<string, unknown> }).select;
    if (!select) fail("englishExam include._count 에는 select 가 있어야 한다");
    const count: Record<string, number> = {};
    for (const [relation, on] of Object.entries(select)) {
      if (on !== true) fail(`_count.select.${relation} 는 true 만 안다`);
      if (relation === "materials")
        count.materials = materialRows.filter(
          (m) => m.examId === row.id,
        ).length;
      else if (relation === "sets")
        count.sets = setRows.filter((s) => s.examId === row.id).length;
      else fail(`_count 가 모르는 관계 '${relation}'`);
    }
    out._count = count;
  }
  return out;
}

/** `{ increment: n }` 을 푼다. 모르는 연산 객체는 던진다 */
function applyData<T extends object>(
  model: string,
  row: T,
  data: Record<string, unknown>,
) {
  const record = row as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (!(key in record)) fail(`${model} data 에 없는 칸 '${key}'`);
    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date) &&
      !(value instanceof Uint8Array) &&
      !Array.isArray(value)
    ) {
      const ops = value as Record<string, unknown>;
      if (typeof ops.increment === "number" && Object.keys(ops).length === 1) {
        record[key] = (record[key] as number) + ops.increment;
        continue;
      }
      fail(`${model} 모르는 data 연산 '${key}'`);
    }
    record[key] = structuredClone(value);
  }
  if ("updatedAt" in record) record.updatedAt = new Date();
}

const onlyId = (model: string, where: Where): string => {
  const keys = Object.keys(where);
  if (keys.length !== 1 || keys[0] !== "id" || typeof where.id !== "string")
    fail(`${model} 유일 조회는 id 하나`);
  return where.id as string;
};

// ── 모델 ───────────────────────────────────────────────────────

export const englishModels = {
  englishExam: {
    async findMany({
      where,
      orderBy,
      include,
      select,
    }: {
      where?: Where;
      orderBy?: unknown;
      include?: Record<string, unknown>;
      select?: Record<string, unknown>;
    } = {}) {
      if (include && select)
        fail("englishExam: include 와 select 를 같이 못 쓴다");
      const hits: EnglishExamRow[] = [];
      for (const row of examRows)
        if (await examMatches(row, where)) hits.push(row);
      return sortRows(
        "englishExam",
        hits as unknown as Record<string, unknown>[],
        orderBy,
      ).map((row) =>
        select
          ? project("englishExam", row, select)
          : examWithInclude(row as unknown as EnglishExamRow, include),
      );
    },
    async findUnique({
      where,
      include,
      select,
    }: {
      where: Where;
      include?: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) {
      const id = onlyId("englishExam", where);
      const row = examRows.find((r) => r.id === id);
      if (!row) return null;
      return select
        ? project("englishExam", row, select)
        : examWithInclude(row, include);
    },
    async create({
      data,
      include,
    }: {
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) {
      const now = new Date();
      // NOT NULL 칸은 자리만 두고(undefined) data 가 채운다 — applyData 는 «있는 칸»만 받는다
      const row: EnglishExamRow = {
        id: randomUUID(),
        userId: undefined,
        school: undefined,
        grade: undefined,
        title: undefined,
        examDate: null,
        types: [],
        createdAt: now,
        updatedAt: now,
      } as unknown as EnglishExamRow;
      applyData("englishExam", row, data);
      if (!row.userId || !row.school || !row.grade || !row.title)
        fail("englishExam NOT NULL 칸이 비었다");
      if (!Array.isArray(row.types))
        fail("englishExam.types 는 배열이어야 한다");
      examRows.push(row);
      return examWithInclude(row, include);
    },
    async update({
      where,
      data,
      include,
    }: {
      where: Where;
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) {
      const id = onlyId("englishExam", where);
      const row = examRows.find((r) => r.id === id);
      if (!row) throw notFound("englishExam");
      applyData("englishExam", row, data);
      if (!Array.isArray(row.types))
        fail("englishExam.types 는 배열이어야 한다");
      return examWithInclude(row, include);
    },
    /** FK ON DELETE CASCADE 흉내 — 딸린 자료·세트도 같이 */
    async delete({ where }: { where: Where }) {
      const id = onlyId("englishExam", where);
      const row = examRows.find((r) => r.id === id);
      if (!row) throw notFound("englishExam");
      examRows = examRows.filter((r) => r.id !== id);
      materialRows = materialRows.filter((m) => m.examId !== id);
      setRows = setRows.filter((s) => s.examId !== id);
      return structuredClone(row);
    },
  },

  englishMaterial: {
    async findMany({
      where,
      orderBy,
      select,
    }: {
      where?: Where;
      orderBy?: unknown;
      select?: Record<string, unknown>;
    } = {}) {
      const hits: EnglishMaterialRow[] = [];
      for (const row of materialRows)
        if (
          await childMatches(
            "englishMaterial",
            row as unknown as { id: string; examId: string } & Record<
              string,
              unknown
            >,
            where,
            (key, cond) => {
              if (key !== "bytes") return null;
              // `bytes: null` · `bytes: { not: null }` — 파일 유무
              if (cond === null) return row.bytes === null;
              if (
                cond &&
                typeof cond === "object" &&
                Object.keys(cond).length === 1 &&
                (cond as { not?: unknown }).not === null
              )
                return row.bytes !== null;
              return fail(
                "englishMaterial where.bytes 는 null · { not: null } 만 안다",
              );
            },
          )
        )
          hits.push(row);
      return sortRows(
        "englishMaterial",
        hits as unknown as Record<string, unknown>[],
        orderBy,
      ).map((row) => project("englishMaterial", row, select));
    },
    async findUnique({
      where,
      select,
    }: {
      where: Where;
      select?: Record<string, unknown>;
    }) {
      const id = onlyId("englishMaterial", where);
      const row = materialRows.find((r) => r.id === id);
      return row ? project("englishMaterial", row, select) : null;
    },
    async create({
      data,
      select,
    }: {
      data: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) {
      const row: EnglishMaterialRow = {
        id: randomUUID(),
        examId: undefined,
        name: undefined,
        mimeType: undefined,
        size: undefined,
        bytes: null,
        content: null,
        createdAt: new Date(),
      } as unknown as EnglishMaterialRow;
      applyData("englishMaterial", row, data);
      if (
        !row.examId ||
        !row.name ||
        !row.mimeType ||
        typeof row.size !== "number"
      )
        fail("englishMaterial NOT NULL 칸이 비었다");
      if (!examRows.some((e) => e.id === row.examId))
        fail("englishMaterial.examId 가 가리키는 시험이 없다(FK)");
      // SQL CHECK 흉내 — 둘 다 비면 자료가 아니다 · size ≥ 0
      if (row.bytes === null && row.content === null)
        fail("englishMaterial: bytes 와 content 가 둘 다 비었다(CHECK)");
      if (row.size < 0) fail("englishMaterial.size < 0 (CHECK)");
      materialRows.push(row);
      return project("englishMaterial", row, select);
    },
    async delete({ where }: { where: Where }) {
      const id = onlyId("englishMaterial", where);
      const row = materialRows.find((r) => r.id === id);
      if (!row) throw notFound("englishMaterial");
      materialRows = materialRows.filter((r) => r.id !== id);
      return structuredClone(row);
    },
  },

  englishQuestionSet: {
    async findMany({
      where,
      orderBy,
      select,
    }: {
      where?: Where;
      orderBy?: unknown;
      select?: Record<string, unknown>;
    } = {}) {
      const hits: EnglishQuestionSetRow[] = [];
      for (const row of setRows)
        if (
          await childMatches(
            "englishQuestionSet",
            row as unknown as { id: string; examId: string } & Record<
              string,
              unknown
            >,
            where,
            (key, cond) => {
              if (key !== "status") return null;
              if (typeof cond !== "string")
                return fail("englishQuestionSet where.status 는 문자열만 안다");
              return row.status === cond;
            },
          )
        )
          hits.push(row);
      return sortRows(
        "englishQuestionSet",
        hits as unknown as Record<string, unknown>[],
        orderBy,
      ).map((row) => project("englishQuestionSet", row, select));
    },
    async findUnique({
      where,
      select,
    }: {
      where: Where;
      select?: Record<string, unknown>;
    }) {
      const id = onlyId("englishQuestionSet", where);
      const row = setRows.find((r) => r.id === id);
      return row ? project("englishQuestionSet", row, select) : null;
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const now = new Date();
      const row: EnglishQuestionSetRow = {
        id: randomUUID(),
        examId: undefined,
        title: undefined,
        status: "초안",
        source: undefined,
        passage: undefined,
        questions: undefined,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      } as unknown as EnglishQuestionSetRow;
      applyData("englishQuestionSet", row, data);
      if (!row.examId || !row.title || !row.source || !row.passage)
        fail("englishQuestionSet NOT NULL 칸이 비었다");
      if (!examRows.some((e) => e.id === row.examId))
        fail("englishQuestionSet.examId 가 가리키는 시험이 없다(FK)");
      if (!Array.isArray(row.questions))
        fail("englishQuestionSet.questions 는 배열이어야 한다(CHECK)");
      if (row.revision < 1) fail("englishQuestionSet.revision < 1 (CHECK)");
      setRows.push(row);
      return structuredClone(row);
    },
    /** `where: { id, revision }` CAS — 둘 다 맞는 행이 없으면 P2025 */
    async update({
      where,
      data,
    }: {
      where: Where;
      data: Record<string, unknown>;
    }) {
      const keys = Object.keys(where).sort();
      if (
        keys.join(",") !== "id,revision" ||
        typeof where.id !== "string" ||
        typeof where.revision !== "number"
      )
        fail(
          "englishQuestionSet.update 의 where 는 { id, revision } 이어야 한다",
        );
      const row = setRows.find(
        (r) => r.id === where.id && r.revision === where.revision,
      );
      if (!row) throw notFound("englishQuestionSet");
      applyData("englishQuestionSet", row, data);
      if (!Array.isArray(row.questions))
        fail("englishQuestionSet.questions 는 배열이어야 한다(CHECK)");
      return structuredClone(row);
    },
    async delete({ where }: { where: Where }) {
      const id = onlyId("englishQuestionSet", where);
      const row = setRows.find((r) => r.id === id);
      if (!row) throw notFound("englishQuestionSet");
      setRows = setRows.filter((r) => r.id !== id);
      return structuredClone(row);
    },
  },
};

/** 원래 대역(계정 등) 위에 영어 표 셋을 얹는다 — 지점 판정은 원래 대역의 `user.findUnique` 로 */
export function composeEnglishDb(base: object): object {
  const baseUser = (
    base as {
      user?: {
        findUnique: (a: {
          where: { id: string };
          select?: Record<string, unknown>;
        }) => Promise<unknown>;
      };
    }
  ).user;
  userLookup = async (id) =>
    ((await baseUser?.findUnique({
      where: { id },
      select: { branchId: true },
    })) as { branchId?: string | null } | null) ?? null;
  return new Proxy(
    {},
    {
      get(_target, prop, receiver) {
        if (typeof prop === "string" && prop in englishModels)
          return englishModels[prop as keyof typeof englishModels];
        return Reflect.get(base, prop, receiver);
      },
    },
  );
}

// ── 시험용 씨앗 · 들여다보기 ───────────────────────────────────────

export function seedEnglishExam(
  input: Pick<EnglishExamRow, "userId" | "school" | "grade" | "title"> &
    Partial<EnglishExamRow>,
): EnglishExamRow {
  const now = new Date();
  const row: EnglishExamRow = {
    id: randomUUID(),
    examDate: null,
    types: [],
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  examRows.push(row);
  return row;
}

export function seedEnglishMaterial(
  input: Pick<EnglishMaterialRow, "examId" | "name"> &
    Partial<EnglishMaterialRow>,
): EnglishMaterialRow {
  const row: EnglishMaterialRow = {
    id: randomUUID(),
    mimeType: "text/plain",
    size: 0,
    bytes: null,
    content: null,
    createdAt: new Date(),
    ...input,
  };
  if (row.bytes === null && row.content === null)
    fail("seedEnglishMaterial: bytes 나 content 하나는 있어야 한다(CHECK)");
  materialRows.push(row);
  return row;
}

export function seedEnglishQuestionSet(
  input: Pick<EnglishQuestionSetRow, "examId" | "title" | "passage"> &
    Partial<EnglishQuestionSetRow>,
): EnglishQuestionSetRow {
  const now = new Date();
  const row: EnglishQuestionSetRow = {
    id: randomUUID(),
    status: "초안",
    source: "manual",
    questions: [],
    revision: 1,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  setRows.push(row);
  return row;
}

/** 시험이 **저장 결과**를 직접 본다 — 응답만 보면 «응답은 맞는데 안 썼다»를 못 가른다 */
export const englishRows = {
  exams: () => examRows.map((r) => structuredClone(r)),
  materials: () => materialRows.map((r) => ({ ...r })),
  sets: () => setRows.map((r) => structuredClone(r)),
};
