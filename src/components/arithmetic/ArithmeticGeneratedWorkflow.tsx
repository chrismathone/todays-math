"use client";

import { useMemo } from "react";
import {
  arithmeticToStudioProblems,
  type ArithmeticOutputSheet,
} from "@/lib/arithmeticOutput";
import { arithmeticSheetPacks } from "@/lib/arithmetic-v2/presentation/preparePacks";
import { useArithmeticPackPreparation } from "./useArithmeticPackPreparation";
import {
  ArithmeticWorkflowView,
  type ArithmeticWorkflowViewProps,
} from "./ArithmeticWorkflow";

/** Loaded only after generation or saved-sheet restoration. */
export default function ArithmeticGeneratedWorkflow(
  props: ArithmeticWorkflowViewProps & { sheet: ArithmeticOutputSheet },
) {
  const requests = useMemo(
    () => arithmeticSheetPacks(props.sheet),
    [props.sheet],
  );
  const { ready, failed, retry } = useArithmeticPackPreparation(
    requests,
    props.preview,
  );
  const problems = useMemo(
    () => (ready ? arithmeticToStudioProblems(props.sheet) : []),
    [props.sheet, ready],
  );
  if (!ready)
    return (
      <ArithmeticWorkflowView
        {...props}
        canOutput={false}
        canSave={false}
        canRegenerate={false}
        problems={problems}
        preparation={
          failed ? (
            <div>
              <p role="alert">연산 그림 자료를 불러오지 못했습니다.</p>
              <button type="button" onClick={retry}>
                다시 시도
              </button>
            </div>
          ) : (
            <p role="status">연산 그림 자료를 불러오는 중입니다.</p>
          )
        }
      />
    );
  return <ArithmeticWorkflowView {...props} problems={problems} />;
}
