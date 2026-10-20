"use client";

import { useMemo } from "react";
import {
  arithmeticToStudioProblems,
  type ArithmeticOutputSheet,
} from "@/lib/arithmeticOutput";
import {
  ArithmeticWorkflowView,
  type ArithmeticWorkflowViewProps,
} from "./ArithmeticWorkflow";

/** Loaded only after generation or saved-sheet restoration. */
export default function ArithmeticGeneratedWorkflow(
  props: ArithmeticWorkflowViewProps & { sheet: ArithmeticOutputSheet },
) {
  const problems = useMemo(
    () => arithmeticToStudioProblems(props.sheet),
    [props.sheet],
  );
  return <ArithmeticWorkflowView {...props} problems={problems} />;
}
