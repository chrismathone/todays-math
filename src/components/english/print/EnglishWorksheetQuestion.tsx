import { ENGLISH_OPEN_TYPES } from "@/contracts/english.contract";
import type { StudioProblem } from "@/components/unified/types";
import {
  ENGLISH_CHOICE_MARKS,
  englishOptionLayout,
} from "@/lib/english/options";
import EnglishPromptText from "../EnglishPromptText";

export function EnglishWorksheetQuestion({
  content,
}: {
  content: NonNullable<StudioProblem["english"]>;
}) {
  const { item, displayNumber, includePassage } = content;
  const { question } = item;
  const options = englishOptionLayout(question);
  return (
    <article
      data-english-source-index={item.questionIndex}
      data-english-question={displayNumber}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {includePassage && (
        <section
          aria-label="지문"
          data-english-passage="first"
          lang="en"
          style={{ border: "1px solid #999", padding: 12, marginBottom: 12 }}
        >
          {item.passage}
        </section>
      )}
      <div>
        <EnglishPromptText question={question} />
      </div>
      {!options.omitted && options.lines.length > 0 && (
        <ol
          aria-label={`${displayNumber}번 보기`}
          style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}
        >
          {options.lines.map((line, index) => (
            <li key={index} style={{ display: "flex", gap: 8 }}>
              <span>{line.mark}</span>
              <span>{line.text}</span>
            </li>
          ))}
        </ol>
      )}
      {ENGLISH_OPEN_TYPES.includes(question.type) && (
        <div
          aria-hidden="true"
          data-english-answer-blank={displayNumber}
          style={{ height: 50, borderBottom: "1px solid #999" }}
        />
      )}
    </article>
  );
}

export function EnglishWorksheetAnswer({
  content,
  quick,
}: {
  content: NonNullable<StudioProblem["english"]>;
  quick: boolean;
}) {
  const { question } = content.item;
  const answer = ENGLISH_OPEN_TYPES.includes(question.type)
    ? question.answer
    : (ENGLISH_CHOICE_MARKS[Number(question.answer) - 1] ?? question.answer);
  return (
    <div style={{ whiteSpace: "pre-wrap" }}>
      <div>
        <strong>{content.displayNumber}. </strong>
        {answer}
      </div>
      {!quick && (
        <>
          {question.explanation && <div>해설 · {question.explanation}</div>}
          {question.evidence && <div>근거 · {question.evidence}</div>}
        </>
      )}
    </div>
  );
}
