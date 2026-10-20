// Mathgen print options/defaults and template metadata, adapted to the unified draft schema.
// Original: F:/Mathgen/src/stores/wizardStore.ts and components/print/types.ts.
import type { StudioProblem } from "../types";
import type { PrintChoiceLayout } from "@/lib/math/choiceLayout";
import type { FontPackId } from "./fontPacks";
export interface ProblemReview {
  id: string;
  variant: StudioProblem & { topic: string };
  /** Measured with the first question, so a type heading cannot be orphaned. */
  sectionHeading?: string;
  /** Shared group question under the heading, e.g. "[11~20] …". */
  sectionInstruction?: string;
}

/** 6 신규 인쇄 템플릿. */
export type PrintTemplate =
  | "pyeongga" // 평가원 정밀형 — 수능·모의평가 클론
  | "jeongtong" // 정통 내신형 — 학교 시험지 표 양식
  | "modern" // 모던 내신형 — 학교 마케팅
  | "workbook" // 학원 워크북 — 풀이공간 포함
  | "jaseup" // 자습 학습지 — 개념박스 + 모눈
  | "yuhyung"; // 유형 훈련지 — 같은 유형 반복 컴팩트

/** 시험지 메타데이터. 헤더 / 푸터 / 워터마크 등에서 사용. */
export interface PrintMeta {
  /** Render-only bridge from the existing draft/presentation tag; never saved in printMeta or presets. */
  sheetTag?: import("@/contracts/sheetTag.contract").SheetTag;
  /** 시험지 타이틀. 예: "2025학년도 1학기 중간고사" */
  title: string;
  /** 학교명. 예: "○○고등학교" */
  schoolName?: string;
  /** 학년. 예: "2학년" */
  grade?: string;
  /** 과목명. 예: "수학" */
  subject: string;
  /** 학기. 예: "1학기" */
  semester?: string;
  /** 시험 일시. */
  examDate?: string;
  /** 시험 시간. 예: "50분" */
  examDuration?: string;
  /** 출제자. */
  examiner?: string;
  /** 총점. 기본 100. */
  totalScore?: number;
  /** 워크북 학원명. */
  academyName?: string;
  /** 워크북 강사. */
  instructorName?: string;
  /** 자습 학습지 단원·개념 정리 (markdown 허용). */
  conceptNote?: string;
  /** 자습 학습지 학습 목표. */
  todayGoal?: string;
  /** 유형 훈련지 유형명. */
  patternName?: string;
  /** 유형 훈련지 핵심 전략. */
  patternStrategy?: string;
}

/** 6 신규 template 컴포넌트가 모두 받는 공통 props. */
export interface PrintTemplateProps {
  /** Arithmetic starts a fresh sheet/header per round while pages stay globally numbered. */
  round?: number;
  firstPage?: boolean;
  /** 페이지 번호 (1-indexed). */
  page: number;
  /** 총 페이지. */
  totalPages: number;
  totalProblems?: number;
  /** 1단/2단. workbook/jaseup 의 1단은 풀이공간 포함. */
  columns: 1 | 2;
  /** 시험지 메타데이터. */
  meta: PrintMeta;
  /** 이 페이지에 렌더할 문항. paginateProblems() 의 결과 한 페이지분. */
  problems: ProblemReview[];
  /** 1-indexed 시작 문항 번호. 페이지 N 의 첫 문항 번호. */
  startingNumber: number;
  /** PrintOptions — accentColor / showDate / showChapter 등 헤더 토글. */
  options: PrintOptions;
  /**
   * 우측 컬럼 시작 인덱스 (2단). usePrintLayout 의 측정 패킹 결과. BodyContainer
   * 가 이 값으로 좌/우 컬럼을 분할 (없으면 기존 개수 절반 fallback — 회귀 0).
   */
  splitIndex?: number;
  /** Scale only a single card taller than its available page; never clip content. */
  itemScales?: number[];
  itemWhitespace?: number[];
  /**
   * 측정 모드 — 화면 밖 측정 viewport 에서만 set. 값이 있으면 템플릿은 헤더/푸터/
   * A4 chrome 없이 *본문만* 1단 flow 로, columnWidthPx 폭으로 렌더하고 각 문항
   * 래퍼에 data-measure-idx 를 붙인다 (usePrintLayout 이 offsetHeight 실측).
   */
  measure?: { columnWidthPx: number };
}

export interface PrintOptions {
  template: PrintTemplate;
  /** 강조 색상 (hex). default: mathg-gen accent (#0EA5E9). */
  color: string;
  columns: 1 | 2;
  /**
   * 레이아웃 모드 (택일):
   *  - "spacing": 세로 여백(spacing) 직접 지정 — 높이 기반 그리디 패킹.
   *  - "count": 단별 문항 수(problemsPerColumn) 지정 — 컬럼당 정확히 N개씩 채우고
   *    여백은 자동 균등 분배(space-evenly). 2단이면 페이지당 N*2.
   */
  layoutMode: "spacing" | "count";
  /** count 모드 — 1단(컬럼)당 문항 수 (2 | 3 | 4). 2단이면 페이지당 ×2. */
  problemsPerColumn: number;
  /** 문항 아래 최소 풀이 여백 (px). 0~150. spacing 모드에서만 사용. */
  spacing: number;
  /** Additive storage field; absent in saved settings means false. */
  smartSpacing?: boolean;
  /** 정답 + 해설 페이지 포함 여부. */
  showAnswers: boolean;
  /** showAnswers true 일 때 — 해설 생략하고 빠른 정답만. */
  quickAnswerOnly: boolean;
  showDate: boolean;
  showChapter: boolean;
  showDifficulty: boolean;
  /** Hide recognized question/subquestion points in rendered output only. */
  hideScores: boolean;
  /** 2단 일 때 컬럼 사이 세로 구분선. 1단 이면 무시. */
  columnDivider: boolean;
  /**
   * 보기 번호 배치 — 원장님 확정 네 값(2026-09-20). 보기 다섯 ①~⑤ 기준:
   *   `5x1` 「5행」 한 줄에 하나씩 · `2x3` 「3열 2행」 ①②③/④⑤
   *   · `3x2` 「2열 3행」 ①②/③④/⑤ · `auto` 「자동」 지금처럼 들어갈 때만 여러 열
   *
   * 정하는 것은 **열 수 하나**다 — 행 수는 보기 수를 따라간다(보기 넷 + 「3열 2행」
   * 은 ①②③/④ 로 2행). 규칙·넘침 처리는 `src/lib/math/choiceLayout.ts`.
   */
  choiceLayout: PrintChoiceLayout;
  /** Optional full-height workspace to the right of one-column questions. */
  solvingArea: "off" | "blank" | "ruled" | "chalkboard";
  /** 한글 폰트 팩 (sans/serif 한 쌍). FONT_PACKS 의 id. */
  fontPack: FontPackId;
  /**
   * 쪽 여백 프리셋 — 측정·미리보기·브라우저 인쇄에 같은 mm 여백 적용.
   */
  marginPreset: "narrow" | "normal" | "wide";
}

/**
 * 기본 PrintOptions — Step5 첫 진입 시 사용. mathlab 의 default 값에서
 * mathg-gen accent 색 + showChapter false (chapter 메타는 우리 데이터에서
 * 거의 비어 있어 노이즈).
 */
export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  template: "jeongtong", // 한국 학교 시험지 표 양식 — 가장 일반적
  color: "#1B2A4E", // navy — jeongtong / modern 의 default accent
  columns: 1, // jeongtong 기본 1단
  layoutMode: "spacing", // 새 시험지는 스마트 여백; 저장본의 칸 없음은 파서가 false로 읽는다.
  problemsPerColumn: 3, // count 모드 기본 — 1단당 3문항
  spacing: 18,
  smartSpacing: false,
  showAnswers: false,
  quickAnswerOnly: false,
  showDate: true,
  showChapter: true, // 6 신규 template 의 chapter chip 도 표시 default 권장
  showDifficulty: true,
  hideScores: true,
  columnDivider: false,
  choiceLayout: "auto", // 지금 동작이 기본값 — 지면이 한 픽셀도 안 바뀐다
  solvingArea: "off",
  fontPack: "system",
  marginPreset: "normal", // 좌우 15mm·상하 12mm (HWP 출력 기본; 좁게/넓게 선택 가능)
};

/**
 * 기본 시험지 메타 — Step5 정보 입력 패널의 초기값. 사용자가 입력하지 않은
 * 필드는 빈 문자열(또는 totalScore 100)로 두고, Step5Export 의 meta useMemo 가
 * 빈 값일 때 testTitle / gradeBadge / 오늘 날짜 등으로 폴백한다.
 *
 * 6 종 인쇄 템플릿(헤더)과 HWP payload(meta) 가 *동일* 한 이 값을 공유 — 고른
 * 폼이 미리보기·HWP 에 일관 유지되도록(§내보내기 고도화). title/subject 는
 * PrintMeta 에서 non-optional 이라 빈 문자열로 시드.
 */
export const DEFAULT_PRINT_META: PrintMeta = {
  title: "",
  subject: "수학",
  schoolName: "",
  grade: "",
  semester: "",
  examDate: "",
  examDuration: "",
  examiner: "",
  totalScore: 100,
  academyName: "",
  instructorName: "",
  conceptNote: "",
  todayGoal: "",
  patternName: "",
  patternStrategy: "",
};
