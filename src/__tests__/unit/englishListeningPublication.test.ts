// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  listeningContentHash,
  publishListeningDocument,
  validateListeningPublication,
} from "@/lib/english/listening/publication";
import {
  englishListeningFixture,
  englishListeningVerifiedMediaFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";

function publish(document = englishListeningFixture()) {
  return publishListeningDocument(document, {
    id: listeningFixtureIds.publication,
    publishedAt: listeningFixtureNow,
    verifiedMedia: englishListeningVerifiedMediaFixture(document),
  });
}

describe("review-bound immutable publication", () => {
  it("requires rights and provenance confirmation before content/audio/alignment reviews", () => {
    const draft = englishListeningFixture();
    draft.rightsReview!.basis = "권리 확인 근거 변경";
    expect(() => publish(draft)).toThrow(/stale review/i);
    const source = englishListeningFixture();
    source.provenance.basis = "출처 확인 변경";
    expect(() => publish(source)).toThrow(/stale review/i);
  });
  it("snapshots fixed question/choice order and recursively freezes an independent copy", () => {
    const draft = englishListeningFixture();
    const publication = publish(draft);
    draft.groups[0].questions[0].prompt = "edited later";
    expect(publication.document.groups[0].questions[0].prompt).not.toBe(
      "edited later",
    );
    expect(
      Object.isFrozen(publication.document.groups[0].questions[0].choices),
    ).toBe(true);
    expect(
      validateListeningPublication(JSON.parse(JSON.stringify(publication))),
    ).toEqual(publication);
  });

  it.each([
    "text",
    "spokenText",
    "question",
    "revision",
    "hash",
    "duration",
    "alignment",
  ])("blocks stale review after %s changes", (change) => {
    const draft = englishListeningFixture();
    if (change === "text") draft.groups[0].transcript.text += " edited";
    if (change === "spokenText")
      draft.groups[0].transcript.spokenText += " edited";
    if (change === "question") draft.groups[0].questions[0].choices.reverse();
    if (change === "revision") draft.revision++;
    if (change === "hash") draft.groups[0].audio.sha256 = "c".repeat(64);
    if (change === "duration") draft.groups[0].audio.durationMs++;
    if (change === "alignment")
      draft.groups[0].questions[0].evidence[0].startMs++;
    expect(() => publish(draft)).toThrow();
  });

  it("requires separately trusted media identity and current distribution rights", () => {
    const draft = englishListeningFixture();
    const verifiedMedia = englishListeningVerifiedMediaFixture(draft);
    verifiedMedia[0].sha256 = "f".repeat(64);
    expect(() =>
      publishListeningDocument(draft, {
        id: listeningFixtureIds.publication,
        publishedAt: listeningFixtureNow,
        verifiedMedia,
      }),
    ).toThrow(/media/i);
    draft.rights = { rightsStatus: "unknown", allowedUses: [] };
    expect(() => publish(draft)).toThrow();
    const missing = englishListeningFixture();
    missing.groups[0].reviews.audio = null;
    expect(() => publish(missing)).toThrow(/review/i);
  });

  it("detects persisted snapshot tampering and rejects future review timestamps", () => {
    const snapshot = JSON.parse(JSON.stringify(publish()));
    snapshot.document.groups[0].questions[0].answerChoiceId =
      snapshot.document.groups[0].questions[0].choices[1].id;
    expect(() => validateListeningPublication(snapshot)).toThrow();
    const future = englishListeningFixture();
    future.groups[0].reviews.content!.reviewedAt = "2030-01-01T00:00:00.000Z";
    expect(() => publish(future)).toThrow();
  });

  it("hashes canonical content independently of object key insertion order", () => {
    const draft = englishListeningFixture();
    const reordered = Object.fromEntries(Object.entries(draft).reverse());
    expect(listeningContentHash(reordered)).toBe(listeningContentHash(draft));
  });

  it.each(["readiness", "ownerId", "branchId", "verifiedAt"])(
    "blocks a wrong trusted media %s",
    (field) => {
      const document = englishListeningFixture();
      const verifiedMedia = englishListeningVerifiedMediaFixture(document);
      const value =
        field === "readiness"
          ? "pending_decode"
          : field === "verifiedAt"
            ? "2030-01-01T00:00:00.000Z"
            : listeningFixtureIds.student;
      Object.assign(verifiedMedia[0], { [field]: value });
      expect(() =>
        publishListeningDocument(document, {
          id: listeningFixtureIds.publication,
          publishedAt: listeningFixtureNow,
          verifiedMedia,
        }),
      ).toThrow();
    },
  );
});
