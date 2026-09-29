"use client";

import type { EnglishExam } from "@/contracts/english.contract";

import { examLabel } from "./englishClient";
import s from "./EnglishStudio.module.css";

/** 학교 칩 + 시험 고르기(`학년 · 이름`) — 세 뷰가 같은 것을 그린다. 고른 칩은 옅은 코발트 면 + 테두리(시안 C) */
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
    <div className={s.pickerRow}>
      <div className={s.chips} role="group" aria-label="학교">
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
    </div>
  );
}
