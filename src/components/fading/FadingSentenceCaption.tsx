import type { FadingProposition, FadingTarget } from "@/lib/fading/concepts";
import { FadingConceptLabel } from "./FadingConceptLabel";
import { curriculumName } from "./labels";
import { fadingSafeTopic } from "./sentenceTopic";
import s from "./fading.module.css";

export function FadingSentenceCaption({
  proposition,
  index,
  section,
  erased = [],
}: {
  proposition: FadingProposition;
  index: number;
  section: string;
  erased?: readonly Pick<FadingTarget, "text">[];
}) {
  const term = fadingSafeTopic(proposition.term, erased);
  const fallback = section
    .split("::")
    .reverse()
    .find((name) => fadingSafeTopic(name, erased) !== undefined);
  const kind = fadingSafeTopic(proposition.kind, erased);
  return (
    <span className={s.singleCardCaption}>
      <FadingConceptLabel index={index} term={term} />
      {term === undefined && fallback && (
        <span className={s.singleCardUnit}>{curriculumName(fallback)}</span>
      )}
      {kind !== undefined && <span className={s.singleCardKind}>{kind}</span>}
    </span>
  );
}
