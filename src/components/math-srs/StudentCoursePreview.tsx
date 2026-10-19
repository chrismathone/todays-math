"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  checkPreviewAnswer,
  previewFigureSvg,
  previewMeaning,
  type PreviewCard,
} from "@/lib/math-srs/preview";
import type { JourneyThemeId } from "@/lib/math-explorers/journeyThemes";
import { ExplorerMath } from "@/components/math-explorers/ExplorerMath";
import { BackButton } from "@/components/ui/BackLink";
import { EnterKey } from "./AnswerKeyCaps";
import { StudyBook } from "./StudyBook";
import s from "./course-preview.module.css";

/** Local practice only: preview answers never become course attempts. */
export default function StudentCoursePreview({
  card,
  journeyTheme,
  busy,
  onStart,
  onExit,
}: {
  card: PreviewCard;
  journeyTheme?: JourneyThemeId;
  busy: boolean;
  onStart: () => void;
  onExit: () => void;
}) {
  const id = useId();
  const scroll = useRef<HTMLDivElement>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  function check(event: FormEvent) {
    event.preventDefault();
    if (!busy) setResult(checkPreviewAnswer(card, answer));
  }
  return (
    <div className={s.preview}>
      <header className={s.header}>
        <BackButton type="button" onClick={onExit} disabled={busy}>
          학습 홈
        </BackButton>
        <span>배우기</span>
      </header>
      <div ref={scroll} className={s.scroll}>
        <StudyBook
          theme={journeyTheme}
          leftTitle="뜻과 그림"
          rightTitle="예와 연습"
          onPageChange={() =>
            scroll.current?.scrollTo?.({ top: 0, behavior: "instant" })
          }
          left={
            <div className={s.meaning}>
              <span className={s.tag}>이 소단원의 첫 배움</span>
              <h1>{card.title}</h1>
              <div className={s.definition}>
                <ExplorerMath text={previewMeaning(card)} />
              </div>
              {card.note ? (
                <div className={s.note}>
                  <ExplorerMath text={card.note} />
                </div>
              ) : null}
              <figure className={s.figure}>
                {/* Authored SVG from the preview engine; preserve its coordinates and markup. */}
                <div
                  data-preview-figure
                  dangerouslySetInnerHTML={{ __html: previewFigureSvg(card) }}
                />
                <figcaption>
                  <ExplorerMath text={card.figureCaption} />
                </figcaption>
              </figure>
            </div>
          }
          right={
            <div className={s.examples}>
              <section aria-labelledby={`${id}-worked`}>
                <h3 id={`${id}-worked`}>함께 풀어 봐요</h3>
                <ol className={s.worked}>
                  {card.worked.map((example, index) => (
                    <li key={index}>
                      <div className={s.prompt}>
                        <ExplorerMath text={example.prompt} />
                      </div>
                      <div className={s.steps}>
                        {example.steps.map((step, stepIndex) => (
                          <div key={stepIndex}>
                            <ExplorerMath text={step} />
                          </div>
                        ))}
                      </div>
                      <div className={s.answer}>
                        정답 <ExplorerMath text={example.answer} />
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section
                className={s.practice}
                aria-labelledby={`${id}-practice`}
              >
                <h3 id={`${id}-practice`}>따라 풀어 봐요</h3>
                <form onSubmit={check}>
                  <label htmlFor={`${id}-answer`}>{card.practice.prompt}</label>
                  <div className={s.inputRow}>
                    <input
                      id={`${id}-answer`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={answer}
                      disabled={busy}
                      aria-describedby={`${id}-feedback`}
                      onChange={(event) => {
                        setAnswer(event.target.value);
                        setResult(null);
                      }}
                    />
                    {card.practice.unit ? (
                      <span>{card.practice.unit}</span>
                    ) : null}
                    <button
                      type="submit"
                      className={s.check}
                      aria-keyshortcuts="Enter"
                      disabled={busy}
                    >
                      확인 <EnterKey />
                    </button>
                  </div>
                </form>
                <div
                  id={`${id}-feedback`}
                  role="status"
                  className={s.feedback}
                  data-correct={result === true ? "true" : undefined}
                >
                  {result === true ? (
                    <>
                      <strong>맞았어요</strong>
                      <ExplorerMath text={card.practice.explanation} />
                    </>
                  ) : result === false ? (
                    <ExplorerMath text={card.practice.hint} />
                  ) : null}
                </div>
              </section>
              <button
                type="button"
                className={s.start}
                onClick={onStart}
                disabled={busy}
              >
                문제 풀기
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
