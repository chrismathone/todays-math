"use client";

import dynamic from "next/dynamic";
import {
  StudentReviewPage,
  StudentReviewStatus,
} from "@/components/math-srs/StudentReviewHome";
import s from "@/components/math-srs/student-course.module.css";

export type ExpeditionActivityCallbacks = {
  onExit: () => void;
  onComplete: () => void;
  onConfirmedAnswer?: (studentId: string) => void;
};

const ElementaryActivity = dynamic(
  () => import("@/components/math-srs/StudentCourseSrs"),
  { loading: ExpeditionLoading },
);
const MiddleActivity = dynamic(
  () =>
    import("@/components/math-srs/StudentMathSrs").then(
      (module) => module.StudentMathSrs,
    ),
  { loading: ExpeditionLoading },
);

function ExpeditionLoading() {
  return (
    <StudentReviewPage
      kind="explorers"
      student={null}
      practicing
      practiceTitle="수학 탐험"
      practicePageClassName={`${s.page} ${s.practicePage}`}
      practiceMainClassName={s.practiceMain}
    >
      <StudentReviewStatus
        loading
        error={null}
        busy={false}
        onReload={() => {}}
      />
    </StudentReviewPage>
  );
}

/** Existing question-bank engines enter directly into the expedition's activity frame. */
export default function ExplorerBankActivity({
  kind,
  onExit,
  onComplete,
  onConfirmedAnswer,
  paused = false,
}: ExpeditionActivityCallbacks & {
  kind: "elementary" | "middle";
  paused?: boolean;
}) {
  const expedition = { onExit, onComplete, onConfirmedAnswer };
  return kind === "elementary" ? (
    <ElementaryActivity expedition={expedition} paused={paused} />
  ) : (
    <MiddleActivity expedition={expedition} paused={paused} />
  );
}
