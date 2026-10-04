import type { TextbookConceptBody } from "@/contracts/textbookConcept.contract";
import { splitTextbookMarkdown } from "./markdown";

/** Only the render projection is split; frozen concept content and its hash stay unchanged. */
export function splitConceptBody(
  body: TextbookConceptBody,
): TextbookConceptBody[] {
  const fields = [
    body.goal,
    body.definition,
    body.conditions,
    body.explainPrompt,
  ].filter((s): s is string => Boolean(s));
  if (
    fields.join("\n").length < 1200 &&
    fields.every((s) => splitTextbookMarkdown(s).length <= 3) &&
    [
      body.prerequisites,
      body.examples,
      body.counterexamples,
      body.misconceptions,
    ].every((rows) => rows.length <= 4 && rows.join("\n").length < 600)
  )
    return [body];
  const empty: TextbookConceptBody = {
    goal: "",
    prerequisites: [],
    definition: "",
    conditions: null,
    examples: [],
    counterexamples: [],
    misconceptions: [],
    explainPrompt: null,
  };
  const parts: TextbookConceptBody[] = [];
  const prose = (
    field: "goal" | "definition" | "conditions" | "explainPrompt",
  ) => {
    if (!body[field]) return;
    let group: string[] = [];
    const flush = () => {
      if (group.length) parts.push({ ...empty, [field]: group.join("\n\n") });
      group = [];
    };
    for (const value of splitTextbookMarkdown(body[field]!)) {
      if (
        group.length &&
        (group.length >= 3 || group.join("\n\n").length + value.length > 600)
      )
        flush();
      group.push(value);
    }
    flush();
  };
  const list = (
    field: "prerequisites" | "examples" | "counterexamples" | "misconceptions",
  ) => {
    for (let at = 0; at < body[field].length; at += 4)
      parts.push({ ...empty, [field]: body[field].slice(at, at + 4) });
  };
  prose("goal");
  list("prerequisites");
  prose("definition");
  prose("conditions");
  list("examples");
  list("counterexamples");
  list("misconceptions");
  prose("explainPrompt");
  return parts.length ? parts : [body];
}
