"use client";

import { useState } from "react";
import { BackButton } from "@/components/ui/BackLink";
import learn from "@/components/learn/learn.module.css";
import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import AnswerFeedbackEffect from "@/components/math-srs/AnswerFeedbackEffect";
import s from "@/components/math-srs/authenticated.module.css";
import pageTurn from "@/components/math-srs/question-page-turn.module.css";
import review from "@/components/math-srs/student-review-home.module.css";
import type { QuickItem } from "@/lib/math-srs/quick/types";

/**
 * 학생 폰 «오늘의 복습» 한 문제 화면을 **그 클래스 그대로** 그린다 — 원장님 시안용.
 *
 * 틀은 `StudentMathSrs` 의 연습 화면(`practiceViewport` · `practiceHeader` · `progress` ·
 * `Question`)을 옮긴 것이다(46082ccaf 기준). 그 파일은 트랙 B2 가 고치므로 여기서는
 * 고치지 않고 같은 CSS 모듈·같은 렌더러(`ProblemContent practiceLayout`·`MathText`)를 쓴다.
 * 보기를 누르면 이 자리에서만 맞음·틀림을 보인다(서버에 아무것도 보내지 않는다).
 */
export function QuickQuestionCard({
  item,
  conceptTitle,
  interactive = true,
}: {
  item: QuickItem;
  conceptTitle: string;
  interactive?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const correct = selected === null ? null : selected === item.answerIndex;
  return (
    <section
      className={`${s.card} ${s.questionCard} ${s.fixedQuestion}`}
      aria-label="현재 문제"
      data-quick-card={item.templateId}
    >
      <div
        className={`${s.problemScroll} ${pageTurn.page}`}
        data-page-turn="true"
      >
        <p className={s.eyebrow}>{conceptTitle}</p>
        <div className={s.question} data-quick-prompt="true">
          <ProblemContent content={item.prompt} practiceLayout />
          {/* 학생 화면(`StudentMathSrs` Question)의 식 칸과 같은 렌더러·같은 클래스 */}
          {item.equation ? (
            <div data-quick-equation="true">
              <MathText text={item.equation} as="div" className={s.equation} />
            </div>
          ) : null}
        </div>
      </div>
      <div className={s.answerDock}>
        <div className={s.answerDockHeading}>
          <span>답을 하나 골라 주세요</span>
          <button
            type="button"
            className={s.skipAnswer}
            disabled={!interactive || selected !== null}
            onClick={() => setSelected(-1)}
          >
            아직 모르겠어요
          </button>
        </div>
        <div className={s.answerChoices} role="group" aria-label="답 고르기">
          {item.choices.map((choice, index) => (
            <button
              key={choice}
              type="button"
              disabled={!interactive || selected !== null}
              aria-pressed={selected === index}
              data-quick-choice={index}
              data-result={
                selected === index
                  ? correct
                    ? "correct"
                    : "incorrect"
                  : selected !== null && index === item.answerIndex
                    ? "correct"
                    : undefined
              }
              onClick={() => setSelected(index)}
            >
              <span className={s.choiceNumber} aria-hidden="true">
                {index + 1}
              </span>
              <MathText text={choice} />
            </button>
          ))}
        </div>
      </div>
      <AnswerFeedbackEffect
        correct={correct}
        eventKey={`${item.templateId}:${selected}`}
      />
    </section>
  );
}

/** 폰 한 화면 — 윗줄 · 학습 홈 줄 · 진행 막대 · 문제 카드 */
export function QuickPhone({
  item,
  conceptTitle,
  step,
}: {
  item: QuickItem;
  conceptTitle: string;
  step: number;
}) {
  return (
    <div
      className={`${s.student} ${s.practiceViewport}`}
      data-student-practice="true"
    >
      {/* `LearnTopBar` 와 같은 틀 — 나가기가 로그아웃 API 를 부르지 않게 글자만 둔다 */}
      <header className={learn.top}>
        <b>오늘 수학</b>
        <span className={learn.who}>
          <span>미리보기</span>
        </span>
      </header>
      <main className={`${s.body} ${s.practiceBody}`}>
        <h1 className={review.srOnly}>오늘 수학 복습</h1>
        <div className={s.practiceHeader}>
          <BackButton disabled>학습 홈</BackButton>
          <span>중1 · 일차방정식</span>
        </div>
        <div className={s.progress}>
          <span>오늘의 복습</span>
          <progress aria-label="미션 진행" value={step - 1} max={12} />
          <span>{step}/12</span>
        </div>
        <QuickQuestionCard item={item} conceptTitle={conceptTitle} />
      </main>
    </div>
  );
}
