"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  planComposition,
  type AppliedConditions,
} from "../../../components/exam-builder/conditionsPlan";
import {
  BLOCKERS,
  CATALOG_SIZE,
  FORMATS,
  LESSONS,
  TIERS,
  VARIANTS,
  blockerMessage,
  conditionInputError,
  initialConditions,
  initialPresets,
  initialSelection,
  questionsFor,
  type Blocker,
  type ListState,
  type PreviewQuestion,
  type SavedPreview,
  type ScopeSelection,
  type Variant,
} from "./fixtures";
import {
  CandidateDialog,
  ConditionFields,
  ConditionsDialog,
  ListFeedback,
  QuestionBody,
  SavedConditionsDialog,
  ladderSummary,
} from "./PreviewDialogs";
import s from "./SimpleHifi.module.css";
import { StepOneVariants } from "./StepOneVariants";

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${s.panel} ${className}`}>
      <header className={s.panelHead}>
        <h4>{title}</h4>
      </header>
      {children}
    </section>
  );
}

function Steps({ id, step }: { id: Variant["id"]; step: 1 | 2 }) {
  return (
    <ol className={s.steps} aria-label="제작 단계">
      {["범위 설정", "문항 검토", "양식 구성·출력"].map((label, index) => (
        <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
          {index < 2 ? (
            <a href={`#${id}-${index + 1}`}>
              <span>{index + 1}</span>
              {label}
            </a>
          ) : (
            <span className={s.futureStep}>
              <span>3</span>
              {label}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Frame({
  variant,
  step,
  listState,
  setListState,
  blocker,
  setBlocker,
  children,
}: {
  variant: Variant;
  step: 1 | 2;
  listState: ListState;
  setListState: (state: ListState) => void;
  blocker?: Blocker;
  setBlocker?: (value: Blocker) => void;
  children: ReactNode;
}) {
  return (
    <figure
      className={s.frame}
      id={`${variant.id}-${step}`}
      data-hifi-screen={`${variant.id}-${step}`}
    >
      <figcaption className={s.frameCaption}>
        <strong>
          {variant.id} · {step}단계{" "}
          <span>{step === 1 ? "범위 설정" : "문항 검토"}</span>
        </strong>
        <div className={s.previewControls}>
          <label>
            목록 상태
            <select
              aria-label={`${variant.id} ${step}단계 목록 상태`}
              data-preview-loading
              value={listState}
              onChange={(event) =>
                setListState(event.target.value as ListState)
              }
            >
              <option value="ready">목록 표시</option>
              <option value="loading">불러오는 중</option>
              <option value="error">불러오기 실패</option>
            </select>
          </label>
          {setBlocker && (
            <label>
              진행 상태
              <select
                aria-label={`${variant.id} 막힘 안내 예`}
                data-preview-blocker
                value={blocker}
                onChange={(event) => setBlocker(event.target.value as Blocker)}
              >
                {BLOCKERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </figcaption>
      <div className={s.screen}>
        <header className={s.screenHead}>
          <div>
            <span className={s.eyebrow}>오늘의수학</span>
            <h3>시험지 만들기</h3>
          </div>
          <Steps id={variant.id} step={step} />
        </header>
        {children}
      </div>
    </figure>
  );
}

function TitleField({ children }: { children?: ReactNode }) {
  return (
    <div className={s.titleRow}>
      <label className={s.titleField}>
        <span>제목</span>
        <input data-screen-title defaultValue="3학년 덧셈과 뺄셈 확인" />
      </label>
      {children}
    </div>
  );
}

function ScopeRows({
  selection,
  change,
}: {
  selection: ScopeSelection;
  change: (next: ScopeSelection) => void;
}) {
  const rows = LESSONS.filter((lesson) => selection.ids.includes(lesson.id));
  return (
    <div className={s.scopeRows} data-selected-scopes>
      {rows.length ? (
        rows.map((lesson) => (
          <div key={lesson.id} className={s.scopeRow}>
            <span>
              <small>{lesson.id}</small>
              {lesson.name}
            </span>
            <label className={s.field}>
              <span>문항 수</span>
              <input
                aria-label={`${lesson.name} 문항 수`}
                type="number"
                min={0}
                max={lesson.available}
                value={selection.counts[lesson.id] ?? 1}
                onChange={(event) =>
                  change({
                    ...selection,
                    counts: {
                      ...selection.counts,
                      [lesson.id]: Number(event.target.value),
                    },
                    fixed: { ...selection.fixed, [lesson.id]: true },
                  })
                }
              />
            </label>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={selection.fixed[lesson.id] ?? false}
                onChange={(event) =>
                  change({
                    ...selection,
                    fixed: {
                      ...selection.fixed,
                      [lesson.id]: event.target.checked,
                    },
                  })
                }
              />
              고정
            </label>
          </div>
        ))
      ) : (
        <p className={s.empty}>왼쪽 목록에서 출제할 범위를 골라 주세요.</p>
      )}
    </div>
  );
}

function ScopeScreen({ variant }: { variant: Variant }) {
  const [listState, setListState] = useState<ListState>("ready");
  const [selection, setSelection] = useState(() =>
    initialSelection(variant.target),
  );
  const [values, setValues] = useState(() => initialConditions(variant.target));
  const [presets, setPresets] = useState(initialPresets);
  const [appliedName, setAppliedName] = useState("");
  const [school, setSchool] = useState("초등");
  const [grade, setGrade] = useState("초3");
  const [semester, setSemester] = useState("1학기");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const selected = LESSONS.filter((lesson) =>
    selection.ids.includes(lesson.id),
  );
  const rowTotal = selected.reduce(
    (sum, lesson) => sum + (selection.counts[lesson.id] ?? 1),
    0,
  );
  const total = values.total ?? rowTotal;
  const matching =
    school === "초등" && grade === "초3" && semester !== "2학기"
      ? LESSONS.filter((lesson) =>
          `${lesson.name} ${lesson.chapter} ${lesson.id}`.includes(
            query.trim(),
          ),
        )
      : [];
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(matching.length / 20) - 1),
  );
  const visible = matching.slice(currentPage * 20, (currentPage + 1) * 20);
  const chapters = [...new Set(visible.map((lesson) => lesson.chapter))];
  const applySaved = (saved: SavedPreview) => {
    setSelection({
      ...saved.selection,
      ids: [...saved.selection.ids],
      counts: { ...saved.selection.counts },
      fixed: { ...saved.selection.fixed },
    });
    setValues({
      ...values,
      total: saved.total,
      ladder: { ...saved.ladder },
      recent: saved.recent,
    });
    setAppliedName(saved.name);
  };
  const savedProps = {
    values,
    selection,
    presets,
    setPresets,
    apply: applySaved,
  };
  const plan = planComposition(
    { ...values, fixed: selection.fixed },
    selected.map((lesson) => ({
      scopeId: lesson.id,
      label: lesson.name,
      count: selection.counts[lesson.id] ?? 1,
      usable: lesson.available,
    })),
    { ladder: TIERS, max: 100 },
  );
  const invalidRow = selected.some(
    (lesson) =>
      !Number.isSafeInteger(selection.counts[lesson.id]) ||
      selection.counts[lesson.id] < 0 ||
      selection.counts[lesson.id] > lesson.available,
  );
  const valid =
    selected.length > 0 &&
    total > 0 &&
    total <= 100 &&
    !invalidRow &&
    !conditionInputError(values) &&
    plan.block.length === 0;
  return (
    <Frame
      variant={variant}
      step={1}
      listState={listState}
      setListState={setListState}
    >
      <TitleField>
        <SavedConditionsDialog
          label={`저장한 조건 · ${presets.length}`}
          {...savedProps}
        />
      </TitleField>
      <p className={s.appliedLine} role="status">
        출제 조건 · {appliedName ? `${appliedName} 적용함` : "직접 정함"}
      </p>
      <div className={s.scopeLayout} data-scope-layout>
        <Panel title="출제할 범위">
          <div className={s.scopeFilters}>
            <div className={s.segments} aria-label="학교급">
              {["초등", "중등", "고등"].map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={school === item}
                  onClick={() => {
                    setSchool(item);
                    setGrade(
                      item === "초등" ? "초3" : item === "중등" ? "중1" : "고1",
                    );
                    setPage(0);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className={s.field}>
              <span>학년·과정</span>
              <select
                value={grade}
                onChange={(event) => {
                  setGrade(event.target.value);
                  setPage(0);
                }}
              >
                {(school === "초등"
                  ? ["초1", "초2", "초3", "초4", "초5", "초6"]
                  : school === "중등"
                    ? ["중1", "중2", "중3"]
                    : ["고1", "고2", "고3"]
                ).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span>학기</span>
              <select
                value={semester}
                onChange={(event) => {
                  setSemester(event.target.value);
                  setPage(0);
                }}
              >
                {["전체 학기", "1학기", "2학기"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className={`${s.field} ${s.search}`}>
              <span>범위 검색</span>
              <input
                type="search"
                placeholder="단원·차시·자료 이름"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
              />
            </label>
          </div>
          <div className={s.sourceRow}>
            <strong>출처</strong>
            <div className={s.segments} aria-label="출처 선택">
              <button
                type="button"
                aria-pressed={selection.source === "all"}
                onClick={() => setSelection({ ...selection, source: "all" })}
              >
                전체
              </button>
              <button
                type="button"
                aria-pressed={selection.source === "textbook"}
                onClick={() =>
                  setSelection({ ...selection, source: "textbook" })
                }
              >
                교과서만
              </button>
            </div>
          </div>
          {selection.source === "textbook" && (
            <div className={s.textbookFields}>
              {listState === "ready" ? (
                <>
                  <label className={s.field}>
                    <span>책</span>
                    <select defaultValue="초등학교 수학 3-1">
                      <option>초등학교 수학 3-1</option>
                    </select>
                  </label>
                  <label className={s.field}>
                    <span>자료 종류</span>
                    <select defaultValue="전체">
                      <option>전체</option>
                      <option>단원 평가</option>
                      <option>차시 평가</option>
                    </select>
                  </label>
                </>
              ) : (
                <ListFeedback
                  state={listState}
                  noun="교과서 목록"
                  retry={() => setListState("ready")}
                />
              )}
            </div>
          )}
          <div className={s.listHeading}>
            <span>
              전체 {CATALOG_SIZE}범위{" "}
              <span className={s.caption}>· 현재 조건 {matching.length}개</span>
            </span>
            <strong>선택 {selected.length}개</strong>
          </div>
          <div
            className={s.rangeList}
            role="region"
            aria-label={`${variant.id} 범위 목록`}
            tabIndex={0}
          >
            {listState !== "ready" ? (
              <ListFeedback
                state={listState}
                noun="범위 목록"
                retry={() => setListState("ready")}
              />
            ) : visible.length ? (
              chapters.map((chapter) => (
                <details
                  className={s.chapter}
                  open
                  key={`${currentPage}-${chapter}`}
                >
                  <summary>
                    <strong>{chapter}</strong>
                    <span>
                      {
                        visible.filter(
                          (lesson) =>
                            lesson.chapter === chapter &&
                            selection.ids.includes(lesson.id),
                        ).length
                      }
                      개 선택 <span className={s.caption}>접기·펴기</span>
                    </span>
                  </summary>
                  {visible
                    .filter((lesson) => lesson.chapter === chapter)
                    .map((lesson) => (
                      <label className={s.lessonRow} key={lesson.id}>
                        <input
                          type="checkbox"
                          disabled={lesson.available === 0}
                          checked={selection.ids.includes(lesson.id)}
                          onChange={(event) =>
                            setSelection({
                              ...selection,
                              ids: event.target.checked
                                ? [...selection.ids, lesson.id]
                                : selection.ids.filter(
                                    (id) => id !== lesson.id,
                                  ),
                              counts: {
                                ...selection.counts,
                                [lesson.id]: selection.counts[lesson.id] ?? 1,
                              },
                            })
                          }
                        />
                        <span>
                          <small>{lesson.id}</small>
                          {lesson.name}
                        </span>
                        <span className={s.available}>
                          {lesson.available === 0
                            ? "0문항 · 선택 불가"
                            : `${lesson.available}문항 가능`}
                        </span>
                      </label>
                    ))}
                </details>
              ))
            ) : (
              <div className={s.empty}>
                <p>조건에 맞는 범위가 없습니다.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSchool("초등");
                    setGrade("초3");
                    setSemester("1학기");
                    setQuery("");
                  }}
                >
                  검색 조건 풀기
                </button>
              </div>
            )}
          </div>
          <div className={s.pagination}>
            <button
              type="button"
              disabled={!currentPage || listState !== "ready"}
              onClick={() => setPage(currentPage - 1)}
            >
              이전 범위
            </button>
            <span>
              {matching.length ? currentPage * 20 + 1 : 0}–
              {Math.min((currentPage + 1) * 20, matching.length)} /{" "}
              {matching.length}
            </span>
            <button
              type="button"
              disabled={
                (currentPage + 1) * 20 >= matching.length ||
                listState !== "ready"
              }
              onClick={() => setPage(currentPage + 1)}
            >
              다음 범위
            </button>
          </div>
          <details className={s.disclosure}>
            <summary>
              선택한 범위별 수·고정 <strong>{selected.length}범위</strong>
            </summary>
            <ScopeRows selection={selection} change={setSelection} />
          </details>
        </Panel>
        <aside className={s.conditionRail}>
          <Panel title="이번 시험지의 조건">
            <ConditionFields
              values={values}
              onChange={setValues}
              rowTotal={rowTotal}
            />
            <div className={s.conditionSummary}>
              <span>
                {total}문항 · {selected.length}범위
              </span>
              <ConditionsDialog
                values={values}
                selection={selection}
                onApply={(nextValues, nextSelection) => {
                  setValues(nextValues);
                  setSelection(nextSelection);
                }}
              />
            </div>
            <p className={s.caption}>
              모자란 범위는 다른 범위에서 채우지 않습니다.
            </p>
            <footer className={s.composeFoot}>
              {!valid && (
                <p className={s.error} role="alert">
                  {!selected.length
                    ? "출제할 범위를 한 개 이상 골라 주세요."
                    : invalidRow
                      ? "범위별 문항 수를 출제 가능한 수 안에서 정해 주세요."
                      : (conditionInputError(values) ??
                        plan.block[0] ??
                        "문항 수를 1~100문항으로 정해 주세요.")}
                </p>
              )}
              <div className={s.composeTotal}>
                <span>구성할 문항</span>
                <strong>
                  {total}
                  <small>문항</small>
                </strong>
                <span>선택한 범위 {selected.length}개</span>
              </div>
              <SavedConditionsDialog label="조건 저장" {...savedProps} />
              {valid ? (
                <a className={s.primary} href={`#${variant.id}-2`}>
                  문항 구성
                </a>
              ) : (
                <button type="button" className={s.primary} disabled>
                  문항 구성
                </button>
              )}
            </footer>
          </Panel>
        </aside>
      </div>
    </Frame>
  );
}

function reviewConditions(
  variant: Variant,
  blocker: Blocker,
): AppliedConditions {
  const questions = questionsFor(variant);
  const values = initialConditions(
    blocker === "total" ? questions.length + 6 : questions.length,
  );
  if (blocker === "format")
    values.formats = Object.fromEntries(
      FORMATS.map((format, index) => [
        format,
        variant.formats[index] + (index === 1 ? 2 : index === 2 ? -2 : 0),
      ]),
    );
  return values;
}

function Statistics({ questions }: { questions: PreviewQuestion[] }) {
  const count = questions.length;
  return (
    <section className={s.statistics} aria-label="담은 문항 통계">
      <div className={s.statTotal}>
        <span>담은 문항</span>
        <strong>
          {count}
          <small>문항</small>
        </strong>
        <span>{new Set(questions.map((q) => q.lesson.id)).size}범위</span>
      </div>
      <dl className={s.formatStats}>
        {FORMATS.map((format) => (
          <div key={format}>
            <dt>{format}</dt>
            <dd>{questions.filter((q) => q.format === format).length}</dd>
          </div>
        ))}
      </dl>
      <div className={s.distribution} aria-label="난이도별 문항 수">
        {TIERS.map((tier) => {
          const number = questions.filter((q) => q.tier === tier).length;
          return (
            <div key={tier}>
              <span>{tier}</span>
              <span className={s.barTrack} aria-hidden="true">
                <span
                  style={{ width: `${count ? (number / count) * 100 : 0}%` }}
                />
              </span>
              <strong>{number}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Pagination({
  page,
  total,
  change,
  label,
}: {
  page: number;
  total: number;
  change: (page: number) => void;
  label: string;
}) {
  return (
    <nav className={s.pagination} aria-label={label}>
      <button
        type="button"
        aria-label={`${label} 이전`}
        disabled={!page}
        onClick={() => change(page - 1)}
      >
        이전
      </button>
      <span>
        {total ? page * 6 + 1 : 0}–{Math.min((page + 1) * 6, total)} / {total}
        문항
      </span>
      <button
        type="button"
        aria-label={`${label} 다음`}
        disabled={(page + 1) * 6 >= total}
        onClick={() => change(page + 1)}
      >
        다음
      </button>
    </nav>
  );
}

function ReviewScreen({ variant }: { variant: Variant }) {
  const [listState, setListState] = useState<ListState>("ready");
  const [blocker, setBlocker] = useState<Blocker>(variant.blocker);
  const [questions, setQuestions] = useState(() => questionsFor(variant));
  const [values, setValues] = useState(() =>
    reviewConditions(variant, variant.blocker),
  );
  const [selection, setSelection] = useState(() =>
    initialSelection(variant.target),
  );
  const [page, setPage] = useState(0);
  const [undo, setUndo] = useState<PreviewQuestion[] | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const addedSerial = useRef(0);
  const pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    document.getElementById(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [questions, values, blocker]);
  const reasonId = useId();
  const shownQuestions = blocker === "empty" ? [] : questions;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(shownQuestions.length / 6) - 1),
  );
  const visible = shownQuestions.slice(currentPage * 6, (currentPage + 1) * 6);
  const target = values.total ?? questions.length;
  const message = blockerMessage(
    blocker,
    shownQuestions,
    target,
    values.formats,
  );
  const sample = questionsFor(variant)[0];
  function deriveBlocker(
    next: PreviewQuestion[],
    nextValues = values,
  ): Blocker {
    if (blocker === "permission" || blocker === "checking") return blocker;
    if (!next.length) return "empty";
    if (nextValues.total !== null && next.length !== nextValues.total)
      return "total";
    if (
      FORMATS.some(
        (format) =>
          nextValues.formats[format] !== null &&
          next.filter((q) => q.format === format).length !==
            nextValues.formats[format],
      )
    )
      return "format";
    return "ready";
  }
  const commitLocal = (next: PreviewQuestion[], note: string) => {
    setUndo(shownQuestions);
    setQuestions(next);
    setBlocker(deriveBlocker(next));
    setChangeNote(note);
  };
  function move(from: number, to: number) {
    if (to < 0 || to >= shownQuestions.length || from === to) return;
    const next = [...shownQuestions];
    const [question] = next.splice(from, 1);
    next.splice(to, 0, question);
    pendingFocus.current = `${variant.id}-order-${question.id}`;
    commitLocal(next, `${from + 1}번 문항을 ${to + 1}번으로 옮겼습니다.`);
    setPage(Math.floor(to / 6));
  }
  const addQuestion = (question: PreviewQuestion) => {
    pendingFocus.current = `${variant.id}-add-question`;
    commitLocal(
      [
        ...shownQuestions,
        { ...question, id: `${question.id}-added-${addedSerial.current++}` },
      ],
      "문항을 마지막에 담았습니다.",
    );
  };
  const applyConditions = (
    nextValues: AppliedConditions,
    nextSelection: ScopeSelection,
  ) => {
    pendingFocus.current = `${variant.id}-review-condition`;
    setValues(nextValues);
    setSelection(nextSelection);
    setBlocker(deriveBlocker(shownQuestions, nextValues));
  };
  const conditions = (
    <ConditionsDialog
      values={values}
      selection={selection}
      onApply={applyConditions}
    />
  );
  const actions = (
    <section
      className={s.outputAction}
      data-output-status={blocker === "ready" ? "ready" : "blocked"}
      data-action-placement={variant.id}
      aria-label="다음 단계 안내"
    >
      <div
        className={`${s.outputReason} ${blocker === "ready" ? s.ready : blocker === "checking" ? s.pending : s.warning}`}
        id={reasonId}
        role="status"
      >
        <strong>{message.title}</strong>
        <p>{message.detail}</p>
        {(blocker === "total" || blocker === "format") && (
          <div className={s.row}>
            {blocker === "total" && target > shownQuestions.length && (
              <CandidateDialog
                original={sample}
                slot={shownQuestions.length + 1}
                mode="add"
                state={listState}
                retry={() => setListState("ready")}
                onChoose={addQuestion}
              />
            )}
            {conditions}
          </div>
        )}
        {blocker === "empty" && (
          <a className={s.textLink} href={`#${variant.id}-1`}>
            범위 설정으로 이동
          </a>
        )}
      </div>
      <div className={s.outputButtons}>
        <a className={s.secondary} href={`#${variant.id}-1`}>
          이전: 범위 설정
        </a>
        {blocker === "ready" ? (
          <a className={s.primary} href="#hifi-output-note">
            다음: 양식 구성·출력
          </a>
        ) : (
          <button
            type="button"
            className={s.primary}
            disabled
            aria-describedby={reasonId}
          >
            다음: 양식 구성·출력
          </button>
        )}
      </div>
    </section>
  );
  return (
    <Frame
      variant={variant}
      step={2}
      listState={listState}
      setListState={setListState}
      blocker={blocker}
      setBlocker={(value) => {
        setBlocker(value);
        setQuestions(questionsFor(variant));
        setValues(reviewConditions(variant, value));
        setPage(0);
        setUndo(null);
        setChangeNote("");
      }}
    >
      <TitleField>
        <span className={s.caption}>초3 · 1학기 · 덧셈과 뺄셈</span>
      </TitleField>
      <div className={s.reviewConditionLine}>
        <p>
          출제 조건 · 총 {target}문항 · {ladderSummary(values.ladder)} ·{" "}
          {values.recent ? "최근 14일 출제 뺌" : "최근 출제 포함"} ·{" "}
          {values.mcFirst ? "객관식 먼저" : "지금 차례 유지"}
        </p>
        <ConditionsDialog
          buttonId={`${variant.id}-review-condition`}
          values={values}
          selection={selection}
          onApply={applyConditions}
        />
      </div>
      {variant.id === "H4" && actions}
      {undo && (
        <div className={s.undoLine} role="status">
          <span>{changeNote}</span>
          <button
            type="button"
            onClick={() => {
              setQuestions(undo);
              setBlocker(deriveBlocker(undo));
              setUndo(null);
              setChangeNote("");
            }}
          >
            되돌리기
          </button>
        </div>
      )}
      <div className={s.reviewLayout} data-review-layout>
        <aside className={s.reviewRail}>
          <Panel title="문제 통계">
            <Statistics questions={shownQuestions} />
          </Panel>
          <Panel title="문항 순서">
            <p className={s.caption}>
              번호를 끌어 옮깁니다. 번호에서 Alt+위·아래 키로도 옮길 수
              있습니다.
            </p>
            <div className={s.orderTableWrap}>
              <table className={s.orderTable}>
                <thead>
                  <tr>
                    <th>순서</th>
                    <th>형식</th>
                    <th>난이도</th>
                    <th>유형명·차시</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((question, index) => {
                    const position = currentPage * 6 + index;
                    return (
                      <tr
                        key={question.id}
                        data-drop-target={dropIndex === position}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDropIndex(position);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (dragIndex !== null) move(dragIndex, position);
                          setDragIndex(null);
                          setDropIndex(null);
                        }}
                      >
                        <td>
                          <button
                            type="button"
                            id={`${variant.id}-order-${question.id}`}
                            className={s.orderHandle}
                            draggable
                            aria-label={`${position + 1}번 문항 본문으로 이동, Alt와 방향키로 순서 변경`}
                            onClick={() =>
                              document
                                .getElementById(
                                  `${variant.id}-question-${question.id}`,
                                )
                                ?.scrollIntoView({ block: "center" })
                            }
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "text/plain",
                                String(position),
                              );
                              setDragIndex(position);
                            }}
                            onDragEnd={() => {
                              setDragIndex(null);
                              setDropIndex(null);
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.altKey &&
                                ["ArrowUp", "ArrowDown"].includes(event.key)
                              ) {
                                event.preventDefault();
                                move(
                                  position,
                                  position + (event.key === "ArrowUp" ? -1 : 1),
                                );
                              }
                            }}
                          >
                            {String(position + 1).padStart(2, "0")}
                          </button>
                        </td>
                        <td>{question.format}</td>
                        <td>{question.tier}</td>
                        <td>
                          <small>{question.lesson.id}</small>
                          {question.lesson.name}
                          {dropIndex === position && (
                            <span className={s.dropHint}>여기로 문제 이동</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!shownQuestions.length && (
              <p className={s.empty}>담은 문항이 없습니다.</p>
            )}
            <Pagination
              page={currentPage}
              total={shownQuestions.length}
              change={setPage}
              label="순서표"
            />
          </Panel>
          {variant.id === "H2" && actions}
        </aside>
        <div className={s.reviewMain}>
          {variant.id === "H3" && actions}
          <section
            className={`${s.panel} ${s.questionPanel}`}
            aria-label="담은 문항 목록"
          >
            <header className={s.panelHead}>
              <h4>
                담은 문항 <strong>{shownQuestions.length}개</strong>
              </h4>
              <CandidateDialog
                buttonId={`${variant.id}-add-question`}
                original={sample}
                slot={shownQuestions.length + 1}
                mode="add"
                state={listState}
                retry={() => setListState("ready")}
                onChoose={addQuestion}
              />
            </header>
            {listState !== "ready" ? (
              <ListFeedback
                state={listState}
                noun="문항 목록"
                retry={() => setListState("ready")}
              />
            ) : visible.length ? (
              <div className={s.questionList}>
                {visible.map((question, index) => {
                  const position = currentPage * 6 + index;
                  return (
                    <article
                      className={s.question}
                      key={`${variant.id}-slot-${position}`}
                      id={`${variant.id}-question-${question.id}`}
                      data-hifi-question={question.id}
                    >
                      <header className={s.questionHead}>
                        <strong className={s.questionNumber}>
                          {String(position + 1).padStart(2, "0")}
                        </strong>
                        <span className={s.caption}>
                          {question.format} · {question.tier}
                        </span>
                        <div className={s.questionActions}>
                          <CandidateDialog
                            original={question}
                            slot={position + 1}
                            state={listState}
                            retry={() => setListState("ready")}
                            onChoose={(candidate) =>
                              commitLocal(
                                shownQuestions.map((item, itemIndex) =>
                                  itemIndex === position ? candidate : item,
                                ),
                                `${position + 1}번 문항을 같은 자리에 교체했습니다.`,
                              )
                            }
                          />
                          <button
                            type="button"
                            className={s.textButton}
                            onClick={() =>
                              commitLocal(
                                shownQuestions.filter(
                                  (_, itemIndex) => itemIndex !== position,
                                ),
                                `${position + 1}번 문항을 뺐습니다.`,
                              )
                            }
                          >
                            빼기
                          </button>
                        </div>
                      </header>
                      <p className={s.questionScope}>
                        {question.lesson.id} · {question.lesson.name}
                      </p>
                      <QuestionBody question={question} />
                      <footer className={s.questionFoot}>
                        <div className={s.row}>
                          <button
                            type="button"
                            className={s.textButton}
                            disabled={position === 0}
                            onClick={() => move(position, position - 1)}
                          >
                            위로
                          </button>
                          <button
                            type="button"
                            className={s.textButton}
                            disabled={position === shownQuestions.length - 1}
                            onClick={() => move(position, position + 1)}
                          >
                            아래로
                          </button>
                        </div>
                        <details className={s.answer} key={question.id}>
                          <summary>정답·해설 보기</summary>
                          <div>
                            <strong>
                              정답 {question.format === "객관식" ? "③ · " : ""}
                              {question.answer}
                            </strong>
                            <p>
                              같은 자리끼리{" "}
                              {question.subtract ? "빼면" : "더하면"}{" "}
                              {question.answer}입니다.
                            </p>
                          </div>
                        </details>
                      </footer>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={s.empty}>
                <p>담은 문항이 없습니다.</p>
                <a className={s.secondary} href={`#${variant.id}-1`}>
                  범위 설정으로 이동
                </a>
              </div>
            )}
            <Pagination
              page={currentPage}
              total={shownQuestions.length}
              change={setPage}
              label="문항 목록"
            />
          </section>
        </div>
      </div>
      {variant.id === "H1" && actions}
    </Frame>
  );
}

export function SimpleHifi() {
  return (
    <main className={s.gallery} data-hifi-gallery>
      <header className={s.galleryHead}>
        <div>
          <p className={s.eyebrow}>Wire A → Hi-fi · 2026.10.18</p>
          <h1>시험지 만들기, 간단하게</h1>
          <p>같은 짜임 위에 모양·밀도·강조를 달리한 네 가지 안입니다.</p>
        </div>
        <a className={s.secondary} href="/dev/exam-builder-simple-wire#A-1">
          선택한 Wire A 보기
        </a>
      </header>
      <nav className={s.galleryNav} aria-label="Hi-fi 안 바로 가기">
        {VARIANTS.map((variant) => (
          <a href={`#${variant.id}`} key={variant.id}>
            <strong>{variant.id}</strong>
            <span>{variant.name}</span>
          </a>
        ))}
      </nav>
      <a className={s.textLink} href="#H2-step1">
        H2 · 1단계 차근차근 S1~S4
      </a>
      <div className={s.galleryNote}>
        <p>
          각 안은 1·2단계의 독립 예시입니다. 화면 위의 목록 상태·진행 상태를
          바꾸어 비교할 수 있습니다.
        </p>
        <p>
          초3 차시명과 전체 735범위 규모를 사용했습니다. 가능 수·34~50문항·책은
          자체 픽스처이며 조작은 현재 시안 안에서만 유지됩니다. 총수와 난이도의
          제품 기본값을 정하는 화면이 아닙니다.
        </p>
      </div>
      {VARIANTS.map((variant) => (
        <section
          className={s.option}
          id={variant.id}
          key={variant.id}
          data-hifi-option={variant.id}
        >
          <header className={s.optionHead}>
            <div>
              <p className={s.optionNumber}>{variant.id}</p>
              <h2>{variant.name}</h2>
            </div>
            <nav aria-label={`${variant.id} 단계 바로 가기`}>
              <a href={`#${variant.id}-1`}>1단계</a>
              <a href={`#${variant.id}-2`}>2단계</a>
            </nav>
          </header>
          <p className={s.idea}>{variant.idea}</p>
          <p className={s.weakness}>
            <strong>약점</strong> {variant.weakness}
          </p>
          <ScopeScreen variant={variant} />
          <ReviewScreen variant={variant} />
        </section>
      ))}
      <StepOneVariants />
      <footer className={s.galleryNote} id="hifi-output-note">
        <strong>3단계 · 양식 구성·출력</strong>
        <p>
          기존 WorksheetEditor의 여섯 양식과 출력 흐름을 이어 씁니다. 이 시안의
          비교 범위는 1·2단계까지입니다.
        </p>
        <p>
          전체/교과서만은 Wire A의 선택을 따릅니다. 엔진·기출·그 밖 제한은 추가
          선택에 남겼습니다. 교체의 두 후보 층·명시적 교체·자리/순서·되돌리기와
          교과서의 별도 지정 복습 변형을 유지합니다. 실제 제작·저장·출력은
          실행하지 않습니다.
        </p>
        <a className={s.textLink} href="#H1">
          H1으로 돌아가기
        </a>
      </footer>
    </main>
  );
}
