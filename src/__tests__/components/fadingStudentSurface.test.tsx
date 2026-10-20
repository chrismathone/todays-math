import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FadingApp } from "@/components/fading/FadingApp";
import { createLocalFadingSource } from "@/lib/fading/local";
import { prepareFadingDev } from "@/components/fading/devFixtures";
import type { FadingConcept } from "@/lib/fading/concepts";
import { StudentReviewPage } from "@/components/math-srs/StudentReviewHome";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
const concept: FadingConcept = {
  id: "words",
  section: "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
  level: "하",
  ordinal: 1,
  siblings: 2,
  propositions: [
    {
      id: "p",
      kind: "정의",
      term: "기준 수",
      pieces: [
        { kind: "text", text: "이상에는 " },
        {
          kind: "target",
          target: { id: "p#1", text: "기준 수", tier: "text" },
        },
        { kind: "text", text: "도 들어가요." },
      ],
    },
  ],
};

describe("student entrypoint copy", () => {
  it("explains a resumed missing answer without exposing storage terminology", async () => {
    const prepared = await prepareFadingDev([concept], {
      scene: "rating",
      conceptId: concept.id,
      preview: false,
      cards: true,
    });
    render(
      <FadingApp
        student
        source={prepared.source}
        initialState={prepared.state}
        initialSession
      />,
    );
    await screen.findByText("4단계를 마쳤어요");
    expect(document.body.textContent).not.toMatch(/입력 원문|미입력/);
  });
  it("opts the real explorer book into student copy and removes its old heading", async () => {
    const source = createLocalFadingSource({
      concepts: [concept],
      today: "2026-10-20",
      cards: true,
    });
    const state = {
      ...explorerView(createExplorerState("words-student", 5), "2026-10-20"),
      student: { id: "words-student", name: "학생", className: "초5" },
      revision: 0,
      feedback: null,
    };
    render(
      <StudentMathExplorers
        student
        initialState={state}
        conceptMemoryEnabled
        fadingSource={source}
      />,
    );
    expect(await screen.findByTestId("study-spread")).toBeInTheDocument();
    expect(screen.queryByText("매일 쌓이는 수학")).toBeNull();
    expect(screen.queryByText(/하루 한 걸음/)).toBeNull();
  });
  it("uses student copy through the standalone app session, while the default preview keeps its metadata", async () => {
    const source = createLocalFadingSource({
      concepts: [concept],
      today: "2026-10-20",
      cards: true,
    });
    await source.act({ action: "pick", conceptId: concept.id });
    const state = await source.act({ action: "open", conceptId: concept.id });
    const { unmount } = render(
      <FadingApp student source={source} initialState={state} initialSession />,
    );
    expect(
      await screen.findByText("수의 범위와 어림하기 · 이상과 이하 알아보기"),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /소거율|정독|대조|2-1-1|개념 1\/2/,
    );
    unmount();
    render(<FadingApp source={source} initialState={state} initialSession />);
    expect(await screen.findByText(/소거율/)).toBeInTheDocument();
    expect(document.body.textContent).toContain("2-1-1");
  });
  it("removes only the old heading when the caller presents a study book", () => {
    const { rerender } = render(
      <StudentReviewPage
        kind="explorers"
        student={null}
        practiceTitle="수학 탐험"
        hideHeading
      >
        <p>넘김책</p>
      </StudentReviewPage>,
    );
    expect(screen.queryByText("매일 쌓이는 수학")).toBeNull();
    expect(screen.queryByText(/하루 한 걸음/)).toBeNull();
    expect(screen.getByText("넘김책")).toBeInTheDocument();
    rerender(
      <StudentReviewPage
        kind="explorers"
        student={null}
        practiceTitle="수학 탐험"
      >
        <p>옛 첫 화면</p>
      </StudentReviewPage>,
    );
    expect(screen.getByText("매일 쌓이는 수학")).toBeInTheDocument();
  });
});
