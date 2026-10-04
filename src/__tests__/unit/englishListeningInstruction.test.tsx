import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { listeningQuestionSchema } from "@/contracts/englishListening.contract";
import {
  listeningDraftQuestionSchema,
  listeningDraftSchema,
} from "@/contracts/englishListeningHttp.contract";
import { ListeningPrint } from "@/components/english/listening/print/ListeningPrint";
import { listeningPrintDocument } from "@/lib/english/listening/print";
import { listeningDraftPrintDocument } from "@/lib/english/listening/draftPrint";
import { projectListeningStudentView } from "@/lib/english/listening/projection";
import {
  listeningContentHash,
  publishListeningDocument,
} from "@/lib/english/listening/publication";
import {
  englishListeningFixture,
  englishListeningAssignmentFixture,
  englishListeningVerifiedMediaFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";

afterEach(cleanup);
const instruction =
  "대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오.";
const image = {
  dataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  width: 1,
  height: 1,
};
function sharedResponseFixture() {
  const draft = englishListeningFixture();
  const question = draft.groups[0].questions[1];
  Object.assign(question, {
    instruction,
    prompt: `${instruction} Woman: __________`,
    image,
    sourceNumber: 17,
  });
  draft.groups = [{ ...draft.groups[0], questions: [question] }];
  const contentHash = listeningContentHash(draft);
  for (const review of Object.values(draft.groups[0].reviews))
    if (review) review.contentHash = contentHash;
  const publication = publishListeningDocument(draft, {
    id: listeningFixtureIds.publication,
    publishedAt: listeningFixtureNow,
    verifiedMedia: englishListeningVerifiedMediaFixture(draft),
  });
  return { draft, question, publication };
}

describe("shared listening instruction", () => {
  it("preserves bounded instruction in teacher and draft HTTP contracts", () => {
    const question = {
      ...englishListeningFixture().groups[0].questions[0],
      instruction,
    };
    expect(listeningQuestionSchema.parse(question)).toMatchObject({
      instruction,
    });
    expect(listeningDraftQuestionSchema.parse(question)).toMatchObject({
      instruction,
    });
    for (const schema of [
      listeningQuestionSchema,
      listeningDraftQuestionSchema,
    ]) {
      expect(
        schema.safeParse({ ...question, instruction: "x".repeat(2001) })
          .success,
      ).toBe(false);
      expect(schema.safeParse({ ...question, instruction: " " }).success).toBe(
        false,
      );
    }
  });

  it("prints the required instruction before a separately selected Q17 image without student answers", () => {
    const { draft, question, publication } = sharedResponseFixture();
    const printDocuments = [
      listeningPrintDocument(publication, "student"),
      listeningDraftPrintDocument(listeningDraftSchema.parse(draft), "student"),
    ];
    for (const document of printDocuments) {
      const view = render(<ListeningPrint document={document} />);
      const text = view.getByText(instruction, { exact: true });
      const crop = view.getByAltText(question.prompt);
      expect(
        text.compareDocumentPosition(crop) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(view.container.textContent).toContain("원본 17번");
      expect(view.container.textContent).not.toContain(question.explanation);
      expect(JSON.stringify(document)).not.toMatch(
        /"(?:answer|transcript|translation|explanation|answerChoiceId)":/,
      );
      view.unmount();
    }
  });

  it("preserves shared instruction for the student while excluding teacher-only answers", () => {
    const { question, publication } = sharedResponseFixture();
    const view = projectListeningStudentView(
      publication,
      englishListeningAssignmentFixture(),
      null,
      {
        now: listeningFixtureNow,
        studentId: listeningFixtureIds.student,
      },
    );
    const projected = view.groups[0].questions[0];
    expect(projected.prompt).toBe(question.prompt);
    expect(projected.prompt).toContain(instruction);
    expect(projected.instruction).toBe(instruction);
    expect(projected).not.toHaveProperty("answerChoiceId");
    expect(projected).not.toHaveProperty("explanation");
    expect(JSON.stringify(view)).not.toContain(question.explanation);
  });
});
