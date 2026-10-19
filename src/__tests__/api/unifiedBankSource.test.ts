/**
 * 🔴 문제은행 «출처 고르기» H1 (D-161 · 05 S-08 [확정 — 2026-10-08]) — 목록 거르기와 고르기 창의 수.
 *
 * 교과서 문항은 `problem.source_material_id → source_material(kind, book_id) → source_book` 을 따라 거른다.
 * 책 · 자료 종류는 **여럿 고르기**고 둘 사이는 «그리고»다. 아무것도 안 고르면 교과서 **전부**다 —
 * 자료가 붙지 않은 교과서 문항까지(그 문항은 책 · 종류를 고르는 순간 빠진다).
 *
 * 이웃 `unifiedBankFilters.test.ts` 와 같은 대역(공유 인메모리 Prisma)을 쓰고, 그 대역이 모르는
 * 관계 투영(`unit` 글자 · `_count`)만 여기서 채운다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { loadUnifiedBank } from "@/lib/unifiedPreview";
import { selectUnifiedBankProblems } from "@/lib/unifiedBankSelection";
import { loadBankSourceCounts } from "@/lib/bankSourceCounts";
import { GET } from "@/app/api/dev/unified/problems/route";
import { GET as sourcesGET } from "@/app/api/dev/unified/problems/sources/route";
import { bankSourceCountsSchema } from "@/contracts/bankSource.contract";
import { SOURCE_MATERIAL_KINDS } from "@/contracts/sourceMaterial.contract";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  const findUnits = db.unit.findMany.bind(db.unit);
  const findProblems = db.problem.findMany.bind(db.problem);
  vi.spyOn(db.unit, "findMany").mockImplementation((async (
    args: Parameters<typeof db.unit.findMany>[0],
  ) => {
    const units = await findUnits(args);
    if (!args?.select?._count) return units as never;
    const count = args.select._count as {
      select: { problems: { where: object } };
    };
    return (await Promise.all(
      units.map(async (unit) => ({
        ...unit,
        _count: {
          problems: await db.problem.count({
            where: { AND: [count.select.problems.where, { unitId: unit.id }] },
          }),
        },
      })),
    )) as never;
  }) as typeof db.unit.findMany);
  vi.spyOn(db.problem, "findMany").mockImplementation((async (
    args: Parameters<typeof db.problem.findMany>[0],
  ) => {
    if (!args?.select?.unit) return (await findProblems(args)) as never;
    const rows = await findProblems({
      ...args,
      select: { ...args.select, unit: false, unitId: true },
    });
    return (await Promise.all(
      rows.map(async (row) => {
        const unit = await db.unit.findUnique({ where: { id: row.unitId } });
        return {
          ...row,
          unit: {
            grade: unit!.grade,
            chapter: unit!.chapter,
            section: unit!.section,
          },
        };
      }),
    )) as never;
  }) as typeof db.problem.findMany);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const marker = "교과서거르기확인";
async function plant(patch: Record<string, unknown> = {}) {
  // exam-wiring: 테스트 — 시험 대역(prismaTestDouble)에 픽스처를 심는다. 실 DB 가 아니다.
  //   `source` 는 시험마다 `patch` 로 정한다(교과서 · 엔진 · 기출 · 변형 · AI 생성).
  return await db.problem.create({
    data: {
      userId: USER_TEACHER_ID,
      unitId: MOCK_UNITS[0].id,
      source: "manual",
      content: marker,
      answer: "7",
      solution: "풀이 있음",
      difficulty: "기본",
      problemType: "계산",
      questionType: "단답형",
      reviewStatus: "approved",
      directUseAllowed: true,
      pool: "shared",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      ...patch,
    } as never,
  });
}
const query = (values: Record<string, string> = {}) =>
  new URLSearchParams({ q: marker, ...values });
const tierCounts = (counts: Partial<DifficultyRatio> = {}): DifficultyRatio =>
  Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, counts[tier] ?? 0]),
  ) as DifficultyRatio;

async function book(
  grade: string,
  publisher: string,
  author: string | null,
  kind = "school_textbook",
) {
  return db.sourceBook.create({
    data: {
      externalKey: `${kind}/${publisher}/${grade}/${author}`,
      kind,
      publisher,
      author,
      title: `${grade} 수학`,
      grade,
      curriculum: "2022",
    },
  });
}
let materialSeq = 0;
async function material(bookId: string, kind: string) {
  materialSeq += 1;
  return db.sourceMaterial.create({
    data: {
      externalKey: `tb-${materialSeq}`,
      bookId,
      kind,
      kindRaw: kind,
      title: `${kind} ${materialSeq}`,
    },
  });
}
const textbook = (sourceMaterialId?: string, patch = {}) =>
  plant({ source: "school_textbook", sourceMaterialId, ...patch });

describe("교과서 거르기 — 출처 갈래 · 책 · 자료 종류 · 학기", () => {
  async function shelf() {
    const kim = await book("중1", "천재교육", "김화경");
    const jang = await book("중1", "지학사", "장경윤");
    const ryu = await book("중2", "YBM", "류희찬");
    const kimUnit = await material(kim.id, "대단원 평가");
    const kimForm = await material(kim.id, "형성 평가");
    const jangUnit = await material(jang.id, "대단원 평가");
    const ryuDrill = await material(ryu.id, "기초 연산");
    return {
      books: { kim, jang, ryu },
      rows: {
        kimUnit: await textbook(kimUnit.id),
        kimForm: await textbook(kimForm.id),
        jangUnit: await textbook(jangUnit.id),
        ryuDrill: await textbook(ryuDrill.id),
        loose: await textbook(),
        engine: await plant({ source: "manual" }),
        exam: await plant({ source: "past_exam" }),
        transformed: await plant({ source: "transformed" }),
        ai: await plant({ source: "ai_generated" }),
      },
    };
  }
  const ids = async (values: Record<string, string>) =>
    (await loadUnifiedBank(query(values))).problems.map((p) => p.id).sort();
  const sorted = (...rows: { id: string }[]) => rows.map((r) => r.id).sort();

  it("빈 고르기는 교과서 전부다 — 자료가 붙지 않은 교과서 문항까지", async () => {
    const { rows } = await shelf();
    expect(await ids({ sourceGroup: "school_textbook" })).toEqual(
      sorted(
        rows.kimUnit,
        rows.kimForm,
        rows.jangUnit,
        rows.ryuDrill,
        rows.loose,
      ),
    );
  });

  it("책을 여럿 고르면 그 책들의 문항만 — 열쇠는 source_book.id", async () => {
    const { books, rows } = await shelf();
    expect(
      await ids({
        sourceGroup: "school_textbook",
        books: `${books.kim.id},${books.jang.id}`,
      }),
    ).toEqual(sorted(rows.kimUnit, rows.kimForm, rows.jangUnit));
  });

  it("자료 종류를 여럿 고르면 그 종류들의 문항만", async () => {
    const { rows } = await shelf();
    expect(
      await ids({
        sourceGroup: "school_textbook",
        materialKinds: "대단원 평가,기초 연산",
      }),
    ).toEqual(sorted(rows.kimUnit, rows.jangUnit, rows.ryuDrill));
  });

  it("책과 자료 종류는 «그리고»로 걸린다 · 총수와 쪽도 그 조건으로 센다", async () => {
    const { books, rows } = await shelf();
    const result = await loadUnifiedBank(
      query({
        sourceGroup: "school_textbook",
        books: `${books.kim.id},${books.ryu.id}`,
        materialKinds: "대단원 평가",
        page: "9",
      }),
    );
    expect(result.problems.map((p) => p.id)).toEqual([rows.kimUnit.id]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it("출처 갈래 — 엔진은 manual, 기출은 past_exam, 그 밖은 변형과 AI 생성", async () => {
    const { rows } = await shelf();
    expect(await ids({ sourceGroup: "engine" })).toEqual(sorted(rows.engine));
    expect(await ids({ sourceGroup: "past_exam" })).toEqual(sorted(rows.exam));
    expect(await ids({ sourceGroup: "other" })).toEqual(
      sorted(rows.transformed, rows.ai),
    );
  });

  it("옛 단일 출처(source=school_textbook)와 책을 같이 받는다 — 다른 호출 호환", async () => {
    const { books, rows } = await shelf();
    expect(
      await ids({ source: "school_textbook", books: books.ryu.id }),
    ).toEqual(sorted(rows.ryuDrill));
  });

  it("랜덤 추가도 목록과 같은 책 · 종류 조건으로 뽑는다", async () => {
    const { books, rows } = await shelf();
    const result = await selectUnifiedBankProblems({
      filters: query({
        sourceGroup: "school_textbook",
        books: books.kim.id,
        materialKinds: "형성 평가",
      }).toString(),
      counts: tierCounts({ 기본: 10 }),
    });
    expect(result.problems.map((p) => p.id)).toEqual([rows.kimForm.id]);
  });

  it("교과서가 아닌 출처에 책 · 종류를 붙이거나 책 열쇠가 uuid 가 아니면 400 — 조용히 0건이 되지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const someBook = "00000000-0000-4000-8000-00000000b00a";
    for (const suffix of [
      `books=${someBook}`,
      `sourceGroup=engine&materialKinds=${encodeURIComponent("형성 평가")}`,
      "sourceGroup=school_textbook&books=not-a-uuid",
      `sourceGroup=school_textbook&materialKinds=${encodeURIComponent("형성평가")}`,
      "sourceGroup=manual",
      "semester=3",
    ]) {
      const response = await GET(
        new Request(`http://localhost/api/dev/unified/problems?${suffix}`),
      );
      expect(response.status, suffix).toBe(400);
    }
  });

  it("학기는 차시의 unit.semester 로 걸고 모든 출처에 듣는다 · 학기 없는 차시는 «전체 학기»에서만", async () => {
    const [first, second, unknown] = [
      MOCK_UNITS[0],
      MOCK_UNITS[8],
      MOCK_UNITS[9],
    ];
    expect(first.semester).toBe(1); // 발췌 차시의 학기는 DB 와 같은 원천에서 온다
    await db.unit.update({ where: { id: second.id }, data: { semester: 2 } });
    await db.unit.update({
      where: { id: unknown.id },
      data: { semester: null },
    });
    const spring = await plant({ unitId: first.id, source: "manual" });
    const autumn = await plant({ unitId: second.id, source: "past_exam" });
    const elective = await textbook(undefined, { unitId: unknown.id });
    expect(await ids({ semester: "1" })).toEqual(sorted(spring));
    expect(await ids({ semester: "2" })).toEqual(sorted(autumn));
    expect(await ids({})).toEqual(sorted(spring, autumn, elective));
  });

  it("학기를 고르면 단원 목록(chapters)도 그 학기의 단원만 낸다", async () => {
    for (const unit of MOCK_UNITS.slice(8))
      await db.unit.update({ where: { id: unit.id }, data: { semester: 2 } });
    const all = await loadUnifiedBank(new URLSearchParams());
    const autumn = await loadUnifiedBank(
      new URLSearchParams({ semester: "2" }),
    );
    expect(all.chapters).toEqual([
      MOCK_UNITS[0].chapter,
      MOCK_UNITS[8].chapter,
    ]);
    expect(autumn.chapters).toEqual([MOCK_UNITS[8].chapter]);
    // 단원 범위 고르개가 받는 차시 목록은 학기 칸을 싣지 않는다(UnitEntity 그대로)
    expect(autumn.units?.[0]).not.toHaveProperty("semester");
  });
});

/**
 * 🔴 고르기 창의 수 — **다른 필터와 무관하게** 공용 풀(`pool = shared`) 전부로 센다(리드 결정 2026-10-08).
 * 책 행의 큰 수 = 실린 문항 · «출제 가능 n» = 출제 자격 · 자료 종류별 수는 책마다 싣는다(창이 요청 없이 센다).
 */
describe("고르기 창의 수 — loadBankSourceCounts · GET …/problems/sources", () => {
  async function seed() {
    const kim = await book("중1", "천재교육", "김화경");
    const yoon = await book("공통수학1", "비상교육", null);
    const ryu = await book("중2", "YBM", "류희찬");
    const workbook = await book("중1", "쎈", "홍길동", "workbook");
    const empty = await book("중2", "미래엔", "황선욱");
    const kimUnit = await material(kim.id, "대단원 평가");
    const kimForm = await material(kim.id, "형성 평가");
    await material(kim.id, "진단 평가"); // 문항이 없는 자료 — 편수에 안 든다
    const yoonDrill = await material(yoon.id, "기초 연산");
    const ryuUnit = await material(ryu.id, "대단원 평가");
    const workbookMaterial = await material(workbook.id, "기타");
    await material(empty.id, "형성 평가");
    await textbook(kimUnit.id);
    await textbook(kimUnit.id);
    // 실렸지만 잠김 — «출제 가능»에서만 빠진다
    await textbook(kimUnit.id, { directUseAllowed: false });
    // 비공개 풀 — 어디에도 안 든다
    await textbook(kimUnit.id, { pool: "private" });
    await textbook(kimForm.id, { reviewStatus: "pending" });
    await textbook(yoonDrill.id);
    await textbook(ryuUnit.id);
    // 자료 없는 교과서 문항 — 교과서 전체 수에만 든다
    await textbook(undefined);
    await plant({
      source: "transformed",
      sourceMaterialId: workbookMaterial.id,
    });
    return { kim, yoon, ryu, workbook, empty };
  }
  /** 과목 차례의 원천 — 발췌 차시(중2 뿐)로는 차례를 못 재니 교육과정 차례를 심는다. */
  function curriculumOrder() {
    vi.spyOn(db.unit, "findMany").mockImplementation((async () => [
      { grade: "중1", orderIndex: 300 },
      { grade: "중2", orderIndex: 400 },
      { grade: "공통수학1", orderIndex: 600 },
    ]) as never);
  }

  it("출처 갈래별 수는 공용 풀 전부(검수 대기 · 잠금 포함)로 센다 — 비공개 풀은 빠진다", async () => {
    curriculumOrder();
    const before = await loadBankSourceCounts();
    await seed();
    await plant({ source: "manual" });
    await plant({ source: "manual", pool: "private" });
    await plant({ source: "past_exam", reviewStatus: "pending" });
    await plant({ source: "ai_generated" });
    const after = await loadBankSourceCounts();
    const delta = Object.fromEntries(
      Object.entries(after.sources).map(([key, value]) => [
        key,
        value - before.sources[key as keyof typeof before.sources],
      ]),
    );
    // 교과서 7(공용 풀 — 잠김 · 검수 대기 · 자료 없음 포함, 비공개 1 은 빠짐) · 문제집 변형 1 · 엔진 1 · 기출 1 · AI 1
    expect(delta).toEqual({
      total: 11,
      engine: 1,
      school_textbook: 7,
      past_exam: 1,
      other: 2,
    });
    expect(bankSourceCountsSchema.safeParse(after).success).toBe(true);
  });

  it("책마다 실린 수 · 출제 가능 수 · 자료 편수 · 자료 종류별 수", async () => {
    curriculumOrder();
    const { kim } = await seed();
    const { textbook: counts } = await loadBankSourceCounts();
    expect(counts.books.find((b) => b.id === kim.id)).toEqual({
      id: kim.id,
      grade: "중1",
      publisher: "천재교육",
      author: "김화경",
      title: "중1 수학",
      count: 4,
      open: 2,
      materials: 2,
      kinds: { "대단원 평가": 3, "형성 평가": 1 },
    });
  });

  it("교과서 전체 수에는 자료 없는 문항까지 들고, 문제집 · 문항 없는 책은 목록에 없다", async () => {
    curriculumOrder();
    const { workbook, empty } = await seed();
    const { textbook: counts } = await loadBankSourceCounts();
    expect(counts.total).toBe(7);
    const listed = counts.books.map((b) => b.id);
    expect(listed).not.toContain(workbook.id);
    expect(listed).not.toContain(empty.id);
    expect(counts.books.reduce((sum, b) => sum + b.count, 0)).toBe(6);
  });

  it("과목은 책이 있는 것만 교육과정 차례로, 한 과목 안의 책은 문항이 많은 차례로, 자료 종류는 계약의 차례로", async () => {
    curriculumOrder();
    const { kim } = await seed();
    const more = await book("중1", "동아출판", "강옥기");
    for (let i = 0; i < 5; i++)
      await textbook((await material(more.id, "기초 연산")).id);
    const { textbook: counts } = await loadBankSourceCounts();
    expect(counts.grades).toEqual(["중1", "중2", "공통수학1"]);
    expect(
      counts.books.filter((b) => b.grade === "중1").map((b) => b.id),
    ).toEqual([more.id, kim.id]);
    expect(counts.kinds).toEqual([...SOURCE_MATERIAL_KINDS]);
    expect(counts.books.find((b) => b.grade === "공통수학1")?.author).toBe(
      null,
    );
  });

  it("라우트는 계약 꼴로 답하고, 운영 빌드에서는 dev 경로가 닫힌다", async () => {
    curriculumOrder();
    await seed();
    vi.stubEnv("NODE_ENV", "development");
    const request = new Request(
      "https://math.example/api/dev/unified/problems/sources",
    );
    const response = await sourcesGET(request);
    expect(response.status).toBe(200);
    expect(
      bankSourceCountsSchema.safeParse(await response.json()).success,
    ).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect((await sourcesGET(request)).status).toBe(404);
  });
});
