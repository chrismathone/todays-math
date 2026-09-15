/**
 * 학생 계정 · 오늘의 개념 표의 **인메모리 대역** — `student_account` · `student_login_miss` ·
 * `concept_lecture` · `concept_lecture_view` · `account_audit_log`(쓰기만).
 *
 * ## 왜 `prismaTestDouble.ts` 에 안 넣었나
 *
 * 나란히 도는 `concept-admin-ui` 워크트리가 같은 대역에 강의 표를 얹을 수 있다 — 같은 파일의 같은
 * 자리(행 배열 선언 · reset · snapshot · restore)를 둘이 고치면 병합이 부딪친다. 이 워크트리의
 * 코드는 `$transaction` 을 쓰지 않으므로(되돌리기 스냅샷이 필요 없다) 따로 둔다. 병합 뒤 한 대역으로
 * 합칠지는 리드가 정한다(보고서 «리드가 정할 것»).
 *
 * 쓰는 법: 시험 파일에서 `@/lib/db` 를 `composeLearnDb(prismaTestDouble)` 로 모킹한다 — 반·학생·차시·
 * 진도는 원래 대역이, 이 넷은 여기가 답한다.
 *
 * 원칙은 원래 대역과 같다: **모르는 모양은 조용히 넘기지 않고 던진다**(where·select·data).
 */
import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import type { ConceptLectureStatus } from "@/contracts/conceptLecture.contract";

export interface StudentAccountRow {
  id: string;
  studentId: string;
  loginId: string;
  passwordHash: string;
  mustChangePassword: boolean;
  issuedById: string | null;
  issuedAt: Date;
  passwordChangedAt: Date | null;
  lastLoginAt: Date | null;
  disabledAt: Date | null;
  failedCount: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentLoginMissRow {
  keyHash: string;
  failedCount: number;
  lockedUntil: Date | null;
  updatedAt: Date;
}

export interface ConceptLectureRow {
  id: string;
  unitId: string;
  title: string;
  videoUrl: string | null;
  seconds: number;
  disclosure: string | null;
  sourceJobId: string | null;
  sortOrder: number;
  status: ConceptLectureStatus;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConceptLectureViewRow {
  studentId: string;
  lectureId: string;
  maxSeconds: number;
  percent: number;
  completedAt: Date | null;
  updatedAt: Date;
}

let studentAccountRows: StudentAccountRow[] = [];
let studentLoginMissRows: StudentLoginMissRow[] = [];
let conceptLectureRows: ConceptLectureRow[] = [];
let conceptLectureViewRows: ConceptLectureViewRow[] = [];
let auditRows: Record<string, unknown>[] = [];

/** 학생 행을 읽는 길 — `composeLearnDb` 가 원래 대역의 `student.findUnique` 로 채운다 */
let studentLookup: (
  id: string,
) => Promise<Record<string, unknown> | null> = async () => null;

export function resetLearnTestDouble(): void {
  studentAccountRows = [];
  studentLoginMissRows = [];
  conceptLectureRows = [];
  conceptLectureViewRows = [];
  auditRows = [];
}

// ── 조회 도우미 — 모르는 모양은 던진다 ─────────────────────────────

type Where = Record<string, unknown>;

function matches(row: object, where: Where | undefined): boolean {
  if (!where) return true;
  const record = row as Record<string, unknown>;
  return Object.entries(where).every(([key, cond]) => {
    if (cond === undefined) return true;
    if (!(key in record))
      throw new Error(`learnTestDouble: 모르는 where 칸 '${key}'`);
    const value = record[key];
    if (cond === null || typeof cond !== "object" || cond instanceof Date)
      return cond instanceof Date && value instanceof Date
        ? cond.getTime() === value.getTime()
        : value === cond;
    const ops = cond as Record<string, unknown>;
    for (const op of Object.keys(ops))
      if (!["in", "lte", "lt", "gte", "gt"].includes(op))
        throw new Error(`learnTestDouble: 모르는 where 연산 '${key}.${op}'`);
    if (Array.isArray(ops.in)) return ops.in.includes(value);
    const t = value instanceof Date ? value.getTime() : null;
    const at = (d: unknown) => (d instanceof Date ? d.getTime() : NaN);
    if (ops.lte !== undefined) return t !== null && t <= at(ops.lte);
    if (ops.lt !== undefined) return t !== null && t < at(ops.lt);
    if (ops.gte !== undefined) return t !== null && t >= at(ops.gte);
    if (ops.gt !== undefined) return t !== null && t > at(ops.gt);
    return false;
  });
}

async function project<T extends object>(
  row: T,
  select: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  if (!select) return { ...(row as Record<string, unknown>) };
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(select)) {
    if (!spec) continue;
    if (spec === true) {
      if (!(key in row))
        throw new Error(`learnTestDouble: select 에 없는 칸 '${key}'`);
      out[key] = (row as Record<string, unknown>)[key];
      continue;
    }
    if (key === "student" && "studentId" in row) {
      const student = await studentLookup(
        (row as { studentId: string }).studentId,
      );
      out.student = student
        ? await project(
            student,
            (spec as { select?: Record<string, unknown> }).select,
          )
        : null;
      continue;
    }
    throw new Error(`learnTestDouble: 모르는 관계 select '${key}'`);
  }
  return out;
}

/** `{ increment: n }` 을 푼다. 모르는 연산 객체는 던진다 */
function applyData<T extends object>(row: T, data: Record<string, unknown>) {
  const record = row as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (!(key in record))
      throw new Error(`learnTestDouble: data 에 없는 칸 '${key}'`);
    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date)
    ) {
      const ops = value as Record<string, unknown>;
      if (typeof ops.increment === "number" && Object.keys(ops).length === 1) {
        record[key] = (record[key] as number) + ops.increment;
        continue;
      }
      throw new Error(`learnTestDouble: 모르는 data 연산 '${key}'`);
    }
    record[key] = value;
  }
  if ("updatedAt" in record) record.updatedAt = new Date();
}

function uniqueViolation(target: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed on the fields: (\`${target}\`)`,
    { code: "P2002", clientVersion: "6.19.3", meta: { target: [target] } },
  );
}

function notFound(model: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `No record was found for an update. (${model})`,
    { code: "P2025", clientVersion: "6.19.3" },
  );
}

// ── 모델 ───────────────────────────────────────────────────────

type AccountUnique =
  { id: string } | { loginId: string } | { studentId: string };

function findAccount(where: AccountUnique): StudentAccountRow | undefined {
  const keys = Object.keys(where);
  if (keys.length !== 1)
    throw new Error("learnTestDouble: studentAccount 유일 조회는 칸 하나");
  return studentAccountRows.find((r) => matches(r, where as Where));
}

export const learnTestDouble = {
  studentAccount: {
    async findUnique({
      where,
      select,
    }: {
      where: AccountUnique;
      select?: Record<string, unknown>;
    }) {
      const row = findAccount(where);
      return row ? project(row, select) : null;
    },
    async create({ data }: { data: Partial<StudentAccountRow> }) {
      if (studentAccountRows.some((r) => r.studentId === data.studentId))
        throw uniqueViolation("student_id");
      if (studentAccountRows.some((r) => r.loginId === data.loginId))
        throw uniqueViolation("login_id");
      const now = new Date();
      const row: StudentAccountRow = {
        id: randomUUID(),
        mustChangePassword: true,
        issuedById: null,
        issuedAt: now,
        passwordChangedAt: null,
        lastLoginAt: null,
        disabledAt: null,
        failedCount: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
        ...(data as Pick<
          StudentAccountRow,
          "studentId" | "loginId" | "passwordHash"
        >),
      };
      if (!row.studentId || !row.loginId || !row.passwordHash)
        throw new Error("learnTestDouble: studentAccount NOT NULL 칸이 비었다");
      studentAccountRows.push(row);
      return { ...row };
    },
    async update({
      where,
      data,
      select,
    }: {
      where: AccountUnique;
      data: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) {
      const row = findAccount(where);
      if (!row) throw notFound("studentAccount");
      applyData(row, data);
      return project(row, select);
    },
    async updateMany({
      where,
      data,
    }: {
      where: Where;
      data: Record<string, unknown>;
    }) {
      const hits = studentAccountRows.filter((r) => matches(r, where));
      for (const r of hits) applyData(r, data);
      return { count: hits.length };
    },
  },

  studentLoginMiss: {
    async findUnique({ where }: { where: { keyHash: string } }) {
      const row = studentLoginMissRows.find((r) => r.keyHash === where.keyHash);
      return row ? { ...row } : null;
    },
    async upsert({
      where,
      create,
      update,
      select,
    }: {
      where: { keyHash: string };
      create: Partial<StudentLoginMissRow> & { keyHash: string };
      update: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) {
      let row = studentLoginMissRows.find((r) => r.keyHash === where.keyHash);
      if (row) applyData(row, update);
      else {
        row = {
          failedCount: 0,
          lockedUntil: null,
          updatedAt: new Date(),
          ...create,
        };
        studentLoginMissRows.push(row);
      }
      return project(row, select);
    },
    async updateMany({
      where,
      data,
    }: {
      where: Where;
      data: Record<string, unknown>;
    }) {
      const hits = studentLoginMissRows.filter((r) => matches(r, where));
      for (const r of hits) applyData(r, data);
      return { count: hits.length };
    },
  },

  conceptLecture: {
    async findUnique({ where }: { where: { id: string } }) {
      const row = conceptLectureRows.find((r) => r.id === where.id);
      return row ? { ...row } : null;
    },
    async findMany({
      where,
      orderBy,
    }: {
      where?: Where;
      orderBy?: unknown;
    } = {}) {
      if (orderBy !== undefined)
        throw new Error(
          "learnTestDouble: conceptLecture 정렬은 부르는 쪽이 한다(차시 차례를 알아야 한다)",
        );
      return conceptLectureRows
        .filter((r) => matches(r, where))
        .map((r) => ({ ...r }));
    },
  },

  conceptLectureView: {
    async findMany({ where }: { where?: Where } = {}) {
      return conceptLectureViewRows
        .filter((r) => matches(r, where))
        .map((r) => ({ ...r }));
    },
    async findUnique({
      where,
    }: {
      where: { studentId_lectureId: { studentId: string; lectureId: string } };
    }) {
      const { studentId, lectureId } = where.studentId_lectureId;
      const row = conceptLectureViewRows.find(
        (r) => r.studentId === studentId && r.lectureId === lectureId,
      );
      return row ? { ...row } : null;
    },
    async upsert({
      where,
      create,
      update,
    }: {
      where: { studentId_lectureId: { studentId: string; lectureId: string } };
      create: Omit<ConceptLectureViewRow, "updatedAt">;
      update: Record<string, unknown>;
    }) {
      const { studentId, lectureId } = where.studentId_lectureId;
      let row = conceptLectureViewRows.find(
        (r) => r.studentId === studentId && r.lectureId === lectureId,
      );
      if (row) applyData(row, update);
      else {
        row = { ...create, updatedAt: new Date() };
        conceptLectureViewRows.push(row);
      }
      return { ...row };
    },
  },

  accountAuditLog: {
    async create({ data }: { data: Record<string, unknown> }) {
      auditRows.push(structuredClone(data));
      return data;
    },
  },
};

/** 원래 대역(반·학생·차시·진도) 위에 이 넷을 얹는다 */
export function composeLearnDb(base: object): object {
  const baseStudent = (
    base as {
      student?: {
        findUnique: (a: { where: { id: string } }) => Promise<unknown>;
      };
    }
  ).student;
  studentLookup = async (id) =>
    ((await baseStudent?.findUnique({ where: { id } })) as Record<
      string,
      unknown
    > | null) ?? null;
  return new Proxy(
    {},
    {
      get(_target, prop, receiver) {
        if (typeof prop === "string" && prop in learnTestDouble)
          return learnTestDouble[prop as keyof typeof learnTestDouble];
        return Reflect.get(base, prop, receiver);
      },
    },
  );
}

// ── 시험용 씨앗 · 들여다보기 ───────────────────────────────────────

export function seedStudentAccount(
  input: Pick<StudentAccountRow, "studentId" | "loginId" | "passwordHash"> &
    Partial<StudentAccountRow>,
): StudentAccountRow {
  const now = new Date();
  const row: StudentAccountRow = {
    id: randomUUID(),
    mustChangePassword: true,
    issuedById: null,
    issuedAt: now,
    passwordChangedAt: null,
    lastLoginAt: null,
    disabledAt: null,
    failedCount: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  studentAccountRows.push(row);
  return row;
}

export function seedConceptLecture(
  input: Pick<ConceptLectureRow, "unitId" | "title"> &
    Partial<ConceptLectureRow>,
): ConceptLectureRow {
  const now = new Date();
  const row: ConceptLectureRow = {
    id: randomUUID(),
    videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M",
    seconds: 139,
    disclosure: null,
    sourceJobId: null,
    sortOrder: 0,
    status: "published",
    reviewedAt: null,
    publishedAt: now,
    createdById: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  conceptLectureRows.push(row);
  return row;
}

/**
 * 학생을 지웠을 때 DB 가 하는 일(`student_account.student_id … ON DELETE CASCADE`)을 흉내 낸다 —
 * 원래 대역의 `student.delete` 는 이 대역을 모르므로 시험이 둘을 같이 부른다.
 */
export function cascadeDeleteStudent(studentId: string): void {
  studentAccountRows = studentAccountRows.filter(
    (r) => r.studentId !== studentId,
  );
  conceptLectureViewRows = conceptLectureViewRows.filter(
    (r) => r.studentId !== studentId,
  );
}

/** 계정 행을 직접 고친다 — «원장님이 계정을 껐다» 같은 바깥의 변화를 흉내 낼 때 */
export function patchStudentAccount(
  id: string,
  patch: Partial<StudentAccountRow>,
): void {
  const row = studentAccountRows.find((r) => r.id === id);
  if (!row) throw new Error(`learnTestDouble: 계정이 없다 ${id}`);
  Object.assign(row, patch);
}

export function seedConceptLectureView(row: ConceptLectureViewRow): void {
  conceptLectureViewRows.push({ ...row });
}

export const learnRows = {
  studentAccounts: () => studentAccountRows.map((r) => ({ ...r })),
  studentLoginMisses: () => studentLoginMissRows.map((r) => ({ ...r })),
  conceptLectureViews: () => conceptLectureViewRows.map((r) => ({ ...r })),
  audits: () => auditRows.map((r) => structuredClone(r)),
};
