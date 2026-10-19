import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  FollowUpSolution,
  FollowUpWarning,
  PreviousAnswerMark,
} from "@/components/math-srs/FollowUpFeedback";

describe("shared follow-up feedback", () => {
  it("labels the solution and preserves the caller's button ref and action", () => {
    const buttonRef = createRef<HTMLButtonElement>();
    const onUnderstood = vi.fn();
    const { rerender } = render(
      <FollowUpSolution
        footerText="다음 복습에서 만나요."
        busy={false}
        onUnderstood={onUnderstood}
        buttonRef={buttonRef}
        headingId="solution-heading"
      >
        <p>풀이 내용</p>
      </FollowUpSolution>,
    );
    expect(screen.getByRole("region", { name: "정답과 풀이" })).toHaveAttribute(
      "aria-labelledby",
      "solution-heading",
    );
    expect(screen.getByText("다시 살펴봐요")).toBeInTheDocument();
    expect(screen.getByText("다음 복습에서 만나요.")).toBeInTheDocument();
    expect(buttonRef.current).toBe(
      screen.getByRole("button", { name: "알겠어요" }),
    );
    buttonRef.current?.focus();
    expect(buttonRef.current).toHaveFocus();
    fireEvent.click(buttonRef.current!);
    expect(onUnderstood).toHaveBeenCalledOnce();
    rerender(
      <FollowUpSolution footerText="다음" busy onUnderstood={onUnderstood}>
        풀이
      </FollowUpSolution>,
    );
    expect(screen.getByRole("button", { name: "알겠어요" })).toBeDisabled();
  });

  it("uses columns only with a figure and generates distinct accessible heading IDs", () => {
    const { container } = render(
      <>
        <FollowUpSolution
          footerText="다음"
          busy={false}
          onUnderstood={() => {}}
        >
          내용만
        </FollowUpSolution>
        <FollowUpSolution
          footerText="다음"
          busy={false}
          onUnderstood={() => {}}
          figure={<svg aria-label="문제 그림" />}
        >
          그림과 내용
        </FollowUpSolution>
      </>,
    );
    const regions = screen.getAllByRole("region", { name: "정답과 풀이" });
    expect(regions[0].getAttribute("aria-labelledby")).not.toBe(
      regions[1].getAttribute("aria-labelledby"),
    );
    expect(container.querySelectorAll('[class*="columns"]')).toHaveLength(1);
    expect(screen.getByLabelText("문제 그림")).toBeInTheDocument();
  });

  it("shares the warning and previous-answer marker without making an answer selected", () => {
    render(
      <>
        <FollowUpWarning />
        <button data-previous="true" aria-pressed="false">
          <PreviousAnswerMark />
        </button>
      </>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("다시 해 볼까요");
    expect(screen.getByText("앞에서 고른 답").tagName).toBe("SPAN");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });
});
