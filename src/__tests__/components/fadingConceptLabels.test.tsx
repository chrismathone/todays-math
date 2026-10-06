import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingApp } from "@/components/fading/FadingApp";
import { createLocalFadingSource } from "@/lib/fading/local";
import type { FadingConcept } from "@/lib/fading/concepts";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
vi.stubGlobal("scrollTo", vi.fn());
afterEach(cleanup);

const term = "연립일차방정식의 해와 두 일차함수의 그래프의 교점 사이의 관계";
const concept: FadingConcept = {
  id: "concept-label-test",
  section: "중2::대수::연립방정식",
  level: "중",
  ordinal: 1,
  siblings: 1,
  propositions: [term, "명제"].map((name, i) => ({
    id: `label-p${i}`,
    term: name,
    kind: "정의",
    pieces: [
      { kind: "text", text: "교과 내용의 " },
      {
        kind: "target",
        target: { id: `label-t${i}`, text: name, tier: "text" },
      },
      { kind: "text", text: "를 읽어요." },
    ],
  })),
};

async function sourceAt(step?: 1 | 2 | 3 | 4) {
  const source = createLocalFadingSource({
    concepts: [concept],
    today: "2026-10-06",
    fresh: () => ({
      sessionId: "11111111-1111-4111-8111-111111111111",
      seed: 42,
    }),
  });
  if (step) {
    await source.act({ action: "pick", conceptId: concept.id });
    const opened = await source.act({ action: "open", conceptId: concept.id });
    const ref = { conceptId: concept.id, sessionId: opened.session!.id };
    if (step > 1) await source.act({ action: "read", ...ref });
    for (const current of [2, 3] as const)
      if (current < step)
        await source.act({
          action: "step",
          ...ref,
          step: current,
          placements: [],
          gaveUp: true,
        });
  }
  return source;
}

describe("오늘의 기억 — 개념 표시 문구", () => {
  it("정독의 개념 번호와 긴 교과 용어를 별도 슬롯에 두며 교과 내용의 명제는 보존한다", async () => {
    const source = await sourceAt(1);
    render(
      <FadingApp
        source={source}
        initialState={await source.state()}
        initialSession
      />,
    );
    const header = screen.getByRole("heading", {
      name: new RegExp(`^개념 1 ·\\s*${term}$`),
    });
    expect(within(header).getByText("개념 1 ·")).toHaveAttribute(
      "data-fading-concept-number",
    );
    expect(
      within(header).getByText(term).closest("[data-fading-concept-term]"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^개념 2 ·\s*명제$/ }),
    ).toBeInTheDocument();
    expect((await source.concept(concept.id)).content.concept).toEqual(concept);
  });

  it.each([2, 3, 4] as const)(
    "%i단계는 번호만 표시하며 용어와 기준안을 숨긴다",
    async (step) => {
      const source = await sourceAt(step);
      const { container } = render(
        <FadingApp
          source={source}
          initialState={await source.state()}
          initialSession
        />,
      );
      expect(
        screen.getByRole("heading", { name: /^개념 1/ }),
      ).toBeInTheDocument();
      expect(container.querySelector("[data-fading-concept-term]")).toBeNull();
      expect(
        screen.queryByRole("button", { name: "기준안 보기" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: /^명제 \d/ }),
      ).not.toBeInTheDocument();
    },
  );

  it("단계 완료 대조와 기준안도 같은 개념 번호·용어 슬롯을 쓴다", async () => {
    const source = await sourceAt(2);
    const { container } = render(
      <FadingApp
        source={source}
        initialState={await source.state()}
        initialSession
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await screen.findByRole("button", { name: "기준안 보기" });
    expect(
      container.querySelectorAll("[data-fading-concept-number]"),
    ).toHaveLength(2);
    expect(screen.getByText("개념 1 ·")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "기준안 보기" }));
    const sheet = screen.getByRole("dialog");
    expect(
      within(sheet).getByRole("heading", { name: "개념별 대조" }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText("개념 1 ·")).toHaveAttribute(
      "data-fading-concept-number",
    );
    expect(within(sheet).getByText("개념 2 ·")).toBeInTheDocument();
    expect(sheet.querySelectorAll("[data-fading-concept-term]")).toHaveLength(
      2,
    );
  });

  it("목록의 문장 수와 개념 읽기의 번호를 구분하고 복습 추가 행동을 설명한다", async () => {
    const source = await sourceAt();
    const { container } = render(
      <FadingApp source={source} initialTab="catalog" />,
    );
    await screen.findByRole("button", { name: /개념 읽기$/ });
    expect(screen.getByText("개념 문장 2개 · 빈칸 2개")).toBeInTheDocument();
    expect(screen.queryByText(/전체 명제|명제 2개/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /개념 읽기$/ }));
    await screen.findByRole("heading", { name: "개념 읽기" });
    expect(
      screen.getByRole("heading", {
        name: new RegExp(`^개념 1 ·\\s*${term}$`),
      }),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll("[data-fading-concept-number]"),
    ).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: "복습에 추가하고 시작" }),
    );
    await screen.findByRole("button", { name: "읽었어요 · 다음 단계" });
    expect((await source.state()).concepts[concept.id]).toBeDefined();
  });
});
