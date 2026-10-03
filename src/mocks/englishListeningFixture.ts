/** Self-authored L0 metadata fixture. Hashes are synthetic: no real media/voice review is claimed. */
import type {
  EnglishListeningAssignment,
  EnglishListeningDocument,
} from "@/contracts/englishListening.contract";
import {
  listeningContentHash,
  publishListeningDocument,
  type VerifiedListeningMedia,
} from "@/lib/english/listening/publication";

const id = (number: number) =>
  `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
export const listeningFixtureIds = {
  set: id(1),
  owner: id(2),
  branch: id(3),
  publication: id(4),
  assignment: id(5),
  student: id(6),
  attempt: id(7),
  retry: id(8),
};
export const listeningFixtureNow = "2026-10-03T00:00:00.000Z";

export function englishListeningFixture(): EnglishListeningDocument {
  const document: EnglishListeningDocument = {
    schemaVersion: 1,
    id: listeningFixtureIds.set,
    ownerId: listeningFixtureIds.owner,
    branchId: listeningFixtureIds.branch,
    revision: 1,
    title: "짧은 대화와 안내",
    level: "중1~2 시범",
    examId: null,
    provenance: {
      kind: "teacher_authored",
      recordedBy: listeningFixtureIds.owner,
      recordedAt: listeningFixtureNow,
      basis: "L0 자체 제작 테스트 자료",
    },
    rights: {
      rightsStatus: "approved",
      allowedUses: ["store_original", "teacher_review", "distribution"],
    },
    rightsReview: {
      confirmedBy: listeningFixtureIds.owner,
      confirmedAt: listeningFixtureNow,
      basis: "자체 작성 텍스트; 음원은 테스트 메타데이터",
    },
    groups: [
      {
        id: id(10),
        audio: { assetId: id(11), sha256: "a".repeat(64), durationMs: 15000 },
        transcript: {
          revision: 1,
          text: "A: When does the library open? B: At nine. Let's meet there on Saturday.",
          spokenText:
            "When does the library open? At nine. Let's meet there on Saturday.",
          translation: "도서관은 아홉 시에 연다. 토요일에 만나기로 한다.",
        },
        questions: [
          {
            id: id(12),
            prompt: "도서관이 여는 시각은?",
            choices: [
              { id: id(13), text: "9시" },
              { id: id(14), text: "10시" },
            ],
            answerChoiceId: id(13),
            explanation: "At nine이라고 답한다.",
            evidence: [{ startMs: 3000, endMs: 7000 }],
          },
          {
            id: id(15),
            prompt: "두 사람이 만날 요일은?",
            choices: [
              { id: id(16), text: "금요일" },
              { id: id(17), text: "토요일" },
            ],
            answerChoiceId: id(17),
            explanation: "Saturday에 만나자고 한다.",
            evidence: [{ startMs: 7000, endMs: 14000 }],
          },
        ],
        reviews: { content: null, audio: null, alignment: null },
      },
      {
        id: id(20),
        audio: { assetId: id(21), sha256: "b".repeat(64), durationMs: 12000 },
        transcript: {
          revision: 1,
          text: "The bus to Green Park leaves at two. Please wait by the main gate.",
          spokenText:
            "The bus to Green Park leaves at two. Please wait by the main gate.",
          translation:
            "공원행 버스는 두 시에 출발한다. 정문에서 기다려 주세요.",
        },
        questions: [
          {
            id: id(22),
            prompt: "안내에 따라 기다릴 곳은?",
            choices: [
              { id: id(23), text: "정문" },
              { id: id(24), text: "매표소" },
            ],
            answerChoiceId: id(23),
            explanation: "by the main gate라고 안내한다.",
            evidence: [{ startMs: 5000, endMs: 11500 }],
          },
        ],
        reviews: { content: null, audio: null, alignment: null },
      },
    ],
  };
  const contentHash = listeningContentHash(document);
  for (const group of document.groups) {
    const review = {
      reviewerId: listeningFixtureIds.owner,
      reviewedAt: listeningFixtureNow,
      revision: document.revision,
      contentHash,
    };
    group.reviews = {
      content: review,
      audio: {
        ...review,
        assetId: group.audio.assetId,
        sha256: group.audio.sha256,
        transcriptRevision: group.transcript.revision,
      },
      alignment: {
        ...review,
        assetId: group.audio.assetId,
        sha256: group.audio.sha256,
        transcriptRevision: group.transcript.revision,
      },
    };
  }
  return document;
}

export function englishListeningPublicationFixture() {
  const document = englishListeningFixture();
  return publishListeningDocument(document, {
    id: listeningFixtureIds.publication,
    publishedAt: listeningFixtureNow,
    verifiedMedia: englishListeningVerifiedMediaFixture(document),
  });
}

export function englishListeningVerifiedMediaFixture(
  document = englishListeningFixture(),
): VerifiedListeningMedia[] {
  return document.groups.map((group) => ({
    ...group.audio,
    readiness: "ready",
    ownerId: document.ownerId,
    branchId: document.branchId,
    verifiedAt: listeningFixtureNow,
  }));
}

export function englishListeningAssignmentFixture(): EnglishListeningAssignment {
  return {
    schemaVersion: 1,
    id: listeningFixtureIds.assignment,
    revision: 1,
    publicationId: listeningFixtureIds.publication,
    ownerId: listeningFixtureIds.owner,
    branchId: listeningFixtureIds.branch,
    createdAt: listeningFixtureNow,
    targetStudentIds: [listeningFixtureIds.student],
    mode: "practice",
    audioSource: "student_device",
    opensAt: listeningFixtureNow,
    closesAt: "2026-10-03T01:00:00.000Z",
    timeLimitSeconds: 600,
    releasePolicy: { kind: "after_unit_answer" },
    cancelledAt: null,
  };
}
