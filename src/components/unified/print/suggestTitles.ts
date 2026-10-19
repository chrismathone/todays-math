import type { PrintMeta } from "./types";

/**
 * W7 제목 추천(Hi-fi 1안 — 원장님 2026-10-16). 시험지에서 읽은 값만 쓴다 —
 * 학년(시험지 정보의 학년, 비었으면 문항의 학년) · 과정(학년-학기) · 대단원 · 범위 이름(첫 범위 + «외 n») ·
 * 날짜(시험일, 비었으면 오늘 · 서울) · 시험 종류(W8 태그, 있으면). 지어내지 않는다 — 채울 값이 없는 줄은 뺀다.
 */
export type TitleSuggestion = {
  id: "scope" | "course" | "date";
  label: string;
  text: string;
};

const TITLE_MAX = 80;
/** «1. 소인수분해» · «Ⅱ. 부등식» 같은 단원 번호를 뗀다. */
const unitName = (value: string) =>
  value.replace(/^\s*(?:\d+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+)\s*[.)]\s*/, "").trim();
const distinct = (values: string[]) => [
  ...new Set(values.map(unitName).filter(Boolean)),
];

function dateLabel(examDate: string | undefined, today: Date) {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(examDate ?? "")
    ? examDate!
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(today);
  const [, month, day] = iso.split("-");
  return `${Number(month)}.${day}`;
}

export function titleSuggestions({
  problems,
  meta,
  tag,
  today = new Date(),
}: {
  problems: readonly { grade?: string; chapter?: string; section?: string }[];
  meta: Pick<PrintMeta, "grade" | "semester" | "examDate">;
  tag?: string | null;
  today?: Date;
}): TitleSuggestion[] {
  const grade =
    meta.grade?.trim() ||
    [
      ...new Set(problems.map((p) => p.grade?.trim() ?? "").filter(Boolean)),
    ].join("·");
  const semester = /([12])/.exec(meta.semester ?? "")?.[1];
  const course = grade && semester ? `${grade}-${semester}` : grade;
  const chapters = distinct(problems.map((p) => p.chapter ?? ""));
  const ranges = distinct(problems.map((p) => p.section ?? ""));
  const date = dateLabel(meta.examDate, today);
  const t = tag?.trim() ?? "";
  const join = (...parts: string[]) =>
    parts.filter(Boolean).join(" ").slice(0, TITLE_MAX).trim();
  const firstRange = ranges[0]
    ? `${ranges[0]}${ranges.length > 1 ? ` 외 ${ranges.length - 1}` : ""}`
    : "";
  const chapter = chapters[0] ?? ranges[0] ?? "";
  const rows: TitleSuggestion[] = [];
  if (firstRange)
    rows.push({
      id: "scope",
      label: "범위 이름",
      text: join(grade, firstRange, t),
    });
  if (chapter) {
    rows.push({
      id: "course",
      label: "과정 · 대단원 · 날짜",
      text: join(course, chapter, t, date),
    });
    rows.push({
      id: "date",
      label: "날짜 먼저",
      text: join(date, grade, chapter, t),
    });
  }
  return rows.filter(
    (row, at) => rows.findIndex((other) => other.text === row.text) === at,
  );
}
