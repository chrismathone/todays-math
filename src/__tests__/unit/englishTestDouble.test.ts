// @vitest-environment node
/**
 * 영어 표 셋 대역(`src/mocks/englishTestDouble.ts`) — **모르는 모양은 던진다** · `ownedRowsWhere` 모양을 안다 ·
 * `update where {id, revision}` CAS · Cascade. 대역이 조용히 통과시키면 라우트 시험이 거짓 초록이 된다
 * (`prismaTestDouble` 머리말의 «지원하지 않는 where 연산자를 조용히 필드 이름으로 취급하면» 과 같은 결).
 */
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";

import {
  composeEnglishDb,
  englishModels,
  englishRows,
  resetEnglishTestDouble,
  seedEnglishExam,
  seedEnglishMaterial,
  seedEnglishQuestionSet,
} from "@/mocks/englishTestDouble";

const OWNER_A = "10000000-0000-4000-8000-0000000000e1";
const OWNER_B = "10000000-0000-4000-8000-0000000000e2";
const BRANCH_A = "30000000-0000-4000-8000-00000000000a";

/** 계정 대역 흉내 — 소유자 A 는 지점 A, B 는 지점 없음 */
const fakeBase = {
  user: {
    async findUnique({ where }: { where: { id: string } }) {
      if (where.id === OWNER_A) return { branchId: BRANCH_A };
      if (where.id === OWNER_B) return { branchId: null };
      return null;
    },
  },
  student: {
    async findUnique() {
      return { id: "s" };
    },
  },
};

type Db = typeof englishModels & {
  user: typeof fakeBase.user;
  student: unknown;
};

beforeEach(() => resetEnglishTestDouble());

describe("composeEnglishDb", () => {
  it("영어 셋은 여기가, 나머지는 원래 대역이 답한다", async () => {
    const db = composeEnglishDb(fakeBase) as Db;
    expect(db.englishExam).toBe(englishModels.englishExam);
    expect(await db.user.findUnique({ where: { id: OWNER_A } })).toEqual({
      branchId: BRANCH_A,
    });
    expect(db.student).toBe(fakeBase.student);
  });

  it("compose 없이 where.user 를 물으면 던진다(조용히 빈 목록을 내지 않는다)", async () => {
    // 이 파일의 다른 시험이 compose 를 먼저 불렀을 수 있으니 여기서 기본 상태를 흉내 낸다
    composeEnglishDb({});
    seedEnglishExam({ userId: OWNER_A, school: "s", grade: "중1", title: "t" });
    await expect(
      englishModels.englishExam.findMany({
        where: { user: { branchId: BRANCH_A } },
      }),
    ).resolves.toEqual([]);
    // 원래 대역에 user 가 없으면 소유자를 못 찾는다 → 목록 밖. compose 자체를 안 한 상태는 아래에서 잰다
  });
});

describe("englishExam — ownedRowsWhere 모양", () => {
  it("{ userId } · { user: { branchId } } · {} 을 안다", async () => {
    composeEnglishDb(fakeBase);
    const a = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "A",
    });
    const b = seedEnglishExam({
      userId: OWNER_B,
      school: "s",
      grade: "중1",
      title: "B",
    });
    const ids = async (where?: Record<string, unknown>) =>
      (await englishModels.englishExam.findMany({ where })).map((r) => r.id);
    expect(await ids({ userId: OWNER_A })).toEqual([a.id]);
    expect(await ids({ user: { branchId: BRANCH_A } })).toEqual([a.id]);
    expect(await ids({})).toEqual([a.id, b.id]);
    expect(await ids({ id: { in: [b.id] } })).toEqual([b.id]);
  });

  it.each([
    ["모르는 where 칸", { where: { school: "s" } }],
    ["user 에 branchId 밖 칸", { where: { user: { id: OWNER_A } } }],
    ["모르는 정렬 칸", { orderBy: { title: "asc" } }],
    ["정렬 방향", { orderBy: { createdAt: "up" } }],
    ["include 에 _count 밖", { include: { materials: true } }],
    ["select 에 없는 칸", { select: { nope: true } }],
  ])("%s → 던진다", async (_label, args) => {
    composeEnglishDb(fakeBase);
    seedEnglishExam({ userId: OWNER_A, school: "s", grade: "중1", title: "A" });
    await expect(
      englishModels.englishExam.findMany(args as never),
    ).rejects.toThrow(/englishTestDouble/);
  });

  it("_count 는 자료·세트 수를 센다 · 정렬은 createdAt 으로", async () => {
    const older = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "old",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const newer = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "new",
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    seedEnglishMaterial({ examId: older.id, name: "m", content: "c" });
    seedEnglishQuestionSet({ examId: older.id, title: "q", passage: "p" });
    seedEnglishQuestionSet({ examId: older.id, title: "q2", passage: "p" });
    const rows = await englishModels.englishExam.findMany({
      where: { userId: OWNER_A },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { materials: true, sets: true } } },
    });
    expect(rows.map((r) => r.id)).toEqual([newer.id, older.id]);
    expect(rows[1]?._count).toEqual({ materials: 1, sets: 2 });
    expect(rows[0]?._count).toEqual({ materials: 0, sets: 0 });
  });

  it("delete 는 딸린 자료·세트를 같이 지운다(FK Cascade 흉내) · 없는 id 는 P2025", async () => {
    const exam = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "A",
    });
    const other = seedEnglishExam({
      userId: OWNER_B,
      school: "s",
      grade: "중1",
      title: "B",
    });
    seedEnglishMaterial({ examId: exam.id, name: "m", content: "c" });
    seedEnglishQuestionSet({ examId: exam.id, title: "q", passage: "p" });
    seedEnglishMaterial({ examId: other.id, name: "m2", content: "c" });
    await englishModels.englishExam.delete({ where: { id: exam.id } });
    expect(englishRows.exams().map((r) => r.id)).toEqual([other.id]);
    expect(englishRows.materials().map((r) => r.examId)).toEqual([other.id]);
    expect(englishRows.sets()).toEqual([]);
    await expect(
      englishModels.englishExam.delete({ where: { id: exam.id } }),
    ).rejects.toMatchObject({ code: "P2025" });
  });

  it("create 는 NOT NULL · types 배열을 지킨다 · 모르는 data 연산은 던진다", async () => {
    await expect(
      englishModels.englishExam.create({
        data: { userId: OWNER_A, school: "s" },
      }),
    ).rejects.toThrow(/NOT NULL/);
    await expect(
      englishModels.englishExam.create({
        data: {
          userId: OWNER_A,
          school: "s",
          grade: "중1",
          title: "t",
          types: "주제",
        },
      }),
    ).rejects.toThrow(/배열/);
    const exam = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "t",
    });
    await expect(
      englishModels.englishExam.update({
        where: { id: exam.id },
        data: { title: { set: "x" } },
      }),
    ).rejects.toThrow(/모르는 data 연산/);
  });
});

describe("englishMaterial", () => {
  it("bytes: null · bytes: { not: null } 로 파일 유무를 가른다 · 다른 연산은 던진다 · exam 으로 부모 범위를 탄다", async () => {
    composeEnglishDb(fakeBase);
    const exam = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "A",
    });
    const file = seedEnglishMaterial({
      examId: exam.id,
      name: "f.pdf",
      bytes: new Uint8Array([1]),
    });
    const text = seedEnglishMaterial({
      examId: exam.id,
      name: "t",
      content: "c",
    });
    const ids = async (where: Record<string, unknown>) =>
      (await englishModels.englishMaterial.findMany({ where })).map(
        (r) => r.id,
      );
    expect(await ids({ examId: exam.id, bytes: { not: null } })).toEqual([
      file.id,
    ]);
    expect(await ids({ examId: exam.id, bytes: null })).toEqual([text.id]);
    expect(await ids({ exam: { user: { branchId: BRANCH_A } } })).toEqual([
      file.id,
      text.id,
    ]);
    expect(await ids({ exam: { userId: OWNER_B } })).toEqual([]);
    await expect(ids({ bytes: { equals: null } })).rejects.toThrow(/bytes/);
    await expect(ids({ name: "t" })).rejects.toThrow(/모르는 where/);
  });

  it("select 는 true 인 칸만 — bytes 를 안 고르면 안 나온다", async () => {
    const exam = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "A",
    });
    seedEnglishMaterial({
      examId: exam.id,
      name: "f.pdf",
      bytes: new Uint8Array([1]),
    });
    const [row] = await englishModels.englishMaterial.findMany({
      select: { id: true, name: true },
    });
    expect(Object.keys(row!).sort()).toEqual(["id", "name"]);
  });

  it("create 는 SQL CHECK(본문 하나는 있어야 · size ≥ 0) 와 FK 를 흉내 낸다", async () => {
    const exam = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "A",
    });
    await expect(
      englishModels.englishMaterial.create({
        data: { examId: exam.id, name: "n", mimeType: "text/plain", size: 0 },
      }),
    ).rejects.toThrow(/CHECK/);
    await expect(
      englishModels.englishMaterial.create({
        data: {
          examId: "00000000-0000-4000-8000-000000000000",
          name: "n",
          mimeType: "text/plain",
          size: 1,
          content: "c",
        },
      }),
    ).rejects.toThrow(/FK/);
    await expect(
      englishModels.englishMaterial.create({
        data: {
          examId: exam.id,
          name: "n",
          mimeType: "text/plain",
          size: -1,
          content: "c",
        },
      }),
    ).rejects.toThrow(/size/);
  });
});

describe("englishQuestionSet — revision CAS", () => {
  it("where 는 { id, revision } 이어야 한다 · 안 맞으면 P2025 · 맞으면 increment", async () => {
    const exam = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "A",
    });
    const set = seedEnglishQuestionSet({
      examId: exam.id,
      title: "q",
      passage: "p",
    });
    await expect(
      englishModels.englishQuestionSet.update({
        where: { id: set.id },
        data: { title: "x" },
      }),
    ).rejects.toThrow(/id, revision/);
    const stale = englishModels.englishQuestionSet.update({
      where: { id: set.id, revision: 7 },
      data: { title: "x" },
    });
    await expect(stale).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    await expect(stale).rejects.toMatchObject({ code: "P2025" });
    const updated = await englishModels.englishQuestionSet.update({
      where: { id: set.id, revision: 1 },
      data: { title: "x", revision: { increment: 1 } },
    });
    expect(updated).toMatchObject({ title: "x", revision: 2 });
    expect(englishRows.sets()[0]?.revision).toBe(2);
  });

  it("status 로 거르고 exam 으로 부모 범위를 탄다 · questions 는 배열이어야 한다", async () => {
    composeEnglishDb(fakeBase);
    const exam = seedEnglishExam({
      userId: OWNER_A,
      school: "s",
      grade: "중1",
      title: "A",
    });
    const done = seedEnglishQuestionSet({
      examId: exam.id,
      title: "d",
      passage: "p",
      status: "검토 완료",
    });
    seedEnglishQuestionSet({ examId: exam.id, title: "n", passage: "p" });
    const rows = await englishModels.englishQuestionSet.findMany({
      where: { examId: { in: [exam.id] }, status: "검토 완료" },
      select: { examId: true },
    });
    expect(rows).toEqual([{ examId: exam.id }]);
    expect(
      (
        await englishModels.englishQuestionSet.findMany({
          where: { exam: { userId: OWNER_A } },
        })
      ).map((r) => r.id),
    ).toContain(done.id);
    await expect(
      englishModels.englishQuestionSet.create({
        data: {
          examId: exam.id,
          title: "t",
          source: "manual",
          passage: "p",
          questions: "x",
        },
      }),
    ).rejects.toThrow(/배열/);
  });
});
