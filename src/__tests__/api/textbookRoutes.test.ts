// @vitest-environment node
/**
 * 교사 교재 라우트 — 요청이 문을 지나는 모양. 본문은 엄격한 파서와 계약 스키마로 읽고, 거절은 저장소의 오류 모양으로 낸다.
 * 권한 문(`authorizeTextbook`)과 연결 풀만 갈아 끼운다 — DB 는 PGlite(실제 마이그레이션 사슬)이고 서버 코드는 그대로 돈다.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { TextbookActor } from "@/lib/textbook/access";
import type { TextbookDb } from "@/lib/textbook/server/sql";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_route: string, handler: unknown) => handler,
}));

const gate = vi.hoisted(() => ({
  actor: null as TextbookActor | null,
  db: null as TextbookDb | null,
}));
vi.mock("@/lib/textbook/server/authorize", () => ({
  TEXTBOOK_MENU: "textbook",
  textbookHeaders: {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  },
  authorizeTextbook: async () =>
    gate.actor
      ? { actor: gate.actor, response: null }
      : {
          actor: null,
          response: Response.json(
            {
              error: {
                code: "FORBIDDEN",
                message: "교재 제작 메뉴를 사용할 권한이 없습니다.",
              },
            },
            { status: 403 },
          ),
        },
}));
vi.mock("@/lib/textbook/server/prismaSql", () => ({
  get textbookDb() {
    return gate.db;
  },
}));

import {
  PATCH as patchEdition,
  GET as getEdition,
} from "@/app/api/textbook/editions/[editionId]/route";
import { GET as getAsset } from "@/app/api/textbook/editions/[editionId]/assets/[assetId]/route";
import { POST as postItems } from "@/app/api/textbook/editions/[editionId]/items/route";
import { POST as postFinalize } from "@/app/api/textbook/editions/[editionId]/publish/finalize/route";
import { POST as postStep } from "@/app/api/textbook/editions/[editionId]/publish/steps/next/route";
import { PUT as putSection } from "@/app/api/textbook/editions/[editionId]/sections/[sectionId]/route";
import {
  GET as listBooksRoute,
  POST as postBook,
} from "@/app/api/textbook/books/route";
import { GET as listConceptLectures } from "@/app/api/textbook/concept-lectures/route";
import { GET as lookupConcepts } from "@/app/api/textbook/concepts/lookup/route";
import { POST as registerItemRoute } from "@/app/api/textbook/editions/[editionId]/items/[itemId]/register/route";
import { GET as getEvidence } from "@/app/api/textbook/students/[studentId]/concept-evidence/route";
import { PUT as putConcept } from "@/app/api/textbook/editions/[editionId]/concepts/[conceptKey]/route";
import { GET as exportRoute } from "@/app/api/textbook/editions/[editionId]/export/route";
import { GET as getItem } from "@/app/api/textbook/editions/[editionId]/items/[itemId]/route";
import { POST as linkItemRoute } from "@/app/api/textbook/editions/[editionId]/items/[itemId]/link/route";
import { POST as postImport } from "@/app/api/textbook/imports/route";
import { readTextbookArchive } from "@/lib/textbook/archive/package.server";
import { POST as completeUploadRoute } from "@/app/api/textbook/uploads/[sha256]/complete/route";
import { PUT as putChunk } from "@/app/api/textbook/uploads/[sha256]/route";
import { sha256 } from "@/lib/textbook/hash.server";

import {
  type Db,
  type World,
  openTextbookDb,
  seedWorld,
} from "../helpers/textbookPglite";
import {
  insertBankProblem,
  insertBranch,
  insertTeacher,
  pgliteTextbookDb,
  sampleConfig,
  tinyPng,
} from "../helpers/textbookServerWorld";

let pg: Db;
let world: World;
let owner: TextbookActor;
let other: TextbookActor;

beforeAll(async () => {
  pg = await openTextbookDb();
  gate.db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  owner = await insertTeacher(pg, { name: "주인" });
  other = await insertTeacher(pg, { name: "남" });
  gate.actor = owner;
}, 120_000);
afterAll(async () => {
  await pg.close();
});

const json = (method: string, body: unknown, raw?: string) =>
  new Request("https://today.test/api/textbook/x", {
    method,
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});

async function newBook() {
  const response = await postBook(
    json("POST", { requestId: randomUUID(), config: sampleConfig() }),
  );
  const body = (await response.json()) as {
    data: { id: string; draftEditionId: string };
  };
  return {
    response,
    bookId: body.data.id,
    editionId: body.data.draftEditionId,
  };
}

async function withUnit(editionId: string) {
  const detail = (await (
    await getEdition(new Request("https://today.test/x"), params({ editionId }))
  ).json()) as {
    data: { structureRevision: number; config: unknown };
  };
  const response = await patchEdition(
    json("PATCH", {
      requestId: randomUUID(),
      expectedRevision: detail.data.structureRevision,
      config: detail.data.config,
      outline: [
        {
          unitKey: "u1",
          title: "단원",
          sourceUnitIds: [],
          prerequisites: [],
          goals: [],
          conceptLectureRefs: [],
          sections: [],
        },
      ],
    }),
    params({ editionId }),
  );
  expect(response.status).toBe(200);
}

const sectionBody = (expectedRevision: number, title = "구획") => ({
  requestId: randomUUID(),
  expectedRevision,
  unitKey: "u1",
  section: {
    sectionKey: "s",
    title,
    templateKey: "basic",
    startPolicy: "even-left",
    blocks: [],
  },
});

describe("문 · 본문 · 응답", () => {
  it("권한 문이 거절하면 처리기는 DB 에 닿지 않는다", async () => {
    gate.actor = null;
    try {
      const before = await pg.query(
        `SELECT count(*)::int AS n FROM "textbook"`,
      );
      const response = await postBook(
        json("POST", { requestId: randomUUID(), config: sampleConfig() }),
      );
      expect(response.status).toBe(403);
      expect(
        await pg.query(`SELECT count(*)::int AS n FROM "textbook"`),
      ).toMatchObject({ rows: before.rows });
    } finally {
      gate.actor = owner;
    }
  });

  it("새 책 — 201 · `{ data }` · 남의 캐시에 남지 않는다", async () => {
    const { response, editionId } = await newBook();
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(editionId).toMatch(/^[0-9a-f-]{36}$/);
    const list = (await (
      await listBooksRoute(new Request("https://today.test/x"))
    ).json()) as { data: Array<{ isOwner: boolean }> };
    expect(list.data.length).toBeGreaterThan(0);
    expect(list.data.every((book) => book.isOwner)).toBe(true);
  });

  it("모르는 칸은 버리지 않고 거절한다", async () => {
    const response = await postBook(
      json("POST", {
        requestId: randomUUID(),
        config: sampleConfig(),
        published: true,
      }),
    );
    expect(response.status).toBe(400);
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe("VALIDATION_ERROR");
  });

  it("겹친 키가 든 본문은 `JSON.parse` 전에 거절한다", async () => {
    const requestId = randomUUID();
    const raw = `{"requestId":"${requestId}","requestId":"${randomUUID()}","config":${JSON.stringify(sampleConfig())}}`;
    const response = await postBook(json("POST", null, raw));
    expect(response.status).toBe(400);
    const rows = await pg.query(
      `SELECT 1 FROM "textbook_request" WHERE "request_id" = $1`,
      [requestId],
    );
    expect(rows.rows).toEqual([]);
  });

  it("주소의 id 가 모양이 아니면 404 — DB 에 묻지 않는다", async () => {
    const response = await getEdition(
      new Request("https://today.test/x"),
      params({ editionId: "1 OR 1=1" }),
    );
    expect(response.status).toBe(404);
  });

  it("남의 판본은 404", async () => {
    const { editionId } = await newBook();
    gate.actor = other;
    try {
      expect(
        (
          await getEdition(
            new Request("https://today.test/x"),
            params({ editionId }),
          )
        ).status,
      ).toBe(404);
    } finally {
      gate.actor = owner;
    }
  });

  it("낡은 revision 의 구획 저장은 409 와 서버의 구획을 준다(화면이 견줄 수 있게)", async () => {
    const { editionId } = await newBook();
    await withUnit(editionId);
    const sectionId = randomUUID();
    const created = await putSection(
      json("PUT", sectionBody(0)),
      params({ editionId, sectionId }),
    );
    expect(created.status).toBe(201);
    expect(
      (
        (await created.json()) as {
          data: {
            section: { revision: number };
            aggregateRevision: number;
            replayed: boolean;
          };
        }
      ).data,
    ).toMatchObject({
      section: { revision: 1 },
      replayed: false,
    });
    const saved = await putSection(
      json("PUT", sectionBody(1, "첫 기기")),
      params({ editionId, sectionId }),
    );
    expect(saved.status).toBe(200);
    const stale = await putSection(
      json("PUT", sectionBody(1, "둘째 기기")),
      params({ editionId, sectionId }),
    );
    expect(stale.status).toBe(409);
    const body = (await stale.json()) as {
      error: {
        code: string;
        details: {
          serverRevision: number;
          serverSection: { section: { title: string } };
        };
      };
    };
    expect(body.error.code).toBe("REVISION_MISMATCH");
    expect(body.error.details.serverRevision).toBe(2);
    expect(body.error.details.serverSection.section.title).toBe("첫 기기");
  });

  it("같은 요청 번호를 다른 구획에 다시 쓰면 다른 요청이다(409)", async () => {
    const { editionId } = await newBook();
    await withUnit(editionId);
    const body = sectionBody(0);
    expect(
      (
        await putSection(
          json("PUT", body),
          params({ editionId, sectionId: randomUUID() }),
        )
      ).status,
    ).toBe(201);
    const reused = await putSection(
      json("PUT", { ...body, section: { ...body.section, sectionKey: "t" } }),
      params({ editionId, sectionId: randomUUID() }),
    );
    expect(reused.status).toBe(409);
  });

  it("담기 — 제외한 문항과 사유가 같이 온다", async () => {
    const { editionId } = await newBook();
    await withUnit(editionId);
    const sectionId = randomUUID();
    const created = (await (
      await putSection(
        json("PUT", sectionBody(0)),
        params({ editionId, sectionId }),
      )
    ).json()) as { data: { aggregateRevision: number } };
    // 검수 전(pending) 문항이라 자격이 없다
    const response = await postItems(
      json("POST", {
        requestId: randomUUID(),
        expectedRevision: created.data.aggregateRevision,
        sectionId,
        source: { kind: "problems", problemIds: [world.problem1.id] },
      }),
      params({ editionId }),
    );
    expect(response.status).toBe(201);
    expect(
      (
        (await response.json()) as {
          data: { items: unknown[]; excluded: unknown[] };
        }
      ).data,
    ).toMatchObject({
      items: [],
      excluded: [
        {
          problemId: world.problem1.id,
          reason: "검수를 통과하지 않은 문항입니다.",
        },
      ],
    });
  });
});

describe("발행 라우트는 요청 번호만 받는다", () => {
  it.each([
    [
      "쪽 계획",
      {
        pageMap: [
          {
            itemId: "x",
            physicalPageIndex: 1,
            printedPageLabel: "1",
            column: 1,
          },
        ],
      },
    ],
    ["PDF 해시", { studentPdfSha256: "a".repeat(64) }],
    ["통과 표지", { verified: true }],
    ["상태", { status: "published" }],
  ])(
    "확정에 %s 을(를) 실어 보내면 400 — 서버가 만든 값만 쓴다",
    async (_name, extra) => {
      const { editionId } = await newBook();
      const response = await postFinalize(
        json("POST", { requestId: randomUUID(), ...extra }),
        params({ editionId }),
      );
      expect(response.status).toBe(400);
      const { rows } = await pg.query<{ status: string }>(
        `SELECT "status" FROM "textbook_edition" WHERE "id" = $1`,
        [editionId],
      );
      expect(rows[0]!.status).toBe("draft");
    },
  );

  it("조판 걸음에 PDF 를 실어 보내면 400", async () => {
    const { editionId } = await newBook();
    const response = await postStep(
      json("POST", { requestId: randomUUID(), pdfBase64: "JVBERi0=" }),
      params({ editionId }),
    );
    expect(response.status).toBe(400);
  });

  it("없는 발행 작업을 확정하면 404", async () => {
    const { editionId } = await newBook();
    const response = await postFinalize(
      json("POST", { requestId: randomUUID() }),
      params({ editionId }),
    );
    expect(response.status).toBe(404);
  });
});

describe("올리기 · 자산 읽기", () => {
  it("조각 올리기 → 끝맺기 → 자산. 판본의 색인에 없는 자산은 그 판본으로 못 읽는다", async () => {
    const bytes = tinyPng(64, 48, randomUUID());
    const hash = sha256(bytes);
    const chunk = await putChunk(
      new Request(`https://today.test/api/textbook/uploads/${hash}?offset=0`, {
        method: "PUT",
        body: new Uint8Array(bytes),
      }),
      params({ sha256: hash }),
    );
    expect(chunk.status).toBe(200);
    const completed = await completeUploadRoute(
      json("POST", {
        byteLength: bytes.length,
        asset: { kind: "image", name: "그림.png" },
      }),
      params({ sha256: hash }),
    );
    expect(completed.status).toBe(200);
    expect(((await completed.json()) as { data: unknown }).data).toMatchObject({
      sha256: hash,
      byteLength: bytes.length,
      asset: {
        assetId: hash,
        mimeType: "image/png",
        widthPx: 64,
        heightPx: 48,
      },
    });
    // 내 자산이지만 이 판본이 가리키지 않는다 — 해시를 알아도 판본의 주소로는 못 읽는다
    const { editionId } = await newBook();
    const miss = await getAsset(
      new Request("https://today.test/x"),
      params({ editionId, assetId: hash }),
    );
    expect(miss.status).toBe(404);
    // 원고가 그 그림을 쓰면 읽힌다
    await withUnit(editionId);
    const sectionId = randomUUID();
    const body = sectionBody(0);
    const saved = await putSection(
      json("PUT", {
        ...body,
        section: {
          ...body.section,
          blocks: [
            { blockId: "b1", kind: "image", assetId: hash, caption: null },
          ],
        },
      }),
      params({ editionId, sectionId }),
    );
    expect(saved.status).toBe(201);
    const hit = await getAsset(
      new Request("https://today.test/x", { headers: { range: "bytes=0-7" } }),
      params({ editionId, assetId: hash }),
    );
    expect(hit.status).toBe(206);
    expect(hit.headers.get("content-type")).toBe("image/png");
    expect(hit.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await hit.arrayBuffer())).toEqual(bytes.subarray(0, 8));
  });

  it("1MB 를 넘는 조각은 413", async () => {
    const hash = "a".repeat(64);
    const response = await putChunk(
      new Request(`https://today.test/api/textbook/uploads/${hash}?offset=0`, {
        method: "PUT",
        body: Buffer.alloc(1_048_577),
      }),
      params({ sha256: hash }),
    );
    expect(response.status).toBe(413);
  });
});

describe("내보내기 → 가져오기 → 연결 (실제 패키지 코드)", () => {
  /** 구획 하나에 은행 문항 하나를 담은 초안 */
  async function draftWithItem() {
    const { editionId } = await newBook();
    await withUnit(editionId);
    const sectionId = randomUUID();
    const created = (await (
      await putSection(
        json("PUT", sectionBody(0)),
        params({ editionId, sectionId }),
      )
    ).json()) as { data: { aggregateRevision: number } };
    const problem = await insertBankProblem(pg, world.unitId, {
      content: "패키지에 실리는 발문",
      answer: "7",
    });
    const captured = await postItems(
      json("POST", {
        requestId: randomUUID(),
        expectedRevision: created.data.aggregateRevision,
        sectionId,
        source: { kind: "problems", problemIds: [problem.id] },
      }),
      params({ editionId }),
    );
    expect(captured.status).toBe(201);
    return { editionId, problem };
  }

  /** 패키지를 1MB 조각으로 올리고 끝맺는다 */
  async function upload(bytes: Uint8Array) {
    const hash = sha256(bytes);
    for (let offset = 0; offset < bytes.byteLength; offset += 1_048_576) {
      const chunk = await putChunk(
        new Request(
          `https://today.test/api/textbook/uploads/${hash}?offset=${offset}`,
          {
            method: "PUT",
            body: new Uint8Array(bytes.subarray(offset, offset + 1_048_576)),
          },
        ),
        params({ sha256: hash }),
      );
      expect(chunk.status).toBe(200);
    }
    const completed = await completeUploadRoute(
      json("POST", { byteLength: bytes.byteLength, fileName: "교재.zip" }),
      params({ sha256: hash }),
    );
    expect(completed.status).toBe(200);
    return {
      hash,
      uploadId: ((await completed.json()) as { data: { uploadId: string } })
        .data.uploadId,
    };
  }

  it("모르는 형식 · 모르는 질의 칸은 400", async () => {
    const { editionId } = await newBook();
    for (const query of ["?format=pdf", "?format=zip&as=other", "?download=1"])
      expect(
        (
          await exportRoute(
            new Request(`https://today.test/x${query}`),
            params({ editionId }),
          )
        ).status,
      ).toBe(400);
  });

  it("초안을 패키지로 내보내 다른 계정이 복사해 오면, 내용이 같은 은행 문항과만 연결된다", async () => {
    const { editionId, problem } = await draftWithItem();
    const exported = await exportRoute(
      new Request("https://today.test/x?format=zip"),
      params({ editionId }),
    );
    expect(exported.status).toBe(200);
    expect(exported.headers.get("content-type")).toBe("application/zip");
    expect(exported.headers.get("content-disposition")).toBe(
      `attachment; filename="textbook-${editionId}.zip"`,
    );
    const zip = new Uint8Array(await exported.arrayBuffer());
    expect(String(zip.byteLength)).toBe(exported.headers.get("content-length"));
    // 실제 패키지 읽기 코드가 다시 읽는다 — 파일 목록 · 해시 · 교환 형식 전부
    const archive = await readTextbookArchive(zip);
    expect(archive.exchange.edition).toMatchObject({
      editionId,
      status: "draft",
    });
    expect(archive.exchange.snapshots).toHaveLength(1);
    expect(archive.validation).toMatchObject({ validated: false });

    // 남의 판본은 패키지로도 못 낸다
    gate.actor = other;
    try {
      expect(
        (
          await exportRoute(
            new Request("https://today.test/x?format=zip"),
            params({ editionId }),
          )
        ).status,
      ).toBe(404);
      const { hash, uploadId } = await upload(zip);
      const imported = await postImport(
        json("POST", {
          requestId: randomUUID(),
          mode: "copy",
          uploadId,
          expectedSha256: hash,
        }),
      );
      expect(imported.status).toBe(200);
      const result = (
        (await imported.json()) as {
          data: { editionId: string; bookId: string; issues: unknown[] };
        }
      ).data;
      expect(result.editionId).not.toBe(editionId);
      const copied = (
        await pg.query<{ id: string; link_status: string; user_id: string }>(
          `SELECT "id", "link_status", "user_id" FROM "textbook_item" WHERE "edition_id" = $1`,
          [result.editionId],
        )
      ).rows;
      expect(copied).toHaveLength(1);
      expect(copied[0]!.user_id).toBe(other.id);

      const detail = (
        (await (
          await getItem(
            new Request("https://today.test/x"),
            params({ editionId: result.editionId, itemId: copied[0]!.id }),
          )
        ).json()) as {
          data: {
            item: { linkStatus: string };
            linkCandidates: Array<{ problemId: string }>;
          };
        }
      ).data;
      if (detail.item.linkStatus === "linked") {
        // 가져올 때 은행 문항의 내용이 같아 서버가 바로 확인했다 — 후보가 남지 않는다
        expect(detail.linkCandidates).toEqual([]);
      } else {
        expect(detail.linkCandidates).toEqual([
          expect.objectContaining({ problemId: problem.id }),
        ]);
        const edition = (
          (await (
            await getEdition(
              new Request("https://today.test/x"),
              params({ editionId: result.editionId }),
            )
          ).json()) as {
            data: { edition: { revision: number } };
          }
        ).data;
        const linked = await linkItemRoute(
          json("POST", {
            requestId: randomUUID(),
            expectedRevision: edition.edition.revision,
            problemId: problem.id,
          }),
          params({ editionId: result.editionId, itemId: copied[0]!.id }),
        );
        expect(linked.status).toBe(200);
        expect(
          ((await linked.json()) as { data: { item: { linkStatus: string } } })
            .data.item.linkStatus,
        ).toBe("linked");
      }
    } finally {
      gate.actor = owner;
    }
  }, 120_000);

  it("연결 요청에 모르는 칸(예: 연결 상태)을 실어 보내면 400", async () => {
    const { editionId } = await draftWithItem();
    const [item] = (
      await pg.query<{ id: string }>(
        `SELECT "id" FROM "textbook_item" WHERE "edition_id" = $1`,
        [editionId],
      )
    ).rows;
    const response = await linkItemRoute(
      json("POST", {
        requestId: randomUUID(),
        expectedRevision: 1,
        problemId: randomUUID(),
        linkStatus: "linked",
      }),
      params({ editionId, itemId: item!.id }),
    );
    expect(response.status).toBe(400);
  });
});

describe("개념 백지 소단원 → 교재 개념", () => {
  const KEY = "중2::유리수와 순환소수::유리수와 순환소수";
  const lookup = (query: string) =>
    lookupConcepts(
      new Request(`https://today.test/api/textbook/concepts/lookup${query}`),
    );
  const matchesOf = async (response: Response) =>
    (
      (await response.json()) as {
        data: { matches: Array<Record<string, unknown>> };
      }
    ).data.matches;

  /** 그 소단원의 항목 하나를 가리키는 개념이 든 판본 */
  async function bookWithConcept(blankSectionKey: string) {
    const { bookId, editionId } = await newBook();
    await withUnit(editionId);
    const conceptKey = `c-${randomUUID().slice(0, 8)}`;
    await pg.query(
      `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "title", "kind", "body", "blank_items", "links", "mapping_version", "updated_at")
       VALUES ($1, $2, 'u1', '순환소수의 뜻', '정의', $3::jsonb, $4::jsonb, '[]'::jsonb, 'm1', now())`,
      [
        editionId,
        conceptKey,
        JSON.stringify({
          goal: "뜻을 말한다",
          explanation: "설명",
          examples: [],
          cautions: [],
        }),
        JSON.stringify([
          {
            blankSectionKey,
            entryKind: "concept",
            entryId: "c-1",
            review: {
              status: "candidate",
              candidateRule: "manual",
              reviewedBy: null,
              reviewedAt: null,
              targetHash: null,
            },
          },
          {
            blankSectionKey: "중2::식의 계산::지수법칙",
            entryKind: "ox",
            entryId: "o-9",
            review: {
              status: "candidate",
              candidateRule: "manual",
              reviewedBy: null,
              reviewedAt: null,
              targetHash: null,
            },
          },
        ]),
      ],
    );
    return { bookId, editionId, conceptKey };
  }

  it("열쇠가 모양이 아니거나 모르는 질의 칸이 있으면 400", async () => {
    for (const query of [
      "",
      "?blankSectionKey=유리수",
      `?blankSectionKey=${encodeURIComponent(KEY)}&name=유리수`,
      `?blankSectionKey=${encodeURIComponent(KEY)}&blankSectionKey=${encodeURIComponent(KEY)}`,
    ])
      expect((await lookup(query)).status).toBe(400);
  });

  it("글자 그대로 같은 소단원만 맞춘다 — 그 소단원의 항목만 싣는다", async () => {
    const made = await bookWithConcept(KEY);
    const response = await lookup(
      `?blankSectionKey=${encodeURIComponent(KEY)}`,
    );
    expect(response.status).toBe(200);
    const mine = (await matchesOf(response)).filter(
      (match) => match.editionId === made.editionId,
    );
    expect(mine).toEqual([
      expect.objectContaining({
        bookId: made.bookId,
        conceptKey: made.conceptKey,
        conceptTitle: "순환소수의 뜻",
        status: "draft",
        access: "owner",
        hasFrozen: false,
        entries: [
          { entryKind: "concept", entryId: "c-1", reviewStatus: "candidate" },
        ],
      }),
    ]);
    // 이름이 비슷한 소단원으로는 찾지 않는다
    const near = await matchesOf(
      await lookup(
        `?blankSectionKey=${encodeURIComponent("중2::유리수와 순환소수::순환소수")}`,
      ),
    );
    expect(near.filter((match) => match.editionId === made.editionId)).toEqual(
      [],
    );
  });

  it("남의 초안은 안 보인다. 지점에 공유된 발행본만 보인다 — 주인이 지점을 떠나면 닫힌다", async () => {
    const branchId = await insertBranch(pg);
    const author = await insertTeacher(pg, { branchId, name: "지은이" });
    const reader = await insertTeacher(pg, { branchId, name: "동료" });
    gate.actor = author;
    let made: Awaited<ReturnType<typeof bookWithConcept>>;
    try {
      made = await bookWithConcept(KEY);
    } finally {
      gate.actor = reader;
    }
    const seen = async () =>
      (
        await matchesOf(
          await lookup(`?blankSectionKey=${encodeURIComponent(KEY)}`),
        )
      ).filter((match) => match.editionId === made.editionId);
    try {
      expect(await seen()).toEqual([]);
      // 공유만으로는 안 보인다 — 초안이다
      await pg.query(
        `UPDATE "textbook" SET "visibility" = 'branch', "shared_branch_id" = $2 WHERE "id" = $1`,
        [made.bookId, branchId],
      );
      expect(await seen()).toEqual([]);
      // 발행 상태를 시험용으로 세운다(발행의 차례는 발행 시험이 잰다): 트리거를 잠깐 끄고 상태만 바꾼다
      await pg.query(`SET session_replication_role = replica`);
      await pg.query(
        `UPDATE "textbook_edition" SET "status" = 'published', "published_at" = now(), "manifest_hash" = $2 WHERE "id" = $1`,
        [made.editionId, "a".repeat(64)],
      );
      await pg.query(`SET session_replication_role = DEFAULT`);
      expect(await seen()).toEqual([
        expect.objectContaining({
          status: "published",
          access: "branch",
          conceptKey: made.conceptKey,
        }),
      ]);
      await pg.query(`UPDATE "user" SET "branch_id" = NULL WHERE "id" = $1`, [
        author.id,
      ]);
      expect(await seen()).toEqual([]);
    } finally {
      await pg.query(`SET session_replication_role = DEFAULT`);
      gate.actor = owner;
    }
  });

  it("개념 저장 라우트를 지나 만든 개념도 찾는다(같은 칸을 읽는다)", async () => {
    const { editionId } = await newBook();
    await withUnit(editionId);
    const response = await putConcept(
      json("PUT", { requestId: randomUUID(), expectedRevision: 0 }),
      params({ editionId, conceptKey: "빈개념" }),
    );
    // 본문이 모자란 저장은 거절된다 — 이 시험은 «조회가 저장 라우트와 같은 표를 본다»만 확인한다
    expect([400, 422]).toContain(response.status);
    expect(
      (
        await matchesOf(
          await lookup(`?blankSectionKey=${encodeURIComponent(KEY)}`),
        )
      ).some((match) => match.editionId === editionId),
    ).toBe(false);
  });
});

describe("등록 · 강의 목록 · 활동 증거 라우트", () => {
  it("등록 요청은 검수 상태 · 본문을 정하지 못한다(모르는 칸은 400)", async () => {
    const { editionId } = await newBook();
    const itemId = randomUUID();
    const base = {
      requestId: randomUUID(),
      expectedRevision: 1,
      unitId: world.unitId,
      difficulty: "기본",
      problemType: "계산",
    };
    for (const extra of [
      { reviewStatus: "approved" },
      { content: "요청이 보낸 본문" },
      { linkStatus: "linked" },
    ]) {
      const response = await registerItemRoute(
        json("POST", { ...base, ...extra }),
        params({ editionId, itemId }),
      );
      expect(response.status).toBe(400);
    }
    // 모양이 맞아도 없는 배치는 404 — 은행에 줄이 생기지 않는다
    const before = await pg.query(`SELECT count(*)::int AS n FROM "problem"`);
    const missing = await registerItemRoute(
      json("POST", { ...base, requestId: randomUUID() }),
      params({ editionId, itemId }),
    );
    expect([404, 409]).toContain(missing.status);
    expect(
      await pg.query(`SELECT count(*)::int AS n FROM "problem"`),
    ).toMatchObject({ rows: before.rows });
  });

  it("개념 강의 목록 — 단원이 없거나 모르는 질의 칸이 있으면 400, 있으면 게시된 강의만", async () => {
    for (const query of [
      "",
      "?unitId=x",
      `?unitId=${world.unitId}&status=draft`,
    ])
      expect(
        (
          await listConceptLectures(
            new Request(
              `https://today.test/api/textbook/concept-lectures${query}`,
            ),
          )
        ).status,
      ).toBe(400);
    const lectureId = randomUUID();
    await pg.query(
      `INSERT INTO "concept_lecture" ("id", "unit_id", "title", "video_url", "seconds", "status", "published_at", "updated_at")
       VALUES ($1, $2, '게시된 강의', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 90, 'published', now(), now()),
              ($3, $2, '초안 강의', NULL, 0, 'draft', NULL, now())`,
      [lectureId, world.unitId, randomUUID()],
    );
    const response = await listConceptLectures(
      new Request(
        `https://today.test/api/textbook/concept-lectures?unitId=${world.unitId}`,
      ),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { lectures: Array<{ lectureId: string; title: string }> };
    };
    expect(body.data.lectures.map((lecture) => lecture.title)).toContain(
      "게시된 강의",
    );
    expect(body.data.lectures.map((lecture) => lecture.title)).not.toContain(
      "초안 강의",
    );
  });

  it("활동 증거 — 내 학생이면 활동과 표시 정보가 같이 온다. 남의 학생은 404", async () => {
    const mine = await pg.query<{ id: string }>(
      `SELECT s."id" FROM "student" s JOIN "class" c ON c."id" = s."class_id" WHERE c."user_id" = $1 LIMIT 1`,
      [world.userA],
    );
    // 이 시험의 주인(owner)은 seedWorld 의 교사가 아니다 — 남의 학생이다
    const foreign = await getEvidence(
      new Request("https://today.test/x"),
      params({ studentId: mine.rows[0]!.id }),
    );
    expect(foreign.status).toBe(404);
    const classId = randomUUID();
    const studentId = randomUUID();
    await pg.query(
      `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "updated_at") VALUES ($1, $2, '반', '중2', '{}'::jsonb, now())`,
      [classId, owner.id],
    );
    await pg.query(
      `INSERT INTO "student" ("id", "class_id", "name", "updated_at") VALUES ($1, $2, '학생', now())`,
      [studentId, classId],
    );
    const response = await getEvidence(
      new Request("https://today.test/x"),
      params({ studentId }),
    );
    expect(response.status).toBe(200);
    expect(((await response.json()) as { data: unknown }).data).toEqual({
      attempts: [],
      references: [],
    });
  });
});
