import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FadingPreview } from "@/components/fading/FadingPreview";
import { createLocalFadingSource } from "@/lib/fading/local";
import { erasedTargets } from "@/lib/fading/erasure";
import type { FadingConcept } from "@/lib/fading/concepts";

vi.mock("@/lib/fading/local", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fading/local")>();
  return {
    ...actual,
    createLocalFadingSource: vi.fn(actual.createLocalFadingSource),
  };
});
vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));

const concept: FadingConcept = {
  id: "responsive-preview",
  section: "중2::도형::삼각형",
  level: "하",
  ordinal: 1,
  siblings: 1,
  propositions: ["수직이등분선", "외심", "반지름"].map((text, i) => ({
    id: `p${i}`,
    term: `성질 ${i + 1}`,
    kind: "정의",
    pieces: [
      { kind: "text", text: `문장 ${i + 1}의 ` },
      { kind: "target", target: { id: `p${i}#1`, text, tier: "text" } },
      { kind: "text", text: "이다." },
    ],
  })),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function preview() {
  return render(
    <FadingPreview
      concepts={[concept]}
      today="2026-10-06"
      traps={{}}
      figures={{}}
    />,
  );
}
function switchDevice(name: "PC 미리 보기" | "모바일 미리 보기") {
  fireEvent.click(screen.getByRole("button", { name }));
  expect(screen.getByRole("button", { name })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

describe("학생 앱 기기 미리 보기", () => {
  it("기기 전환은 같은 앱과 탭을 유지하며 서버에 요청하지 않는다", async () => {
    const { container } = preview();
    await screen.findByRole("heading", { name: "첫 개념부터 시작해요" });
    const root = container.querySelector('[data-fading-root="true"]');
    expect(
      container.querySelector('[data-preview-device="desktop"]'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "학습 통계" }));
    expect(
      await screen.findByRole("heading", { name: "아직 학습 기록이 없어요" }),
    ).toBeInTheDocument();
    switchDevice("모바일 미리 보기");
    expect(
      container.querySelector('[data-preview-device="mobile"]'),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "학습 통계" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    switchDevice("PC 미리 보기");
    expect(container.querySelector('[data-fading-root="true"]')).toBe(root);
    expect(createLocalFadingSource).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("기기를 바꿔도 단계와 아직 제출하지 않은 칩 배치를 보존한다", async () => {
    const { container } = preview();
    fireEvent.click(
      await screen.findByRole("button", { name: "첫 개념 시작" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /개념 읽기$/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "고르고 첫 풀이" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "읽었어요 · 다음 단계" }),
    );
    const blank = await screen.findByRole("button", { name: "빈칸 1" });
    fireEvent.click(blank);
    fireEvent.click(
      screen.getByRole("button", {
        name: `칩 ${erasedTargets(concept, 2)[0]!.text}`,
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "빈칸 1" }),
      ).not.toBeInTheDocument(),
    );
    const session = container.querySelector('[data-step="2"]');
    const source = vi.mocked(createLocalFadingSource).mock.results[0]!
      .value as ReturnType<typeof createLocalFadingSource>;
    const actions = vi.spyOn(source, "act");
    switchDevice("모바일 미리 보기");
    switchDevice("PC 미리 보기");
    expect(container.querySelector('[data-step="2"]')).toBe(session);
    expect(
      screen.queryByRole("button", { name: "빈칸 1" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /단계 마치기/ })).toBeEnabled();
    expect(createLocalFadingSource).toHaveBeenCalledTimes(1);
    expect(actions).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
