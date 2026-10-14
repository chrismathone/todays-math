"use client";

import Link from "next/link";
import BackLink, { BackButton } from "@/components/ui/BackLink";
import { useEffect, useState, type FormEvent } from "react";
import TodayMathMark from "@/components/brand/TodayMathMark";
import WorkspaceIcon from "@/components/unified/WorkspaceIcon";
import { CONCEPTS } from "@/lib/math-srs/concepts";
import { LearningHome } from "./LearningHome";
import { QuestionCard, Feedback, Complete } from "./PracticeSession";
import { dueConcepts, estimatedRecall } from "@/lib/math-srs/memory";
import {
  createMission,
  localDateKey,
  recordAttempt,
} from "@/lib/math-srs/mission";
import {
  addLearner,
  selectLearner,
  updateLearner,
} from "@/lib/math-srs/storage";
import type {
  Attempt,
  GeneratedProblem,
  Learner,
  Rating,
} from "@/lib/math-srs/types";
import { useSrsStore } from "./useSrsStore";
import s from "./math-srs.module.css";

const RATINGS: Record<Rating, string> = {
  again: "다시 익히기",
  hard: "조금 더 연습",
  good: "스스로 해결",
  easy: "빠르고 정확하게",
};
const conceptTitle = (id: string) =>
  CONCEPTS.find((concept) => concept.id === id)?.title ?? id;

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
    <div className={s.page} data-view={view}>
      <a href="#srs-main" className={s.skip}>
        본문으로 건너뛰기
      </a>
      <header className={s.header}>
        <Link href="/lab" className={s.brand}>
          <TodayMathMark size={28} className={s.brandMark} />
          <TodayMathMark size={28} inverse className={s.brandInverse} />
          <span>
            오늘 수학 <b>학생 학습 · 오늘의 기억</b>
          </span>
        </Link>
        <nav aria-label="기억 학습 메뉴">
          <button
            type="button"
            aria-current={view !== "teacher" ? "page" : undefined}
            onClick={() => setView("home")}
          >
            <WorkspaceIcon name="home" size={19} /> 나의 학습
          </button>
          <button
            type="button"
            aria-current={view === "teacher" ? "page" : undefined}
            onClick={() => setView("teacher")}
          >
            <WorkspaceIcon name="class" size={19} /> 교사용 현황
          </button>
        </nav>
        <div className={s.sidebarNote}>
          <span aria-hidden="true">↗</span>
          <p>
            매일 조금씩,
            <br />
            <b>오래 내 것으로.</b>
          </p>
          <span>오늘의 기억</span>
        </div>
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
              aria-label="학습자"
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
              <BackButton type="button" onClick={() => setView("home")}>
                나의 학습
              </BackButton>
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
          <LearningHome
            key={learner.id}
            learner={learner}
            mission={mission}
            now={now}
            onStart={start}
          />
        )}
        <footer className={s.footer}>
          <BackLink href="/lab">개념 실험실</BackLink>
          <span>
            최근 90회 미션은 이 브라우저에 저장됩니다. 다른 기기와 공유되지
            않아요.
          </span>
          <span>오늘 수학 · 기억</span>
        </footer>
      </main>
    </div>
  );
}
