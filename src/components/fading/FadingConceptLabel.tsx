import { FadingMath } from "./FadingMath";
import { conceptSentenceLabel } from "./labels";
import s from "./fading.module.css";

/** 번호는 한 줄로, 허용된 용어는 남은 폭에서 줄바꿈한다. */
export function FadingConceptLabel({
  index,
  term,
}: {
  index: number;
  term?: string;
}) {
  return (
    <span className={s.propositionTitle}>
      <span className={s.propositionNumber} data-fading-concept-number>
        {conceptSentenceLabel(index)}
        {term !== undefined ? " · " : ""}
      </span>
      {term !== undefined && (
        <span className={s.propositionTerm} data-fading-concept-term>
          <FadingMath text={term} />
        </span>
      )}
    </span>
  );
}
