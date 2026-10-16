import type { UnitEntity } from "@/contracts/unit.contract";
import type { ProblemSourceReference } from "@/contracts/problemSourceReference.contract";
import type { MathgenProblemData } from "@/lib/mathgen/contracts";
import type { StudioCrop } from "./studioHelpers";
import type { EnglishBankQuestion } from "@/contracts/englishQuestionBank.contract";

export type SchoolLevel = "elementary" | "secondary";

export interface StudioProblem {
  /** Display-only arithmetic grouping; the saved item remains untouched in source. */
  arithmetic?: {
    round: number;
    number: number;
    groupKey: string;
    groupTitle: string;
    /** One shared question for the contiguous group, printed as "[11~20] …". */
    groupInstruction?: string;
  };
  /** Lossless English output adapter. Never feed English prose through the math parser. */
  english?: {
    item: EnglishBankQuestion;
    displayNumber: number;
    includePassage: boolean;
  };
  ocr?: MathgenProblemData;
  /** Full, nonrecursive source/edit snapshot; printable URLs remain derived output. */
  studioCrop?: StudioCrop;
  questionType?: "multiple-choice" | "short-answer" | "descriptive";
  id: string;
  content: string;
  answer: string;
  solution: string;
  grade: string;
  chapter: string;
  section: string;
  difficulty: string;
  problemCode: string;
  figureUrls: string[];
  figureSvg: string | null;
  figureDims: number[];
  figureSourceMm: number[];
  /** 옛 저장본에는 없다. 없는 연결은 렌더러가 [] 와 똑같이 받는다. */
  choiceFigureIndex?: number[];
  /** Whole-problem image from a local crop; used when text has not been transcribed. */
  croppedImage?: string;
  sourceLabel?: string;
  /** Optional on imported/local crops; retained when a bank problem is selected. */
  sourceReference?: ProblemSourceReference | null;
  source?: unknown;
  /** Bank inspection can include shared rows that cannot be issued. */
  eligible?: boolean;
  ineligibleReason?: string | null;
  reviewStatus?: string;
  problemType?: string;
}

export interface BankProblem extends StudioProblem {
  source?: string;
  /**
   * 출처 배지(`provenanceBadges`)의 판정 근거 — 엔진이 적는 자기 유형 정체(D-105).
   *
   * 🔴 **옵셔널로 만들지 말 것.** 빠지면 초등·중등 엔진 문항이 통째로 `[?] 미분류`로
   *    나오는데 **에러가 안 난다**(`problem.contract.ts` 가 적어 둔 경고 그대로이고,
   *    2026-09-14 에 이 화면에서 실제로 그렇게 됐다 — 변환부가 이 값을 꺼내 쓰고
   *    돌려놓지 않았고, 카드에 배지가 아예 없어 아무도 못 봤다).
   */
  familyKey: string | null;
  /**
   * 변형본의 원본. `source === "transformed"` 안에서 **[변] AI 변형과 [문] 문제집을
   * 가르는 유일한 값**이다. 널이 될 수는 있어도 빠질 수는 없다.
   */
  originProblemId: string | null;
  /**
   * DB 에 기록된 **원본** 출제 형식(`객관식`·`단답형`·`서술형` 또는 null).
   *
   * 🔴 `questionType` 과 **다른 값**이다 — 그쪽은 서버가 판정해 영문으로 덮어쓴
   *    파생값이고, 형식 판정(`classifyFormat`)은 한글 원본과 견준다. 화면이 파생값으로
   *    다시 판정하면 서버와 답이 갈린다. 옵셔널로 만들지 말 것 — 빠지면 에러 없이
   *    `[?형식]` 으로 조용히 떨어진다.
   */
  questionTypeRaw: string | null;
  /**
   * 자료 안 번호(교과서) · 시험지 번호(기출) — 서버 목록(`UNIFIED_PROBLEM_SELECT`)이 싣는다(문제은행 P0 2026-10-14).
   * 자료 안에서도 겹칠 수 있다 — 번호만으로 문항을 가리키지 말고 문항 코드와 함께 보인다. 옛 저장 초안에는 없다.
   */
  questionNumber?: number | null;
}

export interface BankData {
  problems: BankProblem[];
  total: number;
  page: number;
  pageSize: number;
  grades: { grade: string; count: number }[];
  chapters: string[];
  /** Full curriculum for the same range picker used by ProblemBank. */
  units?: UnitEntity[];
  /** Issuable problem counts keyed by curriculum unit ID. */
  unitCounts?: Record<string, number>;
  error?: string;
}

export interface BankViewProps {
  initialData: BankData;
  initialFilters?: { q?: string; grade?: string };
  selected: StudioProblem[];
  onToggle: (problem: StudioProblem) => void;
  /** Commit additions, replacements, and order changes as one selection update. */
  onSelectionChange?: (problems: StudioProblem[]) => void;
  onExport: () => void;
}

export interface StudioViewProps {
  onAdd: (problems: StudioProblem[]) => void;
  onExport: () => void;
  importRequest?: { id: number; files: File[] };
}
