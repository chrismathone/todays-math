"use client";

import Link from "next/link";
import BackLink from "@/components/ui/BackLink";
import dynamic from "next/dynamic";
import { useState, type FormEvent } from "react";
import TodayMathMark from "@/components/brand/TodayMathMark";
import WorkspaceIcon from "@/components/unified/WorkspaceIcon";
import {
  COURSE_CHAPTERS,
  COURSE_SECTIONS,
  getCourseSection,
  getNextCourseSection,
} from "@/lib/math-srs/elementary/catalog";
import { BOOK_CHAPTERS } from "@/lib/math-srs/elementary/bookReference";
import {
  dueCourseSections,
  getSectionStatus,
  markCourseHint,
  recordCourseAttempt,
  startCourseSession,
} from "@/lib/math-srs/elementary/progress";
import type {
  CourseGrade,
  CourseSection,
  CourseSession,
} from "@/lib/math-srs/elementary/types";
import { addLearner, selectLearner } from "@/lib/math-srs/storage";
import { useSrsStore } from "./useSrsStore";
import { useElementaryCourse } from "./useElementaryCourse";
import shell from "./math-srs.module.css";
import s from "./elementary-course.module.css";

const ElementaryPractice = dynamic(() => import("./ElementaryPractice"), {
  loading: () => (
    <p className={shell.loading} role="status">
      문제를 준비하고 있어요…
    </p>
  ),
});
const STATUS_LABEL = {
  new: "시작하기",
  learning: "이어하기",
  review: "다시 익히기",
  complete: "학습 완료",
};

export default function ElementaryCourseApp() {
  const profiles = useSrsStore();
  const learner =
    profiles.store.learners.find(
      (item) => item.id === profiles.store.activeLearnerId,
    ) ?? profiles.store.learners[0];
  const course = useElementaryCourse(learner.id);
  const [view, setView] = useState<"home" | "review" | "practice">("home");
  const [filter, setFilter] = useState<{
    learnerId: string;
    grade: CourseGrade;
    semester: 1 | 2;
  } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const now = new Date();
  const selected =
    getCourseSection(course.state.selectedSectionId) ?? COURSE_SECTIONS[0];
  const grade =
    filter?.learnerId === learner.id ? filter.grade : selected.grade;
  const semester =
    filter?.learnerId === learner.id ? filter.semester : selected.semester;
  const chapters = COURSE_CHAPTERS.filter(
    (chapter) => chapter.grade === grade && chapter.semester === semester,
  );
  const visibleSections = chapters.flatMap((chapter) => chapter.sections);
  const completed = COURSE_SECTIONS.filter(
    (section) => course.state.progress[section.id]?.completedSessions > 0,
  ).length;
  const semesterCompleted = visibleSections.filter(
    (section) => course.state.progress[section.id]?.completedSessions > 0,
  ).length;
  const due = dueCourseSections(course.state, now);
  const active = course.state.session;
  const resume =
    active && !active.completedAt ? getCourseSection(active.sectionId) : null;
  const suggestion = resume ?? selected;
  const ready = profiles.ready && course.ready;
  const practicing = view === "practice" && Boolean(active);

  function showHome() {
    setView("home");
    setError(null);
  }
  function selectSemester(nextGrade: CourseGrade, nextSemester: 1 | 2) {
    setFilter({
      learnerId: learner.id,
      grade: nextGrade,
      semester: nextSemester,
    });
    setExpanded(null);
  }
  async function start(
    section: CourseSection,
    mode: "learn" | "review" = "learn",
  ) {
    if (busy) return;
    setAdding(false);
    setError(null);
    if (active?.sectionId === section.id && !active.completedAt) {
      setView("practice");
      return;
    }
    setBusy(true);
    try {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      const params = new URLSearchParams({
        sectionId: section.id,
        seed: String(seed),
        mode,
      });
      const response = await fetch(`/lab/math-srs/session?${params}`, {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          "문제를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      const generated: CourseSession = await response.json();
      // Local progress uses the learner's clock, including on a hosted server.
      const session = { ...generated, startedAt: new Date().toISOString() };
      if (course.persist((current) => startCourseSession(current, session))) {
        setView("practice");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "문제를 준비하지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  function createProfile(event: FormEvent) {
    event.preventDefault();
    if (profiles.persist((current) => addLearner(current, name))) {
      setName("");
      setAdding(false);
      showHome();
    }
  }
  function continueCourse() {
    if (active?.mode === "learn" && !getNextCourseSection(active.sectionId)) {
      setView("home");
      return;
    }
    const next = getCourseSection(course.state.selectedSectionId);
    if (completed === COURSE_SECTIONS.length || !next) {
      setView("home");
      return;
    }
    void start(next);
  }

  return (
    <div
      className={`${shell.page} ${s.page} ${practicing ? s.practicePage : ""}`}
    >
      <a href="#srs-main" className={shell.skip}>
        본문으로 건너뛰기
      </a>
      <header className={`${shell.header} ${s.navigation}`}>
        <Link
          href="/lab"
          className={shell.brand}
          aria-label="오늘 수학 개념 실험실"
        >
          <TodayMathMark size={28} className={shell.brandMark} />
          <TodayMathMark size={28} inverse className={shell.brandInverse} />
          <span>
            오늘 수학 <b>초등 학습 · 오늘의 기억</b>
          </span>
        </Link>
        <nav aria-label="초등 학습 메뉴">
          <button
            type="button"
            disabled={busy}
            aria-current={view !== "review" ? "page" : undefined}
            onClick={showHome}
          >
            <WorkspaceIcon name="home" size={19} />
            나의 학습
          </button>
          <button
            type="button"
            disabled={busy}
            aria-current={view === "review" ? "page" : undefined}
            onClick={() => setView("review")}
          >
            <span aria-hidden="true">↺</span>복습할 시간{" "}
            {due.length ? <b className={s.navCount}>{due.length}</b> : null}
          </button>
        </nav>
        <div className={shell.sidebarNote}>
          <span aria-hidden="true">↗</span>
          <p>
            한 차시씩 차근차근,
            <br />
            <b>초등 수학을 내 것으로.</b>
          </p>
          <span>초3부터 초6까지</span>
        </div>
      </header>
      <main id="srs-main" className={`${shell.main} ${s.main}`}>
        <div className={`${shell.profileBar} ${s.profileBar}`}>
          <span className={`${shell.localBadge} ${s.localBadge}`}>
            <i />이 기기에 저장되는 학습 기록
          </span>
          <div className={`${shell.profileControls} ${s.profileControls}`}>
            <label htmlFor="course-learner">학습자</label>
            <select
              id="course-learner"
              aria-label="학습자"
              value={learner.id}
              disabled={!ready || busy}
              onChange={(event) => {
                if (
                  profiles.persist((current) =>
                    selectLearner(current, event.target.value),
                  )
                ) {
                  showHome();
                  setExpanded(null);
                }
              }}
            >
              {profiles.store.learners.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={shell.textButton}
              disabled={!ready || busy || profiles.store.learners.length >= 12}
              aria-expanded={adding}
              onClick={() => setAdding(!adding)}
            >
              + 추가
            </button>
          </div>
        </div>
        {adding ? (
          <form onSubmit={createProfile} className={shell.addForm}>
            <label htmlFor="course-new-learner">학습자 이름</label>
            <input
              id="course-new-learner"
              value={name}
              maxLength={20}
              required
              placeholder="이름 또는 별명"
              onChange={(event) => setName(event.target.value)}
            />
            <button className={shell.primary} type="submit">
              추가하기
            </button>
            <button
              className={shell.textButton}
              type="button"
              onClick={() => setAdding(false)}
            >
              취소
            </button>
          </form>
        ) : null}
        {profiles.warning || course.warning ? (
          <p role="status" className={`${shell.warning} ${s.notice}`}>
            {course.warning ?? profiles.warning}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className={`${shell.warning} ${s.notice}`}>
            {error}
          </p>
        ) : null}
        {!ready ? (
          <p className={shell.loading} role="status">
            학습 기록을 불러오는 중…
          </p>
        ) : view === "practice" && active ? (
          <div className={s.practiceStage}>
            <ElementaryPractice
              key={`${learner.id}-${active.id}`}
              session={active}
              section={getCourseSection(active.sectionId)!}
              onAttempt={(attempt) =>
                course.persist((current) =>
                  recordCourseAttempt(current, {
                    ...attempt,
                    answeredAt: new Date(
                      Math.max(
                        Date.parse(attempt.answeredAt),
                        Date.parse(
                          current.session?.attempts.at(-1)?.answeredAt ??
                            current.session?.startedAt ??
                            attempt.answeredAt,
                        ),
                      ),
                    ).toISOString(),
                  }),
                )
              }
              onHint={(problemId) =>
                course.persist((current) => markCourseHint(current, problemId))
              }
              onExit={showHome}
              onContinue={continueCourse}
            />
          </div>
        ) : view === "review" ? (
          <>
            <div className={s.heading}>
              <p>배운 내용을 오래 기억하도록</p>
              <h1>복습할 시간</h1>
              <span>
                정답과 풀이 도움 여부를 바탕으로 다시 만날 차시를 골랐어요.
              </span>
            </div>
            {due.length ? (
              <div className={s.reviewList}>
                {due.map((section) => (
                  <button
                    type="button"
                    key={section.id}
                    disabled={busy}
                    onClick={() => void start(section, "review")}
                  >
                    <span>
                      <small>
                        {section.grade}학년 {section.semester}학기 ·{" "}
                        {section.chapterTitle}
                      </small>
                      <b>{section.title}</b>
                    </span>
                    <span>복습하기 →</span>
                  </button>
                ))}
              </div>
            ) : (
              <section className={s.empty}>
                <span aria-hidden="true">✓</span>
                <h2>지금은 복습할 차시가 없어요</h2>
                <p>학습을 마치면 다시 기억할 때를 알려드릴게요.</p>
                <button className={shell.primary} onClick={showHome}>
                  나의 학습으로
                </button>
              </section>
            )}
          </>
        ) : (
          <>
            <div className={s.heading}>
              <p>초등 3–6학년 · 8개 학기</p>
              <h1>오늘의 기억</h1>
              <span>{learner.name}님의 속도로, 한 차시씩 쌓아가요.</span>
            </div>
            <div className={s.overview}>
              <section className={s.hero} aria-labelledby="course-next">
                <div className={s.heroTop}>
                  <span>{resume ? "이어서 학습" : "다음 학습"}</span>
                  <span>
                    {suggestion.grade}학년 {suggestion.semester}학기
                  </span>
                </div>
                <p>{suggestion.chapterTitle}</p>
                <h2 id="course-next">{suggestion.title}</h2>
                <p className={s.preparation}>
                  종이와 펜을 준비해 주세요.
                  <br />
                  풀이는 편하게 적고, 답은 여기에 남겨요.
                </p>
                <button
                  type="button"
                  className={shell.primary}
                  disabled={busy}
                  onClick={() => void start(suggestion)}
                >
                  {busy
                    ? "문제 준비 중…"
                    : resume
                      ? `이어서 풀기 · ${active?.attempts.length ?? 0}/5`
                      : "5문제로 학습 시작"}
                  <span aria-hidden="true"> →</span>
                </button>
                <small>시간 제한 없이 · 풀이와 함께 확인</small>
              </section>
              <aside className={s.summary} aria-label="전체 학습 현황">
                <p>나의 초등 수학 여정</p>
                <div>
                  <strong>{completed}</strong>
                  <span>/ {COURSE_SECTIONS.length}차시 완료</span>
                </div>
                <progress
                  aria-label="전체 차시 진행률"
                  value={completed}
                  max={COURSE_SECTIONS.length}
                />
                <p>
                  4개 학년 · {COURSE_CHAPTERS.length}개 단원
                  <br />
                  원하는 학년부터 시작할 수 있어요.
                </p>
                <button type="button" onClick={() => setView("review")}>
                  오늘 다시 볼 차시 <b>{due.length}</b>
                  <span aria-hidden="true">↗</span>
                </button>
              </aside>
            </div>
            <section className={s.curriculum} aria-labelledby="course-map">
              <div className={s.mapTitle}>
                <div>
                  <p>나에게 맞는 곳에서 시작해요</p>
                  <h2 id="course-map">전체 학습 과정</h2>
                </div>
                <span>
                  {semesterCompleted}/{visibleSections.length}차시 완료
                </span>
              </div>
              <div className={s.filters}>
                <div className={s.grades} role="group" aria-label="학년 선택">
                  {([3, 4, 5, 6] as const).map((g) => (
                    <button
                      type="button"
                      key={g}
                      aria-pressed={grade === g}
                      onClick={() => selectSemester(g, semester)}
                    >
                      {g}학년
                    </button>
                  ))}
                </div>
                <div
                  className={s.semesters}
                  role="group"
                  aria-label="학기 선택"
                >
                  {([1, 2] as const).map((term) => (
                    <button
                      type="button"
                      key={term}
                      aria-pressed={semester === term}
                      onClick={() => selectSemester(grade, term)}
                    >
                      {term}학기
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.chapterList}>
                {chapters.map((chapter) => {
                  const book = BOOK_CHAPTERS[chapter.id];
                  const done = chapter.sections.filter(
                    (section) =>
                      course.state.progress[section.id]?.completedSessions > 0,
                  ).length;
                  const open =
                    expanded === chapter.id ||
                    (expanded === null &&
                      chapter.id ===
                        (selected.grade === grade &&
                        selected.semester === semester
                          ? selected.chapterId
                          : chapters[0].id));
                  return (
                    <section
                      key={chapter.id}
                      className={`${s.chapter} ${open ? s.open : ""}`}
                    >
                      <h3>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={`chapter-${chapter.id}`}
                          onClick={() =>
                            setExpanded(open ? "none" : chapter.id)
                          }
                        >
                          <span className={s.chapterNumber}>
                            {String(chapter.number).padStart(2, "0")}
                          </span>
                          <span>
                            {chapter.title}
                            <small>
                              {done}/{chapter.sections.length}차시 완료
                            </small>
                          </span>
                          <span className={s.chevron} aria-hidden="true">
                            {open ? "−" : "+"}
                          </span>
                        </button>
                      </h3>
                      {open ? (
                        <div id={`chapter-${chapter.id}`} className={s.lessons}>
                          {book ? (
                            <p className={s.bookNote}>
                              교재 참고 · 큐브수학 개념 {grade}-{semester} ·{" "}
                              {book.from}–{book.to}쪽
                              {book.title !== chapter.title
                                ? ` (${book.title})`
                                : ""}
                            </p>
                          ) : null}
                          <ol>
                            {chapter.sections.map((section, index) => {
                              const status = getSectionStatus(
                                course.state,
                                section.id,
                                now,
                              );
                              return (
                                <li key={section.id}>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void start(section)}
                                  >
                                    <span
                                      className={`${s.lessonMark} ${status === "complete" ? s.done : ""}`}
                                      aria-hidden="true"
                                    >
                                      {status === "complete"
                                        ? "✓"
                                        : String(index + 1).padStart(2, "0")}
                                    </span>
                                    <span className={s.lessonTitle}>
                                      {section.title}
                                    </span>
                                    <span
                                      className={`${s.status} ${status === "review" ? s.review : ""}`}
                                    >
                                      {STATUS_LABEL[status]}{" "}
                                      <span aria-hidden="true">→</span>
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
              <p className={s.courseNote}>
                교재 목차를 참고해 구성한 학습 과정입니다. 차시는 개념에 따라
                묶었으며, 그리기·설명 문제는 연습장 풀이와 해설을 비교해
                확인해요.
              </p>
            </section>
          </>
        )}
        {!practicing ? (
          <footer className={shell.footer}>
            <BackLink href="/lab">개념 실험실</BackLink>
            <span>
              학습 기록은 이 브라우저에 저장돼요. 다른 기기와 공유되지 않아요.
            </span>
            <Link href="/lab/math-srs/algebra">중1 방정식 복습 →</Link>
          </footer>
        ) : null}
      </main>
    </div>
  );
}
