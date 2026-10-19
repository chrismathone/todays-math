import type { DefinitionRecord } from "./definition-cards";
import type {
  ExplorerSupplements,
  WorkshopRecord,
} from "@/contracts/mathExplorers.contract";

/** Account-owned concept progress. The imported demo profiles/game store are not used. */
export type ExplorerProfile = {
  id: string;
  grade: number;
  stars: number;
  earned: number;
  level: number;
  definitions?: DefinitionRecord;
  workshop?: WorkshopRecord;
  /** 보충 카드(D-147) — 본 카드 기록과 따로 둔 칸(`supplement.ts`). */
  supplements?: ExplorerSupplements;
};

export type DefinitionAction = {
  definitionAction:
    | "start"
    | "read"
    | "answer"
    | "hint"
    | "course"
    | "goal"
    | "chest"
    | "retry-unresolved"
    | "understood";
  definitionRoute?: "unit" | "memory" | "repair";
  questionId?: string;
  grade?: number;
  unitId?: string;
  cardId?: string;
  chestId?: string;
  tiles?: number[];
  /** The public choice positions behind `tiles` (kept for «앞에서 고른 답»). */
  choiceIds?: number[];
  /** The screen shows «한 번 더 → 풀이» (header `x-explorer-follow-up`). */
  followUps?: boolean;
};

export type DefinitionFeedback = {
  message: string;
  correct?: boolean;
  advance?: boolean;
  complete?: boolean;
  stars?: number;
  chestId?: string;
  hint?: boolean;
  /** The engine attaches this card's solution (`explorerSolutionSchema`). */
  solutionCardId?: string;
};
