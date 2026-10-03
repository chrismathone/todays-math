// @vitest-environment node
/**
 * 새 문항으로 등록 · 목차의 개념 강의 참조 · 백지 활동의 표시 정보.
 *
 * 셋 다 «서버가 믿지 않는 것»을 잰다:
 *   · 등록은 검수 대기 문항만 만든다 — 연결하지도 승인하지도 않는다. 검수에서 고쳐진 문항과는 잇지 않는다
 *   · 목차는 게시된 강의 · 판본에 있는 개념 · 같은 단원만 가리킨다
 *   · 내 학생의 활동이 가리키는 책이라도, 지금 읽을 수 없는 책의 이름은 내지 않는다
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  textbookConceptEvidenceReferenceSchema,
  textbookConceptLectureListSchema,
  textbookRegisterItemResultSchema,
} from "@/contracts/textbookServer.contract";
import type { TextbookOutlineUnit } from "@/contracts/textbook.contract";
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import { contentHash, sha256, snapshotHash } from "@/lib/textbook/hash.server";
import { preflightEdition } from "@/lib/textbook/publish/preflight";
import { completeUpload, putUploadChunk } from "@/lib/textbook/server/blobs";
import { createBook } from "@/lib/textbook/server/books";
import { conceptEvidenceReferences } from "@/lib/textbook/server/conceptRows";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import {
  type VerifiedArchive,
  importPackage,
} from "@/lib/textbook/server/imports";
import { getItemDetail, linkItem } from "@/lib/textbook/server/itemLink";
import { registerItemProblem } from "@/lib/textbook/server/itemRegister";
import { captureItems } from "@/lib/textbook/server/items";
import { referableLectures } from "@/lib/textbook/server/lectureRefs";
import { saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";

import {
  type Db,
  type World,
  openTextbookDb,
  seedWorld,
  sqlNow,
} from "../helpers/textbookPglite";
import {
  fakePublishDeps,
  insertBankProblem,
  insertBranch,
  insertTeacher,
  pgliteTextbookDb,
  requestKey,
  sampleConfig,
  tinyPng,
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let world: World;
let branchId: string;
let owner: TextbookActor;
let colleague: TextbookActor;
let stranger: TextbookActor;

/** 계약(`textbookConceptBodySchema`) 모양의 개념 본문 */
const CONCEPT_BODY = {
  goal: "뜻을 말한다",
  prerequisites: [],
  definition:
    "순환소수는 소수점 아래의 어떤 자리부터 같은 숫자 배열이 되풀이되는 무한소수다.",
  conditions: null,
  examples: [],
  counterexamples: [],
  misconceptions: [],
  explainPrompt: null,
};

const figures = new Map<string, Buffer>();
const loadFigure = async (path: string) => figures.get(path) ?? null;

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  branchId = await insertBranch(pg);
  owner = await insertTeacher(pg, { branchId, name: "주인" });
  colleague = await insertTeacher(pg, { branchId, name: "동료" });
  stranger = await insertTeacher(pg, { name: "남" });
}, 120_000);
afterAll(async () => {
  await pg.close();
});

async function refusal(run: Promise<unknown>): Promise<TextbookError> {
  try {
    await run;
  } catch (error) {
    if (error instanceof TextbookError) return error;
    throw error;
  }
  throw new Error("거절돼야 하는 요청이 통과했다");
}

const unitOutline = (
  refs: Array<{ lectureId: string; conceptKey: string }> = [],
) => [
  {
    unitKey: "u1",
    title: "단원",
    sourceUnitIds: [],
    prerequisites: [],
    goals: [],
    conceptLectureRefs: refs,
    sections: [] as TextbookOutlineUnit["sections"],
  },
];

/** 구획 하나가 있는 빈 초안 */
async function emptyDraft(actor: TextbookActor) {
  const { book } = await createBook(
    db,
    actor,
    requestKey(actor, "book-create"),
    { config: sampleConfig() },
  );
  const editionId = book.draftEditionId!;
  const detail = await getEditionDetail(db, actor, editionId);
  await saveStructure(
    db,
    actor,
    editionId,
    requestKey(actor, "structure-save"),
    {
      expectedRevision: detail.structureRevision,
      config: detail.config,
      outline: unitOutline(),
    },
  );
  const sectionId = randomUUID();
  const saved = await saveSection(
    db,
    actor,
    editionId,
    sectionId,
    requestKey(actor, "section-save"),
    {
      expectedRevision: 0,
      unitKey: "u1",
      section: {
        sectionKey: "s",
        title: "구획",
        templateKey: "basic",
        startPolicy: "even-left",
        blocks: [],
      },
    },
  );
  return {
    bookId: book.id,
    editionId,
    sectionId,
    revision: saved.aggregateRevision,
  };
}

/**
 * 남(`from`)의 원고를 패키지로 받아 `to` 가 복사해 온 초안 — 가져오는 순간 은행 문항이 달라져 있어
 * 연결을 확인하지 못한 배치가 하나 있다.
 */
async function importedDraft(
  from: TextbookActor,
  to: TextbookActor,
  options: {
    figure?: boolean;
    inlineSvg?: string;
    tamper?: (exchange: TextbookExchange) => void;
  } = {},
) {
  const draft = await emptyDraft(from);
  const path = `/figures/register/${randomUUID()}.png`;
  if (options.figure) figures.set(path, tinyPng(40, 30, path));
  const problem = await insertBankProblem(pg, world.unitId, {
    content: "가져온 원고의 발문",
    answer: "42",
    solution: "가져온 풀이",
    ...(options.figure ? { figureUrls: [path], figureDims: [40, 30] } : {}),
    ...(options.inlineSvg ? { figureSvg: options.inlineSvg } : {}),
  });
  await captureItems(
    db,
    from,
    draft.editionId,
    requestKey(from, "capture"),
    {
      expectedRevision: draft.revision,
      sectionId: draft.sectionId,
      source: { kind: "problems", problemIds: [problem.id] },
    },
    loadFigure,
  );
  const exchange = await assembleExchange(db, draft.editionId, {
    exportedAt: "2026-10-03T00:00:00.000Z",
  });
  const files = new Map<string, Uint8Array>();
  for (const asset of exchange.assets) {
    const blob = await pg.query<{ bytes: Uint8Array }>(
      `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
      [asset.sha256],
    );
    files.set(asset.packagePath, blob.rows[0]!.bytes);
  }
  options.tamper?.(exchange);
  const archive: VerifiedArchive = { exchange, files, validation: {} };
  const zip = Buffer.from(`PK-${randomUUID()}`);
  await putUploadChunk(db, to, sha256(zip), 0, zip);
  const upload = await completeUpload(db, to, sha256(zip), {
    byteLength: zip.length,
  });
  await pg.query(
    `UPDATE "problem" SET "content" = '원래 은행 문항은 그사이 바뀌었다', "updated_at" = $2 WHERE "id" = $1`,
    [problem.id, sqlNow()],
  );
  const result = await importPackage(
    db,
    to,
    requestKey(to, "import"),
    { mode: "copy", uploadId: upload.uploadId, expectedSha256: sha256(zip) },
    async () => archive,
    loadFigure,
  );
  const [item] = (
    await pg.query<{ id: string }>(
      `SELECT "id" FROM "textbook_item" WHERE "edition_id" = $1`,
      [result.editionId],
    )
  ).rows;
  const detail = await getEditionDetail(db, to, result.editionId!);
  return {
    editionId: result.editionId!,
    itemId: item!.id,
    revision: detail.edition.revision,
    original: problem,
  };
}

const bankRow = async (problemId: string) =>
  (
    await pg.query<{
      user_id: string;
      review_status: string;
      source: string;
      content: string;
      answer: string;
      solution: string | null;
      question_type: string | null;
      difficulty: string;
      problem_type: string;
      pool: string;
      unit_id: string;
    }>(
      `SELECT "user_id", "review_status"::text, "source"::text, "content", "answer", "solution", "question_type",
              "difficulty"::text, "problem_type", "pool"::text, "unit_id" FROM "problem" WHERE "id" = $1`,
      [problemId],
    )
  ).rows[0]!;

describe("새 문항으로 등록", () => {
  const body = (revision: number) => ({
    expectedRevision: revision,
    unitId: world.unitId,
    difficulty: "기본",
    problemType: "계산",
  });

  it("검수 대기 문항이 생기고 배치는 연결되지 않은 그대로다 — 본문 · 정답 · 해설은 확정본의 글자 그대로", async () => {
    const made = await importedDraft(owner, colleague);
    const result = await registerItemProblem(
      db,
      colleague,
      made.editionId,
      made.itemId,
      requestKey(colleague, "register"),
      body(made.revision),
    );
    expect(() => textbookRegisterItemResultSchema.parse(result)).not.toThrow();
    expect(result.problem.reviewStatus).toBe("pending");
    expect(result.item.linkStatus).toBe("needs-review");
    expect(result.aggregateRevision).toBeGreaterThan(made.revision);
    expect(await bankRow(result.problem.problemId)).toEqual({
      user_id: colleague.id,
      review_status: "pending",
      source: "manual",
      content: "가져온 원고의 발문",
      answer: "42",
      solution: "가져온 풀이",
      question_type: null,
      difficulty: "기본",
      problem_type: "계산",
      pool: "shared",
      unit_id: world.unitId,
    });
    // 후보에 붙는다 — 원래 주장하던 은행 문항 뒤에
    const detail = await getItemDetail(
      db,
      colleague,
      made.editionId,
      made.itemId,
    );
    expect(
      detail.linkCandidates.map((candidate) => candidate.problemId),
    ).toEqual([made.original.id, result.problem.problemId]);
    expect(detail.item.linkStatus).toBe("needs-review");
  });

  it("검수 전에는 잇지 못한다. 승인되고 내용이 그대로면 이어진다", async () => {
    const made = await importedDraft(owner, colleague);
    const registered = await registerItemProblem(
      db,
      colleague,
      made.editionId,
      made.itemId,
      requestKey(colleague, "register"),
      body(made.revision),
    );
    const link = (revision: number) =>
      linkItem(
        db,
        colleague,
        made.editionId,
        made.itemId,
        requestKey(colleague, "link"),
        { expectedRevision: revision, problemId: registered.problem.problemId },
        loadFigure,
      );
    const early = await refusal(link(registered.aggregateRevision));
    expect(early.message).toBe("검수를 통과하지 않은 문항입니다.");
    await pg.query(
      `UPDATE "problem" SET "review_status" = 'approved' WHERE "id" = $1`,
      [registered.problem.problemId],
    );
    const linked = await link(registered.aggregateRevision);
    expect(linked.item.linkStatus).toBe("linked");
    const snapshot = await pg.query<{
      problem_id: string;
      source_system: string;
    }>(
      `SELECT "problem_id", "source_system" FROM "textbook_problem_snapshot" WHERE "id" = $1`,
      [linked.item.snapshotId],
    );
    expect(snapshot.rows).toEqual([
      {
        problem_id: registered.problem.problemId,
        source_system: "todays-math",
      },
    ]);
  });

  it("검수에서 내용이 고쳐졌으면 승인돼도 잇지 않는다", async () => {
    const made = await importedDraft(owner, colleague);
    const registered = await registerItemProblem(
      db,
      colleague,
      made.editionId,
      made.itemId,
      requestKey(colleague, "register"),
      body(made.revision),
    );
    await pg.query(
      `UPDATE "problem" SET "review_status" = 'approved', "answer" = '43', "updated_at" = $2 WHERE "id" = $1`,
      [registered.problem.problemId, sqlNow()],
    );
    const error = await refusal(
      linkItem(
        db,
        colleague,
        made.editionId,
        made.itemId,
        requestKey(colleague, "link"),
        {
          expectedRevision: registered.aggregateRevision,
          problemId: registered.problem.problemId,
        },
        loadFigure,
      ),
    );
    expect(error.status).toBe(409);
    expect(error.message).toContain("내용이 이 문항과 다릅니다");
  });

  it("같은 요청이 다시 오면 같은 문항을 돌려주고, 새 요청으로 또 등록하지는 못한다", async () => {
    const made = await importedDraft(owner, colleague);
    const key = requestKey(colleague, "register");
    const first = await registerItemProblem(
      db,
      colleague,
      made.editionId,
      made.itemId,
      key,
      body(made.revision),
    );
    const again = await registerItemProblem(
      db,
      colleague,
      made.editionId,
      made.itemId,
      key,
      body(made.revision),
    );
    expect(again).toMatchObject({
      replayed: true,
      problem: { problemId: first.problem.problemId },
    });
    const error = await refusal(
      registerItemProblem(
        db,
        colleague,
        made.editionId,
        made.itemId,
        requestKey(colleague, "register"),
        body(first.aggregateRevision),
      ),
    );
    expect(error.status).toBe(409);
    const made_ = await pg.query(
      `SELECT 1 FROM "problem" WHERE "user_id" = $1 AND "content" = '가져온 원고의 발문' AND "id" = ANY($2::uuid[])`,
      [colleague.id, [first.problem.problemId]],
    );
    expect(made_.rows).toHaveLength(1);
  });

  it("그림이 있는 문항은 등록하지 않는다 — 은행에 그림 없는 문항이 생기지 않는다", async () => {
    const made = await importedDraft(owner, colleague, { figure: true });
    const before = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "problem"`,
    );
    const error = await refusal(
      registerItemProblem(
        db,
        colleague,
        made.editionId,
        made.itemId,
        requestKey(colleague, "register"),
        body(made.revision),
      ),
    );
    expect(error.status).toBe(422);
    expect(error.message).toContain("그림이 있는 문항");
    expect(
      (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM "problem"`,
        )
      ).rows,
    ).toEqual(before.rows);
  });

  const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>`;

  it("그림이 인라인 SVG 하나면 그 글자 그대로 은행에 적는다 — 승인 뒤 이어진다", async () => {
    const made = await importedDraft(owner, colleague, { inlineSvg: SVG });
    const registered = await registerItemProblem(
      db,
      colleague,
      made.editionId,
      made.itemId,
      requestKey(colleague, "register"),
      body(made.revision),
    );
    const stored = await pg.query<{
      figure_svg: string;
      figure_urls: string[];
    }>(`SELECT "figure_svg", "figure_urls" FROM "problem" WHERE "id" = $1`, [
      registered.problem.problemId,
    ]);
    expect(stored.rows).toEqual([{ figure_svg: SVG, figure_urls: [] }]);
    await pg.query(
      `UPDATE "problem" SET "review_status" = 'approved' WHERE "id" = $1`,
      [registered.problem.problemId],
    );
    const linked = await linkItem(
      db,
      colleague,
      made.editionId,
      made.itemId,
      requestKey(colleague, "link"),
      {
        expectedRevision: registered.aggregateRevision,
        problemId: registered.problem.problemId,
      },
      loadFigure,
    );
    expect(linked.item.linkStatus).toBe("linked");
  });

  it("다시 캡처한 내용이 다르게 나오는 문항은 등록하지 않는다 — 은행에 줄이 남지 않는다", async () => {
    // 옛 패키지처럼 인라인 SVG 의 짝이 «모른다»로 적혀 있다 — 지금 은행에서 다시 캡처하면 «발문의 그림»으로 나온다
    const made = await importedDraft(owner, colleague, {
      inlineSvg: SVG,
      tamper: (exchange) => {
        const snapshot = exchange.snapshots[0]!;
        snapshot.payload.figures[0]!.choiceIndex = null;
        snapshot.contentHash = contentHash(snapshot.payload);
        snapshot.snapshotHash = snapshotHash(snapshot);
      },
    });
    const before = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "problem"`,
    );
    const error = await refusal(
      registerItemProblem(
        db,
        colleague,
        made.editionId,
        made.itemId,
        requestKey(colleague, "register"),
        body(made.revision),
      ),
    );
    expect(error.status).toBe(422);
    expect(error.message).toContain("다시 캡처한 내용이 이 문항과 달라");
    expect(
      (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM "problem"`,
        )
      ).rows,
    ).toEqual(before.rows);
    expect(
      (await getItemDetail(db, colleague, made.editionId, made.itemId))
        .linkCandidates,
    ).toHaveLength(1);
  });

  it("이미 연결된 배치 · 남의 판본 · 낡은 revision · 없는 단원은 거절한다", async () => {
    // 이미 연결된 배치
    const linkedDraft = await emptyDraft(owner);
    const problem = await insertBankProblem(pg, world.unitId);
    const captured = await captureItems(
      db,
      owner,
      linkedDraft.editionId,
      requestKey(owner, "capture"),
      {
        expectedRevision: linkedDraft.revision,
        sectionId: linkedDraft.sectionId,
        source: { kind: "problems", problemIds: [problem.id] },
      },
      loadFigure,
    );
    expect(
      (
        await refusal(
          registerItemProblem(
            db,
            owner,
            linkedDraft.editionId,
            captured.items[0]!.itemId,
            requestKey(owner, "register"),
            body(captured.aggregateRevision),
          ),
        )
      ).status,
    ).toBe(409);

    const made = await importedDraft(owner, colleague);
    const attempt = (actor: TextbookActor, input: ReturnType<typeof body>) =>
      refusal(
        registerItemProblem(
          db,
          actor,
          made.editionId,
          made.itemId,
          requestKey(actor, "register"),
          input,
        ),
      );
    expect((await attempt(owner, body(made.revision))).status).toBe(404);
    expect(await attempt(colleague, body(made.revision - 1))).toMatchObject({
      status: 409,
      code: "REVISION_MISMATCH",
    });
    expect(
      (
        await attempt(colleague, {
          ...body(made.revision),
          unitId: randomUUID(),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await pg.query(
          `SELECT 1 FROM "problem" WHERE "user_id" = $1 AND "source" = 'manual' AND "created_at" > now() - interval '1 second' AND "content" = '없는 발문'`,
          [colleague.id],
        )
      ).rows,
    ).toEqual([]);
  });
});

describe("목차의 개념 강의 참조", () => {
  async function lecture(
    status: "draft" | "published" | "archived",
    unitId = world.unitId,
  ) {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO "concept_lecture" ("id", "unit_id", "title", "video_url", "seconds", "status", "published_at", "updated_at")
       VALUES ($1, $2, $3, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 120, $4::"concept_lecture_status", $5, $6)`,
      [
        id,
        unitId,
        `강의 ${status}`,
        status,
        status === "draft" ? null : sqlNow(),
        sqlNow(),
      ],
    );
    return id;
  }
  async function concept(editionId: string, unitId: string | null = null) {
    const conceptKey = `c-${randomUUID().slice(0, 8)}`;
    await pg.query(
      `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "unit_id", "title", "kind", "body", "blank_items", "links", "mapping_version", "updated_at")
       VALUES ($1, $2, 'u1', $3, '개념', '정의', $4::jsonb, '[]'::jsonb, '[]'::jsonb, 'm1', $5)`,
      [editionId, conceptKey, unitId, JSON.stringify(CONCEPT_BODY), sqlNow()],
    );
    return conceptKey;
  }
  async function saveRefs(
    actor: TextbookActor,
    editionId: string,
    refs: Array<{ lectureId: string; conceptKey: string }>,
  ) {
    const detail = await getEditionDetail(db, actor, editionId);
    const sections = detail.outline.flatMap((unit) => unit.sections);
    return saveStructure(
      db,
      actor,
      editionId,
      requestKey(actor, "structure-save"),
      {
        expectedRevision: detail.structureRevision,
        config: detail.config,
        outline: [{ ...unitOutline(refs)[0]!, sections }],
      },
    );
  }

  it("게시된 강의 · 판본에 있는 개념이면 저장된다", async () => {
    const draft = await emptyDraft(owner);
    const ref = {
      lectureId: await lecture("published"),
      conceptKey: await concept(draft.editionId, world.unitId),
    };
    await saveRefs(owner, draft.editionId, [ref]);
    const exchange = await assembleExchange(db, draft.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(exchange.units[0]!.conceptLectureRefs).toEqual([ref]);
  });

  it("없는 강의 · 초안 강의 · 내린 강의 · 없는 개념 · 다른 단원의 강의는 저장하지 않는다", async () => {
    const draft = await emptyDraft(owner);
    const key = await concept(draft.editionId, world.unitId);
    const otherUnit = (await seedWorld(pg)).unitId;
    const cases: Array<[string, { lectureId: string; conceptKey: string }]> = [
      ["없는 개념 강의", { lectureId: randomUUID(), conceptKey: key }],
      [
        "게시되지 않은 개념 강의",
        { lectureId: await lecture("draft"), conceptKey: key },
      ],
      [
        "게시되지 않은 개념 강의",
        { lectureId: await lecture("archived"), conceptKey: key },
      ],
      [
        "이 판본에 없는 개념",
        { lectureId: await lecture("published"), conceptKey: "없는개념" },
      ],
      [
        "단원이 다릅니다",
        { lectureId: await lecture("published", otherUnit), conceptKey: key },
      ],
    ];
    for (const [reason, ref] of cases) {
      const error = await refusal(saveRefs(owner, draft.editionId, [ref]));
      expect(error.status).toBe(400);
      expect(error.message).toContain(reason);
    }
    const exchange = await assembleExchange(db, draft.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(exchange.units[0]!.conceptLectureRefs).toEqual([]);
  });

  it("전부터 있던 참조의 강의가 내려가도 목차 저장은 되고, 발행 사전 검사가 그것을 알린다", async () => {
    const draft = await emptyDraft(owner);
    const ref = {
      lectureId: await lecture("published"),
      conceptKey: await concept(draft.editionId),
    };
    await saveRefs(owner, draft.editionId, [ref]);
    await pg.query(
      `UPDATE "concept_lecture" SET "status" = 'archived' WHERE "id" = $1`,
      [ref.lectureId],
    );
    // 관계없는 목차 저장(같은 참조를 그대로 둔다)은 막히지 않는다
    await saveRefs(owner, draft.editionId, [ref]);
    const preflight = await preflightEdition(
      db,
      owner,
      draft.editionId,
      fakePublishDeps(),
    );
    expect(preflight.canPublish).toBe(false);
    expect(
      preflight.issues.filter((issue) => issue.code === "concept-lecture-ref"),
    ).toEqual([
      expect.objectContaining({
        severity: "error",
        message: expect.stringContaining("게시되지 않은 개념 강의"),
      }),
    ]);
  });

  it("패키지를 복사해 올 때 성립하지 않는 참조는 빼고 사유를 남긴다", async () => {
    const draft = await emptyDraft(owner);
    const good = {
      lectureId: await lecture("published"),
      conceptKey: await concept(draft.editionId),
    };
    const gone = {
      lectureId: await lecture("published"),
      conceptKey: await concept(draft.editionId),
    };
    await saveRefs(owner, draft.editionId, [good, gone]);
    const exchange = await assembleExchange(db, draft.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    await pg.query(
      `UPDATE "concept_lecture" SET "status" = 'archived' WHERE "id" = $1`,
      [gone.lectureId],
    );
    const zip = Buffer.from(`PK-${randomUUID()}`);
    await putUploadChunk(db, colleague, sha256(zip), 0, zip);
    const upload = await completeUpload(db, colleague, sha256(zip), {
      byteLength: zip.length,
    });
    const result = await importPackage(
      db,
      colleague,
      requestKey(colleague, "import"),
      { mode: "copy", uploadId: upload.uploadId, expectedSha256: sha256(zip) },
      async () => ({ exchange, files: new Map(), validation: {} }),
      loadFigure,
    );
    expect(
      result.issues.filter(
        (issue) => issue.code === "concept-lecture-ref-dropped",
      ),
    ).toEqual([expect.objectContaining({ severity: "warning" })]);
    const copied = await assembleExchange(db, result.editionId!, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(copied.units[0]!.conceptLectureRefs).toEqual([good]);
  });

  it("고를 수 있는 강의 목록에는 게시된 것만 나온다", async () => {
    const unitId = (await seedWorld(pg)).unitId;
    const published = await lecture("published", unitId);
    await lecture("draft", unitId);
    await lecture("archived", unitId);
    const lectures = await referableLectures(db, unitId);
    expect(lectures.map((entry) => entry.lectureId)).toEqual([published]);
    expect(() =>
      textbookConceptLectureListSchema.parse({ unitId, lectures }),
    ).not.toThrow();
  });
});

describe("백지 활동의 표시 정보", () => {
  async function bookWithConcept(actor: TextbookActor) {
    const draft = await emptyDraft(actor);
    const conceptKey = `c-${randomUUID().slice(0, 8)}`;
    await pg.query(
      `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "title", "kind", "body", "blank_items", "links", "mapping_version", "updated_at")
       VALUES ($1, $2, 'u1', '순환소수의 뜻', '정의', $3::jsonb, '[]'::jsonb, '[]'::jsonb, 'm1', $4)`,
      [draft.editionId, conceptKey, JSON.stringify(CONCEPT_BODY), sqlNow()],
    );
    return { ...draft, conceptKey };
  }
  const publish = async (editionId: string) => {
    // 발행의 차례는 발행 시험이 잰다 — 여기서는 상태만 세운다
    await pg.query(`SET session_replication_role = replica`);
    await pg.query(
      `UPDATE "textbook_edition" SET "status" = 'published', "published_at" = now(), "manifest_hash" = $2 WHERE "id" = $1`,
      [editionId, "a".repeat(64)],
    );
    await pg.query(`SET session_replication_role = DEFAULT`);
  };

  it("내 책이면 이름이 온다. 판본에 없는 개념이면 개념 이름만 비어 있다", async () => {
    const mine = await bookWithConcept(owner);
    const references = await conceptEvidenceReferences(db, owner, [
      { editionId: mine.editionId, conceptKey: mine.conceptKey },
      { editionId: mine.editionId, conceptKey: mine.conceptKey },
      { editionId: mine.editionId, conceptKey: "지워진개념" },
    ]);
    expect(references).toEqual([
      {
        editionId: mine.editionId,
        conceptKey: mine.conceptKey,
        bookTitle: sampleConfig().title,
        editionLabel: expect.any(String),
        conceptTitle: "순환소수의 뜻",
        canOpen: true,
      },
      {
        editionId: mine.editionId,
        conceptKey: "지워진개념",
        bookTitle: sampleConfig().title,
        editionLabel: expect.any(String),
        conceptTitle: null,
        canOpen: true,
      },
    ]);
    for (const reference of references)
      expect(() =>
        textbookConceptEvidenceReferenceSchema.parse(reference),
      ).not.toThrow();
  });

  it("읽을 수 없는 책의 이름은 내지 않는다 — 남의 초안 · 공유 안 된 발행본 · 다른 지점", async () => {
    const theirs = await bookWithConcept(owner);
    const hidden = {
      editionId: theirs.editionId,
      conceptKey: theirs.conceptKey,
      bookTitle: null,
      editionLabel: null,
      conceptTitle: null,
      canOpen: false,
    };
    const seenBy = (actor: TextbookActor) =>
      conceptEvidenceReferences(db, actor, [
        { editionId: theirs.editionId, conceptKey: theirs.conceptKey },
      ]);
    try {
      // 남의 초안
      expect(await seenBy(colleague)).toEqual([hidden]);
      // 발행했지만 공유하지 않았다
      await publish(theirs.editionId);
      expect(await seenBy(colleague)).toEqual([hidden]);
      // 지점에 공유하면 같은 지점의 동료에게만 이름이 열린다
      await pg.query(
        `UPDATE "textbook" SET "visibility" = 'branch', "shared_branch_id" = $2 WHERE "id" = $1`,
        [theirs.bookId, branchId],
      );
      expect(await seenBy(colleague)).toEqual([
        expect.objectContaining({
          canOpen: true,
          conceptTitle: "순환소수의 뜻",
        }),
      ]);
      expect(await seenBy(stranger)).toEqual([hidden]);
      // 주인이 지점을 떠나면 다시 닫힌다
      await pg.query(`UPDATE "user" SET "branch_id" = NULL WHERE "id" = $1`, [
        owner.id,
      ]);
      expect(await seenBy(colleague)).toEqual([hidden]);
    } finally {
      await pg.query(`SET session_replication_role = DEFAULT`);
      await pg.query(`UPDATE "user" SET "branch_id" = $2 WHERE "id" = $1`, [
        owner.id,
        branchId,
      ]);
    }
  });

  it("없는 판본을 가리키는 활동은 닫힌 것으로 나온다(오류가 아니다)", async () => {
    const editionId = randomUUID();
    expect(
      await conceptEvidenceReferences(db, owner, [
        { editionId, conceptKey: "c" },
      ]),
    ).toEqual([
      {
        editionId,
        conceptKey: "c",
        bookTitle: null,
        editionLabel: null,
        conceptTitle: null,
        canOpen: false,
      },
    ]);
    expect(await conceptEvidenceReferences(db, owner, [])).toEqual([]);
  });
});
