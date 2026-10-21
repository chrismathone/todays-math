import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingSessionView } from "@/components/fading/FadingSessionView";
import { erasedTargets } from "@/lib/fading/erasure";
import { fadingCardBlanks } from "@/lib/fading/cards";
import { prepareMemory } from "../../../scripts/qa/srs-m05-m06-memory/memory";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
vi.stubGlobal("scrollTo", vi.fn());
afterEach(cleanup);
type Fixture = Awaited<ReturnType<typeof prepareMemory>>;
function Host({ fixture }: { fixture: Fixture }) {
  const [state, setState] = useState(fixture.state);
  return (
    <FadingSessionView
      student
      source={fixture.source}
      state={state}
      practice={fixture.practice}
      onState={(next) =>
        setState((previous) =>
          next.session
            ? next
            : { ...next, session: previous.session, opened: previous.opened },
        )
      }
      onReconcile={setState}
      onExit={() => {}}
    />
  );
}
function header() {
  return within(
    document.querySelector("[data-fading-session] > header") as HTMLElement,
  );
}
function progress(done: number, total: number) {
  expect(header().getByText(`${done} / ${total} 완료`)).toBeInTheDocument();
  expect(
    document.querySelector("[data-fading-session] > header [style]"),
  ).toHaveStyle({ width: `${Math.round((done / total) * 100)}%` });
}
function answer(text: string) {
  const input = screen.getByRole("textbox", { name: /빈칸 답 입력/ });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(input.closest("form")!);
}
function pageTo(index: number) {
  const pager = screen.getByRole("navigation", { name: "개념 문장 이동" });
  while (!(pager.textContent ?? "").includes(`문장 ${index + 1} /`)) {
    const current = Number(pager.textContent!.match(/문장 (\d+) \//)![1]) - 1;
    fireEvent.click(
      within(pager).getByRole("button", {
        name: current < index ? "다음 문장" : "이전 문장",
      }),
    );
  }
}
async function compare(cards: boolean, count: number) {
  if (cards) {
    await screen.findByRole("button", { name: "다음 문장 보기" });
    for (let i = 0; i < count - 1; i++)
      fireEvent.click(screen.getByRole("button", { name: "다음 문장 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "살펴보기 마치기" }));
  } else {
    const button = await screen.findByRole("button", {
      name: /느낌 고르기|자가 평가하기|연습 마치기/,
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
  }
}

describe("M-05 current sentence input", () => {
  it.each([2, 3] as const)(
    "step %s hides a no-blank input, keeps paging/retry/step completion",
    async (step) => {
      const fixture = await prepareMemory({ step });
      expect(fadingCardBlanks(fixture.concept, step, "memory-0")).toHaveLength(
        0,
      );
      render(<Host fixture={fixture} />);
      const total = erasedTargets(fixture.concept, step).length;
      progress(0, total);
      expect(
        screen.queryByRole("textbox", { name: /빈칸 답 입력/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "입력" }),
      ).not.toBeInTheDocument();
      const next = screen.getByRole("button", { name: "다음 문장" });
      next.focus();
      await userEvent.setup().keyboard("{Enter}");
      expect(screen.getByRole("button", { name: "이전 문장" })).toBeEnabled();
      const targets = erasedTargets(fixture.concept, step);
      for (const [i, target] of targets.entries()) {
        pageTo(Number(target.id.match(/memory-(\d+)/)![1]));
        if (i === 0) {
          answer("오답");
          expect(screen.getByText(/다시 써 볼까요/)).toBeInTheDocument();
          expect(
            screen.getByRole("textbox", { name: /빈칸 답 입력/ }),
          ).toBeEnabled();
          progress(0, total);
        }
        answer(target.text);
        progress(i + 1, total);
      }
      expect(
        screen.queryByRole("textbox", { name: /빈칸 답 입력/ }),
      ).not.toBeInTheDocument();
      const finish = screen.getByRole("button", { name: "단계 마치기" });
      expect(finish).toBeEnabled();
      fireEvent.click(finish);
      await screen.findByRole("heading", { name: `${step}단계를 마쳤어요` });
      progress(total, total);
      fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
      progress(0, erasedTargets(fixture.concept, (step + 1) as 3 | 4).length);
    },
  );
});

describe("M-06 completed step progress comes from real results", () => {
  it.each([
    [true, 3, false],
    [true, 4, false],
    [true, 4, true],
    [false, 3, false],
    [false, 4, true],
  ] as const)(
    "cards=%s blanks=%s giveUp=%s keeps progress through rating",
    async (cards, count, giveUp) => {
      const fixture = await prepareMemory({ cards, count, step: 4 });
      render(<Host fixture={fixture} />);
      progress(0, count);
      if (giveUp) {
        if (cards)
          for (let i = 0; i < count; i++) {
            const skip = screen.getByRole("button", {
              name: "아직 모르겠어요",
            });
            await waitFor(() => expect(skip).toBeEnabled());
            fireEvent.click(skip);
            if (i < count - 1) await waitFor(() => progress(i + 1, count));
          }
        else
          fireEvent.click(
            screen.getByRole("button", { name: "아직 모르겠어요" }),
          );
      } else {
        for (const [i, target] of erasedTargets(fixture.concept, 4).entries()) {
          answer(target.text);
          if (i < count - 1) progress(i + 1, count);
        }
        if (!cards)
          fireEvent.click(screen.getByRole("button", { name: /단계 마치기/ }));
      }
      await compare(cards, count);
      const rating = await screen.findByRole("button", {
        name: giveUp ? /^다시/ : /^쉬움/,
      });
      await waitFor(() => expect(rating).toBeEnabled());
      fireEvent.click(rating);
      await screen.findByRole("heading", { name: "풀이를 마쳤어요" });
      expect(fixture.source.snapshot().session).toBeNull();
      expect(fixture.source.snapshot().receipts[0]?.rating).toBe(
        giveUp ? "again" : "easy",
      );
      progress(count, count);
    },
  );

  it.each([true, false])(
    "cards=%s resumed rating keeps actual completed result",
    async (cards) => {
      const fixture = await prepareMemory({ cards, step: 4, rating: true });
      render(<Host fixture={fixture} />);
      progress(4, 4);
    },
  );

  it("practice finishes without writing or changing the next review", async () => {
    const fixture = await prepareMemory({ step: 4, practice: true });
    const before = fixture.source.snapshot();
    const act = vi.spyOn(fixture.source, "act");
    render(<Host fixture={fixture} />);
    for (const target of erasedTargets(fixture.concept, 4)) {
      fireEvent.click(screen.getByRole("button", { name: /확실해요/ }));
      answer(target.text);
    }
    await compare(true, 4);
    fireEvent.click(screen.getByRole("button", { name: "연습 마치기" }));
    await screen.findByRole("heading", { name: "연습을 마쳤어요" });
    progress(4, 4);
    expect(act).not.toHaveBeenCalled();
    expect(fixture.source.snapshot()).toEqual(before);
  });
});
