"use client";

import type { EnglishExam } from "@/contracts/english.contract";

import { examLabel } from "./englishClient";
import s from "./EnglishExamPicker.module.css";

/** 학교와 시험을 한 영역에서 고른다. 모든 영어 뷰에서 같은 선택 동작을 쓴다. */
export default function EnglishExamPicker({
  exams,
  exam,
  onSelect,
}: {
  exams: EnglishExam[];
  exam: EnglishExam;
  onSelect: (id: string) => void;
}) {
  const schools = [...new Set(exams.map((item) => item.school))];
  const ofSchool = exams.filter((item) => item.school === exam.school);
  return (
    <section className={s.context} aria-label="학교와 시험 선택">
      <div className={s.schoolField}>
        <span className={s.label}>학교</span>
        <div className={s.schools} role="group" aria-label="학교">
          {schools.map((school) => (
            <button
              key={school}
              type="button"
              className={s.chip}
              aria-pressed={school === exam.school}
              onClick={() => {
                if (school === exam.school) return;
                const first = exams.find((item) => item.school === school);
                if (first) onSelect(first.id);
              }}
            >
              {school}
            </button>
          ))}
        </div>
      </div>
      <label className={s.examField}>
        <span className={s.label}>시험</span>
        <select
          className={s.examSelect}
          aria-label="시험 고르기"
          value={exam.id}
          onChange={(event) => onSelect(event.target.value)}
        >
          {ofSchool.map((item) => (
            <option key={item.id} value={item.id}>
              {examLabel(item)}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
