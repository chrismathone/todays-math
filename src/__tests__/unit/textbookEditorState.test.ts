import { describe, expect, it } from "vitest";

import {
  applyEditionEdits,
  canFinalize,
  conceptManuscriptChanged,
  initialEditionFromLocation,
  manuscriptLocked,
  measuredSpreadAnchor,
  nextMeasuredSpread,
  orderBlankPicks,
  planUploadChunks,
  publishHeadline,
  visibleAnswer,
  withConceptLecture,
  type BlankPick,
  type ConceptDraft,
  type EditionDetail,
} from "@/components/textbook/model";
import { withBrowserQrImages } from "@/components/textbook/browserQr";
import { buildSectionPreview } from "@/components/textbook/previewModel";
import { measurementHtml, renderBlockHtml } from "@/lib/textbook/render/html";
import type { TextbookEditionDetail } from "@/contracts/textbook.contract";
import { TextbookRequestError, createTextbookApi } from "@/lib/textbook/client";
import type { SectionDetail } from "@/components/textbook/model";

function pick(
  form: BlankPick["form"],
  section: string,
  entryId: string,
): BlankPick {
  return {
    blankSectionKey: section,
    entryKind: "concept",
    entryId,
    form,
    level: "중",
    reviewStatus: "candidate",
  };
}

const section = {
  sectionId: "section-1",
  editionId: "edition-1",
  unitKey: "unit-1",
  sectionKey: "dialogue",
  templateKey: "template.dialogue",
  title: "대화",
  revision: 3,
  aggregateRevision: 3,
  status: "draft",
  parity: "even-left",
  parityMessage: null,
  blocks: [],
  answer: "",
  portraits: [],
  picks: [],
  items: [],
  concept: null,
} satisfies SectionDetail;

describe("textbook editor rules", () => {
  it("keeps pick groups in first-seen order and rejects a later return", () => {
    const ordered = orderBlankPicks([
      pick("recall", "초5::약분::통분", "e5-1"),
      pick("recall", "초5::약분::통분", "e5-2"),
      pick("term", "초5::약분::통분", "e5-1"),
    ]);
    expect(ordered.ok).toBe(true);
    if (!ordered.ok) return;
    expect(ordered.groups.map((group) => group.form)).toEqual([
      "recall",
      "term",
    ]);
    expect(ordered.groups[0]?.picks.map((item) => item.entryId)).toEqual([
      "e5-1",
      "e5-2",
    ]);

    const broken = orderBlankPicks([
      pick("recall", "초5::약분::통분", "e5-1"),
      pick("term", "초5::약분::통분", "e5-1"),
      pick("recall", "초5::약분::통분", "e5-3"),
    ]);
    expect(broken).toEqual({
      ok: false,
      message: "같은 형식과 소단원이 떨어져 다시 나옵니다.",
    });
  });

  it("hides answers from a student audience in every preview mode", () => {
    expect(visibleAnswer("student", "teacher", "11/12")).toBeNull();
    expect(visibleAnswer("student", "draft", "11/12")).toBeNull();
    expect(visibleAnswer("teacher", "student", "11/12")).toBeNull();
    expect(visibleAnswer("teacher", "draft", "11/12")).toBe("11/12");
    expect(visibleAnswer("teacher", "teacher", "11/12")).toBe("11/12");
  });

  it("does not treat a failed publish job as finalized", () => {
    expect(canFinalize("failed")).toBe(false);
    expect(canFinalize("preflight-failed")).toBe(false);
    expect(canFinalize("reserved")).toBe(false);
    expect(canFinalize("ready")).toBe(true);
    expect(publishHeadline("failed")).toBe("발행하지 못했습니다.");
    expect(publishHeadline("finalized")).toBe("발행됨");
  });

  it("splits an upload into 1MB chunks", () => {
    expect(planUploadChunks(0)).toEqual([]);
    expect(planUploadChunks(1_000_001)).toEqual([1_000_000, 1]);
  });

  it("keeps a 409 revision and rejects a save response that has no revision", async () => {
    const conflict = createTextbookApi(async () =>
      Response.json(
        { error: { message: "다른 저장", details: { serverRevision: 4 } } },
        { status: 409 },
      ),
    );
    await expect(
      conflict.saveSection({
        editionId: "edition-1",
        sectionId: "section-1",
        expectedRevision: 3,
        requestId: "00000000-0000-4000-8000-000000000001",
        section,
      }),
    ).rejects.toMatchObject({
      status: 409,
      serverRevision: 4,
      name: "TextbookRequestError",
    });

    const saved = createTextbookApi(async () =>
      Response.json({
        data: {
          section: {
            id: "00000000-0000-4000-8000-000000000010",
            unitKey: "unit-1",
            revision: 4,
            section: {
              sectionKey: "dialogue",
              title: "대화",
              templateKey: "template.dialogue",
              startPolicy: "even-left",
              blocks: [],
            },
            updatedAt: "2026-10-03T00:00:00.000Z",
          },
          aggregateRevision: 5,
          replayed: false,
        },
      }),
    );
    await expect(
      saved.saveSection({
        editionId: "00000000-0000-4000-8000-000000000011",
        sectionId: "00000000-0000-4000-8000-000000000012",
        expectedRevision: 3,
        requestId: "00000000-0000-4000-8000-000000000001",
        section,
      }),
    ).resolves.toEqual({ revision: 4, aggregateRevision: 5 });

    const incomplete = createTextbookApi(async () =>
      Response.json({ ok: true }),
    );
    await expect(
      incomplete.saveSection({
        editionId: "edition-1",
        sectionId: "section-1",
        expectedRevision: 3,
        requestId: "00000000-0000-4000-8000-000000000001",
        section,
      }),
    ).rejects.toBeInstanceOf(TextbookRequestError);
  });

  const requestId = "00000000-0000-4000-8000-000000000001";
  const editionId = "00000000-0000-4000-8000-000000000011";
  const sectionId = "00000000-0000-4000-8000-000000000012";
  const problemId = "00000000-0000-4000-8000-000000000013";
  const uploadId = "00000000-0000-4000-8000-000000000014";
  const ownerId = "00000000-0000-4000-8000-000000000015";
  const archiveId = "00000000-0000-4000-8000-000000000016";

  const placedItem = {
    itemId: "item-1",
    editionId: "edition-1",
    snapshotId: "snap-1",
    linkStatus: "linked",
    sourceTestId: null,
    sourceTestProblemId: null,
    unitKey: "unit-1",
    sectionKey: "dialogue",
    learningStage: "basic",
    displayNumber: "1",
    orderIndex: 0,
    layout: {
      columnSpan: 1,
      minWorkLines: 0,
      preferredWorkLines: 0,
      maxWorkLines: 0,
      keepTogether: false,
    },
    qrTargetId: null,
  };

  function bookSummary() {
    return {
      id: editionId,
      ownerId,
      ownerName: "원장",
      isOwner: true,
      title: "분수의 덧셈",
      visibility: "private",
      sharedBranchId: null,
      archivedAt: null,
      createdAt: "2026-10-03T00:00:00.000Z",
      updatedAt: "2026-10-03T00:00:00.000Z",
      draftEditionId: editionId,
      latestPublishedEditionId: null,
    };
  }

  it("sends the chosen solution policy when creating a book", async () => {
    let body: {
      config?: { studentSolutionPolicy?: string; displayCode?: string };
    } = {};
    const api = createTextbookApi(async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ data: bookSummary() });
    });
    await api.createBook({
      title: "분수의 덧셈",
      volumeCode: "2-1-1",
      curriculumVersion: "2022",
      pageTarget: 32,
      videoPolicy: "optional",
      studentSolutionPolicy: "assigned",
      requestId,
    });
    expect(body.config?.studentSolutionPolicy).toBe("assigned");
    expect(body.config?.displayCode).toBe("2-1-1");
  });

  it("sends an identical body when a retry carries the book id of the first attempt", async () => {
    // 서버는 요청 번호가 같아도 본문 해시가 다르면 «다른 내용» 으로 거절한다 — 교재 번호까지 같아야 첫 결과를 돌려받는다
    const bodies: string[] = [];
    const api = createTextbookApi(async (_url, init) => {
      bodies.push(String(init?.body));
      return Response.json({ data: bookSummary() });
    });
    const input = {
      title: "분수의 덧셈",
      volumeCode: "2-1-1",
      curriculumVersion: "2022",
      pageTarget: 32,
      videoPolicy: "optional" as const,
      studentSolutionPolicy: "never" as const,
      requestId,
    };
    const bookId = "00000000-0000-4000-8000-0000000000c1";
    await api.createBook({ ...input, bookId });
    await api.createBook({ ...input, bookId });
    expect(bodies[1]).toBe(bodies[0]);
    expect(JSON.parse(bodies[0]!).config.bookId).toBe(bookId);

    // 번호를 주지 않으면 지금처럼 호출마다 새로 짓는다
    await api.createBook(input);
    await api.createBook(input);
    expect(JSON.parse(bodies[3]!).config.bookId).not.toBe(
      JSON.parse(bodies[2]!).config.bookId,
    );
  });

  it("sends the chosen grade and margins and keeps the even-left start", async () => {
    let body: {
      config?: {
        schoolLevel?: string;
        grade?: number;
        semester?: number;
        mode?: string;
        print?: {
          innerMarginMm?: number;
          outerMarginMm?: number;
          sectionStart?: string;
          coverMode?: string;
        };
      };
    } = {};
    const api = createTextbookApi(async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ data: bookSummary() });
    });
    await api.createBook({
      title: "분수의 덧셈",
      volumeCode: "2-1-1",
      curriculumVersion: "2022",
      pageTarget: 32,
      videoPolicy: "optional",
      studentSolutionPolicy: "never",
      schoolLevel: "elementary",
      grade: 6,
      semester: 2,
      mode: "concept",
      innerMarginMm: 12,
      outerMarginMm: 18,
      coverMode: "included",
      requestId,
    });
    expect(body.config).toMatchObject({
      schoolLevel: "elementary",
      grade: 6,
      semester: 2,
      mode: "concept",
      print: {
        innerMarginMm: 12,
        outerMarginMm: 18,
        sectionStart: "even-left",
        coverMode: "included",
      },
    });
  });

  it("saves blank forms and confirmation ids on the concept", async () => {
    let body: {
      expectedRevision?: number;
      confirmBlankEntryIds?: string[];
      confirmLinkIds?: string[];
      concept?: {
        blankForms?: string[];
        body?: { definition?: string };
        links?: unknown[];
      };
    } = {};
    const api = createTextbookApi(async (_url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({
        data: { concept: body.concept, revision: 2, aggregateRevision: 8 },
      });
    });
    await api.saveConcept({
      editionId,
      conceptKey: "common-denominator",
      expectedRevision: 0,
      requestId,
      concept: {
        conceptKey: "common-denominator",
        title: "통분",
        kind: "정의",
        goal: "",
        prerequisites: "",
        definition: "분모를 같게 한다",
        conditions: "",
        examples: "",
        counterexamples: "",
        misconceptions: "",
        explainPrompt: "",
        blankForms: ["term", "cloze"],
      },
      picks: [
        {
          blankSectionKey: "초5::약분::통분",
          entryKind: "concept",
          entryId: "e5-1",
          form: "term",
          level: "중",
          reviewStatus: "candidate",
          confirmRequested: true,
        },
      ],
      source: null,
      unitKey: "unit-1",
      sectionKey: "dialogue",
      links: [],
      confirmEntryIds: ["e5-1"],
      confirmLinkIds: [],
    });
    expect(body.expectedRevision).toBe(0);
    expect(body.confirmBlankEntryIds).toEqual(["e5-1"]);
    expect(body.confirmLinkIds).toBeUndefined();
    expect(body.concept?.blankForms).toEqual(["term", "cloze"]);
    expect(body.concept?.body?.definition).toBe("분모를 같게 한다");
    expect(body.concept?.links).toEqual([]);
  });

  it("sends an unchanged confirmed link and only explicit confirmation ids", async () => {
    const review = {
      status: "confirmed" as const,
      candidateRule: "manual" as const,
      reviewedBy: "11111111-1111-4111-8111-111111111111",
      reviewedAt: "2026-10-03T00:00:00.000Z",
      targetHash: "a".repeat(64),
    };
    const link = {
      linkId: "factorization-review",
      target: {
        namespace: "explorer-card" as const,
        cardId: "factorization-review",
      },
      relation: "same" as const,
      review,
    };
    let kept: { confirmLinkIds?: string[]; concept?: { links?: unknown[] } } =
      {};
    const api = createTextbookApi(async (_url, init) => {
      kept = JSON.parse(String(init?.body));
      return Response.json({
        data: { concept: kept.concept, revision: 3, aggregateRevision: 9 },
      });
    });
    const concept = {
      conceptKey: "prime-definition",
      title: "소수",
      kind: "정의" as const,
      goal: "",
      prerequisites: "",
      definition: "1과 자신만으로 나누어진다",
      conditions: "",
      examples: "2",
      counterexamples: "",
      misconceptions: "",
      explainPrompt: "",
      blankForms: ["term", "cloze"] as Array<"term" | "cloze">,
    };
    await api.saveConcept({
      editionId,
      conceptKey: "prime-definition",
      expectedRevision: 4,
      requestId,
      concept,
      picks: [],
      source: null,
      unitKey: "unit-1",
      sectionKey: "dialogue",
      links: [link],
      confirmEntryIds: [],
      confirmLinkIds: [],
    });
    expect(kept.confirmLinkIds).toBeUndefined();
    expect(kept.concept?.links).toEqual([link]);
    kept = {};
    await api.saveConcept({
      editionId,
      conceptKey: "prime-definition",
      expectedRevision: 4,
      requestId,
      concept,
      picks: [],
      source: null,
      unitKey: "unit-1",
      sectionKey: "dialogue",
      links: [link],
      confirmEntryIds: [],
      confirmLinkIds: ["factorization-review"],
    });
    expect(kept.confirmLinkIds).toEqual(["factorization-review"]);
  });

  it("posts recapture with the aggregate revision and rejects a diff of the wrong shape", async () => {
    const calls: Array<{ url: string; body: string | null }> = [];
    const api = createTextbookApi(async (url, init) => {
      const path = String(url);
      calls.push({ url: path, body: init?.body ? String(init.body) : null });
      if (path.endsWith("/diff")) {
        return Response.json({ data: { issues: [] } });
      }
      if (path.endsWith("/items")) {
        return Response.json({
          data: {
            items: [placedItem],
            excluded: [],
            aggregateRevision: 10,
            replayed: false,
          },
        });
      }
      return Response.json({
        data: { item: placedItem, aggregateRevision: 10, replayed: false },
      });
    });
    await expect(api.diffItem(editionId, "item-1")).rejects.toBeInstanceOf(
      TextbookRequestError,
    );
    expect(calls[0]?.body).toBeNull();

    const compared = createTextbookApi(async () =>
      Response.json({
        data: {
          itemId: "00000000-0000-4000-8000-0000000000d1",
          changed: true,
          contentChanged: true,
          metadataChanged: false,
          blocked: null,
          fields: ["content"],
          summary: "은행 문항이 바뀌었습니다: 본문",
        },
      }),
    );
    await expect(compared.diffItem(editionId, "item-1")).resolves.toEqual({
      itemId: "00000000-0000-4000-8000-0000000000d1",
      summary: "은행 문항이 바뀌었습니다: 본문",
    });

    calls.length = 0;
    await expect(
      api.recaptureItem(editionId, "item-1", requestId, 9),
    ).resolves.toMatchObject({
      aggregateRevision: 10,
      item: { itemId: "item-1" },
    });
    expect(calls[0]?.url).toContain("/recapture");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      requestId,
      expectedRevision: 9,
    });

    await expect(
      api.captureItems({
        editionId,
        sectionId,
        expectedRevision: 9,
        requestId,
        testId: null,
        problemIds: [problemId],
      }),
    ).resolves.toMatchObject({ aggregateRevision: 10 });
    const capture = calls.find((call) => call.url.endsWith("/items"));
    expect(JSON.parse(capture?.body ?? "{}").expectedRevision).toBe(9);
  });

  it("loads link candidates and posts only the chosen problem", async () => {
    const calls: Array<{ url: string; body: string | null }> = [];
    const api = createTextbookApi(async (url, init) => {
      const path = String(url);
      calls.push({ url: path, body: init?.body ? String(init.body) : null });
      if (path.endsWith("/link")) {
        return Response.json({
          data: { item: placedItem, aggregateRevision: 10, replayed: false },
        });
      }
      return Response.json({
        data: {
          item: placedItem,
          linkCandidates: [
            {
              system: "todays-math",
              problemId,
              problemCode: "E56-1",
            },
          ],
        },
      });
    });
    await expect(api.readItemDetail(editionId, "item-1")).resolves.toEqual({
      candidates: [{ problemId, problemCode: "E56-1" }],
    });
    expect(calls[0]?.body).toBeNull();
    await expect(
      api.linkItem(editionId, "item-1", requestId, 9, problemId),
    ).resolves.toMatchObject({ aggregateRevision: 10 });
    expect(calls[1]?.url).toContain("/link");
    expect(JSON.parse(calls[1]?.body ?? "{}")).toEqual({
      requestId,
      expectedRevision: 9,
      problemId,
    });
  });

  it("registers a pending bank item and keeps the placement unlinked", async () => {
    const unitId = "00000000-0000-4000-8000-0000000000d1";
    let body = "";
    let url = "";
    const api = createTextbookApi(async (input, init) => {
      url = String(input);
      body = String(init?.body);
      return Response.json({
        data: {
          item: { ...placedItem, linkStatus: "unlinked" },
          problem: {
            problemId,
            problemCode: "E56-1",
            reviewStatus: "pending",
          },
          linkCandidates: [
            { system: "todays-math", problemId, problemCode: "E56-1" },
          ],
          aggregateRevision: 10,
          replayed: false,
        },
      });
    });
    await expect(
      api.registerItem(editionId, "item-1", requestId, 9, {
        unitId,
        difficulty: "기본",
        problemType: "계산",
      }),
    ).resolves.toMatchObject({
      aggregateRevision: 10,
      item: { label: "1 · 연결 없음" },
      problem: {
        problemId,
        problemCode: "E56-1",
        reviewStatus: "pending",
      },
      candidates: [{ problemId, problemCode: "E56-1" }],
    });
    expect(url).toBe(
      `/api/textbook/editions/${editionId}/items/item-1/register`,
    );
    expect(JSON.parse(body)).toEqual({
      requestId,
      expectedRevision: 9,
      unitId,
      difficulty: "기본",
      problemType: "계산",
    });

    const figures = createTextbookApi(async () =>
      Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "그림이 있는 문항은 여기서 등록하지 않습니다. 문제은행의 등록 화면에서 그림과 함께 등록해 주세요.",
          },
        },
        { status: 422 },
      ),
    );
    await expect(
      figures.registerItem(editionId, "item-1", requestId, 9, {
        unitId,
        difficulty: "기본",
        problemType: "계산",
      }),
    ).rejects.toThrow(/그림이 있는 문항은 여기서 등록하지 않습니다/);
  });

  it("reissues the chosen item order and rejects a persisted title", async () => {
    const classId = "00000000-0000-4000-8000-0000000000c1";
    const rangeEndUnitId = "00000000-0000-4000-8000-0000000000d1";
    const testId = "00000000-0000-4000-8000-0000000000d2";
    const itemIds = ["item-2", "item-1", "item-2"];
    let body = "";
    const api = createTextbookApi(async (input, init) => {
      expect(String(input)).toBe(`/api/textbook/editions/${editionId}/reissue`);
      body = String(init?.body);
      return Response.json({
        data: {
          testId,
          problemCount: 3,
          titlePersisted: false,
          replayed: false,
        },
      });
    });
    await expect(
      api.reissue({
        editionId,
        requestId,
        itemIds,
        classId,
        title: "",
        testType: "daily",
        rangeEndUnitId,
      }),
    ).resolves.toEqual({
      testId,
      problemCount: 3,
      titlePersisted: false,
      replayed: false,
    });
    expect(JSON.parse(body)).toEqual({
      requestId,
      itemIds,
      classId,
      testType: "daily",
      rangeEndUnitId,
    });
    expect(JSON.parse(body).title).toBeUndefined();

    const titled = createTextbookApi(async (_input, init) => {
      body = String(init?.body);
      return Response.json({
        data: {
          testId,
          problemCount: 2,
          titlePersisted: false,
          replayed: false,
        },
      });
    });
    await titled.reissue({
      editionId,
      requestId,
      itemIds: ["item-1", "item-2"],
      classId,
      title: "복습",
      testType: "review",
      rangeEndUnitId,
    });
    expect(JSON.parse(body).title).toBe("복습");

    const lied = createTextbookApi(async () =>
      Response.json({
        data: {
          testId,
          problemCount: 1,
          titlePersisted: true,
          replayed: false,
        },
      }),
    );
    await expect(
      lied.reissue({
        editionId,
        requestId,
        itemIds: ["item-1"],
        classId,
        testType: "daily",
        rangeEndUnitId,
      }),
    ).rejects.toThrow("교재 응답을 읽지 못했습니다.");

    const duplicate = createTextbookApi(async () =>
      Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "낼 수 없는 문항 1건이 들어 있습니다. 1(같은 문항을 두 번 골랐습니다.)",
          },
        },
        { status: 422 },
      ),
    );
    await expect(
      duplicate.reissue({
        editionId,
        requestId,
        itemIds: ["item-1", "item-1"],
        classId,
        testType: "daily",
        rangeEndUnitId,
      }),
    ).rejects.toThrow(/같은 문항을 두 번 골랐습니다/);
  });

  it("completes an upload with byte length and file name, and blocks a hashless publish", async () => {
    let calls = 0;
    const blocked = createTextbookApi(async () => {
      calls += 1;
      return Response.json({ data: {} });
    });
    await expect(
      blocked.updateVideo({
        bindingId: "bind-1",
        requestId,
        status: "published",
        policy: "optional",
        videoId: "00000000-0000-4000-8000-000000000017",
        startSeconds: 0,
        endSeconds: null,
        contentHash: null,
      }),
    ).rejects.toThrow("게시 검수용 내용 해시가 없습니다.");
    expect(calls).toBe(0);

    let completeBody: {
      byteLength?: number;
      fileName?: string;
      requestId?: string;
    } = {};
    const imported = createTextbookApi(async (url, init) => {
      const path = String(url);
      if (path.endsWith("/complete")) {
        completeBody = JSON.parse(String(init?.body));
        const sha256 = path.split("/").at(-2);
        return Response.json({
          data: {
            uploadId,
            sha256,
            byteLength: completeBody.byteLength,
            asset: null,
          },
        });
      }
      if (path.endsWith("/imports")) {
        return Response.json({
          data: {
            mode: "archive",
            archiveId,
            bookId: null,
            editionId: null,
            idMap: [],
            issues: [],
            replayed: false,
          },
        });
      }
      return new Response(null, { status: 200 });
    });
    await expect(
      imported.importPackage({
        mode: "archive",
        file: new Blob(["pack"]),
        fileName: "pack.json",
        requestId,
      }),
    ).resolves.toMatchObject({ mode: "archive", readOnly: true });
    expect(completeBody).toEqual({ byteLength: 4, fileName: "pack.json" });
    expect(completeBody.requestId).toBeUndefined();
  });

  it("loads lectures from the existing concept lecture list", async () => {
    const unitId = "00000000-0000-4000-8000-0000000000b1";
    const lectureId = "00000000-0000-4000-8000-0000000000b2";
    let called = "";
    const api = createTextbookApi(async (url) => {
      called = String(url);
      return Response.json({
        data: {
          unitId,
          lectures: [
            {
              lectureId,
              unitId,
              title: "통분 강의",
              seconds: 240,
            },
          ],
        },
      });
    });
    await expect(api.listUnitLectures(unitId)).resolves.toEqual([
      { lectureId, title: "통분 강의", status: "published" },
    ]);
    expect(called).toBe(`/api/textbook/concept-lectures?unitId=${unitId}`);
  });

  it("posts a teacher observation and returns the server review status", async () => {
    const studentId = "00000000-0000-4000-8000-0000000000ee";
    let body = "";
    const api = createTextbookApi(async (url, init) => {
      body = String(init?.body);
      expect(String(url)).toContain("/concepts/common-denominator/attempts");
      return Response.json({
        data: {
          attemptId: "00000000-0000-4000-8000-0000000000f1",
          requestId,
          bodyHash: "a".repeat(64),
          studentId,
          editionId,
          conceptKey: "common-denominator",
          frozenHash: "b".repeat(64),
          form: "term",
          channel: "teacher-observed",
          response: "분모를 같게 한다고 말했다.",
          submittedAt: "2026-10-03T00:00:00.000Z",
          revision: 1,
          reviewStatus: "pending",
          reviewedBy: null,
          reviewedAt: null,
          note: null,
        },
      });
    });
    await expect(
      api.recordObservation({
        editionId,
        conceptKey: "common-denominator",
        requestId,
        studentId,
        form: "term",
        observation: "분모를 같게 한다고 말했다.",
      }),
    ).resolves.toEqual({ reviewStatus: "pending" });
    expect(JSON.parse(body)).toMatchObject({
      studentId,
      form: "term",
      observation: "분모를 같게 한다고 말했다.",
    });
    expect(JSON.parse(body).title).toBeUndefined();
  });
});

const when = "2026-10-03T00:00:00.000Z";
const previewEditionId = "00000000-0000-4000-8000-0000000000aa";

function previewSource(): TextbookEditionDetail {
  return {
    book: {
      id: "00000000-0000-4000-8000-0000000000a1",
      ownerId: "00000000-0000-4000-8000-0000000000a2",
      ownerName: "원장",
      isOwner: true,
      title: "분수",
      visibility: "private",
      sharedBranchId: null,
      archivedAt: null,
      createdAt: when,
      updatedAt: when,
      draftEditionId: previewEditionId,
      latestPublishedEditionId: null,
    },
    edition: {
      editionId: previewEditionId,
      label: "1",
      status: "draft",
      revision: 2,
      publishedAt: null,
      manifestHash: null,
    },
    structureRevision: 3,
    config: {
      bookId: "00000000-0000-4000-8000-0000000000a1",
      schoolLevel: "elementary",
      grade: 5,
      semester: 1,
      volume: 1,
      volumeCount: 1,
      displayCode: "2-1-1",
      title: "분수",
      curriculumVersion: "2015",
      mode: "integrated",
      pageBudget: { target: 32, tolerance: 0, strict: false },
      print: {
        paper: "A4",
        innerMarginMm: 15,
        outerMarginMm: 15,
        sectionStart: "even-left",
        coverMode: "separate",
        firstPhysicalPageIndex: 1,
      },
      videoPolicy: "optional",
      studentSolutionPolicy: "never",
    },
    outline: [
      {
        unitKey: "unit-1",
        title: "분수",
        sourceUnitIds: [],
        prerequisites: [],
        goals: [],
        conceptLectureRefs: [],
        sections: [],
      },
    ],
    issues: [],
  };
}

function previewEdition(
  source: TextbookEditionDetail | undefined,
): EditionDetail {
  return {
    editionId: previewEditionId,
    bookId: "book-1",
    title: "분수",
    structureRevision: 3,
    aggregateRevision: 9,
    config: {
      paper: "A4",
      workLineMm: 7,
      answerPolicy: "never",
      volumeCode: "2-1-1",
      videoPolicy: "optional",
      studentSolutionPolicy: "never",
    },
    ...(source ? { structureSource: source } : {}),
    units: [],
  };
}

describe("textbook preview and lecture refs", () => {
  it("reads a valid edition id from the prop before the query", () => {
    expect(
      initialEditionFromLocation(
        previewEditionId,
        "?textbookEdition=00000000-0000-4000-8000-0000000000bb",
      ),
    ).toBe(previewEditionId);
    expect(
      initialEditionFromLocation(
        undefined,
        `?textbookEdition=${previewEditionId}`,
      ),
    ).toBe(previewEditionId);
    expect(
      initialEditionFromLocation(
        "not-a-uuid",
        `?textbookEdition=${previewEditionId}`,
      ),
    ).toBeNull();
  });

  it("refuses a preview that lacks a source, a snapshot, a start page, or a portrait", () => {
    const bare = buildSectionPreview({
      edition: previewEdition(undefined),
      section,
      variant: "student",
    });
    expect(bare).toEqual({
      ok: false,
      message: "판본 원본이 없어 측정하지 않습니다.",
    });
    const source = previewSource();
    const problem = buildSectionPreview({
      edition: previewEdition(source),
      section: {
        ...section,
        blocks: [{ id: "block-1", kind: "problems", itemIds: ["item-1"] }],
      },
      variant: "student",
    });
    expect(problem).toEqual({
      ok: false,
      message: "문항 확정본이 이 화면에 없어 측정하지 않습니다.",
    });
    const parity = buildSectionPreview({
      edition: previewEdition(source),
      section: { ...section, parity: "unconfirmed" },
      variant: "student",
    });
    expect(parity).toEqual({
      ok: false,
      message: "시작 면이 정해지지 않아 측정하지 않습니다.",
    });
    const portrait = buildSectionPreview({
      edition: previewEdition(source),
      section: {
        ...section,
        blocks: [
          {
            id: "block-1",
            kind: "dialogue",
            turns: [
              {
                id: "turn-1",
                speaker: "선생님",
                speakerId: "speaker.teacher",
                expression: "평온",
                side: "왼쪽",
                text: "안녕",
                portraitAssetId: "",
                mirror: false,
              },
            ],
          },
        ],
      },
      variant: "student",
    });
    expect(portrait).toEqual({
      ok: false,
      message: "초상 자료가 없어 측정하지 않습니다.",
    });
  });

  it("builds a student render model and refuses a placeholder QR", () => {
    const built = buildSectionPreview({
      edition: previewEdition(previewSource()),
      section: {
        ...section,
        parity: "even-left",
        blocks: [
          {
            id: "block-1",
            kind: "dialogue",
            turns: [
              {
                id: "turn-1",
                speaker: "선생님",
                speakerId: "speaker.teacher",
                expression: "평온",
                side: "왼쪽",
                text: "안녕",
                portraitAssetId: "portrait.teacher",
                mirror: false,
              },
            ],
          },
        ],
      },
      variant: "student",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.model.variant).toBe("student");
    expect(
      built.model.sections[0]?.blocks.some(
        (block) => block.kind === "dialogue",
      ),
    ).toBe(true);
    expect(built.resources.assetUrl("portrait.teacher")).toBe(
      `/api/textbook/editions/${previewEditionId}/assets/portrait.teacher`,
    );
    expect(() =>
      built.resources.qrDataUrl("qr-1", "https://textbook.invalid/qr"),
    ).toThrow("예약된 QR 이미지가 없습니다.");
    expect(built.provisionalNotice).toBeNull();
  });

  it("measures a student problem from its snapshot and keeps the answer off the page", () => {
    const problemId = "00000000-0000-4000-8000-000000000013";
    const snapshot = {
      snapshotId: "snap-1",
      source: {
        system: "todays-math" as const,
        problemId,
        problemCode: "E56-1",
      },
      sourceUpdatedAt: null,
      capturedAt: when,
      unitId: null,
      familyKey: null,
      difficulty: null,
      problemType: null,
      payload: {
        format: "markdown-latex" as const,
        content: "3+4",
        answer: "7",
        solution: null,
        questionType: null,
        figures: [],
      },
      contentHash: "c".repeat(64),
    };
    const item = {
      itemId: "item-1",
      editionId: previewEditionId,
      snapshotId: "snap-1",
      linkStatus: "unlinked" as const,
      sourceTestId: null,
      sourceTestProblemId: null,
      unitKey: "unit-1",
      sectionKey: "dialogue",
      learningStage: "basic" as const,
      displayNumber: "1",
      orderIndex: 0,
      layout: {
        columnSpan: 1 as const,
        minWorkLines: 0,
        preferredWorkLines: 0,
        maxWorkLines: 0,
        keepTogether: false,
      },
      qrTargetId: "qr-1",
    };
    const material = {
      items: [item],
      snapshots: [snapshot],
      assets: [],
      concepts: [],
      qrTargets: [
        {
          qrTargetId: "qr-1",
          editionId: previewEditionId,
          slug: "abcdefghijklmnop",
          url: "https://textbook.example/qr",
          itemId: "item-1",
        },
      ],
      conceptQrTargets: [],
    };
    const built = buildSectionPreview({
      edition: previewEdition(previewSource()),
      section: {
        ...section,
        blocks: [{ id: "block-1", kind: "problems", itemIds: ["item-1"] }],
      },
      variant: "student",
      material,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const block = built.model.sections
      .flatMap((row) => row.blocks)
      .find((row) => row.kind === "problem");
    expect(block).toMatchObject({
      kind: "problem",
      content: "3+4",
      displayNumber: "1",
      qr: { id: "qr-1", url: "https://textbook.example/qr" },
    });
    expect(block && "answer" in block).toBe(false);
    expect(built.provisionalNotice).toBeNull();
    const answers = buildSectionPreview({
      edition: previewEdition(previewSource()),
      section: {
        ...section,
        blocks: [{ id: "block-1", kind: "problems", itemIds: ["item-1"] }],
      },
      variant: "answers",
      material,
    });
    expect(answers.ok).toBe(true);
    if (!answers.ok) return;
    const answerBlock = answers.model.sections
      .flatMap((row) => row.blocks)
      .find((row) => row.kind === "problem");
    expect(answerBlock).toMatchObject({ answer: "7" });
  });

  it("overlays an unsaved concept onto the preview without a server concept row", () => {
    const built = buildSectionPreview({
      edition: previewEdition(previewSource()),
      section: {
        ...section,
        blocks: [
          { id: "block-1", kind: "concept", conceptKey: "common-denominator" },
        ],
        concept: {
          conceptKey: "common-denominator",
          title: "통분",
          kind: "정의",
          goal: "분모를 같게 한다",
          prerequisites: "",
          definition: "고친 정의",
          conditions: "",
          examples: "",
          counterexamples: "",
          misconceptions: "",
          explainPrompt: "",
          blankForms: ["term"],
        },
      },
      variant: "student",
      material: null,
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const block = built.model.sections
      .flatMap((row) => row.blocks)
      .find((row) => row.kind === "concept");
    expect(block).toMatchObject({
      kind: "concept",
      title: "통분",
      body: { definition: "고친 정의", goal: "분모를 같게 한다" },
      qr: null,
    });
    expect(built.provisionalNotice).toBe(
      "이 초안에는 예약된 QR이 없습니다. 해설 칸은 비워 두고, 발행할 때 예약된 주소만 넣습니다.",
    );
  });

  it("moves between measured spreads and stops at the edge", () => {
    const pages = [
      { physicalPageIndex: 2, printedPageLabel: "2" },
      { physicalPageIndex: 3, printedPageLabel: "3" },
      { physicalPageIndex: 4, printedPageLabel: "4" },
    ];
    expect(measuredSpreadAnchor(pages, null)).toBe(2);
    expect(nextMeasuredSpread(pages, 2, 1)).toBe(4);
    expect(nextMeasuredSpread(pages, 3, 1)).toBe(4);
    expect(nextMeasuredSpread(pages, 4, 1)).toBeNull();
    expect(nextMeasuredSpread(pages, 4, -1)).toBe(2);
    expect(nextMeasuredSpread([], null, 1)).toBeNull();
  });

  it("clamps a spread that disappeared after remeasurement instead of showing an empty spread", () => {
    const pages = [
      { physicalPageIndex: 2, printedPageLabel: "2" },
      { physicalPageIndex: 3, printedPageLabel: "3" },
    ];
    expect(measuredSpreadAnchor(pages, 6)).toBe(2);
    expect(measuredSpreadAnchor(pages, 0)).toBe(2);
    expect(nextMeasuredSpread(pages, 6, -1)).toBeNull();
  });

  it("previews an auto-lesson template with the same generic body projection", () => {
    const built = buildSectionPreview({
      edition: previewEdition(previewSource()),
      section: {
        ...section,
        templateKey: "auto-lesson",
        parity: "continue",
        blocks: [
          { id: "lesson-text", kind: "text", text: "덧셈을 알아봅시다." },
        ],
      },
      variant: "student",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.model.sections[0]).toMatchObject({
      templateKey: "auto-lesson",
      startPolicy: "continue",
      blocks: expect.arrayContaining([
        expect.objectContaining({
          kind: "text",
          markdown: "덧셈을 알아봅시다.",
        }),
      ]),
    });
  });

  it("turns between the actual measured spreads even when physical indexes have a gap", () => {
    const pages = [
      { physicalPageIndex: 7, printedPageLabel: "7" },
      { physicalPageIndex: 1, printedPageLabel: "" },
      { physicalPageIndex: 2, printedPageLabel: "2" },
    ];
    expect(nextMeasuredSpread(pages, 0, 1)).toBe(2);
    expect(nextMeasuredSpread(pages, 2, 1)).toBe(6);
    expect(nextMeasuredSpread(pages, 6, -1)).toBe(2);
    expect(nextMeasuredSpread(pages, 2, -1)).toBe(0);
  });

  it("includes the cover only with the first section and leaves saved print settings intact", () => {
    const source = previewSource();
    source.config.print.coverMode = "included";
    source.outline[0]!.sections = [
      { id: "section-1", sectionKey: "dialogue", title: "대화", revision: 1 },
      { id: "section-2", sectionKey: "practice", title: "연습", revision: 1 },
    ];
    const first = buildSectionPreview({
      edition: previewEdition(source),
      section,
      variant: "student",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.model.config.print).toMatchObject({
      coverMode: "included",
      firstPhysicalPageIndex: 1,
    });

    for (const parity of ["continue", "even-left"] as const) {
      const body = buildSectionPreview({
        edition: previewEdition(source),
        section: {
          ...section,
          sectionId: "section-2",
          sectionKey: "practice",
          parity,
        },
        variant: "student",
      });
      expect(body.ok).toBe(true);
      if (!body.ok) continue;
      expect(body.model.config.print).toMatchObject({
        coverMode: "separate",
        firstPhysicalPageIndex: 2,
      });
    }
    expect(source.config.print).toMatchObject({
      coverMode: "included",
      firstPhysicalPageIndex: 1,
    });

    source.config.print.firstPhysicalPageIndex = 1000;
    const lastAllowedStart = buildSectionPreview({
      edition: previewEdition(source),
      section: { ...section, sectionId: "section-2", parity: "continue" },
      variant: "student",
    });
    expect(lastAllowedStart.ok).toBe(true);
    if (!lastAllowedStart.ok) return;
    expect(lastAllowedStart.model.config.print.firstPhysicalPageIndex).toBe(
      1001,
    );
    expect(source.config.print.firstPhysicalPageIndex).toBe(1000);
  });

  it("adds and removes a concept lecture ref without touching video bindings", () => {
    const source = previewSource();
    const lectureId = "00000000-0000-4000-8000-0000000000cc";
    const linked = withConceptLecture(
      source,
      "unit-1",
      lectureId,
      "common-denominator",
      true,
    );
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;
    expect(linked.source.outline[0]?.conceptLectureRefs).toEqual([
      { lectureId, conceptKey: "common-denominator" },
    ]);
    const again = withConceptLecture(
      linked.source,
      "unit-1",
      lectureId,
      "common-denominator",
      true,
    );
    expect(again).toEqual({
      ok: false,
      message: "이미 이 단원에 연결된 강의입니다.",
    });
    const removed = withConceptLecture(
      linked.source,
      "unit-1",
      lectureId,
      "common-denominator",
      false,
    );
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.source.outline[0]?.conceptLectureRefs).toEqual([]);
  });

  it("keeps a reserved QR on the measured markup without requesting the printed URL", async () => {
    const problemId = "00000000-0000-4000-8000-000000000013";
    const snapshot = {
      snapshotId: "snap-1",
      source: {
        system: "todays-math" as const,
        problemId,
        problemCode: "E56-1",
      },
      sourceUpdatedAt: null,
      capturedAt: when,
      unitId: null,
      familyKey: null,
      difficulty: null,
      problemType: null,
      payload: {
        format: "markdown-latex" as const,
        content: "3+4",
        answer: "7",
        solution: null,
        questionType: null,
        figures: [],
      },
      contentHash: "c".repeat(64),
    };
    const item = {
      itemId: "item-1",
      editionId: previewEditionId,
      snapshotId: "snap-1",
      linkStatus: "unlinked" as const,
      sourceTestId: null,
      sourceTestProblemId: null,
      unitKey: "unit-1",
      sectionKey: "dialogue",
      learningStage: "basic" as const,
      displayNumber: "1",
      orderIndex: 0,
      layout: {
        columnSpan: 1 as const,
        minWorkLines: 0,
        preferredWorkLines: 0,
        maxWorkLines: 0,
        keepTogether: false,
      },
      qrTargetId: "qr-1",
    };
    const built = buildSectionPreview({
      edition: previewEdition(previewSource()),
      section: {
        ...section,
        blocks: [{ id: "block-1", kind: "problems", itemIds: ["item-1"] }],
      },
      variant: "student",
      material: {
        items: [item],
        snapshots: [snapshot],
        assets: [],
        concepts: [],
        qrTargets: [
          {
            qrTargetId: "qr-1",
            editionId: previewEditionId,
            slug: "abcdefghijklmnop",
            url: "https://textbook.example/qr",
            itemId: "item-1",
          },
        ],
        conceptQrTargets: [],
      },
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const requested: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requested.push(String(input));
      throw new Error(`unexpected fetch ${String(input)}`);
    }) as typeof fetch;
    try {
      const prepared = await withBrowserQrImages(built.model, built.resources);
      const block = built.model.sections
        .flatMap((row) => row.blocks)
        .find((row) => row.kind === "problem");
      expect(block?.kind).toBe("problem");
      if (!block || block.kind !== "problem" || !block.qr) return;
      const html = renderBlockHtml(block, prepared);
      const measured = measurementHtml(built.model, prepared);
      expect(html).toContain('class="tb-qr"');
      expect(html).toContain("data:image/png;base64,");
      expect(measured).toContain(prepared.qrDataUrl(block.qr.id, block.qr.url));
      expect(requested.some((url) => url.includes("textbook.example"))).toBe(
        false,
      );
    } finally {
      globalThis.fetch = original;
    }
  });

  it("saves the chosen cover and first page without moving the even-left start", () => {
    const source = previewSource();
    const edited = applyEditionEdits(source, {
      coverMode: "included",
      firstPhysicalPageIndex: 3,
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.source.config.print).toMatchObject({
      paper: "A4",
      sectionStart: "even-left",
      coverMode: "included",
      firstPhysicalPageIndex: 3,
      innerMarginMm: 15,
      outerMarginMm: 15,
    });
    expect(edited.source.outline).toEqual(source.outline);
    expect(applyEditionEdits(source, { firstPhysicalPageIndex: 0 })).toEqual({
      ok: false,
      message: "첫 쪽은 1부터 1000까지입니다.",
    });
    const bare = structuredClone(source);
    Reflect.deleteProperty(bare.config, "print");
    expect(applyEditionEdits(bare, { coverMode: "included" })).toEqual({
      ok: false,
      message: "인쇄 설정이 없어 저장하지 않습니다.",
    });
  });

  it("clears pending link confirmation only when the concept manuscript changes", () => {
    const concept: ConceptDraft = {
      conceptKey: "prime-definition",
      title: "소수",
      kind: "정의",
      goal: "",
      prerequisites: "",
      definition: "1과 자신",
      conditions: "",
      examples: "2",
      counterexamples: "",
      misconceptions: "",
      explainPrompt: "",
      blankForms: ["term", "cloze"],
    };
    expect(conceptManuscriptChanged(concept, concept)).toBe(false);
    expect(conceptManuscriptChanged(null, concept)).toBe(false);
    expect(
      conceptManuscriptChanged(concept, {
        ...concept,
        blankForms: ["term"],
      }),
    ).toBe(false);
    expect(
      conceptManuscriptChanged(concept, {
        ...concept,
        examples: "임시표식",
      }),
    ).toBe(true);
    expect(manuscriptLocked(undefined, false)).toBe(false);
    expect(manuscriptLocked("draft", false)).toBe(false);
    expect(manuscriptLocked("published", false)).toBe(true);
    expect(manuscriptLocked("retired", false)).toBe(true);
    expect(manuscriptLocked("draft", true)).toBe(true);
  });
});
