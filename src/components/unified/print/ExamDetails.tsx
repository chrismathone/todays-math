import type { PrintMeta, PrintOptions } from "./types";
import { readablePaperColor } from "./readableColor";

/** Fields omitted by individual original headers still have a real printed destination. */
export function ExamDetails({
  meta,
  options,
}: {
  meta: PrintMeta;
  options: PrintOptions;
}) {
  const parts = [
    meta.title,
    meta.schoolName,
    meta.grade,
    meta.subject,
    meta.semester,
    options.showDate ? meta.examDate : "",
    meta.examDuration,
    meta.examiner ? `출제 ${meta.examiner}` : "",
    typeof meta.totalScore === "number" ? `총점 ${meta.totalScore}점` : "",
  ].filter(Boolean);
  return (
    <div
      data-exam-details
      style={{
        flexShrink: 0,
        fontFamily: "var(--paper-font-sans)",
        fontSize: 10,
        lineHeight: 1.6,
        color: readablePaperColor(options.color),
        margin: "8px 0",
        overflowWrap: "anywhere",
      }}
    >
      {parts.join(" · ")}
    </div>
  );
}
