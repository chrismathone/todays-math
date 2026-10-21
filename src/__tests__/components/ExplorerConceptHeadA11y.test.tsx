/**
 * 머리의 화면 읽기 이름 — «대입법 · 방법»(05 §8.19 · D-143, 리드 적대적 검토 ③) ·
 * 도감 대화상자 문구 «정의» → «뜻»(검토 ⑥, Claude · codex · grok 셋 다 (나)).
 *
 * 딱지는 눈에는 «대입법 [방법]»이지만 화면 읽기에는 가운뎃점(`ExplorerConceptHead` 의 sr-only « · »)이 있어야
 * «대입법방법»으로 붙어 읽히지 않는다. 접근 이름 **전체**로 단정한다 — 조립 제목 · 뜻 만나기 제목 · 도감 대화상자 제목.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExplorerCardDialog from "@/components/math-explorers/ExplorerCardDialog";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import type {
  ExplorerActivity,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";

const session: NonNullable<ExplorerState["session"]> = {
  id: "session",
  route: "unit",
  title: "연립일차방정식",
  unitId: "g8-simultaneous",
  cardIds: ["a", "b", "c", "d", "e"],
  index: 6,
  total: 15,
  round: 0,
  continuation: 0,
  done: false,
  first: 0,
  stars: 0,
  unresolved: [],
  reviewOnly: false,
};
const assemble: ExplorerActivity = {
  questionId: "q",
  cardId: "g8-substitution",
  cardName: "대입법",
  unitId: "g8-simultaneous",
  unitTitle: "연립일차방정식",
  kind: "assemble",
  prompt: "말 조각을 순서대로 골라 문장을 완성하세요.",
  pieces: [
    "한 식에서 구한 미지수의 표현을 ",
    "에 ",
    " 연립방정식을 푸는 방법.",
  ],
  choices: [
    { id: 0, label: "같은 식만" },
    { id: 1, label: "넣어" },
    { id: 2, label: "다른 식" },
    { id: 3, label: "빼서" },
  ],
};
function practice(activity: ExplorerActivity) {
  return render(
    <ExplorerPractice
      activity={activity}
      session={session}
      busy={false}
      correct={null}
      eventKey=""
      onAction={vi.fn()}
      onHome={vi.fn()}
    />,
  );
}

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});

function dialog(level: number) {
  const view = explorerView(
    createExplorerState("student-a11y", 8),
    "2026-09-28",
  );
  const state: ExplorerState = {
    ...view,
    student: { id: "student-a11y", name: "학생", className: "반" },
    revision: 0,
    feedback: null,
  };
  const card = state.units
    .flatMap((unit) => unit.cards)
    .find((item) => item.id === "g8-substitution")!;
  return render(
    <ExplorerCardDialog
      card={{
        ...card,
        progress: level
          ? {
              level,
              due: "2026-09-29",
              lastDate: "2026-09-28",
              attemptedAt: "2026-09-28",
              missed: 0,
            }
          : null,
      }}
      state={state}
      solution={null}
      busy={false}
      onInspect={vi.fn()}
      onSolution={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe("머리 화면 읽기 이름 — «이름 · 갈래»", () => {
  it("문장 조립 제목", () => {
    practice(assemble);
    expect(
      screen.getByRole("heading", { level: 2, name: "대입법 · 방법" }),
    ).toBeInTheDocument();
  });

  it("뜻 만나기 제목", () => {
    practice({
      ...assemble,
      kind: "read",
      choices: [],
      pieces: undefined,
      reading: { definition: "뜻.", note: "메모." },
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "대입법 · 방법" }),
    ).toBeInTheDocument();
  });

  it("도감 대화상자 제목", () => {
    dialog(0);
    expect(
      screen.getByRole("heading", { level: 2, name: "대입법 · 방법" }),
    ).toBeInTheDocument();
  });
});

describe("이름 줄(예 모으기 · 경계 살피기 · 작업실 · 첫 장) — 글 흐름에 가운뎃점", () => {
  it("화면 읽기 흐름이 «대입법 · 방법»(sr-only « · »)", () => {
    practice({
      ...assemble,
      kind: "examples",
      pieces: undefined,
      prompt: "대입한 결과를 골라봐.",
    });
    const name = document.querySelector(
      "[data-concept-row] [data-concept-name]",
    )!.parentElement!;
    expect(name.textContent).toBe("대입법 · 방법");
  });
});

describe("도감 대화상자 문구 — «정의» 대신 «뜻»(딱지와 어긋나지 않게)", () => {
  it("모으기 전 안내", () => {
    dialog(0);
    expect(
      screen.getByText(
        "뜻을 만나고 세 활동을 해결하면 내 카드로 모을 수 있어요.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/정의/)).not.toBeInTheDocument();
  });

  it("모은 뒤 — 안내와 단추", () => {
    dialog(1);
    expect(
      screen.getByText("필요할 때 뜻과 해설을 열어 확인해 보세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "뜻과 해설 보기" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/정의/)).not.toBeInTheDocument();
  });
});
