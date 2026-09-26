import type { DefinitionRecord } from "./definition-cards";

/** Account-owned concept progress. The imported demo profiles/game store are not used. */
export type ExplorerProfile = {
  id: string;
  grade: number;
  stars: number;
  earned: number;
  level: number;
  definitions?: DefinitionRecord;
};

export type DefinitionAction = {
  definitionAction:
    "start" | "read" | "answer" | "hint" | "course" | "goal" | "chest";
  definitionRoute?: "unit" | "memory" | "repair";
  questionId?: string;
  grade?: number;
  unitId?: string;
  cardId?: string;
  chestId?: string;
  tiles?: number[];
};

export type DefinitionFeedback = {
  message: string;
  correct?: boolean;
  advance?: boolean;
  complete?: boolean;
  stars?: number;
  chestId?: string;
  hint?: boolean;
};
