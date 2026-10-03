import { describe, expect, it } from "vitest";

import {
  canFinalize,
  orderBlankPicks,
  planUploadChunks,
  publishHeadline,
  visibleAnswer,
  type BlankPick,
} from "@/components/textbook/model";
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
});
