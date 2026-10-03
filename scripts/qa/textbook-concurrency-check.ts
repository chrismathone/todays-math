/**
 * 교재 서버 코드의 **경합**을 진짜 Postgres 에서 잰다 — 두 요청이 같은 줄의 잠금을 다툴 때 불변식이 지켜지는가.
 *
 * vitest 의 교재 시험은 PGlite 에서 돈다. PGlite 는 연결이 하나라 «문장의 차례»는 재도 «잠금의 경합»은 못 잰다.
 * 이 스크립트는 **제품과 같은 길**(Prisma 연결 풀 → `prismaTextbookDb` → 같은 서버 함수)로 두 요청을 동시에 던진다.
 *
 *   TEXTBOOK_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/textbook_test \
 *   NODE_OPTIONS=--conditions=react-server \
 *     node node_modules/tsx/dist/cli.mjs scripts/qa/textbook-concurrency-check.ts
 *
 * 🔴 **격리된 로컬 Postgres 에만** 붙는다 — 주소가 127.0.0.1 · localhost 가 아니면 시작하지 않는다.
 *    공유 DB 에는 절대 돌리지 않는다(행을 수천 개 쓴다). DB 에는 저장소의 마이그레이션이 전부 적용돼 있어야 한다.
 *    (`--conditions=react-server` 는 `server-only` 를 빈 모듈로 풀기 위한 것이다. tsx 가 띄우는 자식 프로세스까지
 *     닿아야 해서 `node` 의 인자가 아니라 `NODE_OPTIONS` 로 준다.)
 *
 * «저장 ↔ 확정» · «날 UPDATE ↔ 확정»은 **두 차례가 다 나와야** 통과다(끝의 «누가 이겼나») — 한쪽만 이기면 실패로 센다.
 *
 * 재는 것 — 두 결과가 **둘 다 성공**하면 불변식이 깨진 것이다:
 *   ⑴ 구획 저장 ↔ 발행 확정       → 정확히 하나만. 발행됐으면 그 저장은 발행본에 없다
 *   ⑵ 트리거 밖의 날 UPDATE ↔ 확정 → 정확히 하나만(앱을 안 거친 쓰기도 DB 가 줄을 세운다)
 *   ⑶ 같은 걸음을 두 요청이         → 조판기는 한 번만 불린다
 *   ⑷ 같은 requestId 로 책 만들기 둘 → 책은 하나
 *   ⑸ 새 판본 만들기 둘              → 초안은 하나
 *   ⑹ 발행 예약 둘                   → 열린 발행 작업은 하나
 *   ⑺ 같은 revision 으로 담기 둘     → 하나만 담긴다
 *   ⑻ 같은 바이트를 두 계정이 올리기 → 바이트는 한 줄, 둘 다 끝맺는다
 */
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import type { TextbookConfig } from "@/contracts/textbookExchange.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import { manifestHash, sha256 } from "@/lib/textbook/hash.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import type {
  PublishDeps,
  QrReadback,
} from "@/lib/textbook/publish/rendererAdapter";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import { completeUpload, putUploadChunk } from "@/lib/textbook/server/blobs";
import { createBook, createEdition } from "@/lib/textbook/server/books";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { captureItems } from "@/lib/textbook/server/items";
import type { RequestKey } from "@/lib/textbook/server/requests";
import { getSection, saveSection } from "@/lib/textbook/server/sections";
import {
  type RawSqlRoot,
  prismaTextbookDb,
} from "@/lib/textbook/server/sqlAdapter";

const url = process.env.TEXTBOOK_TEST_DATABASE_URL ?? "";
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  // 아래에서 거절한다
}
if (host !== "127.0.0.1" && host !== "localhost") {
  console.error(
    "TEXTBOOK_TEST_DATABASE_URL 이 격리된 로컬 Postgres(127.0.0.1)가 아니다. 시작하지 않는다.",
  );
  process.exit(1);
}

const ROUNDS = Number(process.env.TEXTBOOK_CONCURRENCY_ROUNDS ?? "12");
const prisma = new PrismaClient({ datasources: { db: { url } } });
const db = prismaTextbookDb(prisma as unknown as RawSqlRoot);
const ORIGIN = "https://textbook.todays-math.kr";

let rendered = 0;
const deps: PublishDeps = {
  officialOrigin: ORIGIN,
  now: () => new Date(),
  validate: async () => [],
  freezeConcept: (concept) => concept,
  renderer: {
    rendererVersion: "check.renderer.v1",
    templateVersion: "check.template.v1",
    async renderChunk(input) {
      rendered += 1;
      // 조판이 걸리는 시간을 흉내 낸다 — 두 요청이 겹칠 틈을 준다
      await new Promise((resolve) => setTimeout(resolve, 40));
      const flat = input.exchange.units.flatMap((unit) =>
        unit.sections.map((section) => `${unit.unitKey}/${section.sectionKey}`),
      );
      const keys = new Set(input.sectionIndices.map((index) => flat[index]!));
      const items = input.exchange.items.filter((item) =>
        keys.has(`${item.unitKey}/${item.sectionKey}`),
      );
      const qrChecks: QrReadback[] = items.map((item) => {
        const qr = input.exchange.qrTargets.find(
          (target) => target.itemId === item.itemId,
        )!;
        return {
          qrTargetId: qr.qrTargetId,
          url: qr.url,
          decodedUrl: qr.url,
          physicalPageIndex: input.firstPhysicalPageIndex,
        };
      });
      return {
        pdf: Buffer.from(`%PDF-check ${input.variant} ${randomUUID()}`),
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

const key = (
  actor: TextbookActor,
  operation: string,
  requestId = randomUUID(),
  body: unknown = requestId,
): RequestKey => ({
  userId: actor.id,
  requestId,
  operation,
  bodyHash: sha256(Buffer.from(JSON.stringify(body))),
});

const config: TextbookConfig = {
  bookId: "placeholder",
  schoolLevel: "middle",
  grade: 2,
  semester: 1,
  volume: 1,
  volumeCount: 2,
  displayCode: "2-1-1",
  title: "경합 점검",
  curriculumVersion: "2022",
  mode: "integrated",
  pageBudget: { target: 100, tolerance: 8, strict: false },
  print: {
    paper: "A4",
    innerMarginMm: 20,
    outerMarginMm: 15,
    sectionStart: "even-left",
    coverMode: "separate",
    firstPhysicalPageIndex: 1,
  },
  videoPolicy: "optional",
};

async function sql<T>(text: string, ...params: unknown[]): Promise<T[]> {
  return (await prisma.$queryRawUnsafe(text, ...params)) as T[];
}

async function teacher(): Promise<TextbookActor> {
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "user" ("id", "email", "name", "approval_status", "updated_at") VALUES ($1::uuid, $2, '교사', 'approved', now())`,
    id,
    `${id}@example.test`,
  );
  return { id, name: "교사", branchId: null };
}

let unitId = "";
async function problem(): Promise<string> {
  if (!unitId) {
    unitId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "unit" ("id", "grade", "chapter", "section", "order_index", "problem_code_prefix")
       VALUES ($1::uuid, '중2', '경합', $2, 1, $3)`,
      unitId,
      `경합-${unitId.slice(0, 8)}`,
      `J2${String(1000 + Math.floor(Math.random() * 8999))}`,
    );
  }
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "problem" ("id", "unit_id", "source", "difficulty", "problem_type", "content", "answer", "review_status", "updated_at")
     VALUES ($1::uuid, $2::uuid, 'manual', '기본', '단답형', $3, '1', 'approved', now())`,
    id,
    unitId,
    `문제 ${id}`,
  );
  return id;
}

/** 구획 하나 · 문항 둘이 놓인 초안 */
async function draft(actor: TextbookActor) {
  const { book } = await createBook(db, actor, key(actor, "book-create"), {
    config,
  });
  const editionId = book.draftEditionId!;
  const detail = await getEditionDetail(db, actor, editionId);
  await saveStructure(db, actor, editionId, key(actor, "structure-save"), {
    expectedRevision: detail.structureRevision,
    config: detail.config,
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
  });
  const sectionId = randomUUID();
  const saved = await saveSection(
    db,
    actor,
    editionId,
    sectionId,
    key(actor, "section-save"),
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
  const captured = await captureItems(
    db,
    actor,
    editionId,
    key(actor, "capture"),
    {
      expectedRevision: saved.aggregateRevision,
      sectionId,
      source: {
        kind: "problems",
        problemIds: [await problem(), await problem()],
      },
    },
    async () => null,
  );
  return {
    bookId: book.id,
    editionId,
    sectionId,
    items: captured.items,
    revision: captured.aggregateRevision,
  };
}

async function readyToFinalize(actor: TextbookActor) {
  const made = await draft(actor);
  const requestId = randomUUID();
  await reservePublish(
    db,
    actor,
    made.editionId,
    { requestId, expectedRevision: made.revision },
    sha256(Buffer.from(requestId)),
    deps,
  );
  let job = await runNextStep(db, actor, made.editionId, requestId, deps);
  while (job.status === "rendering" || job.status === "verifying")
    job = await runNextStep(db, actor, made.editionId, requestId, deps);
  if (job.status !== "ready")
    throw new Error(`조판이 끝나지 않았다: ${job.status}`);
  return { ...made, requestId };
}

const statusOf = async (editionId: string) =>
  (
    await sql<{ status: string }>(
      `SELECT "status" FROM "textbook_edition" WHERE "id" = $1::uuid`,
      editionId,
    )
  )[0]!.status;

const failures: string[] = [];
function check(name: string, ok: boolean, detail: string) {
  if (!ok) failures.push(`${name}: ${detail}`);
}
const ok = (result: PromiseSettledResult<unknown>) =>
  result.status === "fulfilled";
const why = (result: PromiseSettledResult<unknown>) =>
  result.status === "rejected"
    ? String((result.reason as Error)?.message ?? result.reason).slice(0, 120)
    : "성공";

/**
 * 확정은 잠그기 전에 읽는 일이 많아 같이 출발하면 늘 진다. 그러면 «확정이 먼저 잠근 차례»가 한 번도 안 재진다 —
 * 상대의 출발을 회차마다 다르게 늦춰 두 차례가 다 나오게 한다(끝에 «누가 이겼나»로 확인한다).
 */
const STAGGER_MS = [0, 10, 25, 50, 100, 200];
const staggered = async <T>(
  round: number,
  run: () => Promise<T>,
): Promise<T> => {
  await new Promise((resolve) =>
    setTimeout(resolve, STAGGER_MS[round % STAGGER_MS.length]),
  );
  return run();
};

async function saveVersusFinalize(actor: TextbookActor, round: number) {
  const made = await readyToFinalize(actor);
  const section = await getSection(db, actor, made.editionId, made.sectionId);
  const title = `확정과 겹친 저장 ${round}`;
  const [save, finalize] = await Promise.allSettled([
    staggered(round, () =>
      saveSection(
        db,
        actor,
        made.editionId,
        made.sectionId,
        key(actor, "section-save"),
        {
          expectedRevision: section.revision,
          unitKey: "u1",
          section: { ...section.section, title },
        },
      ),
    ),
    finalizePublish(db, actor, made.editionId, made.requestId, deps),
  ]);
  const status = await statusOf(made.editionId);
  const after = await getSection(db, actor, made.editionId, made.sectionId);
  check(
    "⑴ 저장 ↔ 확정",
    ok(save) !== ok(finalize),
    `저장 ${why(save)} · 확정 ${why(finalize)}`,
  );
  check(
    "⑴ 발행됐으면 그 저장은 발행본에 없다",
    (status === "published") === ok(finalize) &&
      (status === "published"
        ? after.section.title !== title
        : after.section.title === title),
    `상태 ${status} · 제목 «${after.section.title}»`,
  );
  if (status === "published") {
    const exchange = await assembleExchange(db, made.editionId, {
      exportedAt: new Date().toISOString(),
    });
    check(
      "⑴ 발행본의 manifest 가 다시 계산해도 같다",
      manifestHash(exchange) === exchange.edition.manifestHash,
      made.editionId,
    );
  }
  return ok(finalize) ? "확정" : "저장";
}

async function rawWriteVersusFinalize(actor: TextbookActor, round: number) {
  const made = await readyToFinalize(actor);
  const [raw, finalize] = await Promise.allSettled([
    // 앱을 거치지 않는 쓰기 — 판본 행도 revision 도 건드리지 않는다
    staggered(round, () =>
      prisma.$executeRawUnsafe(
        `UPDATE "textbook_item" SET "layout" = '{"columnSpan": 2}'::jsonb WHERE "id" = $1::uuid`,
        made.items[0]!.itemId,
      ),
    ),
    finalizePublish(db, actor, made.editionId, made.requestId, deps),
  ]);
  check(
    "⑵ 날 UPDATE ↔ 확정",
    ok(raw) !== ok(finalize),
    `날 UPDATE ${why(raw)} · 확정 ${why(finalize)}`,
  );
  return ok(finalize) ? "확정" : "날 UPDATE";
}

async function twoStepRunners(actor: TextbookActor) {
  const made = await draft(actor);
  const requestId = randomUUID();
  await reservePublish(
    db,
    actor,
    made.editionId,
    { requestId, expectedRevision: made.revision },
    sha256(Buffer.from(requestId)),
    deps,
  );
  const before = rendered;
  await Promise.allSettled([
    runNextStep(db, actor, made.editionId, requestId, deps),
    runNextStep(db, actor, made.editionId, requestId, deps),
    runNextStep(db, actor, made.editionId, requestId, deps),
  ]);
  check(
    "⑶ 같은 걸음은 한 번만 조판한다",
    rendered - before === 1,
    `조판 ${rendered - before}번`,
  );
}

async function sameRequestTwice(actor: TextbookActor) {
  const requestId = randomUUID();
  await Promise.allSettled([
    createBook(db, actor, key(actor, "book-create", requestId, "same"), {
      config,
    }),
    createBook(db, actor, key(actor, "book-create", requestId, "same"), {
      config,
    }),
  ]);
  const [row] = await sql<{ result: { bookId: string } | null }>(
    `SELECT "result" FROM "textbook_request" WHERE "user_id" = $1::uuid AND "request_id" = $2::uuid`,
    actor.id,
    requestId,
  );
  const [{ n }] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM "textbook" WHERE "user_id" = $1::uuid`,
    actor.id,
  );
  check(
    "⑷ 같은 요청은 책 하나",
    n === 1 && Boolean(row?.result?.bookId),
    `책 ${n}권`,
  );
}

async function twoEditions(actor: TextbookActor) {
  const made = await readyToFinalize(actor);
  await finalizePublish(db, actor, made.editionId, made.requestId, deps);
  const results = await Promise.allSettled([
    createEdition(db, actor, made.bookId, key(actor, "edition-create"), {
      label: "2판-가",
    }),
    createEdition(db, actor, made.bookId, key(actor, "edition-create"), {
      label: "2판-나",
    }),
  ]);
  const [{ n }] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM "textbook_edition" WHERE "textbook_id" = $1::uuid AND "status" = 'draft'`,
    made.bookId,
  );
  check(
    "⑸ 초안은 하나",
    n === 1 && results.filter(ok).length === 1,
    `초안 ${n} · 성공 ${results.filter(ok).length} (${results.map(why).join(" / ")})`,
  );
}

async function twoReserves(actor: TextbookActor) {
  const made = await draft(actor);
  const reserve = () => {
    const requestId = randomUUID();
    return reservePublish(
      db,
      actor,
      made.editionId,
      { requestId, expectedRevision: made.revision },
      sha256(Buffer.from(requestId)),
      deps,
    );
  };
  await Promise.allSettled([reserve(), reserve()]);
  const [{ open, qr }] = await sql<{ open: number; qr: number }>(
    `SELECT (SELECT count(*)::int FROM "textbook_request" WHERE "edition_id" = $1::uuid AND "operation" = 'publish' AND "state" = 'open') AS open,
            (SELECT count(*)::int FROM "textbook_qr_target" WHERE "edition_id" = $1::uuid) AS qr`,
    made.editionId,
  );
  check(
    "⑹ 열린 발행 작업은 하나 · QR 은 배치마다 하나",
    open <= 1 && qr === 2,
    `열림 ${open} · QR ${qr}`,
  );
}

async function twoCaptures(actor: TextbookActor) {
  const made = await draft(actor);
  const capture = async () =>
    captureItems(
      db,
      actor,
      made.editionId,
      key(actor, "capture"),
      {
        expectedRevision: made.revision,
        sectionId: made.sectionId,
        source: { kind: "problems", problemIds: [await problem()] },
      },
      async () => null,
    );
  const results = await Promise.allSettled([capture(), capture()]);
  const [{ n }] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM "textbook_item" WHERE "edition_id" = $1::uuid`,
    made.editionId,
  );
  const section = await getSection(db, actor, made.editionId, made.sectionId);
  check(
    "⑺ 같은 revision 으로는 하나만 담긴다",
    results.filter(ok).length === 1 &&
      n === 3 &&
      section.section.blocks.length === 3,
    `성공 ${results.filter(ok).length} · 배치 ${n} · 블록 ${section.section.blocks.length} (${results.map(why).join(" / ")})`,
  );
}

async function sameBytesTwoOwners(a: TextbookActor, b: TextbookActor) {
  const bytes = Buffer.from(`같은 바이트 ${randomUUID()}`);
  const hash = sha256(bytes);
  const upload = async (actor: TextbookActor) => {
    await putUploadChunk(db, actor, hash, 0, bytes);
    return completeUpload(db, actor, hash, { byteLength: bytes.length });
  };
  const results = await Promise.allSettled([upload(a), upload(b)]);
  const [{ n }] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM "textbook_blob" WHERE "sha256" = $1`,
    hash,
  );
  check(
    "⑻ 같은 바이트는 한 줄 · 둘 다 끝맺는다",
    n === 1 && results.every(ok),
    `바이트 ${n}줄 · ${results.map(why).join(" / ")}`,
  );
}

async function main() {
  const [{ version }] = await sql<{ version: string }>(`SELECT version()`);
  console.log(version.split(",")[0]);
  const tables = await sql(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'textbook_edition'`,
  );
  if (!tables.length)
    throw new Error("교재 표가 없다 — 이 DB 에 마이그레이션을 먼저 적용한다");
  const owner = await teacher();
  const other = await teacher();

  const winners: Record<string, number> = {};
  for (let round = 0; round < ROUNDS; round++) {
    const winner = await saveVersusFinalize(owner, round);
    winners[`⑴ ${winner}`] = (winners[`⑴ ${winner}`] ?? 0) + 1;
    const raw = await rawWriteVersusFinalize(owner, round);
    winners[`⑵ ${raw}`] = (winners[`⑵ ${raw}`] ?? 0) + 1;
    await twoStepRunners(owner);
    await sameRequestTwice(await teacher());
    await twoEditions(owner);
    await twoReserves(owner);
    await twoCaptures(owner);
    await sameBytesTwoOwners(owner, other);
  }
  console.log(`${ROUNDS}회 · 누가 이겼나: ${JSON.stringify(winners)}`);
  // 한쪽만 이겼으면 다른 차례는 재지 못한 것이다 — «0건»을 통과로 읽지 않는다
  for (const race of ["⑴", "⑵"])
    if (Object.keys(winners).filter((name) => name.startsWith(race)).length < 2)
      failures.push(
        `${race} 한쪽만 이겼다 — 두 차례가 다 나오도록 출발 간격(STAGGER_MS)을 고친다`,
      );
  if (failures.length) {
    console.error(`🔴 불변식이 깨졌다 ${failures.length}건:`);
    for (const failure of [...new Set(failures)].slice(0, 30))
      console.error(`  ${failure}`);
    process.exitCode = 1;
  } else {
    console.log("경합 8갈래 — 깨진 불변식 0건.");
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
