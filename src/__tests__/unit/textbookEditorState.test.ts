import { describe, expect, it } from "vitest";

import {
  canFinalize,
  initialEditionFromLocation,
  orderBlankPicks,
  planUploadChunks,
  publishHeadline,
  visibleAnswer,
  withConceptLecture,
  type BlankPick,
  type EditionDetail,
} from "@/components/textbook/model";
import { buildSectionPreview } from "@/components/textbook/previewModel";
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

  it("saves blank forms and confirmation ids on the concept", async () => {
    let body: {
      expectedRevision?: number;
      confirmBlankEntryIds?: string[];
      concept?: { blankForms?: string[]; body?: { definition?: string } };
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
      confirmEntryIds: ["e5-1"],
      confirmLinkIds: [],
    });
    expect(body.expectedRevision).toBe(0);
    expect(body.confirmBlankEntryIds).toEqual(["e5-1"]);
    expect(body.concept?.blankForms).toEqual(["term", "cloze"]);
    expect(body.concept?.body?.definition).toBe("분모를 같게 한다");
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

    let registerCalls = 0;
    const refused = createTextbookApi(async () => {
      registerCalls += 1;
      return Response.json({ data: {} });
    });
    await expect(
      refused.registerItem(editionId, "item-1", requestId, 9),
    ).rejects.toThrow(/등록 계약이 아직 없습니다/);
    expect(registerCalls).toBe(0);
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
          unit: {
            id: unitId,
            grade: "초5",
            chapter: "분수",
            section: "통분",
            code: "E56",
            orderIndex: 1,
            lectures: { published: 1, draft: 0, archived: 0 },
          },
          lectures: [
            {
              id: lectureId,
              unitId,
              title: "통분 강의",
              videoUrl: null,
              seconds: 0,
              disclosure: null,
              sortOrder: 0,
              status: "published",
              reviewedAt: null,
              publishedAt: "2026-10-03T00:00:00.000Z",
              gate: { canPublish: true, blockers: [], warnings: [] },
            },
          ],
        },
      });
    });
    await expect(api.listUnitLectures(unitId)).resolves.toEqual([
      { lectureId, title: "통분 강의", status: "published" },
    ]);
    expect(called).toBe(`/api/concept/lectures?unitId=${unitId}`);
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
});
