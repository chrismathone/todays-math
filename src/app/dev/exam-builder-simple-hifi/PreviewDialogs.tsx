"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import {
  matchingStep,
  planComposition,
  stepLadder,
  type AppliedConditions,
  type Ladder,
} from "../../../components/exam-builder/conditionsPlan";
import {
  FORMATS,
  LESSONS,
  TIERS,
  conditionInputError,
  pickSaved,
  type ListState,
  type PreviewQuestion,
  type SavedPreview,
  type ScopeSelection,
} from "./fixtures";
import s from "./SimpleHifi.module.css";

/** Native modal supplies focus containment, Escape and top-layer placement. */
export function DialogButton({
  label,
  title,
  primary = false,
  buttonId,
  onOpen,
  children,
}: {
  label: string;
  title: string;
  primary?: boolean;
  buttonId?: string;
  onOpen?: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => {
    const element = document.getElementById(`${id}-dialog`);
    if (element instanceof HTMLDialogElement) element.close();
  };
  return (
    <>
      <button
        type="button"
        id={buttonId}
        ref={opener}
        className={primary ? s.primary : undefined}
        onClick={() => {
          onOpen?.();
          dialog.current?.showModal();
        }}
      >
        {label}
      </button>
      <dialog
        id={`${id}-dialog`}
        className={s.dialog}
        ref={dialog}
        aria-labelledby={id}
        onClose={() => opener.current?.focus()}
      >
        <header className={s.dialogHead}>
          <h3 id={id}>{title}</h3>
          <button type="button" onClick={close}>
            닫기
          </button>
        </header>
        {children(close)}
      </dialog>
    </>
  );
}

export function ListFeedback({
  state,
  noun,
  retry,
}: {
  state: Exclude<ListState, "ready">;
  noun: string;
  retry: () => void;
}) {
  return (
    <div
      className={s.listFeedback}
      data-list-state={state}
      role={state === "error" ? "alert" : "status"}
    >
      {state === "loading" ? (
        <>
          <span className={s.loadingLine} aria-hidden="true" />
          <strong>{noun}을 불러오는 중입니다.</strong>
          <span>선택은 유지됩니다.</span>
        </>
      ) : (
        <>
          <strong>목록을 불러오지 못했습니다.</strong>
          <span>선택은 유지됩니다.</span>
          <button type="button" onClick={retry}>
            다시 불러오기
          </button>
        </>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  change,
  max = 100,
}: {
  label: string;
  value: number | null;
  change: (value: number | null) => void;
  max?: number;
}) {
  return (
    <label className={s.numberField}>
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        placeholder="–"
        value={value ?? ""}
        onChange={(event) =>
          change(event.target.value === "" ? null : Number(event.target.value))
        }
      />
    </label>
  );
}

export function ConditionFields({
  values,
  onChange,
  rowTotal,
}: {
  values: AppliedConditions;
  onChange: (next: AppliedConditions) => void;
  rowTotal: number;
}) {
  const [manual, setManual] = useState(false);
  const total = values.total ?? rowTotal;
  const step = matchingStep(values.ladder, total, TIERS);
  const ladderChange = (
    key: string,
    value: number | null,
    field: "ladder" | "formats",
  ) => onChange({ ...values, [field]: { ...values[field], [key]: value } });
  return (
    <div className={s.conditionFields}>
      <div className={s.totalControl}>
        <NumberField
          label="총 문항 수"
          value={values.total}
          change={(value) => onChange({ ...values, total: value })}
        />
        <span className={s.caption}>비우면 범위별 수의 합으로 구성합니다.</span>
        <div className={s.presets} aria-label="총 문항 수 빠른 선택">
          {[25, 50, 75, 100].map((count) => (
            <button
              type="button"
              key={count}
              aria-pressed={values.total === count}
              onClick={() => onChange({ ...values, total: count })}
            >
              {count}
            </button>
          ))}
        </div>
      </div>
      <fieldset className={s.fieldset}>
        <legend>
          난이도{" "}
          <span className={s.caption}>
            {step === null ? "직접" : `${step + 1}단계`}
          </span>
        </legend>
        <div className={s.stepChoices} aria-label="난이도 단계">
          {[1, 2, 3, 4, 5, 6].map((number) => (
            <button
              type="button"
              key={number}
              aria-pressed={step === number - 1}
              disabled={
                !Number.isSafeInteger(total) || total < 1 || total > 100
              }
              onClick={() =>
                onChange({
                  ...values,
                  ladder: stepLadder(number - 1, total, TIERS),
                })
              }
            >
              {number}단계
            </button>
          ))}
        </div>
        <button
          type="button"
          className={s.textButton}
          aria-expanded={manual}
          onClick={() => setManual(!manual)}
        >
          직접 · 난이도별 수 {manual ? "접기" : "펼치기"}
        </button>
        {manual && (
          <div className={s.numberGrid}>
            {TIERS.map((tier) => (
              <NumberField
                key={tier}
                label={tier}
                value={values.ladder[tier]}
                change={(value) => ladderChange(tier, value, "ladder")}
              />
            ))}
          </div>
        )}
      </fieldset>
      <details className={s.disclosure}>
        <summary>
          형식별 수 <span className={s.caption}>객관식 · 단답형 · 서술형</span>
        </summary>
        <div className={s.numberGrid}>
          {FORMATS.map((format) => (
            <NumberField
              key={format}
              label={format}
              value={values.formats[format]}
              change={(value) => ladderChange(format, value, "formats")}
            />
          ))}
        </div>
        <p className={s.caption}>‘–’는 지정 없음 · 0은 내지 않음</p>
      </details>
      <label className={s.check}>
        <input
          type="checkbox"
          checked={values.recent}
          onChange={(event) =>
            onChange({ ...values, recent: event.target.checked })
          }
        />
        최근 14일 출제 빼기
      </label>
      <details className={s.disclosure}>
        <summary>추가 선택</summary>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={values.mcFirst}
            onChange={(event) =>
              onChange({ ...values, mcFirst: event.target.checked })
            }
          />
          객관식을 앞에
        </label>
        <p className={s.caption}>같은 문항류는 하나만 담습니다.</p>
        <ExtraSources />
      </details>
    </div>
  );
}

function ExtraSources() {
  const [source, setSource] = useState("전체");
  return (
    <label className={s.field}>
      <span>추가 출처 제한</span>
      <select
        value={source}
        onChange={(event) => setSource(event.target.value)}
      >
        {["전체", "엔진만", "기출만", "그 밖만"].map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

export function ConditionsDialog({
  values,
  selection,
  onApply,
  buttonId,
  lessons = LESSONS,
}: {
  values: AppliedConditions;
  selection: ScopeSelection;
  onApply: (values: AppliedConditions, selection: ScopeSelection) => void;
  buttonId?: string;
  lessons?: readonly { id: string; name: string; available: number }[];
}) {
  const [draft, setDraft] = useState(values);
  const [fixed, setFixed] = useState(selection.fixed);
  const rows = lessons
    .filter((lesson) => selection.ids.includes(lesson.id))
    .map((lesson) => ({
      scopeId: lesson.id,
      label: lesson.name,
      count: selection.counts[lesson.id] ?? 1,
      usable: lesson.available,
    }));
  const plan = planComposition({ ...draft, fixed }, rows, {
    ladder: TIERS,
    max: 100,
  });
  const errors = [
    ...(conditionInputError(draft) ? [conditionInputError(draft)!] : []),
    ...plan.block,
  ];
  return (
    <DialogButton
      label="구성 조건"
      title="구성 조건"
      buttonId={buttonId}
      onOpen={() => {
        setDraft(values);
        setFixed(selection.fixed);
      }}
    >
      {(close) => (
        <>
          <div className={s.conditionDialog}>
            <ConditionFields
              values={draft}
              onChange={setDraft}
              rowTotal={rows.reduce((sum, row) => sum + row.count, 0)}
            />
            <section className={s.allocation} aria-label="적용하면 구성할 수">
              <h4>
                적용하면 구성할 수 <strong>{plan.total}문항</strong>
              </h4>
              {plan.rows.map((row) => (
                <div className={s.allocationRow} key={row.scopeId}>
                  <span>{row.label}</span>
                  <strong>{row.next}문항</strong>
                  <label className={s.check}>
                    <input
                      type="checkbox"
                      checked={fixed[row.scopeId] ?? false}
                      onChange={(event) =>
                        setFixed({
                          ...fixed,
                          [row.scopeId]: event.target.checked,
                        })
                      }
                    />
                    고정
                  </label>
                </div>
              ))}
              <p className={s.caption}>
                고정하지 않은 행만 다시 나눕니다. 모자란 범위는 다른 범위에서
                채우지 않습니다.
              </p>
              {plan.note.map((message) => (
                <p className={s.notice} key={message}>
                  {message}
                </p>
              ))}
              {errors.length > 0 && (
                <div className={s.error} role="alert">
                  {errors.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </div>
              )}
            </section>
          </div>
          <footer className={s.dialogFoot}>
            <button type="button" onClick={close}>
              취소
            </button>
            <button
              type="button"
              className={s.primary}
              disabled={errors.length > 0}
              onClick={() => {
                onApply(draft, {
                  ...selection,
                  fixed,
                  counts: {
                    ...selection.counts,
                    ...Object.fromEntries(
                      plan.rows.map((row) => [row.scopeId, row.next]),
                    ),
                  },
                });
                close();
              }}
            >
              적용
            </button>
          </footer>
        </>
      )}
    </DialogButton>
  );
}

export function SavedConditionsDialog({
  label,
  values,
  selection,
  presets,
  setPresets,
  apply,
  scopeSummary,
}: {
  label: string;
  values: AppliedConditions;
  selection: ScopeSelection;
  presets: SavedPreview[];
  setPresets: (next: SavedPreview[]) => void;
  apply: (saved: SavedPreview) => void;
  scopeSummary?: (selection: ScopeSelection) => string;
}) {
  const [rename, setRename] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <DialogButton
      label={label}
      title="저장한 조건"
      onOpen={() => {
        setRename(null);
        setDeleteId(null);
        setNotice("");
      }}
    >
      {(close) => (
        <>
          <div className={s.dialogBody}>
            <p className={s.caption}>
              출처·범위·문항 수·난이도·최근 출제 조건을 가져옵니다. 형식과
              차례는 지금 값을 유지합니다.
            </p>
            <div className={s.savedList}>
              {presets.map((saved) => (
                <article key={saved.id}>
                  <strong>{saved.name}</strong>
                  <p className={s.caption}>
                    {scopeSummary?.(saved.selection) ?? "초3 · 덧셈과 뺄셈"} ·{" "}
                    {saved.selection.ids.length}범위 ·{" "}
                    {saved.selection.source === "all"
                      ? "전체 출처"
                      : "교과서만"}
                  </p>
                  <p>
                    {saved.total ?? "지정 없음"}문항 ·{" "}
                    {ladderSummary(saved.ladder)} ·{" "}
                    {saved.recent ? "최근 14일 출제 뺌" : "최근 출제 포함"}
                  </p>
                  {rename === saved.id ? (
                    <form
                      className={s.inlineForm}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!name.trim()) return;
                        setPresets(
                          presets.map((item) =>
                            item.id === saved.id
                              ? { ...item, name: name.trim() }
                              : item,
                          ),
                        );
                        setRename(null);
                      }}
                    >
                      <label className={s.field}>
                        <span>새 조건 이름</span>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </label>
                      <button type="submit" disabled={!name.trim()}>
                        이름 변경
                      </button>
                      <button type="button" onClick={() => setRename(null)}>
                        취소
                      </button>
                    </form>
                  ) : (
                    <div className={s.row}>
                      <button
                        type="button"
                        onClick={() => {
                          apply(saved);
                          close();
                        }}
                      >
                        적용
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRename(saved.id);
                          setName(saved.name);
                        }}
                      >
                        이름 바꾸기
                      </button>
                      <button
                        type="button"
                        className={s.dangerButton}
                        onClick={() => setDeleteId(saved.id)}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                  {deleteId === saved.id && (
                    <div className={s.deleteConfirm}>
                      <p>‘{saved.name}’ 조건을 삭제할까요?</p>
                      <div className={s.row}>
                        <button type="button" onClick={() => setDeleteId(null)}>
                          취소
                        </button>
                        <button
                          type="button"
                          className={s.dangerButton}
                          onClick={() => {
                            setPresets(
                              presets.filter((item) => item.id !== saved.id),
                            );
                            setDeleteId(null);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
            <form
              className={s.saveForm}
              onSubmit={(event) => {
                event.preventDefault();
                if (!newName.trim()) return;
                setPresets([
                  ...presets,
                  {
                    id: crypto.randomUUID(),
                    name: newName.trim(),
                    selection: {
                      ...selection,
                      ids: [...selection.ids],
                      counts: { ...selection.counts },
                      fixed: { ...selection.fixed },
                    },
                    ...pickSaved(values),
                  },
                ]);
                setNewName("");
                setNotice("현재 조건을 이 시안에 보관했습니다.");
              }}
            >
              <label className={s.field}>
                <span>현재 조건 이름</span>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="예: 초3 덧셈·뺄셈 확인"
                />
              </label>
              <button
                type="submit"
                disabled={!newName.trim() || !!conditionInputError(values)}
              >
                조건 저장
              </button>
            </form>
            <p className={s.caption}>
              문항은 저장하지 않습니다. 적용 후 문항을 다시 구성합니다.
            </p>
            <p role="status">{notice}</p>
          </div>
          <footer className={s.dialogFoot}>
            <button type="button" onClick={close}>
              닫기
            </button>
          </footer>
        </>
      )}
    </DialogButton>
  );
}

export function ladderSummary(ladder: Ladder) {
  const specified = TIERS.filter((tier) => ladder[tier] !== null);
  return specified.length
    ? specified.map((tier) => `${tier} ${ladder[tier]}`).join(" · ")
    : "난이도 지정 없음";
}

export function QuestionBody({ question }: { question: PreviewQuestion }) {
  return (
    <div className={s.questionBody}>
      <p>
        {question.a} {question.subtract ? "−" : "+"} {question.b}를 계산하시오.
        {question.format === "서술형" ? " 계산 과정을 쓰시오." : ""}
      </p>
      {question.format === "객관식" ? (
        <div className={s.choices}>
          {[-20, -10, 0, 10, 20].map((delta, index) => (
            <span key={delta}>
              {["①", "②", "③", "④", "⑤"][index]} {question.answer + delta}
            </span>
          ))}
        </div>
      ) : (
        <div className={s.answerSpace} aria-label="풀이 공간" />
      )}
    </div>
  );
}

export function CandidateDialog({
  original,
  slot,
  mode = "replace",
  state,
  retry,
  onChoose,
  buttonId,
}: {
  original: PreviewQuestion;
  slot: number;
  mode?: "replace" | "add";
  state: ListState;
  retry: () => void;
  onChoose: (question: PreviewQuestion) => void;
  buttonId?: string;
}) {
  const [layer, setLayer] = useState("family");
  const [chosen, setChosen] = useState<number | null>(null);
  const [tier, setTier] = useState<PreviewQuestion["tier"]>(original.tier);
  const candidates = [1, 2, 3, 4].map((delta) => ({
    ...original,
    id: `${original.id}-candidate-${delta}`,
    tier: layer === "family" ? original.tier : tier,
    a: original.a + delta * 10,
    answer: original.answer + delta * 10,
  }));
  const candidate = chosen === null ? null : candidates[chosen];
  return (
    <DialogButton
      label={mode === "add" ? "문항 추가" : "비슷한 문항으로 교체"}
      buttonId={buttonId}
      title={
        mode === "add"
          ? "문항 추가"
          : `${String(slot).padStart(2, "0")}번 문항 교체`
      }
      onOpen={() => {
        setChosen(null);
        setLayer("family");
        setTier(original.tier);
      }}
    >
      {(close) => (
        <>
          <div className={s.dialogTools}>
            <div className={s.segments} aria-label="교체 후보 범위">
              <button
                type="button"
                aria-pressed={layer === "family"}
                onClick={() => {
                  setLayer("family");
                  setChosen(null);
                }}
              >
                같은 문항류
              </button>
              <button
                type="button"
                aria-pressed={layer === "others"}
                onClick={() => {
                  setLayer("others");
                  setChosen(null);
                }}
              >
                같은 차시의 다른 문항
              </button>
            </div>
            {layer === "others" && (
              <label className={s.field}>
                <span>난이도</span>
                <select
                  value={tier}
                  onChange={(event) => {
                    setTier(event.target.value as PreviewQuestion["tier"]);
                    setChosen(null);
                  }}
                >
                  {TIERS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className={s.replaceDialog}>
            <div className={s.compare}>
              <section>
                <h4>{mode === "add" ? "기준 문항" : "바꿀 문항"}</h4>
                <p className={s.caption}>{original.lesson.name}</p>
                <QuestionBody question={original} />
              </section>
              <section>
                <h4>선택한 후보</h4>
                {candidate ? (
                  <QuestionBody question={candidate} />
                ) : (
                  <p className={s.caption}>
                    오른쪽 후보에서 대조할 문항을 골라 주세요.
                  </p>
                )}
              </section>
            </div>
            <section className={s.candidates} aria-label="후보 목록">
              <h4>
                후보 {state === "ready" ? `${candidates.length}문항` : "목록"}
              </h4>
              {state !== "ready" ? (
                <ListFeedback state={state} noun="후보 목록" retry={retry} />
              ) : (
                candidates.map((question, index) => (
                  <article key={question.id} data-selected={chosen === index}>
                    <span className={s.caption}>
                      {question.format} · {question.tier}
                    </span>
                    <p>
                      {question.a} {question.subtract ? "−" : "+"} {question.b}
                      를 계산하시오.
                    </p>
                    <button
                      type="button"
                      aria-pressed={chosen === index}
                      onClick={() => setChosen(index)}
                    >
                      {chosen === index ? "대조 중" : "대조"}
                    </button>
                  </article>
                ))
              )}
            </section>
          </div>
          <footer className={s.dialogFoot}>
            <span className={s.caption}>
              지정 복습 변형은 교과서 문항의 별도 조작으로 유지합니다.
            </span>
            <button type="button" onClick={close}>
              취소
            </button>
            <button
              type="button"
              className={s.primary}
              disabled={!candidate || state !== "ready"}
              onClick={() => {
                if (!candidate) return;
                onChoose(candidate);
                close();
              }}
            >
              {mode === "add" ? "이 문항 담기" : "이 문항으로 교체"}
            </button>
          </footer>
        </>
      )}
    </DialogButton>
  );
}
