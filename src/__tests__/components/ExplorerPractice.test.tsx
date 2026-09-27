import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import type {
  ExplorerActivity,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";

const session: NonNullable<ExplorerState["session"]> = {
  id: "session",
  route: "unit",
  title: "약수와 배수",
  unitId: "unit",
  cardIds: ["a", "b", "c", "d", "e"],
  index: 0,
  total: 15,
  round: 0,
  continuation: 0,
  done: false,
  first: 0,
  stars: 0,
  unresolved: [],
  reviewOnly: false,
};
const activity: ExplorerActivity = {
  questionId: "question",
  cardId: "a",
  cardName: "약수",
  unitId: "unit",
  unitTitle: "약수와 배수",
  kind: "assemble",
  prompt: "빈칸을 채워 주세요.",
  pieces: ["어떤 수를 ", "나누어 떨어지게 하는 ", "입니다."],
  choices: [
    { id: 2, label: "자연수" },
    { id: 0, label: "정확히" },
    { id: 3, label: "소수" },
    { id: 1, label: "남김없이" },
  ],
};
function fixture(value = activity) {
  const onAction = vi.fn();
  const result = render(
    <ExplorerPractice
      activity={value}
      session={session}
      busy={false}
      correct={null}
      eventKey=""
      onAction={onAction}
      onHome={vi.fn()}
    />,
  );
  return { ...result, onAction };
}

describe("ExplorerPractice", () => {
  it("keeps word order editable and submits the chosen order only after confirmation", () => {
    const { onAction } = fixture();
    fireEvent.click(screen.getByRole("button", { name: "2 정확히" }));
    fireEvent.click(screen.getByRole("button", { name: "1 자연수" }));
    expect(onAction).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "빈칸 1, 정확히" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "빈칸 1, 정확히" }));
    expect(
      screen.getByRole("button", { name: "빈칸 1, 자연수" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "4 남김없이" }));
    fireEvent.click(
      screen.getByRole("button", { name: "완성한 문장 확인하기" }),
    );
    expect(onAction).toHaveBeenCalledWith({
      type: "answer",
      questionId: "question",
      choiceIds: [2, 1],
    });
  });

  it("submits true/false on a single tap without a confirmation page", () => {
    const { onAction } = fixture({
      ...activity,
      kind: "truth",
      pieces: undefined,
      prompt: "모든 약수는 자연수입니다.",
      choices: [
        { id: 1, label: "맞아요" },
        { id: 0, label: "아니에요" },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "1 맞아요" }));
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [1],
    });
    expect(
      screen.queryByRole("button", { name: /확인하기/ }),
    ).not.toBeInTheDocument();
  });

  it("allows multiple examples and deselection before submitting", () => {
    const { onAction } = fixture({
      ...activity,
      kind: "examples",
      pieces: undefined,
    });
    const first = screen.getByRole("button", { name: "1 자연수" });
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("button", { name: "3 소수" }));
    fireEvent.click(first);
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "선택한 예 확인하기" }));
    expect(onAction).toHaveBeenCalledWith({
      type: "answer",
      questionId: "question",
      choiceIds: [3],
    });
  });

  it("only shows the supplied first reading and asks the server to hide it", () => {
    const { onAction, container } = fixture({
      ...activity,
      kind: "read",
      choices: [],
      reading: { definition: "약수의 뜻입니다.", note: "나누어 생각해 봐요." },
    });
    expect(screen.getByText("약수의 뜻입니다.")).toBeVisible();
    expect(container.querySelector("[data-explorer-dock]")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /뜻을 가리고 도전하기/ }),
    );
    expect(onAction).toHaveBeenCalledWith({
      type: "read",
      questionId: "question",
    });
  });

  it("blocks duplicate taps and shows wrong feedback without revealing the answer", () => {
    const onAction = vi.fn();
    const { container } = render(
      <ExplorerPractice
        activity={activity}
        session={session}
        busy
        correct={false}
        eventKey="answer-event"
        onAction={onAction}
        onHome={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "1 자연수" }));
    expect(onAction).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-answer-feedback="incorrect"]'),
    ).toBeVisible();
    expect(screen.queryByText(/정답은|해설 보기/)).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-answer-state="correct"]'),
    ).toHaveLength(0);
  });
});

/**
 * 4안 «이름 줄 + 문장이 곧 문제 + 첫 만남»(원장님 2026-09-28 확정, 05 §8.18 · D-143).
 * 제보: «이게 어떤 용어의 정의인지 정리인지 적어 놓는 게 좋을 거 같은데 너무 무작정 문제가 출몰함.»
 */
describe("ExplorerPractice — 무엇의 문장인가(이름 + 갈래 딱지)", () => {
  const substitution: ExplorerActivity = {
    questionId: "q-sub",
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
  const units = [
    { id: "g8-simultaneous", grade: 8, title: "연립일차방정식" },
  ] as unknown as ExplorerState["units"];
  function show(value: ExplorerActivity) {
    const onAction = vi.fn();
    const result = render(
      <ExplorerPractice
        activity={value}
        session={session}
        units={units}
        busy={false}
        correct={null}
        eventKey=""
        onAction={onAction}
        onHome={vi.fn()}
      />,
    );
    return { ...result, onAction };
  }

  it("정의 조립 — 제목은 이름 + 갈래 딱지, 조작 안내 제목 · 겹친 안내 줄은 없고 아래 칸 한 줄", () => {
    show(substitution);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("대입법");
    expect(heading.querySelector("[data-concept-kind]")).toHaveTextContent(
      "방법",
    );
    expect(
      screen.queryByText(/말 조각을 순서대로 골라/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("말 조각 두 개를 순서대로 골라 주세요."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("말 조각 두 개를 순서대로 · 0 / 2")).toBeVisible();
    expect(screen.getByText("문장 조립")).toBeVisible();
    expect(screen.queryByText("정의 조립")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "3 다른 식" }));
    expect(screen.getByText("말 조각 두 개를 순서대로 · 1 / 2")).toBeVisible();
    // 문장은 이름 바로 아래 — 원문(보정 문장) 그대로, 주어를 붙이지 않는다(4안 주어 없이).
    expect(screen.getByText(/연립방정식을 푸는 방법\./)).toBeVisible();
    expect(screen.queryByText(/대입법은/)).not.toBeInTheDocument();
  });

  it("갈래 딱지는 누르는 것이 아니다(D-30) — 단추 · 링크 밖의 글자", () => {
    show(substitution);
    const tag = document.querySelector("[data-concept-kind]")!;
    expect(tag.tagName).toBe("SPAN");
    expect(tag.closest("button, a, [role=button]")).toBeNull();
    expect(tag.getAttribute("onclick")).toBeNull();
  });

  it("예 모으기 · 경계 살피기 — 이름 줄(이름 + 딱지 + 활동 이름) 뒤에 지금 제목(카드 문장)", async () => {
    show({
      ...substitution,
      kind: "examples",
      pieces: undefined,
      prompt: "y=x+1을 x+y=5에 대입한 결과를 골라봐.",
    });
    const row = document.querySelector("[data-concept-row]")!;
    expect(row).toHaveTextContent("대입법");
    expect(row.querySelector("[data-concept-kind]")).toHaveTextContent("방법");
    expect(row).toHaveTextContent("예 모으기");
    // 제목(카드 문장)은 수식이 들어 KaTeX 청크가 늦게 온다.
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "대입한 결과를 골라봐",
      ),
    );
  });

  it("뜻 만나기 — 개념 카드(학년 · 단원 / 이름 + 딱지 / 뜻), 답 칸은 단추 하나", () => {
    const { container } = show({
      ...substitution,
      kind: "read",
      choices: [],
      pieces: undefined,
      prompt: "개념의 뜻을 읽어 보세요.",
      reading: {
        definition:
          "한 식에서 구한 미지수의 표현을 다른 식에 넣어 연립방정식을 푸는 방법.",
        note: "y 전체를 x+1로 바꿔 넣어.",
      },
    });
    expect(screen.getByText("중2 · 연립일차방정식")).toBeVisible();
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("대입법");
    expect(heading.querySelector("[data-concept-kind]")).toHaveTextContent(
      "방법",
    );
    expect(
      screen.queryByText("개념의 뜻을 읽어 보세요."),
    ).not.toBeInTheDocument();
    expect(container.querySelector("[data-explorer-dock]")).toHaveAttribute(
      "data-dock-size",
      "slim",
    );
    expect(
      screen.getByRole("button", { name: /뜻을 가리고 도전하기/ }),
    ).toBeVisible();
  });

  it("표에 없는 카드는 딱지 없이 이름만", () => {
    fixture();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("약수");
    expect(document.querySelector("[data-concept-kind]")).toBeNull();
  });
});

describe("ExplorerPractice — 수식이 든 이름의 이름 줄", () => {
  // 실제 화면 실측(fit)에서 잡힘: 이름을 `<p>` 에 담으면 KaTeX(`MathText` 의 div)가 p 안에 들어가
  // «In HTML, <div> cannot be a descendant of <p>» 수화(hydration) 경고 — 10배와 100배 · SSS · y절편 · 곱이 0인 성질.
  it("y절편 — 이름 줄에 KaTeX 가 들어와도 태그 중첩 경고가 없다", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <ExplorerPractice
        activity={{
          questionId: "q-y",
          cardId: "g8-y-intercept",
          cardName: "y절편",
          unitId: "g8-linear",
          unitTitle: "일차함수",
          kind: "examples",
          prompt: "y절편을 바르게 설명한 것을 골라봐.",
          choices: [
            { id: 0, label: "가" },
            { id: 1, label: "나" },
          ],
        }}
        session={session}
        busy={false}
        correct={null}
        eventKey=""
        onAction={vi.fn()}
        onHome={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(
        container.querySelector("[data-concept-row] .katex"),
      ).not.toBeNull(),
    );
    const nesting = errors.mock.calls.filter((call) =>
      String(call[0]).includes("cannot be a descendant of"),
    );
    expect(nesting).toEqual([]);
    errors.mockRestore();
  });
});
