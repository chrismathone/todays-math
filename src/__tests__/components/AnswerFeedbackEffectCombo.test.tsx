import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AnswerFeedbackEffect from "@/components/math-srs/AnswerFeedbackEffect";

describe("inline answer feedback semantics", () => {
  it.each([true, false])(
    "has one live result and a small decorative icon: %s",
    (correct) => {
      const { container } = render(
        <AnswerFeedbackEffect correct={correct} eventKey="saved" />,
      );
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute(
        "data-answer-feedback",
        correct ? "correct" : "incorrect",
      );
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
      expect(
        status.querySelector('svg[aria-hidden="true"]'),
      ).toBeInTheDocument();
      expect(status.querySelectorAll("i")).toHaveLength(0);
      expect(status.textContent).not.toContain("!");
      expect(status).toHaveTextContent(
        correct ? "정확하게 풀었어요" : "다시 생각해 볼 문제예요",
      );
    },
  );

  it("keeps the result while the saved grade remains and does not remount on explanation rerenders", () => {
    const { rerender } = render(
      <AnswerFeedbackEffect correct eventKey="saved" />,
    );
    const status = screen.getByRole("status");
    rerender(<AnswerFeedbackEffect correct eventKey="saved" />);
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveTextContent("정확하게 풀었어요");
    rerender(<AnswerFeedbackEffect correct={null} eventKey="saved" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses supplied client copy without changing the grade", () => {
    render(
      <AnswerFeedbackEffect
        correct={false}
        eventKey="saved"
        message="모르는 부분을 확인했어요"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /^모르는 부분을 확인했어요$/,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-answer-feedback",
      "incorrect",
    );
  });

  it.each([null, undefined])(
    "does not add a combo when it is absent: %s",
    (streak) => {
      render(<AnswerFeedbackEffect correct eventKey="saved" streak={streak} />);
      expect(screen.getByRole("status")).toHaveTextContent(
        /^정확하게 풀었어요$/,
      );
      expect(screen.getByRole("status")).not.toHaveAttribute("data-streak");
    },
  );

  it("ignores streak values for an incorrect answer", () => {
    render(
      <AnswerFeedbackEffect correct={false} eventKey="saved" streak={6} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /^다시 생각해 볼 문제예요$/,
    );
    expect(screen.getByRole("status")).not.toHaveAttribute("data-streak");
  });

  it.each([3, 6, 10, 12])(
    "retains the exact combo sentence and separate emphasized number: %s",
    (streak) => {
      render(
        <AnswerFeedbackEffect
          correct
          eventKey="saved"
          streak={streak}
          message="정확하게 풀었어요"
        />,
      );
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent(new RegExp(`^${streak}문제 연속 정답$`));
      expect(status).toHaveAttribute("data-streak", String(streak));
      expect(status.querySelector("p b")).toHaveTextContent(String(streak));
    },
  );

  it("renders nothing without a confirmed grade", () => {
    expect(
      renderToStaticMarkup(<AnswerFeedbackEffect correct={null} eventKey="" />),
    ).toBe("");
  });
});
