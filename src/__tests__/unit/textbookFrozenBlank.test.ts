// @vitest-environment node
/** Real loader/auth SQL on Postgres. Async page tests inspect returned elements, not an RSC/browser render. */
import { randomUUID } from "node:crypto";
import { isValidElement, type ReactElement } from "react";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const boundary = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: boundary.auth }));
vi.mock("@/lib/errorLog/scope", () => ({ noteErrorLog: vi.fn() }));
vi.mock("@/lib/textbook/server/prismaSql", () => ({
  textbookDb: {
    query: boundary.query,
    execute: boundary.execute,
    transaction: boundary.transaction,
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT ${href}`);
  },
}));

import TextbookBlankPrintPage from "@/app/(main)/textbook/editions/[editionId]/concepts/[conceptKey]/blank/page";
import ConceptBlankPaper, {
  type ConceptBlankPaperProps,
} from "@/components/concept-blank/ConceptBlankPaper";
import PrintNow from "@/components/concept-blank/paper/PrintNow";
import {
  textbookConceptSchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import {
  EXACT_COMPOSITION_VERSION,
  EXACT_PARSER_VERSION,
} from "@/lib/concept-blank/exactPick";
import type { TextbookActor } from "@/lib/textbook/access";
import { loadFrozenBlank } from "@/lib/textbook/frozenBlank";
import { conceptContentHash } from "@/lib/textbook/hash.server";
import type { SqlParam, TextbookDb } from "@/lib/textbook/server/sql";
import {
  type Db,
  draftWithContent,
  finalizePublish,
  openTextbookDb,
  reservePublish,
  runSteps,
  seedWorld,
} from "../helpers/textbookPglite";
import { pgliteTextbookDb } from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  boundary.query.mockImplementation(
    (text: string, params: readonly SqlParam[] = []) => db.query(text, params),
  );
  boundary.execute.mockImplementation(
    (text: string, params: readonly SqlParam[] = []) =>
      db.execute(text, params),
  );
  boundary.transaction.mockImplementation(db.transaction);
}, 120_000);
afterAll(async () => {
  await pg?.close();
});
beforeEach(() => {
  vi.clearAllMocks();
  boundary.auth.mockReset().mockResolvedValue(null);
});

function frozenConcept(
  conceptKey: string,
  sectionKey: string,
): TextbookConcept {
  const blankSectionKey = "초5::옛 단원::통분";
  const concept = textbookConceptSchema.parse({
    conceptKey,
    unitKey: "u1",
    sectionKey,
    title: "발행 당시 통분",
    kind: "방법",
    unitId: null,
    body: {
      goal: "뜻을 설명한다",
      prerequisites: [],
      definition: "발행 당시 검수한 정의",
      conditions: null,
      examples: [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
    blankItems: [],
    links: [],
    mappingVersion: "frozen-map-1",
    derivedFromConceptKey: null,
    frozen: {
      contentHash: "0".repeat(64),
      parserVersion: EXACT_PARSER_VERSION,
      compositionVersion: EXACT_COMPOSITION_VERSION,
      mappingVersion: "frozen-map-1",
      sections: [
        {
          blankSectionKey,
          title: "옛 소단원 이름",
          unitLabel: "발행 당시 단원",
        },
      ],
      entries: [
        {
          entryKind: "concept",
          payload: {
            id: "frozen-only-first",
            section: blankSectionKey,
            term: "통분",
            kind: "방법",
            level: "하",
            definition: "분모를 {같게} 만드는 방법입니다.",
          },
        },
        {
          entryKind: "concept",
          payload: {
            id: "frozen-only-second",
            section: blankSectionKey,
            term: "공통분모",
            kind: "정의",
            level: "하",
            definition: "통분한 두 분수의 {같은 분모}입니다.",
            givenCase: true,
          },
        },
      ],
      // Deliberately differs from entry storage order; these synthetic IDs do not exist in the live bank.
      selection: ["frozen-only-second", "frozen-only-first"].map((entryId) => ({
        blankSectionKey,
        entryKind: "concept",
        entryId,
        form: "term",
        level: "하",
      })),
      assetHashes: [],
    },
  });
  concept.frozen!.contentHash = conceptContentHash(concept);
  return concept;
}

async function fixture(
  options: {
    publish?: boolean;
    share?: boolean;
    change?: (concept: TextbookConcept) => void;
    rehash?: boolean;
  } = {},
) {
  const world = await seedWorld(pg);
  await pg.query(
    `UPDATE "user" SET "approval_status" = 'approved', "branch_id" = $1::uuid WHERE "id" IN ($2::uuid, $3::uuid)`,
    [world.branchId, world.userA, world.userB],
  );
  const draft = await draftWithContent(pg, world);
  const section = await pg.query<{ section_key: string }>(
    `SELECT "section_key" FROM "textbook_section" WHERE "id" = $1::uuid`,
    [draft.sectionId],
  );
  const concept = frozenConcept(draft.conceptKey, section.rows[0]!.section_key);
  options.change?.(concept);
  if (options.rehash && concept.frozen)
    concept.frozen.contentHash = conceptContentHash(concept);
  await pg.query(
    `UPDATE "textbook_concept" SET "title" = $3::text, "kind" = $4::text, "body" = $5::jsonb, "blank_items" = $6::jsonb,
    "links" = $7::jsonb, "mapping_version" = $8::text, "frozen" = $9::jsonb WHERE "edition_id" = $1::uuid AND "concept_key" = $2::text`,
    [
      draft.editionId,
      draft.conceptKey,
      concept.title,
      concept.kind,
      JSON.stringify(concept.body),
      JSON.stringify(concept.blankItems),
      JSON.stringify(concept.links),
      concept.mappingVersion,
      concept.frozen === null ? null : JSON.stringify(concept.frozen),
    ],
  );
  if (options.share)
    await pg.query(
      `UPDATE "textbook" SET "visibility" = 'branch', "shared_branch_id" = $2::uuid WHERE "id" = $1::uuid`,
      [draft.bookId, world.branchId],
    );
  if (options.publish !== false) {
    const plan = await reservePublish(pg, draft);
    await runSteps(pg, draft, plan);
    await finalizePublish(pg, draft, plan, ["concept"]);
  }
  const owner: TextbookActor = {
    id: world.userA,
    name: "가",
    branchId: world.branchId,
  };
  const colleague: TextbookActor = {
    id: world.userB,
    name: "나",
    branchId: world.branchId,
  };
  return { ...world, ...draft, concept, owner, colleague };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const load = (f: Fixture, actor: TextbookActor = f.owner) =>
  loadFrozenBlank(db, actor, f.editionId, f.conceptKey);
function teacherSession(
  actor: TextbookActor,
  overrides: Record<string, unknown> = {},
) {
  return {
    user: {
      ...actor,
      email: "teacher@example.test",
      role: "director",
      isAdmin: false,
      approvalStatus: "approved",
      menus: ["textbook"],
      ...overrides,
    },
  };
}
type PrintQuery = { view?: string | string[]; print?: string | string[] };
function page(
  path: { editionId: string; conceptKey: string },
  query: PrintQuery = {},
) {
  return TextbookBlankPrintPage({
    params: Promise.resolve({
      editionId: path.editionId,
      conceptKey: path.conceptKey,
    }),
    searchParams: Promise.resolve(query),
  });
}
function findElement<P>(node: unknown, type: unknown): ReactElement<P> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findElement<P>(child, type);
      if (hit) return hit;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (node.type === type) return node as ReactElement<P>;
  return findElement<P>((node.props as { children?: unknown }).children, type);
}
const paperOf = (node: unknown) =>
  findElement<ConceptBlankPaperProps>(node, ConceptBlankPaper);

describe("교재 고정 백지 로더 — 실제 SQL", () => {
  it("발행 당시 항목·선택 순서·소단원 이름을 최신 은행 없이 보존한다", async () => {
    const f = await fixture();
    const result = await load(f);
    expect(result.source).toBe("frozen");
    expect(result.sheetCode).toBeNull();
    expect(result.selection.pick?.map((pick) => pick.entryId)).toEqual([
      "frozen-only-second",
      "frozen-only-first",
    ]);
    expect(result.sheets).toHaveLength(1);
    const sheet = result.sheets[0];
    expect(sheet.form).toBe("term");
    if (sheet.form !== "term") throw new Error("Expected exact term sheet");
    expect(sheet.header).toMatchObject({
      title: "옛 소단원 이름",
      unitLabel: "발행 당시 단원",
    });
    expect(sheet.terms.map((term) => term.id)).toEqual([
      "frozen-only-second",
      "frozen-only-first",
    ]);
    expect(sheet.terms[0]).toMatchObject({
      givenCase: true,
      definition: "통분한 두 분수의 {같은 분모}입니다.",
    });
    expect(sheet.entryOrder?.map((entry) => entry.entryId)).toEqual([
      "frozen-only-second",
      "frozen-only-first",
    ]);
    expect(await load(f)).toEqual(result);
  });

  it("같은 지점이어도 비공유 판본의 본문은 읽지 못한다", async () => {
    const f = await fixture();
    await expect(load(f, f.colleague)).rejects.toMatchObject({ status: 404 });
  });

  it("공유된 발행본만 동료에게 열고 공유 취소를 다음 조회에 반영한다", async () => {
    const f = await fixture({ share: true });
    expect((await load(f, f.colleague)).edition.scope).toBe("shared");
    await pg.query(
      `UPDATE "textbook" SET "visibility" = 'private', "shared_branch_id" = NULL WHERE "id" = $1::uuid`,
      [f.bookId],
    );
    await expect(load(f, f.colleague)).rejects.toMatchObject({ status: 404 });
  });

  it.each(["suspended_at", "deleted_at"] as const)(
    "공유 주인의 %s 변경 뒤에는 고정 답지도 읽지 못한다",
    async (field) => {
      const f = await fixture({ share: true });
      await pg.query(
        `UPDATE "user" SET "${field}" = now() WHERE "id" = $1::uuid`,
        [f.userA],
      );
      await expect(load(f, f.colleague)).rejects.toMatchObject({ status: 404 });
    },
  );

  it("주인이 지점을 떠나거나 보는 교사가 다른 지점이면 공유가 닫힌다", async () => {
    const f = await fixture({ share: true });
    await expect(
      load(f, { ...f.colleague, branchId: randomUUID() }),
    ).rejects.toMatchObject({ status: 404 });
    await pg.query(
      `UPDATE "user" SET "branch_id" = NULL WHERE "id" = $1::uuid`,
      [f.userA],
    );
    await expect(load(f, f.colleague)).rejects.toMatchObject({ status: 404 });
  });

  it("고정 내용이 있어도 초안은 소유자에게 인쇄하지 않고 동료에게 숨긴다", async () => {
    const f = await fixture({ publish: false, share: true });
    await expect(load(f)).rejects.toMatchObject({ status: 409 });
    await expect(load(f, f.colleague)).rejects.toMatchObject({ status: 404 });
  });

  it("미고정 초안은 최신 은행으로 대체하지 않는다", async () => {
    const f = await fixture({
      publish: false,
      change: (concept) => {
        concept.frozen = null;
      },
    });
    await expect(load(f)).rejects.toMatchObject({ status: 409 });
  });

  it.each(["body", "entry", "selection"] as const)(
    "저장된 %s 변조가 해시와 다르면 인쇄를 중단한다",
    async (target) => {
      const f = await fixture({
        change: (concept) => {
          if (target === "body") concept.body.definition = "바뀐 설명";
          if (target === "entry")
            concept.frozen!.entries[0].payload.id = "substituted-entry";
          if (target === "selection") concept.frozen!.selection.reverse();
        },
      });
      await expect(load(f)).rejects.toThrow(
        "발행 개념의 내용 해시가 일치하지 않습니다.",
      );
    },
  );

  it.each(["parserVersion", "compositionVersion"] as const)(
    "해시가 맞아도 지원하지 않는 %s를 실행하지 않는다",
    async (field) => {
      const f = await fixture({
        change: (concept) => {
          concept.frozen![field] = "future-unsupported";
        },
        rehash: true,
      });
      await expect(load(f)).rejects.toThrow(
        "지원하지 않는 고정 개념백지 파서·조합 버전",
      );
    },
  );

  it("해시가 맞아도 없는 정확한 항목을 다른 항목으로 대체하지 않는다", async () => {
    const f = await fixture({
      change: (concept) => {
        concept.frozen!.selection[0].entryId = "missing-entry";
      },
      rehash: true,
    });
    await expect(load(f)).rejects.toThrow(
      "고정 선택과 고정 항목 목록이 일치하지 않습니다.",
    );
  });

  it("같은 개수의 중복 고정 항목도 오류로 처리한다", async () => {
    const f = await fixture({
      change: (concept) => {
        concept.frozen!.entries[1] = structuredClone(
          concept.frozen!.entries[0],
        );
      },
      rehash: true,
    });
    await expect(load(f)).rejects.toThrow("은행에 중복 항목 ID가 있습니다.");
  });
});

describe("교재 고정 백지 인쇄 페이지 — 실제 인증 가드와 로더", () => {
  let f: Fixture;
  beforeAll(async () => {
    f = await fixture();
  });
  beforeEach(() => {
    boundary.auth.mockResolvedValue(teacherSession(f.owner));
  });

  it.each(["anonymous", "student"])(
    "%s 세션은 채점표 요청이어도 DB를 읽기 전에 로그인으로 보낸다",
    async (kind) => {
      boundary.auth.mockResolvedValue(
        kind === "anonymous"
          ? null
          : {
              student: {
                studentId: f.studentA,
                accountId: randomUUID(),
                name: "학생",
                mustChangePassword: false,
              },
            },
      );
      await expect(page(f, { view: "key", print: "1" })).rejects.toThrow(
        "NEXT_REDIRECT /login",
      );
      expect(boundary.query).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: "교재 메뉴 없음", overrides: { menus: ["conceptBlank"] } },
    { label: "미승인", overrides: { approvalStatus: "pending" } },
  ])("$label 소유자도 고정 본문 조회 전에 차단한다", async ({ overrides }) => {
    boundary.auth.mockResolvedValue(teacherSession(f.owner, overrides));
    await expect(page(f)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(boundary.query).not.toHaveBeenCalled();
  });

  it("관리자 세션이어도 다른 교사의 비공유 교재는 404다", async () => {
    boundary.auth.mockResolvedValue(
      teacherSession(f.colleague, { isAdmin: true, menus: [] }),
    );
    await expect(page(f, { view: "key" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(
      boundary.query.mock.calls.some(([sql]) =>
        String(sql).includes('FROM "textbook_concept"'),
      ),
    ).toBe(false);
  });

  it("세션이 승인 상태여도 현재 정지된 소유자의 본문은 조회하지 않는다", async () => {
    const stopped = await fixture();
    boundary.auth.mockResolvedValue(teacherSession(stopped.owner));
    await pg.query(
      `UPDATE "user" SET "suspended_at" = now() WHERE "id" = $1::uuid`,
      [stopped.userA],
    );
    boundary.query.mockClear();
    await expect(page(stopped)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(boundary.query).toHaveBeenCalledTimes(1);
    expect(String(boundary.query.mock.calls[0][0])).toContain('FROM "user"');
  });

  it("지점을 떠난 동료는 오래된 세션의 지점 값으로 답지를 열지 못한다", async () => {
    const shared = await fixture({ share: true });
    boundary.auth.mockResolvedValue(teacherSession(shared.colleague));
    expect(paperOf(await page(shared, { view: "key" }))).not.toBeNull();
    await pg.query(
      `UPDATE "user" SET "branch_id" = NULL WHERE "id" = $1::uuid`,
      [shared.userB],
    );
    await expect(page(shared, { view: "key" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it.each([
    { editionId: "not-a-uuid", conceptKey: "safe" },
    {
      editionId: "11111111-1111-4111-8111-111111111111",
      conceptKey: "../../other",
    },
    {
      editionId: "11111111-1111-4111-8111-111111111111",
      conceptKey: "x?view=key",
    },
  ])(
    "잘못된 경로 $conceptKey/$editionId는 인증과 SQL 전에 거절한다",
    async (path) => {
      await expect(page(path)).rejects.toThrow("NEXT_NOT_FOUND");
      expect(boundary.auth).not.toHaveBeenCalled();
      expect(boundary.query).not.toHaveBeenCalled();
    },
  );

  it.each<{ view: PrintQuery["view"]; expected: "student" | "key" | "both" }>([
    { view: "student", expected: "student" },
    { view: "key", expected: "key" },
    { view: "both", expected: "both" },
    { view: "javascript:alert(1)", expected: "both" },
    { view: ["student", "key"], expected: "student" },
  ])(
    "인쇄 뷰 $view는 안전한 $expected 값만 지면에 넘긴다",
    async ({ view, expected }) => {
      const paper = paperOf(await page(f, { view }));
      expect(paper?.props.view).toBe(expected);
      expect(paper?.props.sheets[0].header.title).toBe("옛 소단원 이름");
      expect(paper?.props.code).toBeUndefined();
    },
  );

  it("print는 정확한 1일 때만 실행 요소를 붙인다", async () => {
    expect(findElement(await page(f, { print: "1" }), PrintNow)).not.toBeNull();
    expect(
      findElement(await page(f, { print: "1<script>" }), PrintNow),
    ).toBeNull();
    expect(findElement(await page(f), PrintNow)).toBeNull();
  });

  it("초안은 안내만 내보내고 지면과 자동 인쇄는 내보내지 않는다", async () => {
    const draft = await fixture({ publish: false });
    boundary.auth.mockResolvedValue(teacherSession(draft.owner));
    const result = await page(draft, { view: "key", print: "1" });
    expect(paperOf(result)).toBeNull();
    expect(findElement(result, PrintNow)).toBeNull();
    const notice = findElement<{ role: string; children: string }>(result, "p");
    expect(notice?.props.role).toBe("alert");
    expect(notice?.props.children).toContain(
      "발행한 교재의 개념백지만 인쇄할 수 있습니다.",
    );
  });

  it("페이지에서도 무결성 오류는 교사 지면으로 바꾸지 않고 실패한다", async () => {
    const tampered = await fixture({
      change: (concept) => {
        concept.body.definition = "위조된 원고";
      },
    });
    boundary.auth.mockResolvedValue(teacherSession(tampered.owner));
    await expect(page(tampered, { view: "key", print: "1" })).rejects.toThrow(
      "발행 개념의 내용 해시가 일치하지 않습니다.",
    );
  });
});
