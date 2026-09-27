import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AnswerFeedbackEffect from "@/components/math-srs/AnswerFeedbackEffect";

/**
 * 정답 연출에 콤보(«N문제 연속 정답», 05 §8.15)를 더해도 **콤보를 안 넘기는 곳은 한 글자도 같아야** 한다 —
 * 개념 탐험 활동(ExplorerPractice) · 초등 · 지난 학습 다시 풀기 · 오답 다시 풀기가 같은 부품을 쓴다.
 * 아래 GOLDEN 은 콤보를 넣기 **전** 부품(2303862c5)이 그린 그대로다(시험 환경의 CSS 모듈 이름 포함).
 */
const GOLDEN = {
  correct:
    '<div class="_effect_8ec844 _correct_8ec844" role="status" aria-live="polite" aria-atomic="true" data-answer-feedback="correct"><div class="_content_8ec844"><div class="_emblem_8ec844" aria-hidden="true"><span class="_ring_8ec844"></span><span class="_ring_8ec844 _secondRing_8ec844"></span><span class="_sparks_8ec844"><i class="_spark_8ec844" style="--angle:0deg;--delay:0ms"></i><i class="_spark_8ec844" style="--angle:45deg;--delay:50ms"></i><i class="_spark_8ec844" style="--angle:90deg;--delay:0ms"></i><i class="_spark_8ec844" style="--angle:135deg;--delay:50ms"></i><i class="_spark_8ec844" style="--angle:180deg;--delay:0ms"></i><i class="_spark_8ec844" style="--angle:225deg;--delay:50ms"></i><i class="_spark_8ec844" style="--angle:270deg;--delay:0ms"></i><i class="_spark_8ec844" style="--angle:315deg;--delay:50ms"></i></span><span class="_medallion_8ec844"><svg viewBox="0 0 64 64" fill="none" focusable="false"><path class="_mark_8ec844" pathLength="1" d="m17 32 10 10 21-23"></path></svg></span></div><p class="_message_8ec844">정확하게 풀었어요</p></div></div>',
  incorrect:
    '<div class="_effect_8ec844 _incorrect_8ec844" role="status" aria-live="polite" aria-atomic="true" data-answer-feedback="incorrect"><div class="_content_8ec844"><div class="_emblem_8ec844" aria-hidden="true"><span class="_ring_8ec844"></span><span class="_ring_8ec844 _secondRing_8ec844"></span><span class="_medallion_8ec844"><svg viewBox="0 0 64 64" fill="none" focusable="false"><path class="_mark_8ec844" pathLength="1" d="m22 22 20 20"></path><path class="_mark_8ec844 _secondStroke_8ec844" pathLength="1" d="M42 22 22 42"></path></svg></span></div><p class="_message_8ec844">다시 풀 문제로 모았어요</p></div></div>',
  correctMessage:
    '<div class="_effect_8ec844 _correct_8ec844" role="status" aria-live="polite" aria-atomic="true" data-answer-feedback="correct"><div class="_content_8ec844"><div class="_emblem_8ec844" aria-hidden="true"><span class="_ring_8ec844"></span><span class="_ring_8ec844 _secondRing_8ec844"></span><span class="_sparks_8ec844"><i class="_spark_8ec844" style="--angle:0deg;--delay:0ms"></i><i class="_spark_8ec844" style="--angle:45deg;--delay:50ms"></i><i class="_spark_8ec844" style="--angle:90deg;--delay:0ms"></i><i class="_spark_8ec844" style="--angle:135deg;--delay:50ms"></i><i class="_spark_8ec844" style="--angle:180deg;--delay:0ms"></i><i class="_spark_8ec844" style="--angle:225deg;--delay:50ms"></i><i class="_spark_8ec844" style="--angle:270deg;--delay:0ms"></i><i class="_spark_8ec844" style="--angle:315deg;--delay:50ms"></i></span><span class="_medallion_8ec844"><svg viewBox="0 0 64 64" fill="none" focusable="false"><path class="_mark_8ec844" pathLength="1" d="m17 32 10 10 21-23"></path></svg></span></div><p class="_message_8ec844">뜻을 찾았어요</p></div></div>',
  incorrectMessage:
    '<div class="_effect_8ec844 _incorrect_8ec844" role="status" aria-live="polite" aria-atomic="true" data-answer-feedback="incorrect"><div class="_content_8ec844"><div class="_emblem_8ec844" aria-hidden="true"><span class="_ring_8ec844"></span><span class="_ring_8ec844 _secondRing_8ec844"></span><span class="_medallion_8ec844"><svg viewBox="0 0 64 64" fill="none" focusable="false"><path class="_mark_8ec844" pathLength="1" d="m22 22 20 20"></path><path class="_mark_8ec844 _secondStroke_8ec844" pathLength="1" d="M42 22 22 42"></path></svg></span></div><p class="_message_8ec844">다시 볼게요</p></div></div>',
};
const html = (el: React.ReactElement) => renderToStaticMarkup(el);
/** 알약(<p>)과 콤보 표지(data-streak)만 빼고 견준다 — 콤보는 알약 안만 바꾼다 */
const withoutMessage = (s: string) =>
  s
    .replace(/<p class="[^"]*">[\s\S]*?<\/p>/, "<p/>")
    .replace(/ data-streak="\d+"/, "");

describe("정답 연출 — 콤보가 없을 때는 지금 그대로", () => {
  it("정답 · 오답 · 문구를 넘긴 정답/오답 · 없음이 전과 한 글자도 같다", () => {
    expect(html(<AnswerFeedbackEffect correct eventKey="k" />)).toBe(
      GOLDEN.correct,
    );
    expect(html(<AnswerFeedbackEffect correct={false} eventKey="k" />)).toBe(
      GOLDEN.incorrect,
    );
    expect(
      html(
        <AnswerFeedbackEffect correct eventKey="k" message="뜻을 찾았어요" />,
      ),
    ).toBe(GOLDEN.correctMessage);
    expect(
      html(
        <AnswerFeedbackEffect
          correct={false}
          eventKey="k"
          message="다시 볼게요"
        />,
      ),
    ).toBe(GOLDEN.incorrectMessage);
    expect(html(<AnswerFeedbackEffect correct={null} eventKey="k" />)).toBe("");
  });

  it("콤보 값이 없음(null · undefined)이면 지금 그대로", () => {
    expect(
      html(<AnswerFeedbackEffect correct eventKey="k" streak={null} />),
    ).toBe(GOLDEN.correct);
    expect(
      html(<AnswerFeedbackEffect correct eventKey="k" streak={undefined} />),
    ).toBe(GOLDEN.correct);
  });

  it("오답에 콤보 값이 와도 오답 연출은 그대로", () => {
    expect(
      html(<AnswerFeedbackEffect correct={false} eventKey="k" streak={6} />),
    ).toBe(GOLDEN.incorrect);
  });
});

describe("정답 연출 — 콤보(05 §8.15 «숫자 강조 한 줄»)", () => {
  it("알약 안 말만 «N문제 연속 정답» — 숫자는 따로 감싸고, 나머지 연출은 지금과 같다", () => {
    const combo = html(
      <AnswerFeedbackEffect correct eventKey="k" streak={6} />,
    );
    expect(withoutMessage(combo)).toBe(withoutMessage(GOLDEN.correct));
    render(<AnswerFeedbackEffect correct eventKey="k" streak={6} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/^6문제 연속 정답$/);
    expect(status).toHaveAttribute("data-answer-feedback", "correct");
    expect(status).toHaveAttribute("data-streak", "6");
    expect(status.querySelector("p b")).toHaveTextContent(/^6$/);
    expect(status.textContent).not.toContain("!");
    expect(status.textContent).not.toContain("정확하게 풀었어요");
  });

  it("두 자리(10 · 12)도 같은 모양 — 12연속도 같은 문장", () => {
    render(<AnswerFeedbackEffect correct eventKey="k" streak={12} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^12문제 연속 정답$/);
  });

  it("콤보가 있으면 넘긴 문구보다 콤보가 앞선다", () => {
    render(
      <AnswerFeedbackEffect
        correct
        eventKey="k"
        streak={3}
        message="정확하게 풀었어요"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/^3문제 연속 정답$/);
  });
});
