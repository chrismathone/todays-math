import {
  sourceReferenceLabel,
  type SourceReferenceInput,
} from "@/lib/problem/sourceReferenceLabel";
import styles from "./ProblemSourceReference.module.css";

/** Read-only context already included in the problem response; no per-card requests. */
export function ProblemSourceReference({
  problem,
}: {
  problem: SourceReferenceInput;
}) {
  const label = sourceReferenceLabel(problem);
  if (!label) return null;
  return (
    <p className={styles.reference} data-source-reference>
      {label}
    </p>
  );
}
