"use client";

import { useId, useState, type FormEvent } from "react";
import type {
  CoursePlan,
  CoursePlanInput,
} from "@/contracts/mathSrsCourse.contract";
import {
  COURSE_CHAPTERS,
  getCourseSection,
} from "@/lib/math-srs/elementary/catalog";
import s from "./CoursePlanForm.module.css";

export interface CoursePlanFormProps {
  plan: CoursePlan | null;
  revision: number;
  busy?: boolean;
  onSave: (input: CoursePlanInput) => void;
  submitLabel?: string;
  studentView?: boolean;
}

export default function CoursePlanForm(props: CoursePlanFormProps) {
  return (
    <PlanFields
      key={`${props.revision}:${props.plan?.startSectionId ?? "new"}`}
      {...props}
    />
  );
}

function PlanFields({
  plan,
  revision,
  busy = false,
  onSave,
  submitLabel = "학습 설정 저장",
  studentView = false,
}: CoursePlanFormProps) {
  const id = useId();
  const initial = plan ? getCourseSection(plan.startSectionId) : undefined;
  const [grade, setGrade] = useState(initial ? String(initial.grade) : "");
  const [semester, setSemester] = useState(
    initial ? String(initial.semester) : "",
  );
  const [chapterId, setChapterId] = useState(initial?.chapterId ?? "");
  const [sectionId, setSectionId] = useState(plan?.startSectionId ?? "");
  const [daily, setDaily] = useState<CoursePlanInput["dailyQuestionCount"]>(
    plan?.dailyQuestionCount ?? 10,
  );
  const [enabled, setEnabled] = useState(plan?.enabled ?? true);
  const chapters = COURSE_CHAPTERS.filter(
    (chapter) =>
      String(chapter.grade) === grade && String(chapter.semester) === semester,
  );
  const sections =
    chapters.find((chapter) => chapter.id === chapterId)?.sections ?? [];
  const selected = sections.find((section) => section.id === sectionId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !selected) return;
    onSave({
      startSectionId: selected.id,
      dailyQuestionCount: daily,
      enabled,
      expectedRevision: revision,
    });
  }

  return (
    <form
      className={`${s.form} ${studentView ? s.studentForm : ""}`}
      onSubmit={submit}
      aria-describedby={`${id}-scope`}
    >
      <p id={`${id}-scope`} className={s.note}>
        초등 3~6학년 교육과정에서 시작할 진도를 골라 주세요. 이후에는 복습
        시기와 다음 학습을 자동으로 안내해요.
      </p>
      <fieldset disabled={busy} className={s.fields}>
        <legend className={s.legend}>시작 진도</legend>
        <div className={s.grid}>
          <label htmlFor={`${id}-grade`}>
            학년
            <select
              id={`${id}-grade`}
              value={grade}
              required
              onChange={(event) => {
                setGrade(event.target.value);
                setSemester("");
                setChapterId("");
                setSectionId("");
              }}
            >
              <option value="">학년 선택</option>
              {[3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  초등 {value}학년
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-semester`}>
            학기
            <select
              id={`${id}-semester`}
              value={semester}
              required
              disabled={!grade}
              onChange={(event) => {
                setSemester(event.target.value);
                setChapterId("");
                setSectionId("");
              }}
            >
              <option value="">학기 선택</option>
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </select>
          </label>
          <label htmlFor={`${id}-chapter`}>
            단원
            <select
              id={`${id}-chapter`}
              value={chapterId}
              required
              disabled={!semester}
              onChange={(event) => {
                setChapterId(event.target.value);
                setSectionId("");
              }}
            >
              <option value="">단원 선택</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.number}. {chapter.title}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-section`}>
            소단원
            <select
              id={`${id}-section`}
              value={sectionId}
              required
              disabled={!chapterId}
              onChange={(event) => setSectionId(event.target.value)}
            >
              <option value="">소단원 선택</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={s.daily} htmlFor={`${id}-daily`}>
          하루 학습량
          <select
            id={`${id}-daily`}
            value={daily}
            onChange={(event) =>
              setDaily(
                Number(
                  event.target.value,
                ) as CoursePlanInput["dailyQuestionCount"],
              )
            }
          >
            {[5, 10, 15, 20].map((value) => (
              <option key={value} value={value}>
                하루 {value}문제{value === 10 ? " (기본)" : ""}
              </option>
            ))}
          </select>
        </label>
        <p className={s.note}>
          5문제씩 나누어 풀고, 하루 목표를 채우면 마쳐요.
        </p>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          자동 학습 사용
        </label>
        {!enabled ? (
          <p className={s.note}>
            학습 기록은 유지하고 자동 학습을 잠시 쉬어요.
          </p>
        ) : null}
      </fieldset>
      {selected ? (
        <p className={s.selection}>
          시작: 초{selected.grade} · {selected.semester}학기 ·{" "}
          {selected.chapterTitle} · {selected.title}
        </p>
      ) : null}
      <button className={s.submit} type="submit" disabled={busy || !selected}>
        {busy ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}
