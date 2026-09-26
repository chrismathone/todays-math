import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import type { ExplorerRequest } from "@/contracts/mathExplorers.contract";
import { explorerJourney } from "@/components/math-explorers/ExplorerHome";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const now = "2026-09-26";
const student = { id: "student-ui", name: "학생", className: "테스트반" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StudentMathExplorers", () => {
  it("retries a lost mutation with the identical request identifier and revision", async () => {
    let stored = createExplorerState(student.id, 3);
    let revision = 0;
    const requests: ExplorerRequest[] = [];
    const data = () => ({
      ...explorerView(stored, now),
      student,
      revision,
      feedback: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: RequestInit) => {
        if (!options?.body)
          return new Response(JSON.stringify({ data: data() }), {
            status: 200,
          });
        const input = JSON.parse(options.body as string) as ExplorerRequest;
        requests.push(input);
        if (requests.length === 1) throw new TypeError("Lost response");
        const result = applyExplorerAction(
          stored,
          input.action,
          now,
          input.requestId,
        );
        stored = result.state;
        revision++;
        return new Response(
          JSON.stringify({ data: { ...data(), feedback: result.feedback } }),
          { status: 200 },
        );
      }),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(await screen.findByRole("button", { name: "초4" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "같은 요청 다시 시도" }),
    );
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toEqual(requests[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "초4" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });

  it("maps completed expedition days without moving for individual answers or a review-only run", () => {
    const stored = createExplorerState(student.id, 3);
    stored.completedDays = [
      {
        date: "2026-09-25",
        unitId: "e3-multiply",
        sessionId: "completed-session",
      },
    ];
    const view = {
      ...explorerView(stored, now),
      student,
      revision: 0,
      feedback: null,
    };
    const initial = explorerJourney(view);
    const afterAnswer = explorerJourney({
      ...view,
      session: {
        id: "active",
        route: "unit",
        title: "복습",
        unitId: "e3-multiply",
        cardIds: ["a", "b", "c", "d", "e"],
        index: 8,
        total: 15,
        round: 0,
        done: false,
        first: 5,
        stars: 0,
        unresolved: [],
        reviewOnly: false,
      },
    });
    expect(afterAnswer.completedDays).toBe(initial.completedDays);
    expect(afterAnswer.todayAnswered).toBe(8);
    expect(
      explorerJourney({
        ...view,
        session: { ...afterAnswerSession(), reviewOnly: true },
      }).todayAnswered,
    ).toBe(0);
  });
});

function afterAnswerSession() {
  return {
    id: "review",
    route: "unit" as const,
    title: "복습",
    unitId: "e3-multiply",
    cardIds: ["a", "b", "c", "d", "e"],
    index: 8,
    total: 15,
    round: 0,
    done: false,
    first: 5,
    stars: 0,
    unresolved: [],
    reviewOnly: false,
  };
}
