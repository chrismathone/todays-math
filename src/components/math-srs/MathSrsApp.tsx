"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import TodayMathMark from "@/components/brand/TodayMathMark";
import {
  CONCEPTS,
  checkAnswer,
  TEMPLATE_COUNT,
} from "@/lib/math-srs/generator";
import { dueConcepts, retention } from "@/lib/math-srs/memory";
import {
  createMission,
  localDateKey,
  recordAttempt,
  suggestedRating,
} from "@/lib/math-srs/mission";
import {
  addLearner,
  selectLearner,
  updateLearner,
} from "@/lib/math-srs/storage";
import type {
  Attempt,
  ConceptMemory,
  GeneratedProblem,
  Learner,
  Mission,
  MissionKind,
  Rating,
} from "@/lib/math-srs/types";
import { useSrsStore } from "./useSrsStore";
import { clearDraft, readDraft, writeDraft } from "@/lib/math-srs/draft";
import s from "./math-srs.module.css";

const KINDS: Record<
  MissionKind,
  { title: string; mark: string; description: string }
> = {
  warmup: {
    title: "가볍게 시작",
    mark: "01",
    description: "아는 것부터, 천천히 감을 깨워요.",
  },
  quick: {
    title: "짧은 한 문제",
    mark: "⚡",
    description: "속도보다 정확하게. 익숙한 생각을 꺼내 봐요.",
  },
  memory: {
    title: "기억 꺼내기",
    mark: "↺",
    description: "이 개념을 얼마나 알고 있는지 확인해 봐요.",
  },
  training: {
    title: "실력 쌓기",
    mark: "+",
    description: "한 단계씩 식을 정리해 보세요.",
  },
  revenge: {
    title: "다시 도전",
    mark: "↗",
    description: "틀렸던 개념, 새로운 숫자로 다시 도전해요.",
  },
  boss: {
    title: "마지막 도전",
    mark: "★",
    description: "조금 더 어려운 계산에 도전해 보세요.",
  },
};
const RATINGS: Record<Rating, string> = {
  again: "다시 익히기",
  hard: "조금 더 연습",
  good: "스스로 해결",
  easy: "빠르고 정확하게",
};
const conceptTitle = (id: string) =>
  CONCEPTS.find((concept) => concept.id === id)?.title ?? id;

// Combine current performance with time decay; a recent wrong answer must not
// appear as 100% recall just because it was submitted a moment ago.
const estimatedRecall = (memory: ConceptMemory, now: Date) =>
  Math.round((memory.mastery * retention(memory, now)) / 100);

function summary(learner: Learner) {
  const attempts = learner.missions
    .flatMap((mission) => mission.attempts)
    .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
  return {
    attempts,
    correct: attempts.filter((attempt) => attempt.correct).length,
    completed: learner.missions.filter((mission) => mission.completedAt).length,
  };
}

function MemoryRows({ learner, now }: { learner: Learner; now: Date }) {
  return (
    <div className={s.memoryRows}>
      {CONCEPTS.map((concept) => {
        const memory = learner.memories.find(
          (item) => item.conceptId === concept.id,
        )!;
        const assessed = memory.attempts > 0;
        const recall = assessed ? estimatedRecall(memory, now) : 0;
        return (
          <div className={s.memoryRow} key={concept.id}>
            <div>
              <b>{concept.title}</b>
              <span>
                {assessed
                  ? `숙련도 ${Math.round(memory.mastery)} · ${memory.attempts}회 확인`
                  : "첫 미션에서 함께 알아봐요"}
              </span>
            </div>
            <div className={s.memoryMeter}>
              <div className={s.meter} aria-hidden="true">
                <i style={{ width: `${recall}%` }} />
              </div>
              <span>{assessed ? `${recall}%` : "측정 전"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestionCard({
  learnerId,
  problem,
  onSubmit,
  onExit,
}: {
  learnerId: string;
  problem: GeneratedProblem;
  onSubmit: (attempt: Attempt) => boolean;
  onExit: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [draft] = useState(() => readDraft(learnerId, problem.id));
  const [usedHint, setUsedHint] = useState(draft.usedHint);
  const [elapsed, setElapsed] = useState(draft.elapsedSeconds);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const time = useRef({
    activeMs: draft.elapsedSeconds * 1000,
    last: 0,
    usedHint: draft.usedHint,
  });
  const submitted = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    time.current.last = performance.now();
    function tick() {
      const now = performance.now();
      if (!document.hidden)
        time.current.activeMs += Math.max(
          0,
          Math.min(now - time.current.last, 2000),
        );
      time.current.last = now;
      setElapsed(Math.floor(time.current.activeMs / 1000));
    }
    function keepDraft() {
      if (submitted.current) return;
      writeDraft(learnerId, {
        problemId: problem.id,
        usedHint: time.current.usedHint,
        elapsedSeconds: Math.min(
          86400,
          Math.floor(time.current.activeMs / 1000),
        ),
      });
    }
    const timer = window.setInterval(tick, 500);
    const draftTimer = window.setInterval(keepDraft, 5000);
    document.addEventListener("visibilitychange", tick);
    document.addEventListener("visibilitychange", keepDraft);
    window.addEventListener("pagehide", keepDraft);
    return () => {
      keepDraft();
      window.clearInterval(timer);
      window.clearInterval(draftTimer);
      document.removeEventListener("visibilitychange", tick);
      document.removeEventListener("visibilitychange", keepDraft);
      window.removeEventListener("pagehide", keepDraft);
    };
  }, [learnerId, problem.id]);

  function submit(event?: FormEvent, skipped = false) {
    event?.preventDefault();
    if (submitted.current) return;
    if (!skipped && !answer.trim()) {
      setError("답을 입력하거나 ‘아직 모르겠어요’를 선택해 주세요.");
      input.current?.focus();
      return;
    }
    const normalized = answer
      .trim()
      .replace(/^x\s*=\s*/i, "")
      .replace(/−/g, "-");
    if (
      !skipped &&
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(
        normalized,
      )
    ) {
      setError("정수, 소수 또는 분수로 입력해 주세요. 예: -3, 0.5, 1/2");
      return;
    }
    if (
      !skipped &&
      normalized.includes("/") &&
      Number(normalized.split("/")[1]) === 0
    ) {
      setError("분모는 0이 될 수 없어요.");
      return;
    }
    submitted.current = true;
    setLocked(true);
    const seconds = Math.max(1, Math.round(time.current.activeMs / 1000));
    const correct = !skipped && checkAnswer(answer, problem.answer);
    const accepted = onSubmit({
      problemId: problem.id,
      conceptId: problem.conceptId,
      templateId: problem.templateId,
      kind: problem.kind,
      submittedAnswer: skipped ? "" : answer.trim(),
      correct,
      rating: suggestedRating(
        correct,
        usedHint,
        seconds,
        problem.expectedSeconds,
      ),
      usedHint,
      elapsedSeconds: seconds,
      answeredAt: new Date().toISOString(),
    });
    if (!accepted) {
      submitted.current = false;
      setLocked(false);
      setError(
        "기록 상태가 바뀌었습니다. 나의 학습으로 돌아가 다시 이어 주세요.",
      );
    } else clearDraft(learnerId);
  }
  const kind = KINDS[problem.kind];
  return (
    <section className={s.question} aria-labelledby="question-title">
      <div className={s.questionTop}>
        <span className={s.kind}>
          {kind.mark} {kind.title}
        </span>
        <span className={s.time}>
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}{" "}
          <small>풀이 중</small>
        </span>
      </div>
      <p className={s.muted}>{kind.description}</p>
      <div className={s.problemBody}>
        <p className={s.eyebrow}>
          {conceptTitle(problem.conceptId)} · 난이도 {problem.difficulty}
        </p>
        <h2 id="question-title">{problem.prompt}</h2>
        <div className={s.equation}>{problem.equation}</div>
      </div>
      <form onSubmit={submit} className={s.answerForm}>
        <label htmlFor="srs-answer">
          나의 답 {problem.answerUnit ? `(${problem.answerUnit})` : ""}
        </label>
        <div className={s.answerLine}>
          <span aria-hidden="true">x =</span>
          <input
            ref={input}
            id="srs-answer"
            autoComplete="off"
            type="text"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setError("");
            }}
            placeholder="답을 입력하세요"
            aria-describedby={error ? "answer-error" : "answer-help"}
            disabled={locked}
            maxLength={40}
          />
          <button className={s.primary} type="submit" disabled={locked}>
            정답 확인 →
          </button>
        </div>
        <p id="answer-help" className={s.small}>
          음수와 분수도 입력할 수 있어요. 예: -3, 1/2
        </p>
        {error ? (
          <p id="answer-error" className={s.error} role="alert">
            {error}
          </p>
        ) : null}
      </form>
      {usedHint ? (
        <aside className={s.hint}>
          <b>생각의 실마리</b>
          <p>{problem.hint}</p>
        </aside>
      ) : null}
      <div className={s.questionActions}>
        <button
          type="button"
          onClick={() => {
            time.current.usedHint = true;
            writeDraft(learnerId, {
              problemId: problem.id,
              usedHint: true,
              elapsedSeconds: Math.floor(time.current.activeMs / 1000),
            });
            setUsedHint(true);
          }}
          disabled={usedHint || locked}
          className={s.secondary}
        >
          {usedHint ? "힌트를 확인했어요" : "힌트 보기"}
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => submit(undefined, true)}
          className={s.textButton}
        >
          아직 모르겠어요
        </button>
        <button type="button" onClick={onExit} className={s.textButton}>
          잠시 쉬기
        </button>
      </div>
    </section>
  );
}

function Feedback({
  problem,
  attempt,
  onNext,
  last,
}: {
  problem: GeneratedProblem;
  attempt: Attempt;
  onNext: () => void;
  last: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className={s.question}>
      <div
        className={`${s.feedbackBanner} ${attempt.correct ? s.success : s.retry}`}
      >
        <span className={s.feedbackMark} aria-hidden="true">
          {attempt.correct ? "✓" : "↺"}
        </span>
        <div>
          <p className={s.eyebrow}>{RATINGS[attempt.rating]}</p>
          <h2 tabIndex={-1} ref={heading}>
            {attempt.correct
              ? "잘 꺼냈어요, 이 생각!"
              : "괜찮아요. 함께 다시 풀어봐요."}
          </h2>
          <p>
            {attempt.correct
              ? "오늘의 풀이를 기억 기록에 남겼어요."
              : "다음 미션에서 새 문제로 다시 만날 거예요."}
          </p>
        </div>
      </div>
      <div className={s.feedbackEquation}>{problem.equation}</div>
      <p className={s.answerResult}>
        정답{" "}
        <strong>
          x = {problem.answer}
          {problem.answerUnit ? ` ${problem.answerUnit}` : ""}
        </strong>
        <span>내 답: {attempt.submittedAnswer || "아직 모름"}</span>
      </p>
      <div className={s.solution}>
        <h3>이렇게 생각해요</h3>
        <ol>
          {problem.solution.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>
      <div className={s.feedbackFoot}>
        <span className={s.small}>
          {attempt.elapsedSeconds}초 ·{" "}
          {attempt.usedHint ? "힌트 사용" : "힌트 없이 도전"}
        </span>
        <button autoFocus type="button" className={s.primary} onClick={onNext}>
          {last ? "오늘의 결과 보기" : "다음 문제"} →
        </button>
      </div>
    </section>
  );
}

function Complete({
  mission,
  today,
  onHome,
}: {
  mission: Mission;
  today: string;
  onHome: () => void;
}) {
  const correct = mission.attempts.filter((attempt) => attempt.correct).length;
  const independent = mission.attempts.filter(
    (attempt) => attempt.correct && !attempt.usedHint,
  ).length;
  return (
    <section className={s.complete}>
      <div className={s.completeMark} aria-hidden="true">
        ✓
      </div>
      <p className={s.eyebrow}>TODAY, A LITTLE STRONGER</p>
      <h1>오늘의 기억을 쌓았어요.</h1>
      <p>완벽하지 않아도 좋아요. 다시 꺼낸 생각이 내일의 실력이 됩니다.</p>
      <div className={s.resultStats}>
        <div>
          <b>
            {correct}
            <small> / {mission.problems.length}</small>
          </b>
          <span>정답</span>
        </div>
        <div>
          <b>{independent}</b>
          <span>힌트 없이 해결</span>
        </div>
        <div>
          <b>
            {Math.round((correct / mission.problems.length) * 100)}
            <small>%</small>
          </b>
          <span>정확도</span>
        </div>
      </div>
      <p className={s.small}>
        다음 미션:{" "}
        {mission.date === today ? "내일" : "오늘 바로 시작할 수 있어요"} · 틀린
        개념은 다음 미션에 반영됩니다.
      </p>
      <button type="button" onClick={onHome} className={s.primary}>
        나의 기억 지도 보기 →
      </button>
    </section>
  );
}

function Teacher({
  learners,
  now,
  onSelect,
}: {
  learners: Learner[];
  now: Date;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div className={s.sectionHeading}>
        <div>
          <p className={s.eyebrow}>TEACHER VIEW</p>
          <h1>한눈에 보는 기억 지도</h1>
          <p className={s.muted}>
            이 브라우저에서 학습한 프로필의 개념별 복습 상태입니다.
          </p>
        </div>
        <span className={s.pill}>학습자 {learners.length}명</span>
      </div>
      <section className={s.panel}>
        <div className={s.panelHeading}>
          <h2>개념별 예상 기억률</h2>
          <span className={s.small}>
            측정 전 · 보강 필요 · 복습 필요 · 기억 유지
          </span>
        </div>
        <div className={s.tableScroll}>
          <table className={s.heatmap}>
            <caption className={s.srOnly}>
              학습자별 개념 기억률과 복습 필요 상태
            </caption>
            <thead>
              <tr>
                <th scope="col">학습자</th>
                {CONCEPTS.map((concept) => (
                  <th key={concept.id} scope="col">
                    {concept.title}
                  </th>
                ))}
                <th scope="col">완료 미션</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => (
                <tr key={learner.id}>
                  <th scope="row">
                    <button
                      type="button"
                      className={s.textButton}
                      onClick={() => onSelect(learner.id)}
                    >
                      {learner.name} ↗
                    </button>
                  </th>
                  {CONCEPTS.map((concept) => {
                    const memory = learner.memories.find(
                      (item) => item.conceptId === concept.id,
                    )!;
                    const value = estimatedRecall(memory, now);
                    const due =
                      memory.attempts > 0 &&
                      memory.nextReviewAt !== null &&
                      new Date(memory.nextReviewAt) <= now;
                    return (
                      <td key={concept.id}>
                        <span
                          className={`${s.heatCell} ${memory.attempts === 0 ? s.unassessed : due || value < 70 ? s.needsReview : s.remembered}`}
                        >
                          {memory.attempts > 0 ? `${value}%` : "—"}
                          <small>
                            {memory.attempts === 0
                              ? "측정 전"
                              : due
                                ? "복습 필요"
                                : value < 70
                                  ? "보강 필요"
                                  : "기억 유지"}
                          </small>
                        </span>
                      </td>
                    );
                  })}
                  <td>{summary(learner).completed}회</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className={s.teacherGrid}>
        {learners.map((learner) => {
          const result = summary(learner);
          const recent = result.attempts.slice(-5).reverse();
          const due = dueConcepts(learner.memories, now).filter(
            (memory) =>
              memory.attempts > 0 &&
              memory.nextReviewAt !== null &&
              new Date(memory.nextReviewAt) <= now,
          );
          return (
            <section className={s.panel} key={learner.id}>
              <div className={s.panelHeading}>
                <h2>{learner.name}</h2>
                <span className={s.small}>
                  {result.attempts.length}문제 풀이
                </span>
              </div>
              <p className={s.muted}>
                {due.length
                  ? `복습할 개념: ${due.map((memory) => conceptTitle(memory.conceptId)).join(", ")}`
                  : result.attempts.length
                    ? "개념별 기억률과 최근 풀이를 함께 확인해 주세요."
                    : "아직 풀이 기록이 없습니다. 첫 미션을 시작해 보세요."}
              </p>
              <div className={s.recentList}>
                {recent.map((attempt, index) => (
                  <div key={`${attempt.problemId}-${index}`}>
                    <span>
                      {attempt.correct ? "✓" : "↺"}{" "}
                      {conceptTitle(attempt.conceptId)}
                    </span>
                    <span>
                      {RATINGS[attempt.rating]} · {attempt.elapsedSeconds}초
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className={s.notice}>
        기억률과 숙련도는 풀이 기록으로 계산한 초기 추정값입니다. 실제 성취도
        평가를 대신하지 않으며, 교사용 현황은 이 기기의 기록만 보여줍니다.
      </p>
    </>
  );
}

export default function MathSrsApp() {
  const { store, ready, warning, persist } = useSrsStore();
  const [view, setView] = useState<"home" | "mission" | "teacher">("home");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    null,
  );
  const [now, setNow] = useState(() => new Date());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [feedback, setFeedback] = useState<{
    learnerId: string;
    missionId: string;
    problem: GeneratedProblem;
    attempt: Attempt;
  } | null>(null);
  const learner =
    store.learners.find((item) => item.id === store.activeLearnerId) ??
    store.learners[0];
  const today = localDateKey(now);
  const currentMission =
    learner.missions.find((item) => !item.completedAt) ??
    learner.missions.find((item) => item.date === today);
  const mission =
    view === "mission"
      ? (learner.missions.find((item) => item.id === selectedMissionId) ??
        currentMission)
      : currentMission;
  const stats = summary(learner);
  const assessed = learner.memories.filter((memory) => memory.attempts > 0);
  const recall = assessed.length
    ? Math.round(
        assessed.reduce(
          (sum, memory) => sum + estimatedRecall(memory, now),
          0,
        ) / assessed.length,
      )
    : null;
  const due = dueConcepts(learner.memories, now).filter(
    (memory) =>
      memory.attempts > 0 &&
      memory.nextReviewAt !== null &&
      new Date(memory.nextReviewAt) <= now,
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseLearner(id: string) {
    if (persist((current) => selectLearner(current, id))) {
      setFeedback(null);
      setSelectedMissionId(null);
      setView("home");
    }
  }
  function createLearner(event: FormEvent) {
    event.preventDefault();
    try {
      addLearner(store, name);
      if (persist((current) => addLearner(current, name))) {
        setName("");
        setAdding(false);
        setNameError("");
        setFeedback(null);
        setView("home");
      }
    } catch (error) {
      setNameError(
        error instanceof Error ? error.message : "이름을 확인해 주세요.",
      );
    }
  }
  function start() {
    const date = new Date();
    setNow(date);
    const success = persist((current) => {
      const active = current.learners.find((item) => item.id === learner.id)!;
      const existing =
        active.missions.find((item) => !item.completedAt) ??
        active.missions.find((item) => item.date === localDateKey(date));
      if (existing) {
        setSelectedMissionId(existing.id);
        return current;
      }
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const created = createMission(active, date, seed);
      setSelectedMissionId(created.id);
      return updateLearner(current, {
        ...active,
        missions: [...active.missions, created],
      });
    });
    if (success) {
      setFeedback(null);
      setView("mission");
    }
  }
  function answer(attempt: Attempt, problem: GeneratedProblem) {
    if (!mission) return false;
    const saved = persist((current) => {
      const active = current.learners.find((item) => item.id === learner.id)!;
      return updateLearner(current, recordAttempt(active, mission.id, attempt));
    });
    if (saved)
      setFeedback({
        learnerId: learner.id,
        missionId: mission.id,
        problem,
        attempt,
      });
    return saved;
  }
  const visibleFeedback =
    feedback?.learnerId === learner.id && feedback.missionId === mission?.id
      ? feedback
      : null;
  const problem = mission?.problems[mission.attempts.length];

  return (
    <div className={s.page}>
      <a href="#srs-main" className={s.skip}>
        본문으로 건너뛰기
      </a>
      <header className={s.header}>
        <Link href="/lab" className={s.brand}>
          <TodayMathMark size={28} />
          <span>
            오늘의수학 <b>기억</b>
          </span>
        </Link>
        <nav aria-label="기억 학습 메뉴">
          <button
            type="button"
            aria-current={view !== "teacher" ? "page" : undefined}
            onClick={() => setView("home")}
          >
            나의 학습
          </button>
          <button
            type="button"
            aria-current={view === "teacher" ? "page" : undefined}
            onClick={() => setView("teacher")}
          >
            교사용 현황
          </button>
        </nav>
        <span className={s.version}>중1 · 일차방정식</span>
      </header>
      <main id="srs-main" className={s.main}>
        <div className={s.profileBar}>
          <span className={s.localBadge}>
            <i /> 브라우저에 저장되는 체험판
          </span>
          <div className={s.profileControls}>
            <label htmlFor="srs-learner">학습자</label>
            <select
              disabled={!ready}
              id="srs-learner"
              value={learner.id}
              onChange={(event) => chooseLearner(event.target.value)}
            >
              {store.learners.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={s.textButton}
              disabled={!ready || store.learners.length >= 12}
              aria-expanded={adding}
              onClick={() => setAdding(!adding)}
            >
              + 추가
            </button>
          </div>
        </div>
        {adding ? (
          <form onSubmit={createLearner} className={s.addForm}>
            <label htmlFor="new-learner">학습자 이름</label>
            <input
              autoFocus
              id="new-learner"
              maxLength={20}
              placeholder="이름 또는 별명"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button className={s.primary} type="submit">
              추가하기
            </button>
            <button
              type="button"
              className={s.textButton}
              onClick={() => setAdding(false)}
            >
              취소
            </button>
            {nameError ? (
              <p className={s.error} role="alert">
                {nameError}
              </p>
            ) : null}
          </form>
        ) : null}
        {warning ? (
          <p className={s.warning} role="status">
            {warning}
          </p>
        ) : null}
        {!ready ? (
          <div className={s.loading} role="status">
            학습 기록을 불러오는 중…
          </div>
        ) : view === "teacher" ? (
          <Teacher
            learners={store.learners}
            now={now}
            onSelect={chooseLearner}
          />
        ) : view === "mission" && mission ? (
          <>
            <div className={s.sessionHeader}>
              <button
                type="button"
                className={s.textButton}
                onClick={() => setView("home")}
              >
                ← 나의 학습
              </button>
              <span>
                {mission.date === today ? "오늘의 미션" : "이어서 푸는 미션"} ·{" "}
                {Math.min(
                  mission.attempts.length + (visibleFeedback ? 0 : 1),
                  mission.problems.length,
                )}{" "}
                / {mission.problems.length}
              </span>
            </div>
            <div
              className={s.sessionProgress}
              aria-label={`${mission.problems.length}문제 중 ${mission.attempts.length}문제 완료`}
              role="progressbar"
              aria-valuenow={mission.attempts.length}
              aria-valuemin={0}
              aria-valuemax={mission.problems.length}
            >
              <span
                style={{
                  width: `${(mission.attempts.length / mission.problems.length) * 100}%`,
                }}
              />
            </div>
            {visibleFeedback ? (
              <Feedback
                key={visibleFeedback.problem.id}
                problem={visibleFeedback.problem}
                attempt={visibleFeedback.attempt}
                last={!!mission.completedAt}
                onNext={() => setFeedback(null)}
              />
            ) : mission.completedAt ? (
              <Complete
                mission={mission}
                today={today}
                onHome={() => setView("home")}
              />
            ) : problem ? (
              <QuestionCard
                learnerId={learner.id}
                key={`${learner.id}-${problem.id}`}
                problem={problem}
                onSubmit={(attempt) => answer(attempt, problem)}
                onExit={() => setView("home")}
              />
            ) : null}
          </>
        ) : (
          <>
            <div className={s.greeting}>
              <div>
                <p className={s.eyebrow}>A LITTLE EVERY DAY</p>
                <h1>
                  배운 수학을,
                  <br />
                  오래 내 것으로.
                </h1>
                <p>{learner.name}님, 오늘도 한 번 꺼내 볼까요?</p>
              </div>
              <div className={s.date}>
                {now.toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
                <span>오늘의 작은 성취가 쌓이는 곳</span>
              </div>
            </div>
            <div className={s.homeGrid}>
              <section className={s.missionHero}>
                <div className={s.heroTop}>
                  <span className={s.heroLabel}>DAILY MISSION</span>
                  <span>
                    {mission?.completedAt
                      ? "완료 ✓"
                      : mission
                        ? "이어서 학습"
                        : "오늘의 12문제"}
                  </span>
                </div>
                <h2>
                  {mission?.completedAt ? (
                    <>
                      오늘도 한 걸음,
                      <br />잘 해냈어요.
                    </>
                  ) : mission && mission.attempts.length > 0 ? (
                    <>
                      멈췄던 곳에서
                      <br />
                      다시 시작해요.
                    </>
                  ) : (
                    <>
                      12번의 도전,
                      <br />더 단단한 기억.
                    </>
                  )}
                </h2>
                <p>
                  {assessed.length === 0
                    ? "쉬운 문제부터 시작해 나에게 맞는 복습을 찾아요."
                    : `${due.length ? `${due.length}개 개념의 복습과 ` : "익숙한 개념의 확인과 "}새로운 도전을 함께 준비했어요.`}
                </p>
                <div className={s.heroMeta}>
                  <span>12문제</span>
                  <span>약 10–15분</span>
                  <span>힌트와 풀이 제공</span>
                </div>
                <button type="button" className={s.heroButton} onClick={start}>
                  {mission?.completedAt
                    ? "오늘의 결과 보기"
                    : mission && mission.attempts.length > 0
                      ? `미션 이어하기 · ${mission.attempts.length}/12`
                      : "오늘의 미션 시작"}
                  <span aria-hidden="true">↗</span>
                </button>
                <div className={s.heroArt} aria-hidden="true">
                  <span>x</span>
                  <i>+</i>
                  <b>=</b>
                </div>
              </section>
              <section className={s.overview}>
                <p className={s.eyebrow}>MY LEARNING</p>
                <h2>조금씩 쌓이는 나의 실력</h2>
                <div className={s.bigStat}>
                  <b>
                    {recall === null ? "—" : recall}
                    <small>{recall === null ? "" : "%"}</small>
                  </b>
                  <span>
                    예상 기억률
                    <br />
                    <small>
                      {assessed.length
                        ? `${assessed.length}개 개념의 현재 추정`
                        : "첫 미션 후 확인할 수 있어요"}
                    </small>
                  </span>
                </div>
                <div className={s.miniStats}>
                  <div>
                    <b>
                      {stats.completed}
                      <small>회</small>
                    </b>
                    <span>완료한 미션</span>
                  </div>
                  <div>
                    <b>
                      {stats.attempts.length}
                      <small>개</small>
                    </b>
                    <span>도전한 문제</span>
                  </div>
                  <div>
                    <b>
                      {stats.attempts.length
                        ? Math.round(
                            (stats.correct / stats.attempts.length) * 100,
                          )
                        : "—"}
                      <small>{stats.attempts.length ? "%" : ""}</small>
                    </b>
                    <span>기록된 정확도</span>
                  </div>
                </div>
                <p className={s.overviewFoot}>
                  답을 외우지 않도록, 다양한 숫자로 연습합니다.
                </p>
              </section>
            </div>
            <div className={s.bottomGrid}>
              <section className={s.panel}>
                <div className={s.panelHeading}>
                  <div>
                    <p className={s.eyebrow}>MEMORY MAP</p>
                    <h2>나의 개념 기억</h2>
                  </div>
                  <span className={s.small}>예상 기억률</span>
                </div>
                <MemoryRows learner={learner} now={now} />
                <p className={s.small}>
                  숙련도는 풀이 성과, 기억률은 복습 후 지난 시간을 반영해요.
                </p>
              </section>
              <section className={s.panel}>
                <div className={s.panelHeading}>
                  <div>
                    <p className={s.eyebrow}>YOUR MISSION, EXPLAINED</p>
                    <h2>지루할 틈 없이, 한 문제씩</h2>
                  </div>
                </div>
                <ol className={s.rhythm}>
                  <li>
                    <span>01</span>
                    <div>
                      <b>가볍게 감을 깨우고</b>
                      <p>쉬운 문제와 짧은 계산으로 시작해요.</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <b>잊기 전에 다시 만나고</b>
                      <p>복습할 개념과 틀렸던 개념을 골라요.</p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <b>마지막 도전으로 마무리</b>
                      <p>한 단계 더 생각하며 오늘의 성장을 확인해요.</p>
                    </div>
                  </li>
                </ol>
                <div className={s.engineNote}>
                  <span aria-hidden="true">∑</span>
                  <p>
                    <b>{TEMPLATE_COUNT}개 문제 생성 규칙</b>
                    <br />
                    정답에서 거꾸로 만든, 숫자가 바뀌는 방정식.
                  </p>
                </div>
              </section>
            </div>
            {stats.attempts.length > 0 ? (
              <section className={s.panel}>
                <div className={s.panelHeading}>
                  <h2>최근의 작은 성취</h2>
                  <span className={s.small}>최근 5문제</span>
                </div>
                <div className={s.recentList}>
                  {stats.attempts
                    .slice(-5)
                    .reverse()
                    .map((attempt, index) => (
                      <div key={`${attempt.problemId}-${index}`}>
                        <span>
                          {attempt.correct ? "✓" : "↺"}{" "}
                          {conceptTitle(attempt.conceptId)}
                        </span>
                        <span>
                          {RATINGS[attempt.rating]} · {attempt.elapsedSeconds}초
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}
          </>
        )}
        <footer className={s.footer}>
          <Link href="/lab">← 개념 실험실</Link>
          <span>
            최근 90회 미션은 이 브라우저에 저장됩니다. 다른 기기와 공유되지
            않아요.
          </span>
          <span>오늘의 기억 · MVP 0.1</span>
        </footer>
      </main>
    </div>
  );
}
