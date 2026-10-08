/** Bind example prompts to existing definition locations, never search/replace by text. */
import ts from "typescript";
import { definitionLiterals } from "./definition-source";
import { validateExampleParticleChange } from "./example-corrections";

type PromptLiteral = {
  id: string;
  start: number;
  end: number;
  value: string;
  answer: string;
};
type SourceExampleChange = {
  id: string;
  before: string;
  after: string;
  answer: string;
};

function property(
  node: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const item = node.properties.find(
    (item) =>
      ts.isPropertyAssignment(item) &&
      item.name.getText().replace(/["']/g, "") === name,
  );
  return item && ts.isPropertyAssignment(item) ? item.initializer : undefined;
}

function literal(
  expression: ts.Expression | undefined,
  source: ts.SourceFile,
): string | undefined {
  if (!expression) return undefined;
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (
    ts.isTaggedTemplateExpression(expression) &&
    ["r", "String.raw"].includes(expression.tag.getText(source)) &&
    ts.isNoSubstitutionTemplateLiteral(expression.template)
  )
    return expression.template
      .getText(source)
      .slice(1, -1)
      .replace(/\r\n?/g, "\n");
  return undefined;
}

/** Definition element 3 binds the ID; example element 4 is [prompt, answer]. */
export function examplePromptLiterals(
  text: string,
  grade: string,
  ids: string[],
): Map<string, PromptLiteral> {
  if (new Set(ids).size !== ids.length) throw new Error("중복 예문 원천 ID");
  const definitions = definitionLiterals(text, grade);
  const selected = new Map(
    ids.map((id) => {
      const definition = definitions.get(id);
      if (!definition) throw new Error(`예문 원천 ID 없음: ${id}`);
      return [definition.start, { id, end: definition.end }] as const;
    }),
  );
  const source = ts.createSourceFile(
    `${grade}.ts`,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const found = new Map<string, PromptLiteral>();
  const visit = (node: ts.Node) => {
    const binding = selected.get(node.getStart(source));
    if (binding && node.getEnd() === binding.end && ts.isExpression(node)) {
      const { id } = binding;
      const parent = node.parent;
      let example: ts.Expression | undefined;
      if (ts.isArrayLiteralExpression(parent) && parent.elements[3] === node)
        example = parent.elements[4];
      else if (
        ts.isPropertyAssignment(parent) &&
        ts.isObjectLiteralExpression(parent.parent)
      )
        example = property(parent.parent, "example");
      const prompt =
        example && ts.isArrayLiteralExpression(example)
          ? example.elements[0]
          : example && ts.isObjectLiteralExpression(example)
            ? property(example, "prompt")
            : undefined;
      const answerExpression =
        example && ts.isArrayLiteralExpression(example)
          ? example.elements[1]
          : example && ts.isObjectLiteralExpression(example)
            ? property(example, "answer")
            : undefined;
      const value = literal(prompt, source);
      const answer = literal(answerExpression, source);
      if (!prompt || value === undefined || answer === undefined)
        throw new Error(
          `${id}: 예문의 prompt·answer 리터럴을 찾을 수 없습니다.`,
        );
      if (found.has(id)) throw new Error(`중복 예문 원천 위치: ${id}`);
      found.set(id, {
        id,
        start: prompt.getStart(source),
        end: prompt.getEnd(),
        value,
        answer,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (found.size !== ids.length)
    throw new Error("예문 ID와 코드 위치가 다릅니다.");
  return found;
}

/** Writes nothing; only approved prompt literals are replaced, with unchanged answers. */
export function replaceExamplePrompts(
  text: string,
  grade: string,
  changes: SourceExampleChange[],
): string {
  if (!changes.length) return text;
  const locations = examplePromptLiterals(
    text,
    grade,
    changes.map((change) => change.id),
  );
  const edits = changes
    .map((change) => {
      validateExampleParticleChange(change.before, change.after);
      const location = locations.get(change.id)!;
      if (location.value !== change.before || location.answer !== change.answer)
        throw new Error(`예문 원천 prompt·answer가 바뀌었습니다: ${change.id}`);
      const original = text.slice(location.start, location.end);
      const raw = /^(r|String\.raw)`/.exec(original);
      const replacement =
        raw && !change.after.includes("`") && !change.after.includes("${")
          ? raw[1] + "`" + change.after + "`"
          : JSON.stringify(change.after);
      return { ...location, replacement };
    })
    .sort((a, b) => b.start - a.start);
  let next = text;
  for (const edit of edits)
    next = next.slice(0, edit.start) + edit.replacement + next.slice(edit.end);
  const updated = examplePromptLiterals(
    next,
    grade,
    changes.map((change) => change.id),
  );
  for (const change of changes) {
    const location = updated.get(change.id)!;
    if (location.value !== change.after || location.answer !== change.answer)
      throw new Error(`예문 교정 범위를 벗어난 변경: ${change.id}`);
  }
  return next;
}
