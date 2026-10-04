// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listeningQuestionImageSchema } from "@/contracts/englishListeningSource.contract";
import { englishListeningDocumentSchema } from "@/contracts/englishListening.contract";
import {
  englishListeningFixture,
  englishListeningAssignmentFixture,
  englishListeningVerifiedMediaFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";
import {
  listeningContentHash,
  publishListeningDocument,
} from "@/lib/english/listening/publication";
import { projectListeningStudentView } from "@/lib/english/listening/projection";
import { listeningPrintDocument } from "@/lib/english/listening/print";

const image = {
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  width: 320,
  height: 480,
};

describe("listening question image roles", () => {
  it.each(["question", "visual"] as const)(
    "preserves the explicit %s role in stored question JSON",
    (role) => {
      const document = englishListeningFixture();
      Object.assign(document.groups[0].questions[0], {
        image: { ...image, role },
      });
      const parsed = englishListeningDocumentSchema.parse(document);
      expect(parsed.groups[0].questions[0].image).toEqual({ ...image, role });
    },
  );

  it("preserves legacy image JSON without changing published content hashes", () => {
    expect(listeningQuestionImageSchema.parse(image)).toEqual(image);
    expect(JSON.stringify(listeningQuestionImageSchema.parse(image))).toBe(
      JSON.stringify(image),
    );
  });

  it.each([undefined, "question", "visual"] as const)(
    "projects role %s to student and print while keeping answers private",
    (role) => {
      const document = englishListeningFixture();
      document.groups[0].questions[0].image = {
        ...image,
        ...(role ? { role } : {}),
      };
      const hash = listeningContentHash(document);
      for (const group of document.groups)
        for (const review of Object.values(group.reviews))
          if (review) review.contentHash = hash;
      const publication = publishListeningDocument(document, {
        id: listeningFixtureIds.publication,
        publishedAt: listeningFixtureNow,
        verifiedMedia: englishListeningVerifiedMediaFixture(document),
      });
      const student = projectListeningStudentView(
        publication,
        englishListeningAssignmentFixture(),
        null,
        { now: listeningFixtureNow, studentId: listeningFixtureIds.student },
      );
      const print = listeningPrintDocument(publication, "student");
      expect(student.groups[0].questions[0].image).toEqual(
        document.groups[0].questions[0].image,
      );
      expect(print.groups[0].questions[0].image).toEqual(
        document.groups[0].questions[0].image,
      );
      for (const payload of [student, print])
        expect(JSON.stringify(payload)).not.toMatch(
          /"(?:answer|answerChoiceId|explanation|transcript|translation)":/,
        );
    },
  );

  it.each(["answer", "figure", "", null])(
    "rejects an unknown role rather than silently downgrading it: %s",
    (role) => {
      expect(
        listeningQuestionImageSchema.safeParse({ ...image, role }).success,
      ).toBe(false);
    },
  );
});
