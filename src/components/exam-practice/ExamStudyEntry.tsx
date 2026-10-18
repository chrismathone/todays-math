import Link from "next/link";
import s from "./ExamPracticeWorkspace.module.css";

export function ExamStudyEntry() {
  return (
    <section className={s.entry} aria-label="기출 대비 연습">
      <div>
        <strong>기출 대비 연습</strong>
        <p>검토한 학교 범위나 직접 고른 유형으로 새 문제를 만듭니다.</p>
      </div>
      <Link href="/exam/practice">연습 문제 만들기</Link>
    </section>
  );
}
