"use client";

import { useState } from "react";
import { useLearningMotion } from "./LearningMotion";

/** Keep this above the keyed question: a first loaded/resumed paper has no entrance. */
export function useQuestionPageTurn(key: string | null): "true" | undefined {
  const { reduceMotion } = useLearningMotion();
  const [paper, setPaper] = useState({
    key,
    changed: false,
    reduced: reduceMotion,
  });
  if (key !== null && paper.key !== key) {
    setPaper({
      key,
      changed: paper.key !== null && !reduceMotion,
      reduced: reduceMotion,
    });
  } else if (paper.reduced !== reduceMotion) {
    setPaper({ ...paper, changed: false, reduced: reduceMotion });
  }
  return !reduceMotion && key !== null && paper.changed ? "true" : undefined;
}
