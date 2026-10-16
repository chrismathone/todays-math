/**
 * 3단계 «양식 구성·출력» Hi-fi 픽스처 — **지어낸 예**다(실제 문항 · 계정 · 시험지가 아니다).
 * 문항은 중2 «일차부등식» 차시에서 있을 법한 것을 손으로 적었다. 답은 모두 검산했다.
 * DB · API 를 읽지 않는다.
 */
import { DEFAULT_DRAFT_TITLE } from "@/components/unified/draftStore";
import { TEMPLATES } from "@/components/unified/print/settings";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";

export { DEFAULT_DRAFT_TITLE };

/* ───────────── 문항 — 실제 지면 렌더러(WorksheetPrint)에 넣는다 ───────────── */

function problem(
  id: string,
  section: string,
  difficulty: string,
  content: string,
  answer: string,
): StudioProblem {
  return {
    id,
    content,
    answer,
    solution: "",
    grade: "중2",
    chapter: "부등식",
    section,
    difficulty,
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
    questionType: content.includes("①") ? "multiple-choice" : "short-answer",
  };
}

export const PROBLEMS: StudioProblem[] = [
  problem(
    "q1",
    "일차부등식의 해와 성질",
    "기본",
    "$a<b$일 때, 다음 중 옳지 않은 것은?\n① $a+3<b+3$\n② $a-5<b-5$\n③ $2a<2b$\n④ $-a<-b$\n⑤ $\\dfrac{a}{4}<\\dfrac{b}{4}$",
    "④",
  ),
  problem(
    "q2",
    "일차부등식의 풀이",
    "기본",
    "일차부등식 $3x-7\\le 2x+1$을 푸시오.",
    "$x\\le 8$",
  ),
  problem(
    "q3",
    "일차부등식의 풀이",
    "응용",
    "일차부등식 $\\dfrac{x-1}{2}-\\dfrac{x}{3}>1$을 만족시키는 가장 작은 정수 $x$의 값은?\n① $8$\n② $9$\n③ $10$\n④ $11$\n⑤ $12$",
    "③",
  ),
  problem(
    "q4",
    "일차부등식의 활용",
    "응용",
    "한 개에 $800$원인 빵과 한 개에 $1200$원인 우유를 합하여 $15$개 사려고 한다. 전체 금액이 $15000$원 이하가 되게 하려면 우유는 최대 몇 개까지 살 수 있는가?\n① $5$개\n② $6$개\n③ $7$개\n④ $8$개\n⑤ $9$개",
    "③",
  ),
  problem(
    "q5",
    "일차부등식의 활용",
    "심화하",
    "어느 박물관의 입장료는 한 사람에 $3000$원이고, $30$명 이상의 단체는 $20\\%$를 할인해 준다. $30$명 미만의 단체가 $30$명의 단체 입장권을 사는 것이 유리하려면 최소 몇 명이어야 하는지 구하시오.",
    "$25$명",
  ),
];

/* ───────────── 지금 시험지의 머리 정보 ───────────── */

/** 시험지마다 다른 값 — 시험일만 있다(학년 · 학기는 비워 두면 지면이 범위에서 채운다). */
export const SHEET_META: PrintMeta = {
  ...DEFAULT_PRINT_META,
  examDate: "2026-10-16",
};

/* ───────────── W6 — 양식이 담는 것 · 담지 않는 것 ───────────── */

/** 양식이 담는 머리 정보 — 학원에서 잘 안 바뀌는 값(Wire 표 그대로). */
export const CARRIED_META = [
  ["schoolName", "학교/기관명"],
  ["subject", "과목"],
  ["examDuration", "시험 시간"],
  ["examiner", "출제자"],
  ["totalScore", "총점"],
  ["academyName", "학원명"],
  ["instructorName", "강사명"],
] as const satisfies readonly (readonly [keyof PrintMeta, string])[];

export type CarriedMeta = Pick<PrintMeta, (typeof CARRIED_META)[number][0]>;

export const NOT_CARRIED =
  "문항 · 문제 순서 · 제목 · 시험일 · 학년 · 학기 · 오늘의 목표 · 개념 정리 · 유형명 · 핵심 전략 · 태그";

export type Layout = {
  id: string;
  name: string;
  /** 마지막 사용 «10/15» — 정렬 열쇠는 order */
  lastUsed: string;
  order: number;
  saved: string;
  options: PrintOptions;
  head: CarriedMeta;
};

const HEAD_EMPTY: CarriedMeta = {
  schoolName: "",
  subject: "수학",
  examDuration: "",
  examiner: "",
  totalScore: 100,
  academyName: "",
  instructorName: "",
};

export const LAYOUTS: Layout[] = [
  {
    id: "l1",
    name: "일일TEST 2단",
    lastUsed: "10/15",
    order: 1015,
    saved: "10/12",
    options: {
      ...DEFAULT_PRINT_OPTIONS,
      columns: 2,
      layoutMode: "count",
      problemsPerColumn: 3,
      showAnswers: true,
      quickAnswerOnly: true,
    },
    head: {
      ...HEAD_EMPTY,
      schoolName: "인재원학원",
      examDuration: "20분",
      examiner: "박선생",
    },
  },
  {
    id: "l2",
    name: "주간 확인 풀이칸",
    lastUsed: "10/11",
    order: 1011,
    saved: "9/28",
    options: {
      ...DEFAULT_PRINT_OPTIONS,
      template: "workbook",
      color: "#135bec",
      columns: 1,
      solvingArea: "ruled",
      spacing: 32,
      showAnswers: true,
    },
    head: {
      ...HEAD_EMPTY,
      examDuration: "50분",
      academyName: "인재원학원",
      instructorName: "박선생",
    },
  },
  {
    id: "l3",
    name: "단원평가 학교식",
    lastUsed: "9/30",
    order: 930,
    saved: "9/30",
    options: {
      ...DEFAULT_PRINT_OPTIONS,
      columns: 2,
      columnDivider: true,
      hideScores: false,
      choiceLayout: "3x2",
      showAnswers: true,
    },
    head: {
      ...HEAD_EMPTY,
      schoolName: "인재원학원",
      examDuration: "45분",
    },
  },
  {
    id: "l4",
    name: "오답 다시 풀기",
    lastUsed: "9/22",
    order: 922,
    saved: "9/22",
    options: {
      ...DEFAULT_PRINT_OPTIONS,
      template: "yuhyung",
      color: "#64748b",
      columns: 2,
      marginPreset: "narrow",
      showDifficulty: false,
    },
    head: { ...HEAD_EMPTY, schoolName: "인재원학원" },
  },
];

/** 새 시험지 기본 양식 — 처음에는 «일일TEST 2단». */
export const DEFAULT_LAYOUT_ID = "l1";

export function headOf(meta: PrintMeta): CarriedMeta {
  return Object.fromEntries(
    CARRIED_META.map(([key]) => [key, meta[key] ?? ""]),
  ) as CarriedMeta;
}

/* 요약 글 — 목록의 둘째 · 셋째 줄 */

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
const COLOR_NAME: Record<string, string> = {
  "#1b2a4e": "기본 남색",
  "#0ea5e9": "사이언",
  "#135bec": "파랑",
  "#8b5cf6": "보라",
  "#ec4899": "핑크",
  "#f97316": "주황",
  "#eab308": "노랑",
  "#10b981": "초록",
  "#64748b": "회색",
};

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

export function headLine(h: CarriedMeta) {
  const parts = CARRIED_META.filter(([key]) => key !== "subject")
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

/** 담는 서식을 «항목 — 값» 줄로(저장 창). */
export function optionRows(o: PrintOptions): [string, string][] {
  return [
    ["템플릿", templateLabel(o)],
    [
      "폰트 · 강조 색상",
      `${fontLabel(o.fontPack)} · ${COLOR_NAME[o.color.toLowerCase()] ?? o.color}`,
    ],
    [
      "문제 배치",
      `${o.columns}단${o.columns === 2 ? (o.columnDivider ? " · 단 사이 구분선" : "") : SOLVING[o.solvingArea] ? ` · ${SOLVING[o.solvingArea]}` : ""}`,
    ],
    ["쪽 여백", MARGIN[o.marginPreset]],
    [
      "세로 배치",
      o.layoutMode === "count"
        ? `문항 수 지정 · 1단당 ${o.problemsPerColumn}`
        : `여백 지정 · ${o.spacing}`,
    ],
    ["보기 번호 배치", CHOICE[o.choiceLayout].replace("보기 ", "")],
    [
      "표시 옵션",
      [
        o.showDate ? "날짜" : "",
        o.showChapter ? "단원명" : "",
        o.showDifficulty ? "난이도" : "",
        o.hideScores ? "배점 숨김" : "배점 보임",
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    [
      "정답 · 해설",
      o.showAnswers
        ? o.quickAnswerOnly
          ? "빠른 정답만"
          : "정답 · 해설지 포함"
        : "넣지 않음",
    ],
  ];
}

function fontLabel(id: PrintOptions["fontPack"]) {
  return (
    {
      system: "기본",
      nanum: "나눔",
      noto: "본고딕",
      gowun: "고운",
      pretendard: "프리텐다드",
    } as const
  )[id];
}

/** 서식 · 머리 정보 가운데 양식과 다른 칸의 이름 — «직접 정함 · 2곳 바뀜». */
export function changedFields(
  layout: Layout,
  options: PrintOptions,
  meta: PrintMeta,
): string[] {
  const labels: Partial<Record<keyof PrintOptions, string>> = {
    template: "템플릿",
    fontPack: "폰트",
    color: "강조 색상",
    columns: "단",
    columnDivider: "단 사이 구분선",
    solvingArea: "풀이 공간",
    marginPreset: "쪽 여백",
    layoutMode: "세로 배치",
    problemsPerColumn: "세로 배치",
    spacing: "세로 배치",
    choiceLayout: "보기 번호 배치",
    showDate: "표시 옵션",
    showChapter: "표시 옵션",
    showDifficulty: "표시 옵션",
    hideScores: "표시 옵션",
    showAnswers: "정답 · 해설",
    quickAnswerOnly: "정답 · 해설",
  };
  const out = new Set<string>();
  for (const key of Object.keys(labels) as (keyof PrintOptions)[]) {
    const a = layout.options[key];
    const b = options[key];
    const same =
      typeof a === "string" && typeof b === "string"
        ? a.toLowerCase() === b.toLowerCase()
        : a === b;
    if (!same) out.add(labels[key]!);
  }
  for (const [key, label] of CARRIED_META) {
    if ((layout.head[key] ?? "") !== (meta[key] ?? "")) out.add(label);
  }
  return [...out];
}

/* ───────────── W7 — 제목 추천 ───────────── */

export type Suggestion = { id: string; label: string; text: string };

/** 시험지에서 읽은 값만 — 학년 · 과정 · 대단원 · 범위 이름 · 날짜 · 시험 종류(W8). */
export function suggestions(examDate: string, tag?: string): Suggestion[] {
  const [, m, d] = (examDate || "2026-10-16").split("-");
  const date = `${Number(m)}.${d}`;
  const t = tag ? ` ${tag}` : "";
  return [
    {
      id: "scope",
      label: "범위 이름",
      text: `중2 일차부등식의 해와 성질 외 2${t}`,
    },
    {
      id: "course",
      label: "과정 · 대단원 · 날짜",
      text: `중2-1 부등식${t} ${date}`,
    },
    { id: "date", label: "날짜 먼저", text: `${date} 중2 일차부등식${t}` },
  ];
}

export const TYPED_TITLE = "중2A 화요일 시험";

/* ───────────── W8 — 태그 ───────────── */

export const TAGS = [
  "일일TEST",
  "주간TEST",
  "단원TEST",
  "숙제",
  "복습",
  "오답",
  "입학TEST",
  "내신대비",
] as const;
export type Tag = (typeof TAGS)[number];

export type Kind = "draft" | "arithmeticSheet" | "extraction" | "conceptBlank";
export const KINDS: { id: Kind; label: string }[] = [
  { id: "draft", label: "시험지" },
  { id: "arithmeticSheet", label: "연산 연습지" },
  { id: "extraction", label: "추출한 자료" },
  { id: "conceptBlank", label: "개념 백지" },
];
export const TAGGABLE: Kind[] = ["draft", "arithmeticSheet"];

export type LibRow = {
  id: string;
  kind: Kind;
  tag?: Tag;
  title: string;
  count: number;
  updated: string;
  /** 진행 단계가 기록된 자료 — «내 작업 중만» */
  step?: string;
};

/** 첫 행이 지금 3단계에서 고치는 시험지다 — 3단계에서 고른 태그가 그 행에 붙는다. */
export const THIS_SHEET_ID = "r1";

export const LIB_ROWS: LibRow[] = [
  {
    id: "r1",
    kind: "draft",
    tag: "일일TEST",
    title: "중2 일차부등식 일일TEST 10.16",
    count: 5,
    updated: "2026. 10. 16. 오후 4:12",
    step: "3 양식 구성·출력",
  },
  {
    id: "r2",
    kind: "draft",
    tag: "일일TEST",
    title: "중2 일차부등식 일일TEST 10.15",
    count: 8,
    updated: "2026. 10. 15. 오후 5:40",
  },
  {
    id: "r3",
    kind: "draft",
    tag: "주간TEST",
    title: "중2-1 부등식 주간 확인",
    count: 20,
    updated: "2026. 10. 14. 오후 9:03",
    step: "2 문항 검토",
  },
  {
    id: "r4",
    kind: "arithmeticSheet",
    tag: "숙제",
    title: "중1 정수의 덧셈 연습 3회",
    count: 40,
    updated: "2026. 10. 13. 오후 2:21",
  },
  {
    id: "r5",
    kind: "extraction",
    title: "쎈 중2 112~118쪽 추출",
    count: 18,
    updated: "2026. 10. 12. 오전 11:30",
    step: "문제 잘라내기",
  },
  {
    id: "r6",
    kind: "conceptBlank",
    title: "중2 부등식 개념 백지",
    count: 12,
    updated: "2026. 10. 12. 오전 10:02",
  },
  {
    id: "r7",
    kind: "draft",
    tag: "오답",
    title: "중2 10월 2주 오답 다시 풀기",
    count: 12,
    updated: "2026. 10. 11. 오후 6:15",
  },
  {
    id: "r8",
    kind: "draft",
    title: "오늘 수학 학습지",
    count: 15,
    updated: "2026. 10. 9. 오후 3:48",
    step: "3 양식 구성·출력",
  },
  {
    id: "r9",
    kind: "draft",
    tag: "단원TEST",
    title: "중2 일차방정식 단원평가",
    count: 25,
    updated: "2026. 10. 8. 오후 8:30",
  },
  {
    id: "r10",
    kind: "arithmeticSheet",
    tag: "복습",
    title: "중1 분수의 곱셈 복습",
    count: 30,
    updated: "2026. 10. 7. 오후 4:00",
  },
  {
    id: "r11",
    kind: "draft",
    tag: "입학TEST",
    title: "예비 중1 입학 진단",
    count: 20,
    updated: "2026. 10. 5. 오전 10:45",
  },
  {
    id: "r12",
    kind: "draft",
    tag: "일일TEST",
    title: "중2 연립방정식 일일TEST 10.02",
    count: 8,
    updated: "2026. 10. 2. 오후 5:10",
  },
  {
    id: "r13",
    kind: "arithmeticSheet",
    title: "중1 소인수분해 연습",
    count: 24,
    updated: "2026. 9. 30. 오후 7:22",
  },
  {
    id: "r14",
    kind: "draft",
    tag: "숙제",
    title: "중2 9월 4주 숙제",
    count: 16,
    updated: "2026. 9. 26. 오후 9:12",
  },
  {
    id: "r15",
    kind: "extraction",
    title: "중2 1학기 기말 기출 모음 추출",
    count: 30,
    updated: "2026. 9. 20. 오후 1:05",
  },
];
