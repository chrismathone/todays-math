"use client";
import { useRef, useState } from "react";
import { PaperText } from "@/components/concept-blank/paper/PaperParts";
import { SCAN_GRADE_MARKS } from "@/contracts/conceptBlankScan.contract";
import type {
  ScanOverrideInput,
  ScanSubmissionView,
} from "@/contracts/conceptBlankScanApi.contract";
import { ScanWrittenName } from "./ScanWrittenName";
import { ScanPhoto } from "./ScanPhoto";
import type { ScanSource } from "./api";
import { latestScanGrades, scanNumbers } from "./view";
import s from "./scan.module.css";

export function ScanResults({
  view,
  busy,
  source,
  save,
  onPage,
}: {
  view: ScanSubmissionView;
  busy: boolean;
  source: Pick<ScanSource, "photoUrl">;
  save: (input: ScanOverrideInput) => Promise<void>;
  onPage: (page: number) => void;
}) {
  const [onlyReview, setOnlyReview] = useState(false);
  const [photoPage, setPhotoPage] = useState(1);
  const [studentPhoto, setStudentPhoto] = useState(false);
  const firstReview = useRef<HTMLElement>(null);
  const grades = latestScanGrades(view);
  const shown = onlyReview
    ? grades.filter((g) => g.label === "review")
    : grades;
  const units = [...new Set(grades.map((g) => g.unit))];
  const numbers = scanNumbers(view);
  const photo = view.photos.find((p) => p.page === photoPage);
  const teacher = view.role === "teacher";
  const showPage = (page: number) => {
    setPhotoPage(page);
    setStudentPhoto(true);
    onPage(page);
  };
  return (
    <section aria-label="답안 결과">
      <ScanWrittenName view={view} />
      <p>○ 충족 · △ 일부 충족 · × 미충족 · 확인 필요</p>
      <p className={s.meta}>
        확인 필요는 오답으로 세지 않습니다. 교사가 판정과 까닭을 고칠 수
        있습니다.
      </p>
      {units.map((unit) => (
        <p className={s.counts} key={unit}>
          {Object.entries(SCAN_GRADE_MARKS)
            .map(
              ([label, mark]) =>
                `${mark} ${grades.filter((g) => g.unit === unit && g.label === label).length}${unit}`,
            )
            .join(" · ")}
        </p>
      ))}
      <div className={s.actions}>
        <label className={s.inline}>
          <input
            type="checkbox"
            checked={onlyReview}
            onChange={(e) => setOnlyReview(e.target.checked)}
          />
          확인 필요만 보기
        </label>
        <button
          type="button"
          disabled={!grades.some((g) => g.label === "review")}
          onClick={() => {
            setOnlyReview(false);
            requestAnimationFrame(() => {
              firstReview.current?.focus();
              firstReview.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            });
          }}
        >
          확인 필요 첫 항목으로
        </button>
      </div>
      <div className={teacher ? s.resultSplit : undefined}>
        {photo && (teacher || studentPhoto) ? (
          <aside className={s.evidencePhoto}>
            <label>
              대조할 쪽
              <select
                value={photoPage}
                onChange={(e) => showPage(Number(e.target.value))}
              >
                {view.snapshot.pages.map((p) => (
                  <option key={p.number} value={p.number}>
                    {p.number}쪽
                  </option>
                ))}
              </select>
            </label>
            <ScanPhoto
              photo={photo}
              submissionId={view.id}
              source={source}
              numbers={numbers}
            />
            {!teacher ? (
              <button type="button" onClick={() => setStudentPhoto(false)}>
                사진 접기
              </button>
            ) : null}
          </aside>
        ) : null}
        <div>
          {!shown.length ? (
            <p className={s.notice}>확인 필요한 항목이 없습니다.</p>
          ) : null}
          {shown.map((grade) => {
            const page = view.snapshot.pages.find(
              (p) => p.number === grade.page,
            )!;
            const question = page.questions.find(
              (q) => q.id === grade.questionId,
            )!;
            const history = view.grades.filter(
              (g) => g.targetId === grade.targetId,
            );
            const automatic = history.find((g) => g.origin !== "teacher");
            return (
              <article
                className={s.resultRow}
                key={grade.targetId}
                tabIndex={-1}
                ref={
                  grade.targetId ===
                  grades.find((g) => g.label === "review")?.targetId
                    ? firstReview
                    : undefined
                }
              >
                <header>
                  <h3>
                    {grade.page}쪽 · 문항 {question.number}
                    <span className={s.meta}>
                      확인 번호{" "}
                      {grade.slotIds.map((id) => numbers.get(id)).join(" · ")}
                    </span>
                  </h3>
                  <strong className={s.mark} data-grade={grade.label}>
                    {SCAN_GRADE_MARKS[grade.label]}
                  </strong>
                </header>
                <PaperText text={question.prompt} />
                <p
                  className={
                    grade.label === "partial" || grade.label === "review"
                      ? s.notice
                      : undefined
                  }
                >
                  {grade.reason}
                </p>
                {grade.directlyEntered ? (
                  <p className={s.tag}>직접 입력한 답 포함</p>
                ) : null}
                {grade.origin === "teacher" ? (
                  <p className={s.tag}>
                    교사 수정 · {new Date(grade.at).toLocaleString("ko-KR")}
                  </p>
                ) : null}
                <button type="button" onClick={() => showPage(grade.page)}>
                  사진 대조 · {grade.page}쪽 문항 {question.number}
                </button>
                {teacher ? (
                  <>
                    <dl className={s.evidence}>
                      {grade.slotIds.map((slotId) => {
                        const read = view.readings.find(
                          (r) => r.slotId === slotId,
                        );
                        const correction = view.corrections
                          .filter((c) => c.slotId === slotId)
                          .at(-1);
                        return (
                          <div key={slotId}>
                            <dt>
                              확인 번호 {numbers.get(slotId)} · 처음 읽은 글
                            </dt>
                            <dd>
                              {read?.text ||
                                (read?.status === "blank"
                                  ? "빈 답"
                                  : "못 읽음")}
                            </dd>
                            <dt>직접 입력</dt>
                            <dd>
                              {correction
                                ? correction.resolution === "text"
                                  ? correction.text
                                  : correction.resolution === "blank"
                                    ? "종이에도 빈 답"
                                    : "확인하기 어려움"
                                : "없음"}
                            </dd>
                          </div>
                        );
                      })}
                      <div>
                        <dt>처음 자동 판정</dt>
                        <dd>
                          {automatic
                            ? `${SCAN_GRADE_MARKS[automatic.label]} · ${automatic.reason}`
                            : "교사 확인"}
                        </dd>
                      </div>
                    </dl>
                    <details>
                      <summary>판정 이력</summary>
                      {history.map((entry) => (
                        <p key={entry.id}>
                          {entry.origin === "teacher"
                            ? "교사 수정"
                            : "자동 판정"}{" "}
                          · {SCAN_GRADE_MARKS[entry.label]} · {entry.reason}
                        </p>
                      ))}
                    </details>
                    <GradeEdit
                      key={`${grade.targetId}:${grade.sequence}`}
                      view={view}
                      grade={grade}
                      busy={busy}
                      save={save}
                    />
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function GradeEdit({
  view,
  grade,
  busy,
  save,
}: {
  view: ScanSubmissionView;
  grade: ScanSubmissionView["grades"][number];
  busy: boolean;
  save: (input: ScanOverrideInput) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(grade.label);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!editing)
    return (
      <button type="button" disabled={busy} onClick={() => setEditing(true)}>
        판정 고치기
      </button>
    );
  return (
    <form
      className={s.teacherEdit}
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          await save({
            revision: view.revision,
            targetId: grade.targetId,
            label,
            reason,
          });
          setEditing(false);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "판정을 저장하지 못했습니다.",
          );
        }
      }}
    >
      <fieldset disabled={busy}>
        <label>
          수정 판정
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value as typeof label)}
          >
            {Object.entries(SCAN_GRADE_MARKS).map(([value, mark]) => (
              <option key={value} value={value}>
                {mark}
              </option>
            ))}
          </select>
        </label>
        <label>
          수정 이유
          <input
            required
            maxLength={240}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className={s.actions}>
          <button type="button" onClick={() => setEditing(false)}>
            취소
          </button>
          <button type="submit" disabled={!reason.trim()} className={s.primary}>
            판정 저장
          </button>
        </div>
      </fieldset>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
