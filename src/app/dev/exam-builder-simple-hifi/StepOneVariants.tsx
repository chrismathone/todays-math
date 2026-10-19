"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PickerDialog } from "../../../components/picker-dialog/PickerDialog";
import { planComposition } from "../../../components/exam-builder/conditionsPlan";
import {
  conditionInputError,
  initialConditions,
  TIERS,
  type ListState,
  type SavedPreview,
  type ScopeSelection,
} from "./fixtures";
import {
  ConditionFields,
  ConditionsDialog,
  ListFeedback,
  SavedConditionsDialog,
} from "./PreviewDialogs";
import {
  STEP1_GRADES,
  STEP1_SCOPES,
  STEP1_VARIANTS,
  type Step1Variant,
} from "./step1Fixtures";
import s from "./SimpleHifi.module.css";
import t from "./StepOneVariants.module.css";

type Stage = "grade" | "chapter" | "lesson";
const STAGE_NAMES: Record<Stage, string> = {
  grade: "학년·과정",
  chapter: "단원",
  lesson: "차시",
};
const scopeById = new Map(STEP1_SCOPES.map((scope) => [scope.id, scope]));

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.panel}>
      <header className={`${s.panelHead} ${t.panelHead}`}>
        <h4>{title}</h4>
      </header>
      {children}
    </section>
  );
}

export function StepOneScreen({ variant }: { variant: Step1Variant }) {
  const id = useId();
  const frame = useRef<HTMLElement>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const gradeOpener = useRef<HTMLButtonElement>(null);
  const chapterOpener = useRef<HTMLButtonElement>(null);
  const lessonOpener = useRef<HTMLButtonElement>(null);
  const [grade, setGrade] = useState("");
  const [chapter, setChapter] = useState("");
  const [stage, setStage] = useState<Stage>("grade");
  const [picker, setPicker] = useState<Stage | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [listState, setListState] = useState<ListState>("ready");
  const [selection, setSelection] = useState<ScopeSelection>({
    ids: [],
    counts: {},
    fixed: {},
    source: "all",
  });
  const [values, setValues] = useState(() => initialConditions(40));
  const [presets, setPresets] = useState<SavedPreview[]>([]);
  const [appliedName, setAppliedName] = useState("");
  const chapters = [
    ...new Set(
      STEP1_SCOPES.filter((row) => row.grade === grade).map(
        (row) => row.chapter,
      ),
    ),
  ];
  const lessons = STEP1_SCOPES.filter(
    (row) => row.grade === grade && row.chapter === chapter,
  );
  const matching = lessons.filter((row) => row.name.includes(query.trim()));
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(matching.length / 20) - 1),
  );
  const selected = selection.ids.flatMap((scopeId) => {
    const scope = scopeById.get(scopeId);
    return scope ? [scope] : [];
  });
  const rowTotal = selected.reduce(
    (sum, row) => sum + (selection.counts[row.id] ?? 1),
    0,
  );
  const total = values.total ?? rowTotal;
  const plan = planComposition(
    { ...values, fixed: selection.fixed },
    selected.map((row) => ({
      scopeId: row.id,
      label: `${row.grade} · ${row.name}`,
      count: selection.counts[row.id] ?? 1,
      usable: row.available,
    })),
    { ladder: TIERS, max: 100 },
  );
  const invalidRow = selected.some((row) => {
    const count = selection.counts[row.id];
    return !Number.isSafeInteger(count) || count < 0 || count > row.available;
  });
  const reason = !selected.length
    ? "출제할 범위를 한 개 이상 골라 주세요."
    : invalidRow
      ? "범위별 문항 수를 출제 가능한 수 안에서 정해 주세요."
      : (conditionInputError(values) ??
        plan.block[0] ??
        (total < 1 || total > 100
          ? "문항 수를 1~100문항으로 정해 주세요."
          : null));
  const moveTo = (next: Stage) => {
    if (variant.id === "S2" || variant.id === "S3")
      setFocusRequest((request) => request + 1);
    setStage(next);
  };
  useLayoutEffect(() => {
    if (!focusRequest) return;
    frame.current
      ?.querySelector<HTMLElement>(`[data-step1-stage="${stage}"] h5`)
      ?.focus();
  }, [grade, chapter, stage, focusRequest]);

  const chooseGrade = (next: string) => {
    setGrade(next);
    setChapter("");
    setQuery("");
    setPage(0);
    moveTo("chapter");
    setPicker(null);
  };
  const chooseChapter = (next: string) => {
    setChapter(next);
    setQuery("");
    setPage(0);
    moveTo("lesson");
    setPicker(null);
  };
  const toggleScope = (scopeId: string, checked: boolean) => {
    setSelection((previous) => ({
      ...previous,
      ids: checked
        ? [...new Set([...previous.ids, scopeId])]
        : previous.ids.filter((item) => item !== scopeId),
      counts: { ...previous.counts, [scopeId]: previous.counts[scopeId] ?? 1 },
    }));
  };
  const savedProps = {
    values,
    selection,
    presets,
    setPresets,
    scopeSummary: (saved: ScopeSelection) =>
      [
        ...new Set(
          saved.ids.flatMap((scopeId) => scopeById.get(scopeId)?.grade ?? []),
        ),
      ].join(" · ") || "범위 없음",
    apply: (saved: SavedPreview) => {
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
      const last = scopeById.get(saved.selection.ids.at(-1) ?? "");
      setGrade(last?.grade ?? "");
      setChapter(last?.chapter ?? "");
      setStage(last ? "lesson" : "grade");
      setQuery("");
      setPage(0);
    },
  };

  const list = (current: Stage) => (
    <section
      className={t.stage}
      data-step1-stage={current}
      aria-labelledby={`${id}-${current}`}
    >
      <h5 id={`${id}-${current}`} tabIndex={-1}>
        {STAGE_NAMES[current]}
      </h5>
      {listState !== "ready" ? (
        <ListFeedback
          state={listState}
          noun={`${STAGE_NAMES[current]} 목록`}
          retry={() => setListState("ready")}
        />
      ) : (
        <>
          {current === "lesson" && (
            <label className={`${s.field} ${t.search}`}>
              <span>차시 검색</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
              />
            </label>
          )}
          <div
            className={t.list}
            role="region"
            aria-label={`${variant.id} ${STAGE_NAMES[current]} 목록`}
            tabIndex={0}
          >
            {current === "grade" &&
              STEP1_GRADES.map((item) => (
                <button
                  type="button"
                  key={item}
                  data-scope-grade={item}
                  aria-pressed={grade === item}
                  onClick={() => chooseGrade(item)}
                >
                  {item}
                </button>
              ))}
            {current === "chapter" &&
              chapters.map((item) => (
                <button
                  type="button"
                  key={item}
                  data-scope-chapter={item}
                  aria-pressed={chapter === item}
                  onClick={() => chooseChapter(item)}
                >
                  {item}
                </button>
              ))}
            {current === "lesson" &&
              matching
                .slice(currentPage * 20, (currentPage + 1) * 20)
                .map((row) => (
                  <label
                    key={row.id}
                    className={t.lesson}
                    data-scope-lesson={row.id}
                  >
                    <input
                      type="checkbox"
                      checked={selection.ids.includes(row.id)}
                      onChange={(event) =>
                        toggleScope(row.id, event.target.checked)
                      }
                    />
                    <span>{row.name}</span>
                  </label>
                ))}
            {current === "lesson" && matching.length === 0 && (
              <p className={t.empty}>검색 결과가 없습니다.</p>
            )}
          </div>
          {current === "lesson" && matching.length > 20 && (
            <div className={s.pagination}>
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                이전 차시
              </button>
              <span>
                {currentPage * 20 + 1}–
                {Math.min((currentPage + 1) * 20, matching.length)} /{" "}
                {matching.length}
              </span>
              <button
                type="button"
                disabled={(currentPage + 1) * 20 >= matching.length}
                onClick={() => setPage(currentPage + 1)}
              >
                다음 차시
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );

  const collapsed = (current: "grade" | "chapter", value: string) => (
    <div className={t.collapsed}>
      <span>{STAGE_NAMES[current]}</span>
      <strong>{value}</strong>
      <button
        type="button"
        aria-label={`${STAGE_NAMES[current]} 변경`}
        onClick={() => moveTo(current)}
      >
        변경
      </button>
    </div>
  );

  return (
    <figure
      ref={frame}
      className={s.frame}
      id={`${variant.id}-1`}
      data-hifi-screen={`${variant.id}-1`}
      data-step1-screen={variant.id}
    >
      <figcaption className={s.frameCaption}>
        <strong>
          {variant.id} · 1단계 <span>범위 설정</span>
        </strong>
        <div className={s.previewControls}>
          <label>
            목록 상태
            <select
              data-preview-loading
              aria-label={`${variant.id} 1단계 목록 상태`}
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
        </div>
      </figcaption>
      <div className={`${s.screen} ${t.screen}`}>
        <header className={`${s.screenHead} ${t.screenHead}`}>
          <div>
            <span className={s.eyebrow}>오늘의수학</span>
            <h3>시험지 만들기</h3>
          </div>
          <ol className={s.steps} aria-label="제작 단계">
            <li aria-current="step">
              <a href={`#${variant.id}-1`}>
                <span>1</span>범위 설정
              </a>
            </li>
            <li>
              <a href="#H2-2">
                <span>2</span>문항 검토
              </a>
            </li>
            <li>
              <span className={s.futureStep}>
                <span>3</span>양식 구성·출력
              </span>
            </li>
          </ol>
        </header>
        <div className={s.titleRow}>
          <label className={s.titleField}>
            <span>제목</span>
            <input data-screen-title defaultValue="3학년 덧셈과 뺄셈 확인" />
          </label>
          <SavedConditionsDialog
            label={`저장한 조건 · ${presets.length}`}
            {...savedProps}
          />
        </div>
        <p className={s.appliedLine} role="status">
          출제 조건 · {appliedName ? `${appliedName} 적용함` : "직접 정함"}
        </p>
        <div className={s.scopeLayout} data-scope-layout>
          <Panel title="출제할 범위">
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
                <label className={s.field}>
                  <span>책</span>
                  <select>
                    <option>{grade || "수학"} 교과서 (예시)</option>
                  </select>
                </label>
                <label className={s.field}>
                  <span>자료 종류</span>
                  <select>
                    <option>전체</option>
                    <option>단원 평가</option>
                    <option>차시 평가</option>
                  </select>
                </label>
              </div>
            )}
            <div className={t.browser} data-scope-browser>
              {variant.id === "S1" && (
                <div
                  className={t.columns}
                  data-columns={chapter ? 3 : grade ? 2 : 1}
                >
                  {list("grade")}
                  {grade && list("chapter")}
                  {chapter && list("lesson")}
                </div>
              )}
              {variant.id === "S2" && (
                <div className={t.sequence}>
                  {stage === "grade"
                    ? list("grade")
                    : collapsed("grade", grade)}
                  {grade &&
                    stage !== "grade" &&
                    (stage === "chapter"
                      ? list("chapter")
                      : collapsed("chapter", chapter))}
                  {chapter && stage === "lesson" && list("lesson")}
                </div>
              )}
              {variant.id === "S3" && (
                <>
                  <nav className={t.path} aria-label="범위 경로">
                    <button
                      type="button"
                      aria-current={stage === "grade" ? "step" : undefined}
                      onClick={() => moveTo("grade")}
                    >
                      {grade || "학년·과정"}
                    </button>
                    {grade && (
                      <>
                        <span aria-hidden="true">›</span>
                        <button
                          type="button"
                          aria-current={
                            stage === "chapter" ? "step" : undefined
                          }
                          onClick={() => moveTo("chapter")}
                        >
                          {chapter || "단원"}
                        </button>
                      </>
                    )}
                    {chapter && (
                      <>
                        <span aria-hidden="true">›</span>
                        <button
                          type="button"
                          aria-current={stage === "lesson" ? "step" : undefined}
                          onClick={() => moveTo("lesson")}
                        >
                          차시
                        </button>
                      </>
                    )}
                  </nav>
                  {list(stage)}
                </>
              )}
              {variant.id === "S4" && (
                <>
                  {listState !== "ready" && !picker && (
                    <ListFeedback
                      state={listState}
                      noun="범위 목록"
                      retry={() => setListState("ready")}
                    />
                  )}
                  {(
                    [
                      "grade",
                      ...(grade ? ["chapter"] : []),
                      ...(chapter ? ["lesson"] : []),
                    ] as Stage[]
                  ).map((current) => (
                    <div className={t.pickerRow} key={current}>
                      <span>{STAGE_NAMES[current]}</span>
                      <strong>
                        {current === "grade"
                          ? grade || "선택 안 함"
                          : current === "chapter"
                            ? chapter || "선택 안 함"
                            : `${lessons.filter((row) => selection.ids.includes(row.id)).length}개 선택`}
                      </strong>
                      <button
                        ref={
                          current === "grade"
                            ? gradeOpener
                            : current === "chapter"
                              ? chapterOpener
                              : lessonOpener
                        }
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={`${STAGE_NAMES[current]} 고르기`}
                        onClick={() => setPicker(current)}
                      >
                        고르기
                      </button>
                    </div>
                  ))}
                  {picker && (
                    <PickerDialog
                      title={`${STAGE_NAMES[picker]} 고르기`}
                      doneLabel="닫기"
                      doneTone="plain"
                      returnFocus={
                        picker === "grade"
                          ? gradeOpener
                          : picker === "chapter"
                            ? chapterOpener
                            : lessonOpener
                      }
                      onClose={() => setPicker(null)}
                    >
                      {list(picker)}
                    </PickerDialog>
                  )}
                </>
              )}
            </div>
          </Panel>
          <aside className={s.conditionRail}>
            <Panel title={`출제 범위 · ${selected.length}개`}>
              <div
                className={t.selected}
                data-selected-scopes
                aria-live="polite"
              >
                {selected.length ? (
                  selected.map((row) => (
                    <article
                      className={t.selectedRow}
                      key={row.id}
                      data-selected-scope={row.id}
                    >
                      <span>
                        <small>
                          {row.grade} · {row.chapter}
                        </small>
                        {row.name}
                      </span>
                      <label className={s.field}>
                        <span>문항 수</span>
                        <input
                          aria-label={`${row.grade} ${row.name} 문항 수`}
                          type="number"
                          min={0}
                          max={row.available}
                          value={selection.counts[row.id] ?? 1}
                          onChange={(event) =>
                            setSelection({
                              ...selection,
                              counts: {
                                ...selection.counts,
                                [row.id]: Number(event.target.value),
                              },
                              fixed: { ...selection.fixed, [row.id]: true },
                            })
                          }
                        />
                      </label>
                      <label className={s.check}>
                        <input
                          type="checkbox"
                          aria-label={`${row.grade} ${row.name} 고정`}
                          checked={selection.fixed[row.id] ?? false}
                          onChange={(event) =>
                            setSelection({
                              ...selection,
                              fixed: {
                                ...selection.fixed,
                                [row.id]: event.target.checked,
                              },
                            })
                          }
                        />
                        고정
                      </label>
                      <button
                        type="button"
                        aria-label={`${row.grade} ${row.name} 빼기`}
                        onClick={() => toggleScope(row.id, false)}
                      >
                        빼기
                      </button>
                    </article>
                  ))
                ) : (
                  <p className={t.empty}>출제할 차시를 골라 주세요.</p>
                )}
              </div>
            </Panel>
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
                  lessons={STEP1_SCOPES}
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
                {reason && (
                  <p className={s.error} id={`${id}-reason`} role="alert">
                    {reason}
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
                {reason ? (
                  <button
                    type="button"
                    className={s.primary}
                    disabled
                    aria-describedby={`${id}-reason`}
                  >
                    문항 구성
                  </button>
                ) : (
                  <a className={s.primary} href="#H2-2">
                    문항 구성
                  </a>
                )}
              </footer>
            </Panel>
          </aside>
        </div>
      </div>
    </figure>
  );
}

export function StepOneVariants() {
  return (
    <section
      id="H2-step1"
      className={`${s.option} ${t.root}`}
      aria-labelledby="h2-step1-heading"
    >
      <header className={s.optionHead}>
        <div>
          <p className={s.optionNumber}>H2 · 1단계</p>
          <h2 id="h2-step1-heading">범위 선택, 차근차근</h2>
        </div>
        <nav aria-label="확정된 문항 검토">
          <a href="#H2-2">H2 · 2단계</a>
        </nav>
      </header>
      <p className={s.idea}>
        학년·과정부터 고르는 네 가지 안입니다. 2단계는 확정된 H2를 이어 봅니다.
      </p>
      <nav className={s.galleryNav} aria-label="H2 1단계 안 바로 가기">
        {STEP1_VARIANTS.map((variant) => (
          <a key={variant.id} href={`#${variant.id}`}>
            <strong>{variant.id}</strong>
            <span>{variant.name}</span>
          </a>
        ))}
      </nav>
      <p className={s.galleryNote}>
        기존 교육과정 {STEP1_SCOPES.length}차시를 사용합니다. 문항 수·책은
        시안용 예시이며 선택은 이 화면에만 유지됩니다.
      </p>
      {STEP1_VARIANTS.map((variant) => (
        <section
          key={variant.id}
          id={variant.id}
          className={t.variant}
          data-step1-option={variant.id}
        >
          <h3>
            {variant.id} · {variant.name}
          </h3>
          <p className={s.idea}>{variant.idea}</p>
          <p className={s.weakness}>
            <strong>약점</strong>
            {variant.weakness}
          </p>
          <StepOneScreen variant={variant} />
        </section>
      ))}
    </section>
  );
}
