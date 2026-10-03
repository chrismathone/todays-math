/**
 * 교재 서버 코드를 PGlite(실제 Postgres 엔진 · 저장소의 마이그레이션 사슬 전부) 위에서 돌리는 하네스.
 *
 * 제품은 `TextbookDb` 를 Prisma 로 채우고(`server/prismaSql.ts`), 시험은 여기서 PGlite 로 채운다 —
 * **도는 SQL 은 글자까지 같다.** 손으로 지은 메모리 대역이 아니라서 트리거 · 복합 FK · 부분 유일 색인이 같이 돈다.
 * 🔴 PGlite 는 연결이 하나다. 두 요청이 잠금을 다투는 경합은 `scripts/qa/textbook-concurrency-check.ts` 가 잰다.
 */
import { randomUUID } from "node:crypto";

import type { TextbookConfig } from "@/contracts/textbookExchange.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import type { RequestKey } from "@/lib/textbook/server/requests";
import type {
  SqlParam,
  TextbookDb,
  TextbookSql,
} from "@/lib/textbook/server/sql";

import { type Db, fakeHash, sqlNow } from "./textbookPglite";

type Queryable = Pick<Db, "query">;

function wrap(target: Queryable): TextbookSql {
  return {
    query: async <T>(text: string, params: readonly SqlParam[] = []) =>
      (await target.query<T>(text, [...params])).rows,
    execute: async (text, params = []) =>
      (await target.query(text, [...params])).affectedRows ?? 0,
  };
}

export function pgliteTextbookDb(db: Db): TextbookDb {
  return {
    ...wrap(db),
    transaction: (run) => db.transaction((tx) => run(wrap(tx as Queryable))),
  };
}

/** 지점에 속한 승인된 교사 한 명 */
export async function insertTeacher(
  db: Db,
  input: { branchId?: string | null; name?: string } = {},
): Promise<TextbookActor> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO "user" ("id", "email", "name", "branch_id", "approval_status", "updated_at")
     VALUES ($1, $2, $3, $4, 'approved', $5)`,
    [
      id,
      `${id}@example.test`,
      input.name ?? "교사",
      input.branchId ?? null,
      sqlNow(),
    ],
  );
  return { id, name: input.name ?? "교사", branchId: input.branchId ?? null };
}

export async function insertBranch(db: Db): Promise<string> {
  const id = randomUUID();
  await db.query(`INSERT INTO "branch" ("id", "name") VALUES ($1, $2)`, [
    id,
    `지점-${id.slice(0, 8)}`,
  ]);
  return id;
}

/** 요청 열쇠 — 시험마다 새 requestId. `body` 가 같으면 본문 해시도 같다 */
export function requestKey(
  actor: TextbookActor,
  operation: string,
  body: unknown = {},
  requestId: string = randomUUID(),
  editionId: string | null = null,
): RequestKey {
  return {
    userId: actor.id,
    requestId,
    operation,
    bodyHash: fakeHash(JSON.stringify(body)),
    editionId,
  };
}

export const sampleConfig = (
  overrides: Partial<TextbookConfig> = {},
): TextbookConfig => ({
  bookId: "placeholder",
  schoolLevel: "middle",
  grade: 2,
  semester: 1,
  volume: 1,
  volumeCount: 2,
  displayCode: "2-1-1",
  title: "중2-1 개념과 유형",
  curriculumVersion: "2022",
  mode: "integrated",
  pageBudget: { target: 260, tolerance: 8, strict: false },
  print: {
    paper: "A4",
    innerMarginMm: 20,
    outerMarginMm: 15,
    sectionStart: "even-left",
    coverMode: "separate",
    firstPhysicalPageIndex: 1,
  },
  videoPolicy: "optional",
  ...overrides,
});

/** 머리만 있는 PNG — 치수를 읽을 수 있을 만큼(서명 + IHDR). 내용은 `seed` 로 가른다 */
export function tinyPng(width: number, height: number, seed = ""): Buffer {
  const head = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0);
  head.writeUInt32BE(13, 8);
  head.write("IHDR", 12, "latin1");
  head.writeUInt32BE(width, 16);
  head.writeUInt32BE(height, 20);
  return Buffer.concat([head, Buffer.from(seed)]);
}

export interface BankProblemInput {
  content?: string;
  answer?: string;
  solution?: string | null;
  questionType?: string | null;
  difficulty?: string;
  reviewStatus?: "pending" | "approved" | "rejected";
  directUseAllowed?: boolean;
  pool?: "shared" | "private";
  figureSvg?: string | null;
  figureUrls?: string[];
  figureDims?: number[];
  figureSourceMm?: number[];
  choiceFigureIndex?: number[];
  score?: number | null;
}

/** 출제 자격이 있는 은행 문항(기본값) — 칸을 덮어써 자격을 잃게 하거나 그림을 단다 */
export async function insertBankProblem(
  db: Db,
  unitId: string,
  input: BankProblemInput = {},
): Promise<{ id: string; code: string }> {
  const id = randomUUID();
  const { rows } = await db.query<{ problem_code: string }>(
    `INSERT INTO "problem" ("id", "unit_id", "source", "difficulty", "problem_type", "question_type", "content", "answer",
        "solution", "figure_svg", "figure_urls", "figure_dims", "figure_source_mm", "choice_figure_index", "score",
        "review_status", "direct_use_allowed", "pool", "updated_at")
     VALUES ($1, $2, 'manual', $3::"difficulty", '단답형', $4, $5, $6, $7, $8,
             ARRAY(SELECT jsonb_array_elements_text($9::jsonb)), ARRAY(SELECT (jsonb_array_elements_text($10::jsonb))::int),
             ARRAY(SELECT (jsonb_array_elements_text($11::jsonb))::float8), ARRAY(SELECT (jsonb_array_elements_text($12::jsonb))::int),
             $13, $14::"review_status", $15, $16::"problem_pool", $17)
     RETURNING "problem_code"`,
    [
      id,
      unitId,
      input.difficulty ?? "기본",
      input.questionType ?? null,
      input.content ?? "다음을 계산하시오.",
      input.answer ?? "3",
      input.solution === undefined ? "풀이" : input.solution,
      input.figureSvg ?? null,
      JSON.stringify(input.figureUrls ?? []),
      JSON.stringify(input.figureDims ?? []),
      JSON.stringify(input.figureSourceMm ?? []),
      JSON.stringify(input.choiceFigureIndex ?? []),
      input.score ?? null,
      input.reviewStatus ?? "approved",
      input.directUseAllowed ?? true,
      input.pool ?? "shared",
      sqlNow(),
    ],
  );
  return { id, code: rows[0]!.problem_code };
}

export const TEST_ORIGIN = "https://textbook.todays-math.kr";

/**
 * 결정적인 대역 조판기가 든 발행 의존물 — Chromium 을 띄우지 않는다.
 * 쪽 계획 · 다시 읽은 QR 은 교환 형식에서 그대로 지어낸다(서버 쪽 차례와 검증을 재는 시험용이다).
 */
export function fakePublishDeps(): import("@/lib/textbook/publish/rendererAdapter").PublishDeps {
  type QrReadback = import("@/lib/textbook/publish/rendererAdapter").QrReadback;
  return {
    officialOrigin: TEST_ORIGIN,
    now: () => new Date("2026-10-03T03:00:00.000Z"),
    validate: async () => [],
    freezeConcept: (concept) => ({
      ...concept,
      frozen: {
        contentHash: fakeHash(`frozen:${concept.conceptKey}`),
        parserVersion: "p1",
        compositionVersion: "c1",
        mappingVersion: concept.mappingVersion,
        sections: [],
        entries: [],
        selection: [],
        assetHashes: [],
      },
    }),
    renderer: {
      rendererVersion: "fake.renderer.v1",
      templateVersion: "fake.template.v1",
      async renderChunk(input) {
        const flat = input.exchange.units.flatMap((unit) =>
          unit.sections.map(
            (section) => `${unit.unitKey}/${section.sectionKey}`,
          ),
        );
        const keys = new Set(input.sectionIndices.map((index) => flat[index]!));
        const items = input.exchange.items.filter((item) =>
          keys.has(`${item.unitKey}/${item.sectionKey}`),
        );
        const concepts = (
          input.exchange.conceptIntegration?.concepts ?? []
        ).filter(
          (concept) =>
            concept.sectionKey &&
            keys.has(`${concept.unitKey}/${concept.sectionKey}`),
        );
        const qrChecks: QrReadback[] = [
          ...items.map((item) =>
            input.exchange.qrTargets.find((qr) => qr.itemId === item.itemId)!,
          ),
          ...concepts.flatMap((concept) =>
            (input.exchange.conceptQrTargets ?? []).filter(
              (qr) => qr.conceptKey === concept.conceptKey,
            ),
          ),
        ].map((qr) => ({
          qrTargetId: qr.qrTargetId,
          url: qr.url,
          decodedUrl: qr.url,
          physicalPageIndex: input.firstPhysicalPageIndex,
        }));
        return {
          pdf: Buffer.from(
            `%PDF-fake ${input.variant} ${input.sectionIndices.join(",")} ${randomUUID()}`,
          ),
          pageCount: 2,
          pageMap: items.map((item) => ({
            itemId: item.itemId,
            physicalPageIndex: input.firstPhysicalPageIndex,
            printedPageLabel: String(input.firstPhysicalPageIndex),
            column: 1 as const,
          })),
          issues: [],
          qrChecks,
          nextPhysicalPageIndex: input.firstPhysicalPageIndex + 2,
          carry: { qrChecks },
        };
      },
      async mergeChunks(chunks) {
        return {
          pdf: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk.pdf))),
          pageCount: chunks.reduce((sum, chunk) => sum + chunk.pageCount, 0),
          qrChecks: chunks.flatMap(
            (chunk) => (chunk.carry as { qrChecks: QrReadback[] }).qrChecks,
          ),
        };
      },
    },
  };
}
