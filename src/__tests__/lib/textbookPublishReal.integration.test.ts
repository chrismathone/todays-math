// @vitest-environment node
/**
 * 발행의 끝에서 끝 — **실제 조판기**(로컬 Chromium · PDF 합치기 · QR 픽셀 해독)를 서버의 발행 경로에 그대로 꽂는다.
 * 대역 조판기 시험(`textbookPublish*.test.ts`)이 서버 쪽 차례를 잰다면, 여기서는 «둘이 실제로 맞물리는가»를 잰다:
 * 서버가 조립한 교환 형식을 조판기가 받아들이는가 · 걸음 줄에 보관했다 꺼낸 값으로 해설판 · 합치기 · 펼침면이 되는가 ·
 * 조판기가 낸 쪽 계획 · 다시 읽은 QR 이 확정의 검증을 지나는가 · 산출물 여덟 가지가 실제 바이트로 남는가.
 *
 *   TEXTBOOK_PDF_TEST=1 npx vitest run src/__tests__/lib/textbookPublishReal.integration.test.ts
 *
 * 기본 실행에서는 건너뛴다(브라우저를 띄운다 — 조판기 쪽 통합 시험과 같은 표지를 쓴다). DB 는 PGlite 다.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookActor } from "@/lib/textbook/access";
import { readTextbookArchive } from "@/lib/textbook/archive/package.server";
import { sha256 } from "@/lib/textbook/hash.server";
import { codexRenderer } from "@/lib/textbook/publish/codexRenderer";
import { publishDeps } from "@/lib/textbook/publish/deps.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import type { PublishDeps } from "@/lib/textbook/publish/rendererAdapter";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import { createBook } from "@/lib/textbook/server/books";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { exportEdition } from "@/lib/textbook/server/exportEdition";
import { captureItems, updateItem } from "@/lib/textbook/server/items";
import { saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";

import {
  type Db,
  type World,
  fakeHash,
  openTextbookDb,
  seedWorld,
} from "../helpers/textbookPglite";
import {
  insertBankProblem,
  insertTeacher,
  pgliteTextbookDb,
  requestKey,
  sampleConfig,
} from "../helpers/textbookServerWorld";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
const ORIGIN = "https://textbook.todays-math.kr";

let pg: Db;
let db: TextbookDb;
let world: World;
let owner: TextbookActor;

beforeAll(async () => {
  if (!run) return;
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  owner = await insertTeacher(pg, { name: "주인" });
}, 120_000);
afterAll(async () => {
  if (run) await pg.close();
});

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><path d="M10 70 L60 10 L110 70 Z" fill="none" stroke="black"/></svg>`;

describe.skipIf(!run)("실제 조판기로 발행한다", () => {
  it("예약 → 걸음 여섯 → 확정. 산출물 여덟 가지가 실제 PDF · HTML · ZIP 으로 남고, 패키지를 다시 읽을 수 있다", async () => {
    const deps: PublishDeps = {
      ...publishDeps(codexRenderer),
      officialOrigin: ORIGIN,
    };

    const { book } = await createBook(
      db,
      owner,
      requestKey(owner, "book-create"),
      // 첫 구획은 왼쪽(짝수) 면에서 시작한다 — 본문이 2쪽부터다. 조판기는 빈 쪽을 끼워 넣지 않는다
      {
        config: sampleConfig({
          print: { ...sampleConfig().print, firstPhysicalPageIndex: 2 },
        }),
      },
    );
    const editionId = book.draftEditionId!;
    const detail = await getEditionDetail(db, owner, editionId);
    await saveStructure(
      db,
      owner,
      editionId,
      requestKey(owner, "structure-save"),
      {
        expectedRevision: detail.structureRevision,
        config: detail.config,
        outline: [
          {
            unitKey: "u1",
            title: "유리수와 순환소수",
            sourceUnitIds: [],
            prerequisites: [],
            goals: [],
            conceptLectureRefs: [],
            sections: [],
          },
        ],
      },
    );
    const sectionIds = [randomUUID(), randomUUID()];
    let revision = 0;
    for (const [index, sectionId] of sectionIds.entries())
      revision = (
        await saveSection(
          db,
          owner,
          editionId,
          sectionId,
          requestKey(owner, "section-save"),
          {
            expectedRevision: 0,
            unitKey: "u1",
            section: {
              sectionKey: `s${index}`,
              title: `구획 ${index + 1}`,
              templateKey: "basic",
              // 둘째 구획은 앞 구획에 이어서 시작한다(한 쪽짜리 구획 뒤에 왼쪽 면을 맞출 빈 쪽이 없다)
              startPolicy: index === 0 ? "even-left" : "continue",
              blocks: [],
            },
          },
        )
      ).aggregateRevision;
    // 그림(SVG) 있는 문항 하나와 수식이 든 문항 둘
    const figurePath = `/figures-svg/real/${randomUUID()}.svg`;
    const problems = [
      await insertBankProblem(pg, world.unitId, {
        content: "다음 삼각형의 넓이를 구하시오.",
        answer: "12",
        figureUrls: [figurePath],
        figureDims: [120, 80],
        // 발문의 그림이다(0) — 짝을 모르는 그림(빈 배열)은 검증기가 발행을 막는다
        choiceFigureIndex: [0],
      }),
      await insertBankProblem(pg, world.unitId, {
        content: "$\\frac{1}{3}$ 을 소수로 나타내시오.",
        answer: "$0.\\dot{3}$",
      }),
      await insertBankProblem(pg, world.unitId, {
        content: "$x^2 - 4 = 0$ 의 해를 구하시오.",
        answer: "$x = \\pm 2$",
      }),
    ];
    const loadFigure = async (path: string) =>
      path === figurePath ? Buffer.from(SVG) : null;
    for (const [index, ids] of [
      [problems[0]!.id, problems[1]!.id],
      [problems[2]!.id],
    ].entries()) {
      const captured = await captureItems(
        db,
        owner,
        editionId,
        requestKey(owner, "capture"),
        {
          expectedRevision: revision,
          sectionId: sectionIds[index]!,
          source: { kind: "problems", problemIds: ids },
        },
        loadFigure,
      );
      expect(captured.excluded).toEqual([]);
      revision = captured.aggregateRevision;
      // 해설판은 학생용의 그 문항 자리에 정답 · 해설을 놓는다 — 풀이 줄이 없으면 자리가 모자라 조판이 멈춘다
      for (const item of captured.items)
        revision = (
          await updateItem(
            db,
            owner,
            editionId,
            item.itemId,
            requestKey(owner, "item-update"),
            {
              expectedRevision: revision,
              layout: {
                columnSpan: 1,
                // 해설판의 그 자리에는 정답 · 해설 상자와 QR(27mm)이 같이 들어간다 — 7mm × 14줄이면 넉넉하다
                minWorkLines: 14,
                preferredWorkLines: 14,
                maxWorkLines: 16,
                keepTogether: true,
              },
            },
          )
        ).aggregateRevision;
    }

    const requestId = randomUUID();
    const reserved = await reservePublish(
      db,
      owner,
      editionId,
      { requestId, expectedRevision: revision },
      fakeHash(requestId),
      deps,
    ).catch((error: unknown) => {
      // 막는 사유를 시험 출력에 남긴다 — «422» 만으로는 무엇이 어긋났는지 알 수 없다
      console.error(
        JSON.stringify((error as { details?: unknown }).details, null, 1),
      );
      throw error;
    });
    // 학생용 조판 · 합치기, 해설 조판 · 합치기, 펼침면, 단일 HTML
    expect(reserved.totalSteps).toBe(6);
    let job = reserved;
    for (
      let guard = 0;
      guard < 12 && ["reserved", "rendering", "verifying"].includes(job.status);
      guard++
    )
      job = await runNextStep(db, owner, editionId, requestId, deps);
    expect(job.issues).toEqual([]);
    expect(job).toMatchObject({ status: "ready", completedSteps: 6 });

    const done = await finalizePublish(db, owner, editionId, requestId, deps);
    expect(done.status).toBe("published");
    expect(done.artifacts.map((artifact) => artifact.kind).sort()).toEqual([
      "answer-pdf",
      "exchange-json",
      "exchange-zip",
      "mapping-csv",
      "offline-html",
      "spread-pdf",
      "student-pdf",
      "validation-json",
    ]);
    const bytesOf = new Map<string, Buffer>();
    for (const artifact of done.artifacts) {
      const stored = await pg.query<{ bytes: Uint8Array }>(
        `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
        [artifact.sha256],
      );
      const bytes = Buffer.from(stored.rows[0]!.bytes);
      expect(sha256(bytes)).toBe(artifact.sha256);
      bytesOf.set(artifact.kind, bytes);
    }
    for (const kind of ["student-pdf", "answer-pdf", "spread-pdf"])
      expect(bytesOf.get(kind)!.subarray(0, 5).toString()).toBe("%PDF-");
    const student = done.artifacts.find((a) => a.kind === "student-pdf")!;
    const answers = done.artifacts.find((a) => a.kind === "answer-pdf")!;
    // 해설판은 학생용의 쪽 자리를 그대로 쓴다 — 쪽 수가 같다
    expect(answers.pageCount).toBe(student.pageCount);
    // 학생용 단일 HTML 에는 정답이 없다. 바깥 주소를 부르지 않는다(스크립트도 없다)
    const html = bytesOf.get("offline-html")!.toString();
    expect(html).toContain("구획 1");
    expect(html).not.toContain("pm 2");
    expect(html).not.toMatch(/<script(?![^>]*application\/json)/);
    expect(html).not.toMatch(/(?:src|href)="https?:/);

    // 쪽 · QR 이 줄에 적혔다
    const items = await pg.query<{
      physical_page_index: number;
      printed_page_label: string;
    }>(
      `SELECT "physical_page_index", "printed_page_label" FROM "textbook_item" WHERE "edition_id" = $1`,
      [editionId],
    );
    expect(items.rows).toHaveLength(3);
    expect(
      items.rows.every(
        (row) => row.physical_page_index >= 1 && row.printed_page_label,
      ),
    ).toBe(true);
    const qr = await pg.query<{ state: string; url: string }>(
      `SELECT "state", "url" FROM "textbook_qr_target" WHERE "edition_id" = $1`,
      [editionId],
    );
    expect(qr.rows).toHaveLength(3);
    expect(
      qr.rows.every(
        (row) => row.state === "active" && row.url.startsWith(`${ORIGIN}/q/`),
      ),
    ).toBe(true);

    // 보관한 패키지를 실제 읽기 코드가 다시 읽는다 — 발행본 · 같은 manifest · 그림 바이트까지
    const archive = await readTextbookArchive(bytesOf.get("exchange-zip")!);
    expect(archive.exchange.edition).toMatchObject({
      editionId,
      status: "published",
      manifestHash: done.manifestHash,
    });
    expect(archive.exchange.pageMap).toHaveLength(3);
    expect(archive.exchange.assets).toHaveLength(1);
    // 발행 뒤의 내보내기도 같은 manifest 다
    const exported = await exportEdition(
      db,
      owner,
      editionId,
      "2027-01-01T00:00:00.000Z",
    );
    expect(exported.edition.manifestHash).toBe(done.manifestHash);
  }, 600_000);
});
