import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ListeningBankMaterial from "@/components/english/bank/ListeningBankMaterial";
import { ListeningTeacherWorkspace } from "@/components/english/listening/ListeningTeacherWorkspace";
import { ListeningStudentView } from "@/components/learn/english-listening/ListeningStudentView";
import { ListeningPrint } from "@/components/english/listening/print/ListeningPrint";
import { ListeningDraftEditor } from "@/components/english/listening/ListeningDraftEditor";
import { editListeningDraft } from "@/components/english/listening/listeningDraft";
import { listeningPrintDocument } from "@/lib/english/listening/print";
import { listeningDraftPrintDocument } from "@/lib/english/listening/draftPrint";
import { listeningDraftSchema } from "@/contracts/englishListeningHttp.contract";
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

const request = vi.hoisted(() => vi.fn());
vi.mock("@/components/english/listening/listeningClient", () => ({
  listeningRequest: request,
  listeningError: (error: Error) => error.message,
}));
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const sharedInstruction = "대화를 듣고, 두 사람이 만나기로 한 시각을 고르시오.";
function fixture(
  role?: "question" | "visual",
  placeholders = false,
  shared = false,
) {
  const document = englishListeningFixture();
  const question = document.groups[0].questions[0];
  question.image = {
    dataUrl: png,
    width: 320,
    height: 180,
    ...(role ? { role } : {}),
  };
  question.sourceNumber = 17;
  if (shared) question.instruction = sharedInstruction;
  if (placeholders)
    question.choices.forEach((choice, i) => {
      choice.text = ["①", "②"][i];
    });
  document.groups = [{ ...document.groups[0], questions: [question] }];
  const hash = listeningContentHash(document);
  for (const review of Object.values(document.groups[0].reviews))
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
  const source = {
    documentHash: hash,
    detail: {
      id: document.id,
      revision: document.revision,
      document,
      publications: [],
      mediaUrlsByAssetId: {},
    },
  };
  return { document, question, publication, student, source };
}

beforeEach(() => {
  request.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("listening question presentation across bank, teacher, student and print", () => {
  it.each([
    ["1", "2"],
    ["①", "②"],
  ])(
    "preserves numbered answer options without a visual: %s %s",
    (first, second) => {
      const data = fixture("visual");
      const document = listeningPrintDocument(data.publication, "student");
      const question = document.groups[0].questions[0];
      delete question.image;
      question.choices = [first, second];
      const view = render(<ListeningPrint document={document} />);
      expect(view.container.textContent).toContain(data.question.prompt);
      const choices = view.container.querySelectorAll("section section ol li");
      expect(choices).toHaveLength(2);
      expect(choices[0].textContent).toContain("①");
      expect(choices[1].textContent).toContain("②");
      if (first === "1") {
        expect(choices[0].textContent).toContain("1");
        expect(choices[1].textContent).toContain("2");
      } else {
        expect(choices[0].textContent?.match(/①/g)).toHaveLength(1);
        expect(choices[1].textContent?.match(/②/g)).toHaveLength(1);
      }
    },
  );
  it.each(["question", "visual"] as const)(
    "preserves required shared instructions in the student %s view",
    (role) => {
      const data = fixture(role, false, true);
      const view = render(
        <ListeningStudentView
          view={data.student}
          mode="exam"
          attempt={{
            id: listeningFixtureIds.attempt,
            revision: 1,
            status: "in_progress",
            serverNow: listeningFixtureNow,
            startedAt: listeningFixtureNow,
            deadlineAt: "2026-10-03T00:20:00.000Z",
            submittedAt: null,
            answers: [],
          }}
          onStart={vi.fn()}
          onCommitAnswer={vi.fn()}
          onSubmit={vi.fn()}
        />,
      );
      expect(view.container.textContent).toContain(sharedInstruction);
      expect(view.container.textContent?.split(sharedInstruction)).toHaveLength(
        2,
      );
      expect(screen.getByRole("img")).toHaveAttribute("src", png);
      if (role === "question")
        for (const choice of data.question.choices)
          expect(
            screen.getByRole("radio", { name: new RegExp(choice.text) }),
          ).toBeEnabled();
    },
  );
  it("lets the teacher distinguish a full question crop from a visual without losing question data", () => {
    const data = fixture();
    const draft = editListeningDraft(data.document);
    const setDraft = vi.fn();
    render(
      <ListeningDraftEditor
        draft={draft}
        setDraft={setDraft}
        saved
        busy={false}
        mediaUrls={{}}
        onSave={vi.fn()}
        onUpload={vi.fn()}
        onClose={vi.fn()}
        onConfirmRights={vi.fn()}
        rightsReviewed
      />,
    );
    const role = screen.getByRole("combobox", {
      name: "묶음 1 문항 1 그림 용도",
    });
    expect(role).toHaveValue("question");
    fireEvent.change(role, { target: { value: "visual" } });
    const update = setDraft.mock.calls.at(-1)![0];
    const result = update(draft);
    expect(result.groups[0].questions[0]).toEqual({
      ...draft.groups[0].questions[0],
      image: { ...data.question.image, role: "visual" },
    });
  });
  it.each([undefined, "question"] as const)(
    "keeps full-question role %s readable without repeating its stem above the image",
    async (role) => {
      const data = fixture(role);
      request.mockResolvedValue(data.source);
      const bank = render(
        <ListeningBankMaterial
          active
          setId={data.document.id}
          onOpenListening={vi.fn()}
        />,
      );
      await screen.findByRole("checkbox", { name: "17번 문항 담기" });
      expect(bank.container.textContent).not.toContain(data.question.prompt);
      expect(screen.getByRole("img")).toHaveAttribute("src", png);
      bank.unmount();
      const teacher = render(
        <ListeningTeacherWorkspace
          materials={[data.document]}
          selectedDocument={data.document}
          mediaUrlsByAssetId={{}}
          onSelectMaterial={vi.fn()}
        />,
      );
      expect(teacher.container.textContent).not.toContain(data.question.prompt);
      expect(screen.getByRole("img")).toHaveAttribute("src", png);
      teacher.unmount();
    },
  );

  it("shows native text and actual choices alongside visual figures in the bank and teacher views", async () => {
    const data = fixture("visual");
    request.mockResolvedValue(data.source);
    const bank = render(
      <ListeningBankMaterial
        active
        setId={data.document.id}
        onOpenListening={vi.fn()}
      />,
    );
    await screen.findByText(data.question.prompt, { exact: false });
    for (const choice of data.question.choices)
      expect(bank.container.textContent).toContain(choice.text);
    expect(screen.getByRole("img")).toHaveAttribute("src", png);
    bank.unmount();
    const teacher = render(
      <ListeningTeacherWorkspace
        materials={[data.document]}
        selectedDocument={data.document}
        mediaUrlsByAssetId={{}}
        onSelectMaterial={vi.fn()}
      />,
    );
    expect(teacher.container.textContent).toContain(data.question.prompt);
    expect(screen.getByRole("img")).toHaveAttribute("src", png);
    for (const choice of data.question.choices)
      expect(teacher.container.textContent).toContain(choice.text);
  });

  it.each([undefined, "question", "visual"] as const)(
    "keeps all student answer controls for role %s without duplicated placeholder text",
    (role) => {
      const data = fixture(role, true);
      const view = render(
        <ListeningStudentView
          view={data.student}
          mode="exam"
          attempt={{
            id: listeningFixtureIds.attempt,
            revision: 1,
            status: "in_progress",
            serverNow: listeningFixtureNow,
            startedAt: listeningFixtureNow,
            deadlineAt: "2026-10-03T00:20:00.000Z",
            submittedAt: null,
            answers: [],
          }}
          onStart={vi.fn()}
          onCommitAnswer={vi.fn()}
          onSubmit={vi.fn()}
        />,
      );
      expect(screen.getByRole("img")).toHaveAttribute("src", png);
      expect(view.container.textContent).not.toMatch(/[①②]/);
      if (role === "visual")
        expect(view.container.textContent).toContain(data.question.prompt);
      else
        expect(view.container.textContent).not.toContain(data.question.prompt);
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(2);
      fireEvent.click(radios[1]);
      expect(radios[1]).toBeChecked();
    },
  );

  it.each([false, true])(
    "prints visual figures and native choices (placeholder-only=%s) on publication and draft sheets",
    (placeholders) => {
      const data = fixture("visual", placeholders);
      const documents = [
        listeningPrintDocument(data.publication, "student"),
        listeningDraftPrintDocument(
          listeningDraftSchema.parse(data.document),
          "student",
        ),
      ];
      for (const document of documents) {
        const view = render(<ListeningPrint document={document} />);
        expect(view.container.textContent).toContain(data.question.prompt);
        expect(screen.getByRole("img")).toHaveAttribute("src", png);
        if (placeholders) {
          expect(view.container.querySelector("section section ol")).toBeNull();
          expect(view.container.textContent).not.toMatch(/[①②]/);
        } else
          for (const choice of data.question.choices)
            expect(view.container.textContent).toContain(choice.text);
        expect(view.container.textContent).not.toContain(
          data.question.explanation,
        );
        expect(JSON.stringify(document)).not.toContain(
          data.question.answerChoiceId,
        );
        view.unmount();
      }
      const teacher = render(
        <ListeningPrint
          document={listeningPrintDocument(data.publication, "teacher")}
        />,
      );
      expect(teacher.container.textContent).toContain("정답 1");
      expect(teacher.container.textContent).toContain(
        data.question.explanation,
      );
    },
  );
});
