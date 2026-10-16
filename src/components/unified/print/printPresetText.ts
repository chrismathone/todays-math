import {
  PRINT_PRESET_HEAD,
  type PrintPresetHead,
} from "@/contracts/printPreset.contract";
import { TEMPLATES } from "./settings";
import type { PrintOptions } from "./types";

/**
 * «내 양식»(W6 · Hi-fi 1안)의 요약 글 — 목록의 둘째 · 셋째 줄과 저장 창의 «담는 서식 / 담는 머리 정보».
 * `src/app/dev/exam-output-hifi/fixtures.ts` 의 `optionsLine` · `headLine` 그대로다.
 */

const templateLabel = (o: PrintOptions) =>
  TEMPLATES.find((t) => t.value === o.template)?.label ?? o.template;
const SOLVING: Record<PrintOptions["solvingArea"], string> = {
  off: "",
  blank: "오른쪽 풀이 공간 빈칸",
  ruled: "오른쪽 풀이 공간 공책 줄",
  chalkboard: "오른쪽 풀이 공간 칠판",
};
const MARGIN: Record<PrintOptions["marginPreset"], string> = {
  narrow: "좁은 여백",
  normal: "보통 여백",
  wide: "넓은 여백",
};
const CHOICE: Record<PrintOptions["choiceLayout"], string> = {
  "5x1": "보기 5행",
  "2x3": "보기 3열 2행",
  "3x2": "보기 2열 3행",
  auto: "보기 자동",
};

/** «정통 · 2단 · 보통 여백 · 1단당 3문항 · 보기 자동 · 빠른 정답만». */
export function optionsLine(o: PrintOptions) {
  return [
    templateLabel(o),
    `${o.columns}단`,
    o.columns === 2 && o.columnDivider ? "단 사이 구분선" : "",
    o.columns === 1 ? SOLVING[o.solvingArea] : "",
    MARGIN[o.marginPreset],
    o.layoutMode === "count" ? `1단당 ${o.problemsPerColumn}문항` : "",
    CHOICE[o.choiceLayout],
    o.hideScores ? "" : "배점 보임",
    o.showDifficulty ? "" : "난이도 라벨 끔",
    o.showAnswers
      ? o.quickAnswerOnly
        ? "빠른 정답만"
        : "정답 · 해설지"
      : "정답지 없음",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** «인재원학원 · 시험 시간 20분 · 출제자 박선생» — 과목 · 총점 100 은 적지 않는다. */
export function headLine(h: PrintPresetHead) {
  const parts = PRINT_PRESET_HEAD.filter(([key]) => key !== "subject")
    .map(([key, label]) => {
      const v = h[key];
      if (v === undefined || v === "") return "";
      if (key === "totalScore") return v === 100 ? "" : `총점 ${v}`;
      if (key === "schoolName" || key === "academyName") return String(v);
      return `${label} ${v}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "머리 정보 없음";
}

/** «10/14» — 서울 날짜. */
export function dayLabel(iso: string) {
  const [, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .split("-");
  return `${Number(month)}/${Number(day)}`;
}
