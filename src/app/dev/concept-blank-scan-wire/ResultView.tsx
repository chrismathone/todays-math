"use client";

import { useState } from "react";
import {
  CONCEPT_BLANK_FORMS,
  CONCEPT_BLANK_FORM_LABELS,
  type ConceptBlankForm,
} from "@/contracts/conceptBlank.contract";
import {
  KeySentence,
  PaperText,
} from "@/components/concept-blank/paper/PaperParts";
import {
  planSheet,
  type KeyRow,
} from "@/components/concept-blank/paper/paginate";
import {
  termAnswer,
  termPrompt,
  clozeSentence,
} from "@/lib/concept-blank/questions";
import { PAPER_OPTIONS, READ_OPTIONS } from "./options";
import { MarkedPhoto, readingFields, type ManualAnswers } from "./ReadAnswers";
import { SampleStrip } from "./WirePaper";
import type { WireSample } from "./samples";
import s from "./scanWire.module.css";

const VERDICTS = ["○", "△", "×", "확인 필요"] as const;
type Verdict = (typeof VERDICTS)[number];
const FORM_NOTES: Record<ConceptBlankForm, string> = {
  recall:
    "A · 소단원 백지에서 드러난 개념을 하나씩 대조합니다. 쓰기 칸 수를 문항 수로 세지 않습니다.",
  term: "B · 개념 질문의 답과 ○×의 까닭을 구분합니다. 핵심 내용 일부만 드러난 경우 △를 표시하는 안입니다.",
  cloze:
    "C · 문장 속 빈칸과 적용 문항을 구별합니다. 빈칸별 세부 판정과 문항 판정의 합산은 미정입니다.",
  map: "D · 이 고르기는 질문 지도입니다. 가지마다 답을 대조하며, 옛 뜻·예 지도와 구별합니다.",
  figure:
    "E · 같은 그림 안의 이름표와 설명 줄을 따로 확인합니다. 각 칸의 결과를 문항으로 합치는 규칙은 미정입니다.",
};

function rowContent(
  row: KeyRow,
  form: ConceptBlankForm,
): { id: string; label: string; prompt: string; answer: string }[] {
  if (row.kind === "concept")
    return [
      {
        id: row.entry.id,
        label:
          form === "recall"
            ? `개념 ${row.n}`
            : form === "map"
              ? `가지 ${row.n}`
              : `문 ${row.n}`,
        prompt:
          form === "cloze"
            ? clozeSentence(row.entry)
            : form === "recall"
              ? row.entry.term
              : termPrompt(row.entry),
        answer:
          form === "recall"
            ? row.entry.definition
            : form === "cloze"
              ? clozeSentence(row.entry)
              : termAnswer(row.entry),
      },
    ];
  if (row.kind === "figure")
    return [
      ...row.item.tags.map((tag, i) => ({
        id: `${row.item.id}:tag:${i}`,
        label: `문 ${row.n} · 이름표 ${i + 1}`,
        prompt: row.item.prompt,
        answer: tag.answer,
      })),
      ...row.item.lines.map((line, i) => ({
        id: `${row.item.id}:line:${i}`,
        label: `문 ${row.n} · 설명 ${i + 1}`,
        prompt: line.label,
        answer: line.answer,
      })),
    ];
  return [
    {
      id: row.item.id,
      label: `문 ${row.n} · ${row.kind === "ox" ? "○×와 까닭" : "적용"}`,
      prompt: row.kind === "ox" ? row.item.statement : row.item.prompt,
      answer:
        row.kind === "ox"
          ? `${row.item.answer ? "참" : "거짓"} · ${row.item.why}`
          : row.item.answer,
    },
  ];
}

export function ResultView({
  sample,
  readingSample,
  variant,
  manual,
  allowAfter,
  onRead,
}: {
  sample: WireSample;
  readingSample: WireSample;
  variant: string;
  manual: ManualAnswers;
  allowAfter: boolean;
  onRead: () => void;
}) {
  const [role, setRole] = useState("student");
  const [state, setState] = useState("done");
  const [form, setForm] = useState<ConceptBlankForm>("term");
  const [edits, setEdits] = useState<Record<string, Verdict>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Verdict>("○");
  const [reason, setReason] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const sheet = sample.sheets.find((sh) => sh.form === form)!;
  const rows = planSheet(sheet)
    .key.flat()
    .flatMap((row) => rowContent(row, form))
    .map((row, i) => ({
      ...row,
      key: `${form}:${row.id}`,
      verdict: edits[`${form}:${row.id}`] ?? VERDICTS[i % VERDICTS.length],
    }));
  const ordered =
    variant === "R3"
      ? [
          ...rows.filter((row) => row.verdict === "확인 필요"),
          ...rows.filter((row) => row.verdict !== "확인 필요"),
        ]
      : rows;
  const directFields = readingFields(readingSample).map((fields) =>
    fields.filter((field) => manual[field.id]?.trim()),
  );
  const manualCount = directFields.flat().length;
  return (
    <>
      <div className={s.controls}>
        <label>
          보는 계정
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">학생 · 폰</option>
            <option value="teacher">교사 · 넓은 화면</option>
          </select>
        </label>
        <label>
          채점 상태
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="done">결과 공개</option>
            <option value="grading">채점 중</option>
            <option value="failed">처리 실패</option>
          </select>
        </label>
      </div>
      <section
        className={`${s.phone} ${role === "teacher" ? s.widePhone : ""}`}
        data-wire-phone=""
      >
        <header className={s.phoneHead}>
          <b>개념 백지 · {role === "teacher" ? "학생 가의 답안" : "내 답안"}</b>
          <span>
            {state === "done"
              ? "결과 공개"
              : state === "grading"
                ? "채점 중"
                : "처리 실패"}
          </span>
        </header>
        <div className={s.phoneBody}>
          <p className={s.notice}>
            ○ · △ · ×는 배치 확인용 판정입니다. 실제 학생 답안이나 AI 채점
            결과가 아닙니다.
          </p>
          {state === "grading" ? (
            <div className={s.processing} role="status">
              <h3>답안을 채점하고 있습니다</h3>
              <p>읽은 답과 인쇄할 때 저장한 문항·정답을 대조합니다.</p>
              <p>채점이 끝나면 교사 확정 없이 결과를 공개합니다.</p>
            </div>
          ) : state === "failed" ? (
            <div className={s.warning} role="alert">
              <h3>채점을 마치지 못했습니다</h3>
              <p>사진과 직접 입력을 유지하고 다시 시도하는 상태입니다.</p>
              <button type="button" onClick={() => setState("grading")}>
                다시 시도 상태 보기
              </button>
            </div>
          ) : (
            <>
              <label>
                결과 형식
                <select
                  value={form}
                  onChange={(e) => setForm(e.target.value as ConceptBlankForm)}
                >
                  {CONCEPT_BLANK_FORMS.map((f, i) => (
                    <option key={f} value={f}>
                      {"ABCDE"[i]} · {CONCEPT_BLANK_FORM_LABELS[f]}
                    </option>
                  ))}
                </select>
              </label>
              {variant === "R1" ? (
                <div className={s.score}>
                  <span>종합 점수</span>
                  <strong>
                    — <small>점</small>
                  </strong>
                  <p>배점·△·확인 필요의 합산 방식은 선택 전입니다.</p>
                  <p>
                    현재 형식의 판정 칸:{" "}
                    {VERDICTS.map(
                      (v) =>
                        `${v} ${rows.filter((r) => r.verdict === v).length}`,
                    ).join(" · ")}
                  </p>
                </div>
              ) : null}
              <p className={s.formNote}>{FORM_NOTES[form]}</p>
              <p className={s.legend}>
                ○ 충족 · △ 일부 충족 · × 미충족
                <br />
                <b>확인 필요</b>는 읽기가 불확실한 상태이며 오답으로 세지 않는
                안입니다.
              </p>
              <p>
                채점이 끝난 결과입니다. 교사가 나중에 판정을 고칠 수 있습니다.
              </p>
              <div
                className={
                  variant === "R4" && role === "teacher"
                    ? s.resultSplit
                    : undefined
                }
              >
                {variant === "R4" ? (
                  <div>
                    <h3>제출 지면</h3>
                    <SampleStrip sample={sample} option={PAPER_OPTIONS[0]} />
                    <p className={s.meta}>
                      사진 대용 · 실제 은행의 미작성 지면
                    </p>
                  </div>
                ) : null}
                <div className={s.resultRows}>
                  {ordered.map((row) => (
                    <article key={row.key} className={s.resultRow}>
                      <header>
                        <h3>{row.label}</h3>
                        <strong
                          className={s.verdict}
                          data-verdict={row.verdict}
                        >
                          {row.verdict}
                        </strong>
                      </header>
                      <div className={s.prompt}>
                        <PaperText text={row.prompt} />
                      </div>
                      {row.verdict === "확인 필요" ? (
                        <p className={s.warning}>
                          사진에서 답을 분명하게 읽지 못했습니다. 틀렸다는 뜻은
                          아닙니다.
                        </p>
                      ) : row.verdict === "△" ? (
                        <p className={s.notice}>
                          필요한 내용 중 일부가 드러난 상태입니다. 부족한 내용의
                          설명 자리를 함께 둡니다.
                        </p>
                      ) : null}
                      <details>
                        <summary>인쇄 때 저장한 참고 답</summary>
                        <div className={s.answerReference}>
                          <KeySentence sentence={row.answer} />
                        </div>
                      </details>
                      {edits[row.key] ? (
                        <p className={s.tag}>교사 수정 · {reasons[row.key]}</p>
                      ) : null}
                      {role === "teacher" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(row.key);
                            setDraft(row.verdict);
                            setReason(reasons[row.key] ?? "");
                          }}
                        >
                          판정 고치기 · {row.label}
                        </button>
                      ) : null}
                      {editing === row.key && role === "teacher" ? (
                        <div className={s.teacherEdit}>
                          <label>
                            수정 판정
                            <select
                              value={draft}
                              onChange={(e) =>
                                setDraft(e.target.value as Verdict)
                              }
                            >
                              {VERDICTS.map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            수정 이유
                            <textarea
                              rows={2}
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            />
                          </label>
                          <div className={s.actions}>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              disabled={!reason.trim()}
                              onClick={() => {
                                setEdits((old) => ({
                                  ...old,
                                  [row.key]: draft,
                                }));
                                setReasons((old) => ({
                                  ...old,
                                  [row.key]: reason,
                                }));
                                setEditing(null);
                              }}
                            >
                              화면에 반영
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
              <section className={s.directComparison}>
                <h3>직접 입력 대조 · 읽은 답 확인의 3쪽 표본</h3>
                <p className={s.meta}>
                  위 A~E 표본과 별도 지면입니다. 코드 {readingSample.code} ·
                  직접 입력 {manualCount}칸
                </p>
                {manualCount === 0 ? (
                  <p>
                    아직 직접 입력한 답이 없습니다. 읽은 답 확인 면에서 입력하면
                    사진과 함께 여기에 보입니다.
                  </p>
                ) : (
                  directFields.map((fields, i) =>
                    fields.length ? (
                      <div
                        key={i}
                        className={
                          role === "teacher" ? s.directSplit : undefined
                        }
                      >
                        <div>
                          <h4>{i + 1}쪽 원본 사진</h4>
                          <MarkedPhoto
                            sample={readingSample}
                            page={i}
                            option={READ_OPTIONS[2]}
                          />
                        </div>
                        <div>
                          {fields.map((field) => (
                            <div key={field.id} className={s.answerField}>
                              <h4>
                                {i + 1}쪽 문 {field.question}{" "}
                                <span className={s.tag}>직접 입력</span>
                              </h4>
                              <p className={s.manualText}>{manual[field.id]}</p>
                              <p className={s.meta}>
                                직접 입력 후 재채점 상태 · 실제 판정 없음
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )
                )}
              </section>
              {allowAfter ? (
                <button type="button" onClick={onRead}>
                  읽은 답 고치기 · 공개 뒤 수정
                </button>
              ) : (
                <p className={s.meta}>
                  선택한 읽기 확인 안은 공개 전 수정입니다. 공개 뒤에는 교사가
                  판정을 고치는 자리를 둡니다.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
