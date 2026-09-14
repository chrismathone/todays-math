export type SchoolLevel = "elementary" | "secondary";

export interface StudioProblem {
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
  /** Whole-problem image from a local crop; used when text has not been transcribed. */
  croppedImage?: string;
  sourceLabel?: string;
}

export interface BankData {
  problems: StudioProblem[];
  total: number;
  page: number;
  pageSize: number;
  grades: { grade: string; count: number }[];
  chapters: string[];
  error?: string;
}

export interface BankViewProps {
  initialData: BankData;
  initialFilters?: { q?: string; grade?: string };
  selected: StudioProblem[];
  onToggle: (problem: StudioProblem) => void;
  onExport: () => void;
}

export interface StudioViewProps {
  onAdd: (problems: StudioProblem[]) => void;
  onExport: () => void;
  importRequest?: { id: number; files: File[] };
}
