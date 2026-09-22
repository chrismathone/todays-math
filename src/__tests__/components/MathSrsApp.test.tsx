import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MathSrsApp from "@/components/math-srs/MathSrsApp";
import { clearDraft } from "@/lib/math-srs/draft";
import { createMission, recordAttempt } from "@/lib/math-srs/mission";
import {
  createStore,
  loadStore,
  saveStore,
  STORAGE_KEY,
} from "@/lib/math-srs/storage";

beforeEach(() => {
  localStorage.clear();
  clearDraft("srs-default");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  clearDraft("srs-default");
});

describe("Math SRS learning journey", () => {
  it("starts a real first mission and rejects blank/invalid fractions without recording", async () => {
    const user = userEvent.setup();
    render(<MathSrsApp />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    await user.click(screen.getByRole("button", { name: "정답 확인 →" }));
    expect(screen.getByRole("alert")).toHaveTextContent("답을 입력");
    await user.type(screen.getByLabelText(/^나의 답/), "1/0");
    await user.click(screen.getByRole("button", { name: "정답 확인 →" }));
    expect(screen.getByRole("alert")).toHaveTextContent("분모는 0");
    expect(loadStore().store.learners[0].missions[0].attempts).toHaveLength(0);
  });

  it("preserves a revealed hint across a reload and records a capped correct answer", async () => {
    const user = userEvent.setup();
    const first = render(<MathSrsApp />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    );
    await user.click(screen.getByRole("button", { name: "힌트 보기" }));
    const answer = loadStore().store.learners[0].missions[0].problems[0].answer;
    first.unmount();
    render(<MathSrsApp />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    );
    expect(
      screen.getByRole("button", { name: "힌트를 확인했어요" }),
    ).toBeDisabled();
    await user.type(screen.getByLabelText(/^나의 답/), String(answer));
    await user.click(screen.getByRole("button", { name: "정답 확인 →" }));
    const attempt = loadStore().store.learners[0].missions[0].attempts[0];
    expect(attempt).toMatchObject({
      correct: true,
      usedHint: true,
      rating: "hard",
    });
    await user.click(screen.getByRole("button", { name: "다음 문제 →" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    expect(screen.getByRole("button", { name: "힌트 보기" })).toBeEnabled();
  });

  it("finishes yesterday's interrupted mission and keeps the last feedback and result visible", async () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const store = createStore();
    const mission = createMission(store.learners[0], now, 1123);
    let learner = { ...store.learners[0], missions: [mission] };
    for (const [index, problem] of mission.problems.slice(0, 11).entries()) {
      learner = recordAttempt(learner, mission.id, {
        problemId: problem.id,
        conceptId: problem.conceptId,
        templateId: problem.templateId,
        kind: problem.kind,
        submittedAnswer: String(problem.answer),
        correct: true,
        rating: "good",
        usedHint: false,
        elapsedSeconds: 20,
        answeredAt: new Date(
          now.getTime() + (index + 1) * 20_000,
        ).toISOString(),
      });
    }
    expect(saveStore({ ...store, learners: [learner] }).ok).toBe(true);
    const user = userEvent.setup();
    render(<MathSrsApp />);
    await user.click(
      await screen.findByRole("button", { name: "미션 이어하기 · 11/12" }),
    );
    await user.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    expect(
      screen.getByRole("heading", { name: "괜찮아요. 함께 다시 풀어봐요." }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "오늘의 결과 보기 →" }),
    );
    expect(
      screen.getByRole("heading", { name: "오늘의 기억을 쌓았어요." }),
    ).toBeInTheDocument();
    expect(loadStore().store.learners[0].missions[0].attempts).toHaveLength(12);
    expect(
      loadStore().store.learners[0].missions[0].completedAt,
    ).not.toBeNull();
    await user.click(
      screen.getByRole("button", { name: "나의 기억 지도 보기 →" }),
    );
    await user.click(screen.getByRole("button", { name: "오늘의 미션 시작" }));
    expect(loadStore().store.learners[0].missions).toHaveLength(2);
  });

  it("isolates learner records and shows actual attempts in the teacher view", async () => {
    const user = userEvent.setup();
    render(<MathSrsApp />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    );
    await user.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await user.click(screen.getByRole("button", { name: "+ 추가" }));
    await user.type(screen.getByLabelText("학습자 이름"), "검증 학생");
    await user.click(screen.getByRole("button", { name: "추가하기" }));
    const stored = loadStore().store;
    expect(stored.learners).toHaveLength(2);
    expect(stored.learners[0].missions[0].attempts).toHaveLength(1);
    expect(stored.learners[1].missions).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "교사용 현황" }));
    expect(screen.getByRole("table")).toHaveTextContent("검증 학생");
    expect(screen.getByRole("table")).toHaveTextContent("보강 필요");
    expect(screen.getByRole("table")).toHaveTextContent("측정 전");
  });

  it("continues in memory when storage is full instead of dropping the active mission", async () => {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key === STORAGE_KEY)
        throw new DOMException("quota", "QuotaExceededError");
      original.call(this, key, value);
    });
    const user = userEvent.setup();
    render(<MathSrsApp />);
    await user.click(
      await screen.findByRole("button", { name: "오늘의 미션 시작" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("저장 공간");
    await user.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await user.click(screen.getByRole("button", { name: "다음 문제 →" }));
    await user.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
