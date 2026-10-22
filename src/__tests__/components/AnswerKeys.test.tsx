import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import ExplorerWorkshop from "@/components/math-explorers/ExplorerWorkshop";
import { StudentMathSrs } from "@/components/math-srs/StudentMathSrs";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import StudentReplayDialog from "@/components/math-srs/StudentReplayDialog";
import { NumberKey } from "@/components/math-srs/AnswerKeyCaps";
import * as srsApi from "@/components/math-srs/mathSrsApi";
import type {
  ExplorerAction,
  ExplorerActivity,
  ExplorerState,
  WorkshopView,
} from "@/contracts/mathExplorers.contract";
import type {
  MathSrsPublicMission,
  MathSrsState,
} from "@/contracts/mathSrs.contract";
import type { MathSrsReplay } from "@/contracts/mathSrsReplay.contract";
import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import { createMemories } from "@/lib/math-srs/memory";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";

/**
 * 보기 번호 = 키보드 숫자 · 엔터 = 확인 단추 (원장님 2026-09-28 «1,2,3,4 를 눌러도 정답 입력 · 엔터로 제출»).
 *
 * 키는 화면에 적힌 `aria-keyshortcuts` 단추를 **누른다** — 그래서 «그 단추를 누른 것과 똑같이»가 구조로 선다
 * (꺼진 단추는 안 눌린다 · 하나 고르기는 즉시 제출 · 복수 선택은 켜고 끔 · 정의 조립은 다음 빈칸).
 * 여기서 지키는 것: 입력 칸 · 조합 키 · 반복 · IME 조합 · 피드백 중 · 대화상자 · 포커스된 단추와 두 번 겹치기.
 *
 * 🔴 jsdom 은 포커스된 단추에서 엔터를 쳐도 click 을 안 낸다 — 그 «기본 동작»이 걸리는 시험은 user-event 로 친다
 *    (user-event 가 브라우저처럼 keydown 이 막히지 않았으면 click 을 낸다).
 */

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/math-srs/mathSrsApi", () => ({
  fetchMathSrs: vi.fn(),
  startMathSrs: vi.fn(),
  submitMathSrsAttempt: vi.fn(),
  revealMathSrsHint: vi.fn(),
  submitMathSrsReplay: vi.fn(),
  fetchClassMathSrs: vi.fn(),
}));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <div>{content}</div>,
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: { text: string }) => <span>{text}</span>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

/** 지금 포커스가 있는 곳(없으면 body)에서 키를 한 번 누른다 — 브라우저처럼 document 까지 올라간다. */
function press(key: string, init: Record<string, unknown> = {}) {
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
}
const pressed = (name: string) =>
  screen.getByRole("button", { name }).getAttribute("aria-pressed");

// ── 통합 탐험 ────────────────────────────────────────────────────────────
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
  kind: "examples",
  prompt: "약수의 예를 모두 골라 주세요.",
  choices: [
    { id: 2, label: "자연수" },
    { id: 0, label: "정확히" },
    { id: 3, label: "소수" },
    { id: 1, label: "남김없이" },
  ],
};
const assemble: ExplorerActivity = {
  ...activity,
  kind: "assemble",
  prompt: "빈칸을 채워 주세요.",
  pieces: ["어떤 수를 ", "나누어 떨어지게 하는 ", "입니다."],
};
const truth: ExplorerActivity = {
  ...activity,
  kind: "truth",
  prompt: "모든 약수는 자연수입니다.",
  choices: [
    { id: 1, label: "맞아요" },
    { id: 0, label: "아니에요" },
  ],
};

function explorer(
  value: ExplorerActivity = activity,
  props: { busy?: boolean; correct?: boolean | null } = {},
) {
  const onAction = vi.fn();
  const result = render(
    <ExplorerPractice
      activity={value}
      session={session}
      busy={props.busy ?? false}
      correct={props.correct ?? null}
      eventKey=""
      onAction={onAction}
      onHome={vi.fn()}
    />,
  );
  return { ...result, onAction };
}

/** 부모(`StudentMathExplorers.send`)처럼 보내는 순간 busy 가 켜진다 — «서버 기록 한 번»을 이 틀로 잰다. */
function ExplorerWithParent({
  value,
  onAction,
}: {
  value: ExplorerActivity;
  onAction: (action: ExplorerAction) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ExplorerPractice
      activity={value}
      session={session}
      busy={busy}
      correct={null}
      eventKey=""
      onAction={(action) => {
        onAction(action);
        setBusy(true);
      }}
      onHome={vi.fn()}
    />
  );
}

describe("통합 탐험 — 보기 번호 키 · 엔터", () => {
  it("보기 단추마다 번호 키, 확인 단추에 엔터를 화면 읽기로 알린다", () => {
    explorer();
    ["1 자연수", "2 정확히", "3 소수", "4 남김없이"].forEach((name, index) =>
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-keyshortcuts",
        String(index + 1),
      ),
    );
    expect(
      screen.getByRole("button", { name: "선택한 예 확인하기" }),
    ).toHaveAttribute("aria-keyshortcuts", "Enter");
    expect(
      screen.getByRole("button", { name: "아직 모르겠어요" }),
    ).not.toHaveAttribute("aria-keyshortcuts");
  });

  it("예 모으기 — 숫자키(윗줄 · 숫자 패드)가 켜고 끄고, 엔터가 확인 단추와 같다", () => {
    const { onAction } = explorer();
    press("1", { code: "Digit1" });
    press("3", { code: "Digit3" });
    expect(pressed("1 자연수")).toBe("true");
    expect(pressed("3 소수")).toBe("true");
    press("1", { code: "Numpad1" });
    expect(pressed("1 자연수")).toBe("false");
    expect(onAction).not.toHaveBeenCalled();
    press("Enter");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [3],
    });
  });

  it("확인 단추가 꺼져 있으면 엔터는 아무 일도 하지 않는다", () => {
    const { onAction } = explorer();
    expect(
      screen.getByRole("button", { name: "선택한 예 확인하기" }),
    ).toBeDisabled();
    press("Enter");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("정의 조립 — 숫자키가 다음 빈칸을 채우고, 쓴 조각은 다시 안 들어가며, 엔터로 확인", () => {
    const { onAction } = explorer(assemble);
    press("2");
    press("1");
    press("2");
    expect(
      screen.getByRole("button", { name: "빈칸 1, 정확히" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "빈칸 2, 자연수" }),
    ).toBeInTheDocument();
    press("Enter");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [0, 2],
    });
  });

  it("정의 조립 — 채운 빈칸을 마우스로 빼 포커스가 남아도, 확인이 꺼져 있으면 엔터는 아무것도 안 뺀다(누르고 있어도)", async () => {
    // 첫 칸을 빼면 남은 조각이 앞칸으로 당겨져 포커스된 그 단추가 다시 «채운 빈칸»이 된다 — 엔터가 그것까지 빼면 안 된다.
    const user = userEvent.setup();
    const { onAction } = explorer(assemble);
    press("2");
    press("1");
    await user.click(screen.getByRole("button", { name: "빈칸 1, 정확히" }));
    const slot = screen.getByRole("button", { name: "빈칸 1, 자연수" });
    expect(slot).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "완성한 문장 확인하기" }),
    ).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(
      fireEvent.keyDown(slot, { key: "Enter", repeat: true }),
      "누르고 있는 엔터도 그 빈칸을 누르지 않게 막는다",
    ).toBe(false);
    expect(
      screen.getByRole("button", { name: "빈칸 1, 자연수" }),
    ).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("정의 조립 — 채운 빈칸에 포커스가 남아 있어도 확인 단추가 켜져 있으면 엔터 = 확인(그 조각을 빼지 않는다)", async () => {
    const user = userEvent.setup();
    const { onAction } = explorer(assemble);
    press("2");
    press("1");
    await user.click(screen.getByRole("button", { name: "빈칸 1, 정확히" }));
    press("3");
    expect(
      screen.getByRole("button", { name: "빈칸 1, 자연수" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [2, 3],
    });
  });

  it("하나 고르기(경계 살피기) — 숫자키 한 번에 즉시 제출, 이어 누른 키는 먹지 않는다(기록 한 번)", () => {
    const onAction = vi.fn();
    render(<ExplorerWithParent value={truth} onAction={onAction} />);
    press("2");
    press("2");
    press("1");
    press("Enter");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [0],
    });
    expect(pressed("2 아니에요")).toBe("true");
    expect(pressed("1 맞아요")).toBe("false");
  });

  it("보기 수보다 큰 숫자 · 0 은 무시한다", () => {
    const { onAction } = explorer(truth);
    press("3");
    press("0");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("엔터를 두 번 쳐도 확인은 한 번 — 보낸 뒤에는 키를 먹지 않는다", () => {
    const onAction = vi.fn();
    render(<ExplorerWithParent value={activity} onAction={onAction} />);
    press("2");
    press("Enter");
    press("Enter");
    press("3");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [0],
    });
    expect(pressed("3 소수")).toBe("false");
  });

  it("마우스로 고른 보기에 포커스가 남아 있어도 엔터는 그 보기를 끄지 않고 확인한다", async () => {
    const user = userEvent.setup();
    const { onAction } = explorer();
    await user.click(screen.getByRole("button", { name: "1 자연수" }));
    await user.click(screen.getByRole("button", { name: "3 소수" }));
    expect(screen.getByRole("button", { name: "3 소수" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [2, 3],
    });
    expect(pressed("3 소수")).toBe("true");
  });

  it("마우스로 켰다 끈 보기에 포커스가 남아 확인 단추가 꺼졌으면, 엔터는 그 보기를 다시 켜지 않는다(아무 일 없음)", async () => {
    const user = userEvent.setup();
    const { onAction } = explorer();
    const first = screen.getByRole("button", { name: "1 자연수" });
    await user.click(first);
    await user.click(first);
    expect(first).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "선택한 예 확인하기" }),
    ).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(pressed("1 자연수")).toBe("false");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("마우스로 켰다 끈 보기에 포커스가 남아도 확인 단추가 켜져 있으면 엔터는 확인 — 그 보기를 다시 켜지 않는다", async () => {
    // D-145 ⑸ — 확인 단추가 있는 화면에서 누름 단추(켜졌든 꺼졌든)에 포커스가 있으면 엔터 = 확인(리드 · codex · grok 2:1).
    const user = userEvent.setup();
    const { onAction } = explorer();
    await user.click(screen.getByRole("button", { name: "1 자연수" }));
    const third = screen.getByRole("button", { name: "3 소수" });
    await user.click(third);
    await user.click(third);
    expect(third).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [2],
    });
    expect(pressed("3 소수")).toBe("false");
  });

  it("확인 단추에 포커스가 있으면 엔터는 그 단추를 한 번만 누른다", async () => {
    const user = userEvent.setup();
    const { onAction } = explorer();
    press("4");
    screen.getByRole("button", { name: "선택한 예 확인하기" }).focus();
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [1],
    });
  });

  it("다른 단추(아직 모르겠어요)에 포커스가 있으면 엔터는 그 단추만 누른다", async () => {
    const user = userEvent.setup();
    const { onAction } = explorer();
    press("4");
    screen.getByRole("button", { name: "아직 모르겠어요" }).focus();
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [],
    });
  });

  it("하나 고르기에서 포커스된 보기에 엔터를 치면 그 보기를 누른 것 — 한 번", async () => {
    const user = userEvent.setup();
    const { onAction } = explorer(truth);
    screen.getByRole("button", { name: "2 아니에요" }).focus();
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "answer",
      questionId: "question",
      choiceIds: [0],
    });
  });

  it("입력 칸(글자 · 여러 줄 · 편집 영역 · 수식 칸)에 포커스가 있으면 숫자키와 엔터를 가로채지 않는다", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <>
        <input aria-label="메모" />
        <textarea aria-label="긴 메모" />
        <div contentEditable suppressContentEditableWarning data-testid="편집">
          편집
        </div>
        {/* MathLive 수식 칸 — jsdom 에는 정의가 없어 이름만 같은 요소다 */}
        {/* @ts-expect-error 사용자 정의 요소 */}
        <math-field data-testid="수식" tabIndex={0} />
        <ExplorerPractice
          activity={activity}
          session={session}
          busy={false}
          correct={null}
          eventKey=""
          onAction={onAction}
          onHome={vi.fn()}
        />
      </>,
    );
    const memo = screen.getByRole("textbox", { name: "메모" });
    await user.type(memo, "13{Enter}");
    expect(memo).toHaveValue("13");
    await user.type(screen.getByRole("textbox", { name: "긴 메모" }), "2");
    fireEvent.keyDown(screen.getByTestId("편집"), { key: "3" });
    fireEvent.keyDown(screen.getByTestId("수식"), { key: "4" });
    fireEvent.keyDown(screen.getByTestId("수식"), { key: "Enter" });
    for (const name of ["1 자연수", "2 정확히", "3 소수", "4 남김없이"])
      expect(pressed(name)).toBe("false");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("Ctrl · Alt · Meta · Shift 조합, 누르고 있는 반복, IME 조합 중인 키는 무시한다", () => {
    const { onAction } = explorer(truth);
    press("1", { ctrlKey: true });
    press("1", { altKey: true });
    press("1", { metaKey: true });
    press("1", { shiftKey: true });
    press("1", { repeat: true });
    press("1", { isComposing: true });
    press("1", { keyCode: 229 });
    expect(onAction).not.toHaveBeenCalled();
    expect(pressed("1 맞아요")).toBe("false");
  });

  it("채점 연출 · 저장 중에는 숫자키도 엔터도 먹지 않는다", () => {
    const busy = explorer(activity, { busy: true });
    press("1");
    press("Enter");
    expect(busy.onAction).not.toHaveBeenCalled();
    expect(pressed("1 자연수")).toBe("false");
    busy.unmount();
    const graded = explorer(truth, { correct: false });
    press("2");
    expect(graded.onAction).not.toHaveBeenCalled();
    expect(pressed("2 아니에요")).toBe("false");
  });

  it("대화상자가 열려 있으면 뒤 화면은 키를 먹지 않는다(대화상자 안에 포커스가 있어도)", () => {
    const onAction = vi.fn();
    render(
      <>
        <ExplorerPractice
          activity={truth}
          session={session}
          busy={false}
          correct={null}
          eventKey=""
          onAction={onAction}
          onHome={vi.fn()}
        />
        <dialog open aria-label="풀이">
          <button type="button">닫기</button>
        </dialog>
      </>,
    );
    press("1");
    screen.getByRole("button", { name: "닫기" }).focus();
    press("2");
    expect(onAction).not.toHaveBeenCalled();
    expect(pressed("1 맞아요")).toBe("false");
  });

  it("다른 처리기가 이미 막은 키(preventDefault)는 건드리지 않는다", () => {
    const onAction = vi.fn();
    render(
      <>
        <div
          tabIndex={0}
          data-testid="자기 키를 쓰는 칸"
          onKeyDown={(event) => event.preventDefault()}
        />
        <ExplorerPractice
          activity={truth}
          session={session}
          busy={false}
          correct={null}
          eventKey=""
          onAction={onAction}
          onHome={vi.fn()}
        />
      </>,
    );
    screen.getByTestId("자기 키를 쓰는 칸").focus();
    press("1");
    expect(onAction).not.toHaveBeenCalled();
    expect(pressed("1 맞아요")).toBe("false");
  });

  it("화면이 사라지면 키를 듣지 않는다", () => {
    const spy = vi.spyOn(document, "removeEventListener");
    const { unmount } = explorer();
    unmount();
    expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
    spy.mockRestore();
  });
});

// ── 작업실 ───────────────────────────────────────────────────────────────
const workshop: NonNullable<WorkshopView["session"]> = {
  id: "workshop",
  route: "explore",
  stage: "split",
  attachedTo: {
    sessionId: "session",
    questionId: "concept-question",
    cardId: "g5-common-denominator",
  },
  questionId: "split-question",
  checkIndex: 0,
  checkTotal: 2,
  done: false,
  prompt: "한 조각을 세 개로 나눠 보세요.",
  fractions: [{ numerator: 1, denominator: 2 }],
  targetDenominator: null,
  factors: [1, 1],
  choices: [],
  predictionLabel: null,
  stars: 0,
};
function lab(changes: Partial<typeof workshop> = {}) {
  const onAction = vi.fn();
  render(
    <ExplorerWorkshop
      workshop={{ ...workshop, ...changes }}
      session={session}
      busy={false}
      correct={null}
      eventKey=""
      onAction={onAction}
      onHome={vi.fn()}
    />,
  );
  return onAction;
}

describe("작업실 — 예상 · 규칙 보기는 숫자키, 확인 단추는 엔터", () => {
  it("먼저 예상하기 — 숫자키 하나로 즉시 보낸다", () => {
    const onAction = lab({
      stage: "predict",
      choices: [
        { id: 0, label: "더 커져요" },
        { id: 1, label: "그대로예요" },
        { id: 2, label: "더 작아져요" },
      ],
    });
    expect(
      screen.getByRole("button", { name: "2 그대로예요" }),
    ).toHaveAttribute("aria-keyshortcuts", "2");
    press("2");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "lab-predict",
      questionId: "split-question",
      choiceId: 1,
    });
  });

  it("조각 나누기 — 엔터가 «나눈 조각 확인하기»와 같다", () => {
    const onAction = lab();
    expect(
      screen.getByRole("button", { name: "나눈 조각 확인하기" }),
    ).toHaveAttribute("aria-keyshortcuts", "Enter");
    press("Enter");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "lab-split",
      questionId: "split-question",
      factor: 1,
    });
  });

  it("칠한 칸에 포커스가 남아 있어도 엔터는 그 칸을 지우지 않고 확인한다", async () => {
    const user = userEvent.setup();
    const onAction = lab({
      stage: "check",
      targetDenominator: 4,
      fractions: [{ numerator: 1, denominator: 2 }],
    });
    await user.click(
      screen.getByRole("button", { name: "1번째 분수 1번째 조각" }),
    );
    await user.click(
      screen.getByRole("button", { name: "1번째 분수 2번째 조각" }),
    );
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "lab-check",
      questionId: "split-question",
      parts: [2],
    });
  });

  it("답 조작 표지는 답을 만드는 단추에만 — 보기 · 빈칸 · −/＋ · 칠한 칸, 확인 · 아직 모르겠어요에는 없다", () => {
    const marked = () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>("button")).filter(
        (button) => button.hasAttribute("data-answer-control"),
      );
    const names = (buttons: HTMLButtonElement[]) =>
      buttons.map((button) => button.getAttribute("aria-label"));
    const first = explorer(assemble);
    expect(names(marked())).toEqual([
      "빈칸 1",
      "빈칸 2",
      "1 자연수",
      "2 정확히",
      "3 소수",
      "4 남김없이",
    ]);
    for (const name of ["완성한 문장 확인하기", "아직 모르겠어요"])
      expect(screen.getByRole("button", { name })).not.toHaveAttribute(
        "data-answer-control",
      );
    first.unmount();
    lab();
    expect(names(marked())).toEqual([
      "1번째 분수 나누는 수 줄이기",
      "1번째 분수 나누는 수 늘리기",
    ]);
    cleanup();
    lab({ stage: "check", targetDenominator: 4 });
    expect(marked()).toHaveLength(4);
    expect(
      screen.getByRole("button", { name: "칠한 조각 확인하기" }),
    ).not.toHaveAttribute("data-answer-control");
  });

  it("나누는 수 ＋ 를 마우스로 누른 뒤 포커스가 남아 있어도 엔터는 ＋ 를 한 번 더 누르지 않고 확인한다", async () => {
    // D-145 ⑸ 넓힘(리드 · codex · grok 합의 (나)) — 답을 만드는 조작 단추는 누름 단추가 아니어도 엔터 = 확인.
    const user = userEvent.setup();
    const onAction = lab();
    const more = screen.getByRole("button", {
      name: "1번째 분수 나누는 수 늘리기",
    });
    await user.click(more);
    expect(more).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: "lab-split",
      questionId: "split-question",
      factor: 2,
    });
  });
});

// ── 중등 «오늘의 복습»(한 걸음) ────────────────────────────────────────────
const missionId = "44444444-4444-4444-8444-444444444444";
const pid = (i: number) =>
  `55555555-5555-4555-8555-${String(i + 1).padStart(12, "0")}`;
function middleState(): MathSrsState {
  const mission: MathSrsPublicMission = {
    id: missionId,
    date: "2026-09-28",
    startedAt: "2026-09-28T01:00:00.000Z",
    completedAt: null,
    problems: Array.from({ length: 12 }, (_, i) => ({
      id: pid(i),
      templateId: "quick:two-step:solve",
      conceptId: "two-step",
      conceptWeights: [{ conceptId: "two-step", weight: 1 }],
      difficulty: 1,
      kind: "quick",
      prompt: `${i + 1}번. x 의 값은?`,
      equation: "2x=6",
      answerChoices: ["3", "4", "6", "12"],
      expectedSeconds: 10,
      hint: null,
      feedback: null,
    })),
    attempts: [],
  };
  return {
    student: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "실제 학생",
      classId: "22222222-2222-4222-8222-222222222222",
      className: "중1 A반",
    },
    revision: 0,
    memories: createMemories(),
    mission,
    recentMissions: [],
    currentProgress: null,
    lectures: [],
    available: true,
  };
}

describe("중등 오늘의 복습 — 보기 번호 키", () => {
  it("숫자키로 고르면 즉시 제출하고, 저장 중에 누른 다른 숫자키는 먹지 않는다", async () => {
    vi.mocked(srsApi.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: middleState(),
    });
    // 저장이 끝나지 않은 채로 둔다 — 그 사이의 키를 본다
    vi.mocked(srsApi.submitMathSrsAttempt).mockReturnValue(
      new Promise(() => {}),
    );
    render(
      <StudentMathSrs expedition={{ onExit: vi.fn(), onComplete: vi.fn() }} />,
    );
    const choices = within(
      await screen.findByRole("group", { name: "답 고르기" }),
    ).getAllByRole("button");
    expect(choices.map((c) => c.getAttribute("aria-keyshortcuts"))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    press("Enter");
    expect(srsApi.submitMathSrsAttempt).not.toHaveBeenCalled();
    press("2");
    press("3");
    expect(srsApi.submitMathSrsAttempt).toHaveBeenCalledTimes(1);
    expect(srsApi.submitMathSrsAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ problemId: pid(0), submittedAnswer: "4" }),
    );
    expect(choices[1]).toHaveAttribute("aria-pressed", "true");
    expect(choices[2]).toHaveAttribute("aria-pressed", "false");
    await act(async () => {});
  });
});

// ── 초등 은행 ─────────────────────────────────────────────────────────────
const section = COURSE_SECTIONS[1];
const now = "2026-09-28T01:00:00.000Z";
function course(
  change: Partial<CoursePublicSession["problems"][number]> = {},
): CoursePublicSession {
  const problems = Array.from(
    { length: 5 },
    (_, index) =>
      ({
        id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
        sectionId: section.id,
        tier: "기본",
        content: `문제 ${index + 1}: 1 + 1`,
        figureUrl: null,
        answerChoices: null,
        interactive: null,
        input: {
          mode: "number" as const,
          label: "나의 답",
          placeholder: "답 입력",
          help: "숫자로 적어 주세요.",
        },
        hint: null,
        feedback: null,
        ...(index === 0 ? change : {}),
      }) as CoursePublicSession["problems"][number],
  );
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId: section.id,
    mode: "learn",
    startedAt: now,
    completedAt: null,
    retry: null,
    problems,
    attempts: [],
  } as CoursePublicSession;
}
function elementary(run: CoursePublicSession) {
  const onAnswer = vi.fn();
  render(
    <StudentCoursePractice
      session={run}
      summary={{ todayAnswered: 0, todayGoal: 10 } as CourseSummary}
      feedbackId={null}
      busy={false}
      onAnswer={onAnswer}
      onHint={vi.fn()}
      onNext={vi.fn()}
      onContinue={vi.fn()}
      onExit={vi.fn()}
      onAuthFailure={vi.fn()}
    />,
  );
  return onAnswer;
}

describe("초등 은행 — 보기 번호 키 · 엔터", () => {
  it("네 보기 — 숫자키 하나로 즉시 제출, 다음 숫자키는 먹지 않는다", async () => {
    const onAnswer = elementary(
      course({ answerChoices: ["1", "2", "3", "4"] } as never),
    );
    await screen.findByText("문제 1: 1 + 1");
    const choices = within(
      screen.getByRole("group", { name: "답 고르기" }),
    ).getAllByRole("button");
    expect(choices.map((c) => c.getAttribute("aria-keyshortcuts"))).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    press("3");
    press("4");
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith({
      sessionId: "44444444-4444-4444-8444-444444444444",
      problemId: "55555555-5555-4555-8555-000000000001",
      submittedAnswer: "3",
    });
  });

  it("숫자 입력 칸 — 숫자는 칸에 적히고, 칸 안의 엔터가 제출(한 번)", async () => {
    const user = userEvent.setup();
    const onAnswer = elementary(course());
    const input = await screen.findByRole("textbox", { name: "나의 답" });
    expect(screen.getByRole("button", { name: /정답 확인/ })).toHaveAttribute(
      "aria-keyshortcuts",
      "Enter",
    );
    await user.type(input, "12");
    expect(input).toHaveValue("12");
    expect(onAnswer).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ submittedAnswer: "12" }),
    );
  });

  it("칸 밖(문제 영역)에서 엔터를 쳐도 «정답 확인»과 같다 — 빈 답이면 지금 안내 그대로", async () => {
    const onAnswer = elementary(course());
    await screen.findByRole("textbox", { name: "나의 답" });
    screen.getByRole("region", { name: "문제 내용" }).focus();
    press("Enter");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "생각한 답을 입력해 주세요.",
    );
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("칸 칠하기 — 칠한 칸에 포커스가 남아 있어도 엔터는 «완성했어요»(칸을 지우지 않는다)", async () => {
    const user = userEvent.setup();
    const onAnswer = elementary(
      course({
        interactive: { kind: "fraction-parts", denominator: 4, shape: "bar" },
      } as never),
    );
    const part = await screen.findByRole("button", { name: "2번째 칸" });
    expect(screen.getByRole("button", { name: /완성했어요/ })).toHaveAttribute(
      "aria-keyshortcuts",
      "Enter",
    );
    await user.click(part);
    expect(part).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ submittedAnswer: "1/4" }),
    );
    expect(part).toHaveAttribute("aria-pressed", "true");
  });
});

// ── 지난 학습 다시 풀기(대화상자) ──────────────────────────────────────────
const replay: MathSrsReplay = {
  kind: "elementary",
  step: 2,
  problemId: "55555555-5555-4555-8555-555555555555",
  title: "약수와 배수",
  subtitle: "초5 · 1학기 · 약수와 배수",
  content: "36의 약수 중 두 번째로 작은 수는?",
  figureUrl: null,
  answerChoices: ["2", "3", "4", "6"],
  interactive: null,
  correct: null,
  canRevealSolution: true,
  solution: null,
};
const json = (data: MathSrsReplay) =>
  new Response(JSON.stringify({ data }), {
    headers: { "content-type": "application/json" },
  });

describe("지난 학습 다시 풀기 — 대화상자 안에서는 대화상자의 보기가 키를 받는다", () => {
  it("숫자키로 바로 채점을 청하고(한 번), 뒤에 깔린 탐험 화면은 키를 먹지 않는다", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json(replay))
      .mockReturnValueOnce(new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    const onAction = vi.fn();
    render(
      <>
        <ExplorerPractice
          activity={truth}
          session={session}
          busy={false}
          correct={null}
          eventKey=""
          onAction={onAction}
          onHome={vi.fn()}
        />
        <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />
      </>,
    );
    const choices = within(
      await screen.findByRole("group", { name: "복습 답 고르기" }),
    ).getAllByRole("button");
    expect(choices[1]).toHaveAttribute("aria-keyshortcuts", "2");
    press("2");
    press("1");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({
      submittedAnswer: "3",
    });
    expect(choices[1]).toHaveAttribute("aria-pressed", "true");
    expect(onAction).not.toHaveBeenCalled();
    expect(pressed("1 맞아요")).toBe("false");
  });

  it("조각을 마우스로 칠해 포커스가 남아 있어도 엔터는 그 조각을 지우지 않고 «완성했어요»", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          ...replay,
          interactive: { kind: "fraction-parts", denominator: 3, shape: "bar" },
        }),
      )
      .mockReturnValueOnce(new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    render(
      <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />,
    );
    const part = await screen.findByRole("button", { name: "2번째 조각" });
    await user.click(part);
    expect(part).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({
      submittedAnswer: "1/3",
    });
    expect(part).toHaveAttribute("aria-pressed", "true");
  });

  it("조각 채우기 — 엔터가 «완성했어요»와 같다", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          ...replay,
          interactive: { kind: "fraction-parts", denominator: 3, shape: "bar" },
        }),
      )
      .mockReturnValueOnce(new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    render(
      <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />,
    );
    const done = await screen.findByRole("button", { name: "완성했어요" });
    expect(done).toHaveAttribute("aria-keyshortcuts", "Enter");
    fireEvent.click(screen.getByRole("button", { name: "1번째 조각" }));
    press("Enter");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({
      submittedAnswer: "1/3",
    });
  });

  describe("대화상자가 열리며 첫 포커스가 «복습 닫기 ×»에 가도(브라우저 showModal), 숫자키로 푼 뒤의 엔터가 대화상자를 닫지 않는다", () => {
    // jsdom 에는 showModal 이 없다 — 브라우저처럼 열면서 첫 단추(×)에 포커스를 두는 대역으로 재현한다.
    const native = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      "showModal",
    );
    beforeEach(() => {
      Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.setAttribute("open", "");
          this.querySelector<HTMLButtonElement>("button")?.focus();
        },
      });
    });
    afterEach(() => {
      if (native)
        Object.defineProperty(HTMLDialogElement.prototype, "showModal", native);
      else
        delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)
          .showModal;
    });
    function day(second: Promise<Response>) {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(json(replay))
        .mockReturnValueOnce(second);
      vi.stubGlobal("fetch", fetcher);
      const onClose = vi.fn();
      render(
        <StudentReplayDialog
          kind="elementary"
          step={1}
          dayId="day-1"
          total={2}
          onClose={onClose}
        />,
      );
      return { fetcher, onClose };
    }

    it("채점을 기다리는 동안 친 엔터 — 대화상자 그대로 · 진행 중 요청 그대로", async () => {
      const user = userEvent.setup();
      const { fetcher, onClose } = day(new Promise(() => {}));
      await screen.findByRole("group", { name: "복습 답 고르기" });
      await user.keyboard("2");
      expect(fetcher).toHaveBeenCalledTimes(2);
      await user.keyboard("{Enter}");
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toHaveAttribute("open");
      expect((fetcher.mock.calls[1][1] as RequestInit).signal?.aborted).toBe(
        false,
      );
    });

    it("맞힌 뒤 친 엔터 — 대화상자 그대로 · 그날 진행(1 / 2) 그대로", async () => {
      const user = userEvent.setup();
      const { onClose } = day(
        Promise.resolve(json({ ...replay, correct: true })),
      );
      await screen.findByRole("group", { name: "복습 답 고르기" });
      await user.keyboard("2");
      await screen.findByRole("button", { name: "다음 복습 문제" });
      await user.keyboard("{Enter}");
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toHaveAttribute("open");
      expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    });
  });
});

// ── 키 모양 — 번호 키 · ⏎ 키 (05 §8.18 · D-145) ─────────────────────────────
/**
 * 키 모양이 **실제 키와 같은가**. 모양 · 화면 읽기 · 동작이 모두 단추의 `aria-keyshortcuts` 한 곳에서 나오는지 본다:
 * 키를 단 단추마다 키 모양이 정확히 하나(그 키) · 키 모양은 그 키를 단 단추 안에만.
 * 색 · 크기 · «마우스 기기에서만»은 jsdom 이 못 잰다 — 실브라우저 `mobile-explorers-qa.mjs` 의 `keys:look` 이 계산된 스타일로 잰다.
 */
function expectKeyCaps() {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button[aria-keyshortcuts]"),
  );
  for (const button of buttons) {
    const key = button.getAttribute("aria-keyshortcuts")!;
    const caps = button.querySelectorAll("[data-answer-key]");
    expect(caps, `${button.textContent} 의 키 모양`).toHaveLength(1);
    expect(caps[0]).toHaveAttribute("data-answer-key", key);
    // ⏎ 는 모양뿐 — 화면 읽기는 단추의 `aria-keyshortcuts` 로 엔터를 알린다. 번호는 읽는 방식을 지금 그대로 둔다.
    if (key === "Enter") {
      expect(caps[0].tagName).toBe("KBD");
      expect(caps[0]).toHaveAttribute("aria-hidden", "true");
    } else {
      expect(caps[0].textContent).toBe(key);
      // 번호 키를 단 보기는 답 조작 단추 — 엔터 규칙(D-145 ⑸)의 표지를 단다
      expect(button).toHaveAttribute("data-answer-control");
    }
  }
  for (const cap of document.querySelectorAll("[data-answer-key]"))
    expect(cap.closest("button")).toHaveAttribute(
      "aria-keyshortcuts",
      cap.getAttribute("data-answer-key")!,
    );
  return buttons.map((button) => button.getAttribute("aria-keyshortcuts"));
}
const hasEnterKey = (name: string | RegExp) =>
  !!screen
    .getByRole("button", { name })
    .querySelector('[data-answer-key="Enter"]');

describe("키 모양 — 번호 키 · ⏎ 키는 그 단추의 실제 키 (05 §8.18)", () => {
  it("탐험 예 모으기 · 정의 조립 — 번호 키 넷과 확인 단추의 ⏎, 화면 읽기 이름은 그대로", () => {
    const first = explorer();
    expect(expectKeyCaps()).toEqual(["1", "2", "3", "4", "Enter"]);
    expect(
      screen.getByRole("button", { name: "선택한 예 확인하기" }),
    ).toBeInTheDocument();
    expect(hasEnterKey("아직 모르겠어요")).toBe(false);
    first.unmount();
    explorer(assemble);
    expect(expectKeyCaps()).toEqual(["1", "2", "3", "4", "Enter"]);
    expect(hasEnterKey("완성한 문장 확인하기")).toBe(true);
  });

  it("탐험 경계 살피기 — 번호 키만(확인 단추가 없어 ⏎ 도 없다) · 뜻 만나기의 넘김 단추에는 ⏎ 가 없다", () => {
    const first = explorer(truth);
    expect(expectKeyCaps()).toEqual(["1", "2"]);
    first.unmount();
    explorer({ ...activity, kind: "read" });
    expectKeyCaps();
    expect(hasEnterKey(/뜻을 가리고 도전하기/)).toBe(false);
  });

  it("작업실 — 예상 보기의 번호 키 · 조각 확인 단추의 ⏎", () => {
    lab({
      stage: "predict",
      choices: [
        { id: 0, label: "더 커져요" },
        { id: 1, label: "그대로예요" },
      ],
    });
    expect(expectKeyCaps()).toEqual(["1", "2"]);
    cleanup();
    lab();
    expect(expectKeyCaps()).toEqual(["Enter"]);
    expect(hasEnterKey("나눈 조각 확인하기")).toBe(true);
  });

  it("중등 오늘의 복습 — 번호 키 넷", async () => {
    vi.mocked(srsApi.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: middleState(),
    });
    render(
      <StudentMathSrs expedition={{ onExit: vi.fn(), onComplete: vi.fn() }} />,
    );
    await screen.findByRole("group", { name: "답 고르기" });
    expect(expectKeyCaps()).toEqual(["1", "2", "3", "4"]);
  });

  it("초등 은행 — 네 보기의 번호 키 · «정답 확인»과 «완성했어요»의 ⏎ · 화살표는 키와 바꿔 끼는 자리", async () => {
    elementary(course({ answerChoices: ["1", "2", "3", "4"] } as never));
    await screen.findByText("문제 1: 1 + 1");
    expect(expectKeyCaps()).toEqual(["1", "2", "3", "4"]);
    cleanup();
    elementary(course());
    await screen.findByRole("textbox", { name: "나의 답" });
    expect(expectKeyCaps()).toEqual(["Enter"]);
    const submit = screen.getByRole("button", { name: /정답 확인/ });
    // ㉠ 키가 보이는 기기에서는 ⏎ 가 화살표 자리를 대신한다 — 화살표는 «바꿔 끼는 자리» 표지를 단다(모양은 실브라우저에서).
    expect(submit.querySelectorAll("[data-answer-key-swap]")).toHaveLength(1);
    expect(submit.querySelector("[data-answer-key-swap]")).toHaveTextContent(
      "→",
    );
    cleanup();
    elementary(
      course({
        interactive: { kind: "fraction-parts", denominator: 4, shape: "bar" },
      } as never),
    );
    await screen.findByRole("button", { name: "2번째 칸" });
    expect(expectKeyCaps()).toEqual(["Enter"]);
    expect(hasEnterKey(/완성했어요/)).toBe(true);
  });

  it("초등 은행 — 채점 뒤 «다음 문제 →»(넘김)에는 ⏎ 도 바꿔 끼는 표지도 없다", async () => {
    const run = course();
    const answered = {
      ...run,
      problems: run.problems.map((problem, index) =>
        index === 0 ? { ...problem, feedback: { correct: false } } : problem,
      ),
      attempts: [
        {
          problemId: run.problems[0].id,
          submittedAnswer: "3",
          correct: false,
          usedHint: false,
          selfAssessed: false,
          answeredAt: now,
        },
      ],
    } as CoursePublicSession;
    render(
      <StudentCoursePractice
        session={answered}
        summary={{ todayAnswered: 1, todayGoal: 10 } as CourseSummary}
        feedbackId={run.problems[0].id}
        busy={false}
        onAnswer={vi.fn()}
        onHint={vi.fn()}
        onNext={vi.fn()}
        onContinue={vi.fn()}
        onExit={vi.fn()}
        onAuthFailure={vi.fn()}
      />,
    );
    const next = await screen.findByRole("button", { name: /다음 문제/ });
    // 넘김은 Enter로 실행되지만 답 입력용 키 모양은 달지 않는다.
    expect(next).toHaveAttribute("aria-keyshortcuts", "Enter");
    expect(next.querySelector("[data-answer-key]")).toBeNull();
    expect(next.querySelector("[data-answer-key-swap]")).toBeNull();
  });

  it("지난 학습 다시 풀기 — 보기 번호 키 · 조각 «완성했어요»의 ⏎ · 맞힌 뒤 «다음 복습 문제»에는 ⏎ 가 없다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json(replay))
        .mockResolvedValueOnce(json({ ...replay, correct: true })),
    );
    render(
      <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />,
    );
    await screen.findByRole("group", { name: "복습 답 고르기" });
    expect(expectKeyCaps()).toEqual(["1", "2", "3", "4"]);
    press("2");
    const next = await screen.findByRole("button", {
      name: /진도판으로|다음 복습 문제/,
    });
    expectKeyCaps();
    expect(next.querySelector("[data-answer-key]")).toBeNull();
    cleanup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        json({
          ...replay,
          interactive: { kind: "fraction-parts", denominator: 3, shape: "bar" },
        }),
      ),
    );
    render(
      <StudentReplayDialog kind="elementary" step={2} onClose={vi.fn()} />,
    );
    await screen.findByRole("button", { name: "완성했어요" });
    expect(expectKeyCaps()).toEqual(["Enter"]);
  });

  it("키가 없는 번호(열째 보기부터)는 키 모양을 입지 않는다 — 번호만 지금 그대로", () => {
    render(
      <>
        <button type="button" aria-keyshortcuts="9" data-answer-control="">
          <NumberKey index={8} className="n" />
        </button>
        <button type="button">
          <NumberKey index={9} className="n" />
        </button>
      </>,
    );
    expect(expectKeyCaps()).toEqual(["9"]);
    const tenth = screen.getByText("10");
    expect(tenth).not.toHaveAttribute("data-answer-key");
    expect(tenth).toHaveAttribute("class", "n");
  });

  it("키 모양은 마우스가 주 포인터인 기기에서만 — 모양을 주는 규칙은 모두 가르는 조건 안에 있고, 밖에서는 ⏎ 를 숨긴다", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/components/math-srs/answer-keys.module.css"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const gate = "@media (hover: hover) and (pointer: fine)";
    const start = css.indexOf(gate);
    expect(start).toBeGreaterThanOrEqual(0);
    // 가르는 조건 블록을 괄호 짝으로 떼어 낸다
    let depth = 0;
    let end = css.indexOf("{", start);
    for (; end < css.length; end += 1) {
      if (css[end] === "{") depth += 1;
      if (css[end] === "}" && --depth === 0) break;
    }
    const inside = css.slice(start, end + 1);
    const outside = css.slice(0, start) + css.slice(end + 1);
    expect(inside).toMatch(/\.number\.number\s*\{[^}]*box-shadow/);
    expect(inside).toMatch(/\.enter\s*\{[^}]*display:\s*inline-grid/);
    expect(inside).toMatch(/\.swap\s*\{[^}]*display:\s*none/);
    expect(outside).toMatch(/\.enter\s*\{[^}]*display:\s*none/);
    expect(outside).not.toMatch(/\.number|\.swap/);
  });
});
