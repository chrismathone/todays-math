"use client";

import { useRef, useState, type ReactNode } from "react";
import type {
  ExplorerAction,
  ExplorerActivity,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";
import AnswerFeedbackEffect from "@/components/math-srs/AnswerFeedbackEffect";
import { EnterKey, NumberKey } from "@/components/math-srs/AnswerKeyCaps";
import pageTurn from "@/components/math-srs/question-page-turn.module.css";
import { answerKey, useAnswerKeys } from "@/components/math-srs/useAnswerKeys";
import {
  ConceptKindTag,
  ConceptNameRow,
  conceptHead as c,
  conceptHeadingLabel,
} from "./ExplorerConceptHead";
import { ExplorerChoiceText, ExplorerMath } from "./ExplorerMath";
import s from "./math-explorers.module.css";

const activityNames = {
  read: "뜻 만나기",
  // 갈래(정의 · 성질 · 공식 · 방법 …)와 상관없이 하나로(원장님 2026-09-28, D-143 ②) — 갈래는 이름 옆 딱지가 말한다.
  assemble: "문장 조립",
  examples: "예 모으기",
  truth: "경계 살피기",
};

/**
 * 풀이 틀이 세션에서 쓰는 것 — 제목 · 진행 · 바퀴. 본 카드 세션과 보충 카드 한 장(D-147)이 같은 틀을 쓴다.
 */
export type PracticeSession = Pick<
  NonNullable<ExplorerState["session"]>,
  "title" | "index" | "total" | "round" | "reviewOnly"
>;

export default function ExplorerPractice({
  activity,
  session,
  progressLabel,
  units,
  busy,
  correct,
  eventKey,
  onAction,
  onHome,
}: {
  activity: ExplorerActivity;
  session: PracticeSession;
  /** 진행 줄 왼쪽 이름 — 없으면 «오늘의 개념 탐험»(보충 카드는 «교재에 한 장 더»). */
  progressLabel?: string;
  /** 뜻 만나기 머리의 «중2 · 단원» — 학년은 단원 목록에서 찾는다. */
  units?: ExplorerState["units"];
  busy: boolean;
  correct: boolean | null;
  eventKey: string;
  onAction: (action: ExplorerAction) => void;
  onHome: () => void;
}) {
  const grade = units?.find((unit) => unit.id === activity.unitId)?.grade;
  return (
    <ExplorerPracticeFrame
      session={session}
      progressLabel={progressLabel}
      busy={busy}
      correct={correct}
      eventKey={eventKey}
      onHome={onHome}
    >
      <Activity
        key={`${activity.questionId}:${activity.kind}`}
        activity={activity}
        gradeLabel={
          grade === undefined
            ? null
            : grade < 7
              ? `초${grade}`
              : `중${grade - 6}`
        }
        busy={busy}
        correct={correct}
        onAction={onAction}
      />
    </ExplorerPracticeFrame>
  );
}

export function ExplorerPracticeFrame({
  session,
  progressLabel,
  busy,
  correct,
  eventKey,
  onHome,
  children,
  feedbackMessage,
}: {
  session: PracticeSession;
  progressLabel?: string;
  busy: boolean;
  correct: boolean | null;
  eventKey: string;
  onHome: () => void;
  children: ReactNode;
  feedbackMessage?: string;
}) {
  // 보기 번호 키 · 엔터(`useAnswerKeys`) — 연습과 작업실이 같은 틀이라 한 곳에서 듣는다.
  const frame = useRef<HTMLElement>(null);
  useAnswerKeys(frame);
  return (
    <>
      <div className={s.practiceToolbar}>
        <button type="button" disabled={busy} onClick={onHome}>
          ← 진도판
        </button>
        <span>
          {session.reviewOnly ? (
            "지난 학습 다시 풀기"
          ) : (
            <ExplorerMath text={session.title} />
          )}
        </span>
      </div>
      <div className={s.practiceProgress}>
        <div>
          <strong>
            {session.round
              ? `오답 복습 ${session.round}회`
              : (progressLabel ?? "오늘의 개념 탐험")}
          </strong>
          <span>
            {Math.min(session.index + 1, session.total)} / {session.total}
          </span>
        </div>
        <progress
          value={session.index}
          max={session.total}
          aria-label="이번 학습 진행률"
        />
      </div>
      <section
        ref={frame}
        className={s.practiceFrame}
        aria-label="개념 문제와 답 고르기"
      >
        {children}
        <AnswerFeedbackEffect
          correct={correct}
          eventKey={eventKey}
          message={feedbackMessage}
        />
      </section>
    </>
  );
}

function Activity({
  activity,
  gradeLabel,
  busy,
  correct,
  onAction,
}: {
  activity: ExplorerActivity;
  gradeLabel: string | null;
  busy: boolean;
  correct: boolean | null;
  onAction: (action: ExplorerAction) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  // «선택됨» 움직임 표지(05 §8.16) — 누르거나 푼 **순간에만** 붙는다. 처음 그릴 때 · 채점 뒤 다시 그릴 때는 없거나 그대로라
  // 차오름·빠짐이 다시 돌지 않는다.
  const [motion, setMotion] = useState<Record<number, "in" | "out">>({});
  const move = (id: number, value: "in" | "out") =>
    setMotion((current) => ({ ...current, [id]: value }));
  const disabled = busy || correct !== null;
  const isReading = activity.kind === "read";
  const submit = (choiceIds: number[]) =>
    onAction({ type: "answer", questionId: activity.questionId, choiceIds });
  function choose(id: number) {
    if (disabled) return;
    if (activity.kind === "truth") {
      setSelected([id]);
      move(id, "in");
      submit([id]);
      return;
    }
    if (activity.kind === "assemble") {
      if (selected.includes(id)) return;
      const next = [...selected, id];
      if (next.length > 2) return;
      setSelected(next);
      move(id, "in");
      return;
    }
    const picking = !selected.includes(id);
    move(id, picking ? "in" : "out");
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <>
      <div
        className={`${s.problemPane} ${pageTurn.page}`}
        data-page-turn="true"
        tabIndex={0}
        aria-label="문제 내용"
      >
        {/* 머리 — 무엇의 문장인가(원장님 2026-09-28 Hi-fi 4안, 05 §8.19 · D-143): 이름 + 갈래 딱지.
            정의 조립은 조작 안내 제목 · 겹친 안내 줄을 빼 이름(제목 크기) 바로 아래 문장이 온다 — 안내는 아래 칸 한 줄.
            뜻 만나기는 «개념 카드»(학년 · 단원 / 이름 + 딱지 / 뜻). 예 모으기 · 경계 살피기는 이름 줄 + 카드 문장 제목. */}
        {activity.kind === "assemble" ? (
          <ConceptNameRow
            cardId={activity.cardId}
            name={activity.cardName}
            side={activityNames.assemble}
            title
          />
        ) : isReading ? (
          <>
            <div className={s.activityMeta}>
              <span className={c.metaMuted}>
                {gradeLabel ? `${gradeLabel} · ` : null}
                <ExplorerMath text={activity.unitTitle} />
              </span>
              <span>{activityNames.read}</span>
            </div>
            <h2
              className={s.questionTitle}
              aria-label={conceptHeadingLabel(
                activity.cardId,
                activity.cardName,
              )}
            >
              <span data-concept-name="">
                <ExplorerMath text={activity.cardName} />
              </span>
              <ConceptKindTag cardId={activity.cardId} large />
            </h2>
          </>
        ) : (
          <>
            <ConceptNameRow
              cardId={activity.cardId}
              name={activity.cardName}
              side={activityNames[activity.kind]}
            />
            <h2 className={s.questionTitle}>
              <ExplorerMath text={activity.prompt} />
            </h2>
          </>
        )}
        {isReading && activity.reading ? (
          <>
            <div className={s.readingDefinition} data-reading-definition="">
              <ExplorerMath text={activity.reading.definition} />
            </div>
            {/* `MathText` 는 div 를 내므로 p 가 아니라 div 에 담는다(모양은 클래스가 정한다). */}
            <div className={s.readingNote}>
              <ExplorerMath text={activity.reading.note} />
            </div>
            <p className={s.quietNote}>
              뜻을 읽고 나면 말 조각과 예를 골라 확인해요.
            </p>
          </>
        ) : activity.kind === "assemble" && activity.pieces ? (
          <>
            <div className={s.assemblySentence} data-assembly-sentence="">
              {activity.pieces.map((piece, index) => (
                <span key={index}>
                  <ExplorerMath text={piece} />
                  {index < 2 ? (
                    <button
                      type="button"
                      className={s.wordSlot}
                      data-answer-control=""
                      data-filled={
                        selected[index] !== undefined ? "true" : undefined
                      }
                      disabled={disabled || selected[index] === undefined}
                      onClick={() => {
                        move(selected[index]!, "out");
                        setSelected((current) =>
                          current.filter((_, i) => i !== index),
                        );
                      }}
                      aria-label={`빈칸 ${index + 1}${selected[index] !== undefined ? `, ${activity.choices.find((choice) => choice.id === selected[index])?.label}` : ""}`}
                    >
                      {selected[index] !== undefined ? (
                        <ExplorerMath
                          text={
                            activity.choices.find(
                              (choice) => choice.id === selected[index],
                            )?.label ?? ""
                          }
                        />
                      ) : (
                        `${index + 1}`
                      )}
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className={s.instruction}>
            {activity.kind === "examples"
              ? "해당하는 예를 모두 고른 뒤 확인해 주세요."
              : "하나를 고르면 바로 확인해요."}
          </p>
        )}
      </div>
      {/* 뜻 만나기는 단추 하나뿐이라 답 칸 높이를 비운다(4안) — 좁은 폰에서도 뜻 상자가 보이게. */}
      <div
        className={isReading ? `${s.answerDock} ${c.dockSlim}` : s.answerDock}
        data-explorer-dock="true"
        data-dock-size={isReading ? "slim" : undefined}
      >
        {isReading ? (
          <button
            type="button"
            className={s.primary}
            disabled={disabled}
            onClick={() =>
              onAction({ type: "read", questionId: activity.questionId })
            }
          >
            뜻을 가리고 도전하기 <span aria-hidden="true">→</span>
          </button>
        ) : (
          <>
            <div className={s.answerInstruction}>
              <span>
                {activity.kind === "assemble"
                  ? `말 조각 두 개를 순서대로 · ${Math.min(selected.length, 2)} / 2`
                  : activity.kind === "examples"
                    ? "해당하는 예 모두 선택"
                    : "답을 하나 골라 주세요"}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => submit([])}
              >
                아직 모르겠어요
              </button>
            </div>
            <div
              className={s.answers}
              data-kind={activity.kind}
              role="group"
              aria-label="답 고르기"
            >
              {activity.choices.map((choice, index) => (
                <button
                  type="button"
                  key={choice.id}
                  aria-label={`${index + 1} ${choice.label}`}
                  aria-keyshortcuts={answerKey(index)}
                  aria-pressed={selected.includes(choice.id)}
                  data-answer-control=""
                  disabled={
                    disabled ||
                    (activity.kind === "assemble" &&
                      selected.includes(choice.id))
                  }
                  data-answer-state={
                    selected.includes(choice.id) && correct !== null
                      ? correct
                        ? "correct"
                        : "incorrect"
                      : undefined
                  }
                  data-anim={motion[choice.id]}
                  onClick={() => choose(choice.id)}
                >
                  <NumberKey index={index} className={s.answerNumber} />
                  <ExplorerChoiceText
                    className={s.answerText}
                    text={choice.label}
                  />
                </button>
              ))}
            </div>
            <div className={s.answerControls}>
              {activity.kind === "examples" || activity.kind === "assemble" ? (
                <button
                  type="button"
                  className={s.confirm}
                  aria-keyshortcuts="Enter"
                  disabled={
                    disabled ||
                    (activity.kind === "assemble"
                      ? selected.length !== 2
                      : selected.length === 0)
                  }
                  onClick={() => submit(selected)}
                >
                  {activity.kind === "assemble"
                    ? "완성한 문장 확인하기"
                    : "선택한 예 확인하기"}
                  <EnterKey />
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  );
}
