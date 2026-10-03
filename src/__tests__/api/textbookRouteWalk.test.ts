// @vitest-environment node
/**
 * 교사 교재 라우트를 **한 권의 일생**으로 훑는다 — 만들기 → 원고 → 담기 → 개념 → 영상 → 발행 → 배정 → 활동 → 재출제 → 새 판본.
 *
 * 재는 것은 하나다: **성공한 요청의 응답이 계약 스키마를 지나는가.** 라우트는 응답을 `strictObject` 로 거르므로,
 * 서버 함수가 칸 하나를 더 돌려주면(`replayed` 같은) 저장은 됐는데 응답이 500 이 된다 — 그리고 같은 요청을 다시 보내면
 * 멱등 기록 덕에 «성공»으로 보여 원인이 가려진다. 서버 함수만 부르는 시험(`src/__tests__/lib/textbook*.test.ts`)은
 * 이 층을 지나지 않아 그 결함을 못 본다(2026-10-03 실제 브라우저 검증: 개념 저장 · 패키지 복사가 그렇게 500 이었다).
 * 그래서 여기서는 **모든 라우트의 성공 경로를 적어도 한 번** 지나고, 같은 요청을 다시 보내는 경로도 지난다.
 *
 * 권한 문 · 연결 풀 · 조판기만 갈아 끼운다(조판기는 결정적인 대역 — 브라우저를 띄우지 않는다). DB 는 PGlite 다.
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
  authorizeTextbook: async () => ({ actor: gate.actor, response: null }),
}));
vi.mock("@/lib/textbook/server/prismaSql", () => ({
  get textbookDb() {
    return gate.db;
  },
}));
vi.mock("@/lib/textbook/publish/deps.server", async (original) => {
  const { fakePublishDeps } = await import("../helpers/textbookServerWorld");
  const fake = fakePublishDeps();
  return {
    ...(await original<typeof import("@/lib/textbook/publish/deps.server")>()),
    publishDeps: () => fake,
  };
});

import { PATCH as patchBinding } from "@/app/api/textbook/bindings/[bindingId]/route";
import { POST as postEdition } from "@/app/api/textbook/books/[bookId]/editions/route";
import { PATCH as patchBook } from "@/app/api/textbook/books/[bookId]/route";
import {
  GET as listBooks,
  POST as postBook,
} from "@/app/api/textbook/books/route";
import { PUT as reviewAttemptRoute } from "@/app/api/textbook/concept-attempts/[attemptId]/review/route";
import { GET as getCatalog } from "@/app/api/textbook/concepts/catalog/route";
import { GET as getArtifact } from "@/app/api/textbook/editions/[editionId]/artifacts/[artifactId]/route";
import { DELETE as revokeAssignmentRoute } from "@/app/api/textbook/editions/[editionId]/assignments/[assignmentId]/route";
import {
  GET as listAssignments,
  POST as postAssignment,
} from "@/app/api/textbook/editions/[editionId]/assignments/route";
import { POST as postObservation } from "@/app/api/textbook/editions/[editionId]/concepts/[conceptKey]/attempts/route";
import {
  GET as getConceptRoute,
  PUT as putConcept,
} from "@/app/api/textbook/editions/[editionId]/concepts/[conceptKey]/route";
import {
  GET as listConceptsRoute,
  POST as postConcept,
} from "@/app/api/textbook/editions/[editionId]/concepts/route";
import { GET as exportRoute } from "@/app/api/textbook/editions/[editionId]/export/route";
import { POST as diffRoute } from "@/app/api/textbook/editions/[editionId]/items/[itemId]/diff/route";
import { POST as recaptureRoute } from "@/app/api/textbook/editions/[editionId]/items/[itemId]/recapture/route";
import {
  GET as getItem,
  PATCH as patchItem,
} from "@/app/api/textbook/editions/[editionId]/items/[itemId]/route";
import { POST as postItems } from "@/app/api/textbook/editions/[editionId]/items/route";
import { GET as getJob } from "@/app/api/textbook/editions/[editionId]/publish/[requestId]/route";
import { POST as postFinalize } from "@/app/api/textbook/editions/[editionId]/publish/finalize/route";
import { POST as postPreflight } from "@/app/api/textbook/editions/[editionId]/publish/preflight/route";
import { POST as postReserve } from "@/app/api/textbook/editions/[editionId]/publish/reserve/route";
import { POST as postStep } from "@/app/api/textbook/editions/[editionId]/publish/steps/next/route";
import { POST as postReissue } from "@/app/api/textbook/editions/[editionId]/reissue/route";
import {
  GET as getEdition,
  PATCH as patchEdition,
} from "@/app/api/textbook/editions/[editionId]/route";
import {
  DELETE as deleteSection,
  GET as getSectionRoute,
  PUT as putSection,
} from "@/app/api/textbook/editions/[editionId]/sections/[sectionId]/route";
import { POST as postBinding } from "@/app/api/textbook/snapshots/[snapshotId]/bindings/route";
import { GET as getEvidence } from "@/app/api/textbook/students/[studentId]/concept-evidence/route";
import {
  GET as listVideos,
  POST as postVideo,
} from "@/app/api/textbook/videos/route";

import {
  type Db,
  type World,
  openTextbookDb,
  seedWorld,
} from "../helpers/textbookPglite";
import {
  insertBankProblem,
  insertTeacher,
  pgliteTextbookDb,
  sampleConfig,
} from "../helpers/textbookServerWorld";

let pg: Db;
let world: World;
let owner: TextbookActor;

beforeAll(async () => {
  pg = await openTextbookDb();
  gate.db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  owner = await insertTeacher(pg, { name: "주인" });
  gate.actor = owner;
}, 120_000);
afterAll(async () => {
  await pg.close();
});

const url = "https://today.test/api/textbook/x";
const get = (query = "") => new Request(`${url}${query}`);
const send = (method: string, body: unknown) =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});

/** 기대한 상태가 아니면 본문(오류 사유)을 같이 보여 준다 — «500» 만으로는 무엇이 어긋났는지 모른다 */
async function ok<T = Record<string, unknown>>(
  response: Response | Promise<Response>,
  status: number | number[] = 200,
): Promise<T> {
  const settled = await response;
  const text = await settled.text();
  const allowed = Array.isArray(status) ? status : [status];
  if (!allowed.includes(settled.status))
    throw new Error(`${settled.status} (기대 ${allowed.join("/")}): ${text}`);
  return (JSON.parse(text) as { data: T }).data;
}

const CONCEPT = {
  conceptKey: "순환소수",
  unitKey: "u1",
  sectionKey: null,
  title: "순환소수의 뜻",
  kind: "정의" as const,
  unitId: null,
  body: {
    goal: "순환소수의 뜻을 말한다",
    prerequisites: [],
    definition:
      "소수점 아래의 어떤 자리부터 같은 숫자 배열이 되풀이되는 무한소수",
    conditions: null,
    examples: [],
    counterexamples: [],
    misconceptions: [],
    explainPrompt: null,
  },
  blankItems: [],
  links: [],
  mappingVersion: "m1",
  derivedFromConceptKey: null,
  frozen: null,
};

describe("한 권의 일생 — 모든 성공 응답이 계약을 지난다", () => {
  it("만들기 → 원고 → 담기 → 개념 → 영상 → 발행 → 배정 → 활동 → 재출제 → 새 판본", async () => {
    const revisionOf = async (editionId: string) =>
      (
        await ok<{ edition: { revision: number } }>(
          getEdition(get(), params({ editionId })),
        )
      ).edition.revision;

    // ── 책
    const book = await ok<{ id: string; draftEditionId: string }>(
      postBook(
        send("POST", { requestId: randomUUID(), config: sampleConfig() }),
      ),
      201,
    );
    const editionId = book.draftEditionId;
    const bookId = book.id;
    expect(
      (await (await listBooks(get())).json()).data.some(
        (entry: { id: string }) => entry.id === bookId,
      ),
    ).toBe(true);
    const renameBody = {
      requestId: randomUUID(),
      title: "중2-1 개념과 유형 (고침)",
    };
    expect(
      (
        await ok<{ title: string }>(
          patchBook(send("PATCH", renameBody), params({ bookId })),
        )
      ).title,
    ).toBe(renameBody.title);
    // 같은 요청을 다시 보내도 같은 응답이다
    await ok(patchBook(send("PATCH", renameBody), params({ bookId })));

    // ── 목차 · 구획
    const detail = await ok<{ structureRevision: number; config: unknown }>(
      getEdition(get(), params({ editionId })),
    );
    const structureBody = {
      requestId: randomUUID(),
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
    };
    await ok(patchEdition(send("PATCH", structureBody), params({ editionId })));
    await ok(patchEdition(send("PATCH", structureBody), params({ editionId })));
    const sectionId = randomUUID();
    const sectionBody = {
      requestId: randomUUID(),
      expectedRevision: 0,
      unitKey: "u1",
      section: {
        sectionKey: "s1",
        title: "순환소수",
        templateKey: "basic",
        startPolicy: "even-left",
        blocks: [],
      },
    };
    await ok(
      putSection(send("PUT", sectionBody), params({ editionId, sectionId })),
      201,
    );
    await ok(
      putSection(send("PUT", sectionBody), params({ editionId, sectionId })),
      [200, 201],
    );
    await ok(getSectionRoute(get(), params({ editionId, sectionId })));

    // ── 담기 · 배치
    const problems = [
      await insertBankProblem(pg, world.unitId, { content: "가", answer: "1" }),
      await insertBankProblem(pg, world.unitId, { content: "나", answer: "2" }),
    ];
    const captureBody = {
      requestId: randomUUID(),
      expectedRevision: await revisionOf(editionId),
      sectionId,
      source: { kind: "problems", problemIds: problems.map((p) => p.id) },
    };
    const captured = await ok<{
      items: Array<{ itemId: string; snapshotId: string }>;
    }>(postItems(send("POST", captureBody), params({ editionId })), 201);
    expect(captured.items).toHaveLength(2);
    await ok(
      postItems(send("POST", captureBody), params({ editionId })),
      [200, 201],
    );
    const itemId = captured.items[0]!.itemId;
    await ok(getItem(get(), params({ editionId, itemId })));
    await ok(
      diffRoute(
        new Request(url, { method: "POST" }),
        params({ editionId, itemId }),
      ),
    );
    await ok(
      recaptureRoute(
        send("POST", {
          requestId: randomUUID(),
          expectedRevision: await revisionOf(editionId),
        }),
        params({ editionId, itemId }),
      ),
    );

    // ── 개념: 새로 만들기 · 같은 요청 다시 · 고치기 · 같은 요청 다시
    const createConcept = {
      requestId: randomUUID(),
      expectedRevision: 0,
      concept: CONCEPT,
    };
    const made = await ok<{ revision: number }>(
      postConcept(send("POST", createConcept), params({ editionId })),
      201,
    );
    await ok(postConcept(send("POST", createConcept), params({ editionId })));
    const conceptKey = CONCEPT.conceptKey;
    const updateConcept = {
      requestId: randomUUID(),
      expectedRevision: made.revision,
      concept: { ...CONCEPT, title: "순환소수의 뜻과 표현" },
    };
    const updated = await ok<{ concept: { title: string }; revision: number }>(
      putConcept(send("PUT", updateConcept), params({ editionId, conceptKey })),
    );
    expect(updated).toMatchObject({
      concept: { title: "순환소수의 뜻과 표현" },
      revision: made.revision + 1,
    });
    await ok(
      putConcept(send("PUT", updateConcept), params({ editionId, conceptKey })),
    );
    // 주소로 새로 만드는 길(PUT, revision 0)도 있다
    const second = { ...CONCEPT, conceptKey: "유한소수", title: "유한소수" };
    const putNew = {
      requestId: randomUUID(),
      expectedRevision: 0,
      concept: second,
    };
    await ok(
      putConcept(
        send("PUT", putNew),
        params({ editionId, conceptKey: second.conceptKey }),
      ),
      [200, 201],
    );
    await ok(
      putConcept(
        send("PUT", putNew),
        params({ editionId, conceptKey: second.conceptKey }),
      ),
      [200, 201],
    );
    expect(
      await ok<unknown[]>(listConceptsRoute(get(), params({ editionId }))),
    ).toHaveLength(2);
    await ok(getConceptRoute(get(), params({ editionId, conceptKey })));
    await ok(getCatalog(get("?grade=중2&limit=5")));
    // 배치가 개념을 가리킨다(발행 때 그 개념이 굳는다)
    await ok(
      patchItem(
        send("PATCH", {
          requestId: randomUUID(),
          expectedRevision: await revisionOf(editionId),
          conceptKeys: [conceptKey],
          layout: {
            columnSpan: 1,
            minWorkLines: 4,
            preferredWorkLines: 6,
            maxWorkLines: 8,
            keepTogether: true,
          },
        }),
        params({ editionId, itemId }),
      ),
    );

    // ── 영상 · 연결(초안 → 검수 대기 → 게시)
    const exchange = await ok<{
      snapshots: Array<{ snapshotId: string; contentHash: string }>;
      items: Array<{ itemId: string; snapshotId: string }>;
    }>(exportRoute(get(), params({ editionId })));
    const snapshotId = exchange.items.find(
      (item) => item.itemId === itemId,
    )!.snapshotId;
    const contentHash = exchange.snapshots.find(
      (snapshot) => snapshot.snapshotId === snapshotId,
    )!.contentHash;
    const videoBody = {
      requestId: randomUUID(),
      title: "풀이 영상",
      provider: "youtube",
      providerVideoId: "dQw4w9WgXcQ",
    };
    const video = await ok<{ id: string }>(
      postVideo(send("POST", videoBody)),
      201,
    );
    await ok(postVideo(send("POST", videoBody)));
    const binding = (status: string) => ({
      requestId: randomUUID(),
      videoId: video.id,
      startSeconds: 0,
      endSeconds: 90,
      status,
      expectedContentHash: contentHash,
    });
    const draftBinding = binding("draft");
    const bound = await ok<{ bindingId: string }>(
      postBinding(send("POST", draftBinding), params({ snapshotId })),
      201,
    );
    await ok(postBinding(send("POST", draftBinding), params({ snapshotId })));
    await ok(
      patchBinding(
        send("PATCH", binding("review")),
        params({ bindingId: bound.bindingId }),
      ),
    );
    const publishBinding = binding("published");
    expect(
      (
        await ok<{ status: string; reviewedAgainstHash: string }>(
          patchBinding(
            send("PATCH", publishBinding),
            params({ bindingId: bound.bindingId }),
          ),
        )
      ).reviewedAgainstHash,
    ).toBe(contentHash);
    await ok(
      patchBinding(
        send("PATCH", publishBinding),
        params({ bindingId: bound.bindingId }),
      ),
    );
    const videos = await ok<{ videos: unknown[]; bindings: unknown[] }>(
      listVideos(get()),
    );
    expect(videos.videos.length).toBeGreaterThan(0);
    expect(videos.bindings.length).toBeGreaterThan(0);

    // ── 발행
    const preflight = await ok<{ canPublish: boolean; issues: unknown[] }>(
      postPreflight(
        new Request(url, { method: "POST" }),
        params({ editionId }),
      ),
    );
    expect(preflight).toMatchObject({ canPublish: true });
    const requestId = randomUUID();
    const reserveBody = {
      requestId,
      expectedRevision: await revisionOf(editionId),
    };
    await ok(
      postReserve(send("POST", reserveBody), params({ editionId })),
      201,
    );
    await ok(postReserve(send("POST", reserveBody), params({ editionId })));
    let job = await ok<{ status: string }>(
      postStep(send("POST", { requestId }), params({ editionId })),
    );
    for (let guard = 0; guard < 20 && job.status !== "ready"; guard++)
      job = await ok<{ status: string }>(
        postStep(send("POST", { requestId }), params({ editionId })),
      );
    expect(job.status).toBe("ready");
    await ok(getJob(get(), params({ editionId, requestId })));
    const published = await ok<{
      status: string;
      artifacts: Array<{ id: string; kind: string; byteLength: number }>;
    }>(postFinalize(send("POST", { requestId }), params({ editionId })));
    expect(published.status).toBe("published");
    await ok(postFinalize(send("POST", { requestId }), params({ editionId })));
    for (const artifact of published.artifacts) {
      const response = await getArtifact(
        get(),
        params({ editionId, artifactId: artifact.id }),
      );
      expect([200, 206]).toContain(response.status);
      expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    }
    const frozen = await ok<{ edition: { status: string } }>(
      exportRoute(get(), params({ editionId })),
    );
    expect(frozen.edition.status).toBe("published");

    // ── 배정
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
    const assignBody = {
      requestId: randomUUID(),
      subject: { kind: "class", classId },
      scope: { kind: "edition" },
      startsAt: "2026-10-01T00:00:00.000Z",
      expiresAt: null,
    };
    const assignment = await ok<{ id: string }>(
      postAssignment(send("POST", assignBody), params({ editionId })),
      201,
    );
    await ok(postAssignment(send("POST", assignBody), params({ editionId })));
    expect(
      await ok<unknown[]>(listAssignments(get(), params({ editionId }))),
    ).toHaveLength(1);

    // ── 백지 활동(교사가 본 것) → 확인 → 학생의 증거
    const observeBody = {
      requestId: randomUUID(),
      studentId,
      form: "recall",
      observation: "뜻을 스스로 말했다",
    };
    const attempt = await ok<{ attemptId: string; revision: number }>(
      postObservation(
        send("POST", observeBody),
        params({ editionId, conceptKey }),
      ),
      201,
    );
    await ok(
      postObservation(
        send("POST", observeBody),
        params({ editionId, conceptKey }),
      ),
    );
    const reviewBody = {
      requestId: randomUUID(),
      expectedRevision: attempt.revision,
      reviewStatus: "checked",
      note: null,
    };
    await ok(
      reviewAttemptRoute(
        send("PUT", reviewBody),
        params({ attemptId: attempt.attemptId }),
      ),
    );
    await ok(
      reviewAttemptRoute(
        send("PUT", reviewBody),
        params({ attemptId: attempt.attemptId }),
      ),
    );
    const evidence = await ok<{
      attempts: unknown[];
      references: Array<Record<string, unknown>>;
    }>(getEvidence(get(), params({ studentId })));
    expect(evidence.attempts).toHaveLength(1);
    expect(evidence.references).toEqual([
      {
        editionId,
        conceptKey,
        bookTitle: renameBody.title,
        editionLabel: expect.any(String),
        conceptTitle: "순환소수의 뜻과 표현",
        canOpen: true,
      },
    ]);

    // ── 배정 회수 · 재출제 · 새 판본
    await ok(
      revokeAssignmentRoute(
        send("DELETE", { requestId: randomUUID() }),
        params({ editionId, assignmentId: assignment.id }),
      ),
    );
    const reissueBody = {
      requestId: randomUUID(),
      itemIds: captured.items.map((item) => item.itemId),
      classId,
      testType: "review",
      rangeEndUnitId: world.unitId,
    };
    expect(
      await ok(
        postReissue(send("POST", reissueBody), params({ editionId })),
        201,
      ),
    ).toMatchObject({
      problemCount: 2,
      titlePersisted: false,
      replayed: false,
    });
    expect(
      await ok(postReissue(send("POST", reissueBody), params({ editionId }))),
    ).toMatchObject({ replayed: true });

    const editionBody = {
      requestId: randomUUID(),
      sourceEditionId: editionId,
      label: "2판",
    };
    const next = await ok<{
      edition: { editionId: string; status: string };
      outline: Array<{ sections: Array<{ id: string; revision: number }> }>;
    }>(postEdition(send("POST", editionBody), params({ bookId })), 201);
    expect(next.edition.status).toBe("draft");
    expect(next.edition.editionId).not.toBe(editionId);
    await ok(
      postEdition(send("POST", editionBody), params({ bookId })),
      [200, 201],
    );
    const copiedSection = next.outline[0]!.sections[0]!;
    await ok(
      deleteSection(
        send("DELETE", {
          requestId: randomUUID(),
          expectedRevision: copiedSection.revision,
        }),
        params({
          editionId: next.edition.editionId,
          sectionId: copiedSection.id,
        }),
      ),
    );
  }, 180_000);
});
