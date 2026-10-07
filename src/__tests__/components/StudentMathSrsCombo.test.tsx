import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentMathSrs } from "@/components/math-srs/StudentMathSrs";
import type {
  MathSrsPublicMission,
  MathSrsState,
} from "@/contracts/mathSrs.contract";
import { createMemories } from "@/lib/math-srs/memory";
import * as api from "@/components/math-srs/mathSrsApi";
import { effectAppears } from "../helpers/answerFeedback";

/**
 * 복습 화면의 콤보(05 §8.15) — 서버가 돌려준 미션 기록으로 세어, 첫 풀이 정답 연출에서만 말한다.
 * 규칙 자체는 `mathSrsCombo.test.ts`, 부품 모양은 `AnswerFeedbackEffectCombo.test.tsx`.
 */
const sounds = vi.hoisted(() => ({
  enabled: true,
  status: "ready" as const,
  setEnabled: vi.fn(),
  gesture: vi.fn(),
  preview: vi.fn(),
  play: vi.fn(),
  resetStudent: vi.fn(),
}));
vi.mock("@/components/math-srs/LearningSounds", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/components/math-srs/LearningSounds")
  >()),
  LearningSoundsProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useLearningSounds: () => sounds,
}));

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/math-srs/mathSrsApi", () => ({
  fetchMathSrs: vi.fn(),
  startMathSrs: vi.fn(),
  submitMathSrsAttempt: vi.fn(),
  revealMathSrsHint: vi.fn(),
  submitMathSrsReplay: vi.fn(),
  fetchClassMathSrs: vi.fn(),
}));

const missionId = "44444444-4444-4444-8444-444444444444";
const pid = (i: number) =>
  `55555555-5555-4555-8555-${String(i + 1).padStart(12, "0")}`;
type Result = "fast" | "late" | "wrong";

function state(mission: MathSrsPublicMission): MathSrsState {
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
/** 목표 10초 문제 12개. fast 5초 · late 20초(1.5배 15초 넘음) · wrong 틀림 */
function mission(results: Result[]): MathSrsPublicMission {
  const problems: MathSrsPublicMission["problems"] = Array.from(
    { length: 12 },
    (_, i) => ({
      id: pid(i),
      templateId: "quick:two-step:solve",
      conceptId: "two-step",
      conceptWeights: [{ conceptId: "two-step", weight: 1 }],
      difficulty: 1,
      kind: "quick",
      prompt: `${i + 1}번. $x$ 의 값은?`,
      equation: "$2x=6$",
      answerChoices: ["$3$", "$4$", "$6$", "$12$"],
      expectedSeconds: 10,
      hint: null,
      feedback:
        i < results.length ? { answer: "$3$", solution: ["$x=3$"] } : null,
    }),
  );
  return {
    id: missionId,
    date: "2026-09-27",
    startedAt: "2026-09-27T01:00:00.000Z",
    completedAt: results.length === 12 ? "2026-09-27T01:10:00.000Z" : null,
    problems,
    attempts: results.map((r, i) => ({
      problemId: pid(i),
      templateId: "quick:two-step:solve",
      conceptId: "two-step",
      kind: "quick",
      submittedAnswer: r === "wrong" ? "$4$" : "$3$",
      correct: r !== "wrong",
      // 화면이 보낸 값 그대로 — 콤보는 이 값을 보지 않는다
      rating: "good",
      usedHint: false,
      elapsedSeconds: r === "late" ? 20 : 5,
      answeredAt: `2026-09-27T01:0${Math.floor(i / 2)}:${i % 2 ? "30" : "00"}.000Z`,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

/** 앞 결과들로 이어 풀기 → 다음 문제를 첫 보기로 답 → 서버가 next 를 돌려준다 */
async function answerNext(
  before: Result[],
  next: Result,
  options: { expedition?: boolean } = {},
) {
  const user = userEvent.setup();
  vi.mocked(api.fetchMathSrs).mockResolvedValue({
    ok: true,
    data: state(mission(before)),
  });
  // «이어서 학습하기»는 서버에 미션을 다시 청한다(같은 미션이 돌아온다)
  vi.mocked(api.startMathSrs).mockResolvedValue({
    ok: true,
    data: state(mission(before)),
  });
  vi.mocked(api.submitMathSrsAttempt).mockResolvedValue({
    ok: true,
    data: state(mission([...before, next])),
  });
  render(
    <StudentMathSrs
      expedition={
        options.expedition
          ? { onExit: vi.fn(), onComplete: vi.fn() }
          : undefined
      }
    />,
  );
  if (!options.expedition)
    await user.click(
      await screen.findByRole("button", { name: /이어서 학습하기/ }),
    );
  const choices = within(
    await screen.findByRole("group", { name: "답 고르기" }),
  ).getAllByRole("button");
  const effect = effectAppears();
  await user.click(choices[0]);
  return effect;
}

describe("복습 화면 — 첫 풀이 정답 연출의 콤보", () => {
  it("distinguishes explicit give-up from a wrong selection without changing the server rating", async () => {
    const user = userEvent.setup();
    const before = mission(["fast", "fast", "fast"]);
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(before),
    });
    const saved = mission(["fast", "fast", "fast", "wrong"]);
    saved.attempts[3].submittedAnswer = "";
    saved.attempts[3].rating = "again";
    vi.mocked(api.submitMathSrsAttempt).mockResolvedValue({
      ok: true,
      data: state(saved),
    });
    const { container } = render(
      <StudentMathSrs expedition={{ onExit: vi.fn(), onComplete: vi.fn() }} />,
    );
    await screen.findByRole("group", { name: "답 고르기" });
    expect(
      container.querySelector('[data-question-transition="true"]'),
    ).not.toBeInTheDocument();
    const effect = effectAppears();
    await user.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    const status = await effect;
    expect(status).toHaveTextContent(/^모르는 부분을 확인했어요$/);
    expect(status).not.toHaveAttribute("data-streak");
    expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
      "soft",
      `${state(before).student.id}:${missionId}:${pid(3)}`,
    );
    expect(status.closest('[class*="answerDockHeading"]')).toBeInTheDocument();
    expect(api.submitMathSrsAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ submittedAnswer: "", rating: "again" }),
    );
  });
  it("셋째 빠른 정답에서 «3문제 연속 정답»", async () => {
    const status = await answerNext(["fast", "fast"], "fast");
    expect(status).toHaveTextContent(/^3문제 연속 정답$/);
    expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
      "correct",
      `${state(mission([])).student.id}:${missionId}:${pid(2)}`,
    );
    expect(sounds.gesture).toHaveBeenCalled();
    // 화면 읽기 — 정답 연출이 role=status 로 이 한 문장을 읽는다
    expect(status).toHaveAttribute("role", "status");
  });

  it("둘째까지는 지금 문구", async () => {
    const status = await answerNext(["fast"], "fast");
    expect(status).toHaveTextContent(/^정확하게 풀었어요$/);
  });

  it("늦게 맞히면 지금 문구 — 콤보는 말하지 않는다", async () => {
    const status = await answerNext(["fast", "fast", "fast"], "late");
    expect(status).toHaveTextContent(/^정확하게 풀었어요$/);
  });

  it("틀리면 지금 오답 연출 — 끊겼다는 말 없음", async () => {
    const status = await answerNext(["fast", "fast", "fast"], "wrong");
    expect(status).toHaveTextContent(/^다시 생각해 볼 문제예요$/);
  });

  it("탐험 안 복습도 같은 셈 · 같은 모양", async () => {
    const status = await answerNext(["fast", "fast", "fast"], "fast", {
      expedition: true,
    });
    expect(status).toHaveTextContent(/^4문제 연속 정답$/);
  });

  it("열두째(미션이 끝나는 답)에도 연출이 뜬다 — 12연속은 같은 문장", async () => {
    const status = await answerNext(Array(11).fill("fast"), "fast");
    expect(status).toHaveTextContent(/^12문제 연속 정답$/);
  });

  it("모아 둔 오답 다시 풀기에서는 콤보를 말하지 않는다", async () => {
    const user = userEvent.setup();
    const finished = mission([...Array(11).fill("fast"), "wrong"] as Result[]);
    vi.mocked(api.fetchMathSrs).mockResolvedValue({
      ok: true,
      data: state(finished),
    });
    vi.mocked(api.submitMathSrsReplay).mockResolvedValue({
      ok: true,
      data: {
        kind: "middle",
        step: 12,
        problemId: finished.problems[11].id,
        title: "두 단계 방정식",
        subtitle: "중1",
        content: finished.problems[11].prompt,
        figureUrl: null,
        answerChoices: finished.problems[11].answerChoices!,
        interactive: null,
        canRevealSolution: true,
        solution: null,
        correct: true,
      },
    });
    render(<StudentMathSrs />);
    await user.click(
      await screen.findByRole("button", { name: /오답 다시 풀기/ }),
    );
    const effect = effectAppears();
    await user.click(
      within(screen.getByRole("group", { name: "답 고르기" })).getAllByRole(
        "button",
      )[0],
    );
    const status = await effect;
    expect(status).toHaveTextContent(/^이번에는 해결했어요$/);
    expect(sounds.play).toHaveBeenCalledExactlyOnceWith(
      "correct",
      `${state(finished).student.id}:${missionId}:${pid(11)}:0`,
    );
    expect(status).not.toHaveAttribute("data-streak");
    await act(async () => {});
  });
});
