import type { StudioAiPageJob } from "./useStudioAi";
import type { SchoolLevel } from "./types";
import { STUDIO_GRADES } from "./studioHelpers";

export interface StudioGradeSource {
  id: string;
  grade?: string;
  level?: SchoolLevel;
  gradeManual?: boolean;
}

export function studioGradeLevel(grade?: string): SchoolLevel {
  return grade && STUDIO_GRADES.elementary.includes(grade)
    ? "elementary"
    : "secondary";
}

/** File-wide evidence is considered only after that file's active queue settles. */
export function resolveStudioGrade(
  source: StudioGradeSource,
  jobs: StudioAiPageJob[],
) {
  if (source.gradeManual)
    return {
      grade: source.grade,
      needsReview: false,
      evidence: "직접 선택한 학년",
    };
  const pages = jobs.filter((job) => job.sourceId === source.id);
  if (
    !pages.length ||
    pages.some((job) => ["queued", "rendering", "running"].includes(job.state))
  )
    return {
      grade: source.grade,
      needsReview: false,
      evidence: "전체 페이지 인식 후 자동 반영",
    };
  const known = pages.flatMap((job) => {
    const detected = job.detectedGrade;
    return ["complete", "empty"].includes(job.state) &&
      detected?.confidence === "high" &&
      detected.evidence.trim() &&
      [...STUDIO_GRADES.elementary, ...STUDIO_GRADES.secondary].includes(
        detected.grade,
      )
      ? [detected]
      : [];
  });
  const grades = new Set(known.map((value) => value.grade));
  return grades.size === 1
    ? { grade: known[0].grade, needsReview: false, evidence: known[0].evidence }
    : {
        grade: undefined,
        needsReview: true,
        evidence:
          grades.size > 1
            ? "페이지마다 학년이 달라 직접 확인이 필요합니다."
            : "학년을 확실히 확인하지 못했습니다.",
      };
}
