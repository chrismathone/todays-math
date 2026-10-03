import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ListeningPrint } from "@/components/english/listening/print/ListeningPrint";
import { listeningPrintDocument } from "@/lib/english/listening/print";
import { publishListeningDocument } from "@/lib/english/listening/publication";
import {
  englishListeningFixture,
  englishListeningVerifiedMediaFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";
afterEach(cleanup);
describe("listening print projection", () => {
  it("removes every teacher-only field before student HTML or hydration props are produced", () => {
    const draft = englishListeningFixture();
    const publication = publishListeningDocument(draft, {
      id: listeningFixtureIds.publication,
      publishedAt: listeningFixtureNow,
      verifiedMedia: englishListeningVerifiedMediaFixture(draft),
    });
    const data = listeningPrintDocument(publication, "student");
    const { container } = render(<ListeningPrint document={data} />);
    const payload = JSON.stringify(data);
    for (const group of draft.groups) {
      expect(payload).not.toContain(group.transcript.text);
      expect(container.textContent).not.toContain(group.transcript.text);
      for (const question of group.questions) {
        expect(payload).not.toContain(question.explanation);
        expect(container.textContent).not.toContain(question.explanation);
        expect(payload).not.toContain(question.answerChoiceId);
        for (const choice of question.choices)
          expect(container.textContent).toContain(choice.text);
      }
    }
    expect(payload).not.toMatch(
      /"(?:answer|transcript|translation|explanation|audio|reviews|rights)":/,
    );
    const teacher = listeningPrintDocument(publication, "teacher");
    expect(teacher.groups[0].transcript).toBe(draft.groups[0].transcript.text);
    expect(teacher.groups[0].questions[0].answer).toBeGreaterThan(0);
  });
});
