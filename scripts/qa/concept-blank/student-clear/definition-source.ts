/** Locate general-definition literals without rewriting IDs, order, figures or helpers. */
import ts from "typescript";

export type DefinitionLiteral = {
  id: string;
  start: number;
  end: number;
  value: string;
};

function property(
  node: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const entry = node.properties.find(
    (item) =>
      ts.isPropertyAssignment(item) &&
      item.name.getText().replace(/["']/g, "") === name,
  );
  return entry && ts.isPropertyAssignment(entry)
    ? entry.initializer
    : undefined;
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

/** Four existing bank layouts: entry objects, elementary sections, middle section(), plusSection(). */
export function definitionLiterals(
  text: string,
  grade: string,
): Map<string, DefinitionLiteral> {
  if (!/^(?:e[3-6]|m[1-3])$/.test(grade))
    throw new Error("알 수 없는 은행 학년");
  const source = ts.createSourceFile(
    `${grade}.ts`,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const found = new Map<string, DefinitionLiteral>();
  const add = (id: string, expression: ts.Expression | undefined) => {
    const value = literal(expression, source);
    if (!expression || value === undefined)
      throw new Error(`${id}: 일반 설명 리터럴을 찾을 수 없습니다.`);
    if (found.has(id)) throw new Error(`원천에서 중복된 ID: ${id}`);
    found.set(id, {
      id,
      value,
      start: expression.getStart(source),
      end: expression.getEnd(),
    });
  };
  const tuples = (
    prefix: string,
    entries: ts.Expression | undefined,
    suffix: "c" | "xc",
    numbers?: ts.Expression,
  ) => {
    if (!entries || !ts.isArrayLiteralExpression(entries))
      throw new Error(`${prefix}: 개념 튜플 배열 없음`);
    const ordinals =
      numbers && ts.isArrayLiteralExpression(numbers)
        ? numbers.elements.map((item) =>
            ts.isNumericLiteral(item) ? Number(item.text) : NaN,
          )
        : undefined;
    if (
      numbers &&
      (!ordinals ||
        ordinals.length !== entries.elements.length ||
        ordinals.some((value) => !Number.isInteger(value) || value < 1) ||
        new Set(ordinals).size !== ordinals.length)
    )
      throw new Error(`${prefix}: 고정 문항 번호를 확인해야 합니다.`);
    entries.elements.forEach((entry, index) => {
      if (
        entry.kind === ts.SyntaxKind.NullKeyword ||
        entry.getText(source) === "RETIRED"
      )
        return;
      if (!ts.isArrayLiteralExpression(entry))
        throw new Error(`${prefix}: 지원하지 않는 개념 튜플`);
      add(
        `${prefix}-${suffix}${ordinals?.[index] ?? index + 1}`,
        entry.elements[3],
      );
    });
  };
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const id = literal(property(node, "id"), source);
      const definition = property(node, "definition");
      if (id && definition && id.startsWith(`${grade}-`) && /-c\d+$/.test(id))
        add(id, definition);
      const concepts = property(node, "concepts");
      if (id && concepts && id.startsWith(`${grade}-`) && !definition)
        tuples(id, concepts, "c");
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === "section") {
        const code =
          grade === "e4"
            ? literal(node.arguments[1], source)?.split(" ")[0]
            : literal(node.arguments[0], source);
        if (code) {
          const argument = node.arguments[2];
          const body =
            argument && ts.isObjectLiteralExpression(argument)
              ? argument
              : node.arguments[3];
          const concepts =
            argument && ts.isArrayLiteralExpression(argument)
              ? argument
              : body && ts.isObjectLiteralExpression(body)
                ? (property(body, "concepts") ?? property(body, "c"))
                : undefined;
          const numbering = node.arguments[5];
          const numbers =
            grade === "e4" &&
            numbering &&
            ts.isObjectLiteralExpression(numbering)
              ? property(numbering, "concepts")
              : undefined;
          tuples(`${grade}-${code}`, concepts, "c", numbers);
        }
      }
      if (node.expression.text === "plusSection") {
        const prefix = literal(node.arguments[1], source);
        const items = node.arguments[2];
        if (prefix && items && ts.isObjectLiteralExpression(items)) {
          const concepts = property(items, "concepts");
          if (concepts) tuples(prefix, concepts, "xc");
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** Returns proposed source text only; callers own complete review and application gates. */
export function replaceDefinitions(
  text: string,
  grade: string,
  changes: { id: string; before: string; after: string }[],
): string {
  if (new Set(changes.map((change) => change.id)).size !== changes.length)
    throw new Error("중복 일반 설명 교정");
  const locations = definitionLiterals(text, grade);
  const edits = changes
    .map((change) => {
      const location = locations.get(change.id);
      if (!location || location.value !== change.before)
        throw new Error(
          `교정 후 또는 타 세션 원천을 덮어쓸 수 없습니다: ${change.id}`,
        );
      const replacement =
        text.slice(location.start, location.end).startsWith("r`") &&
        !change.after.includes("`") &&
        !change.after.includes("${")
          ? "r`" + change.after + "`"
          : JSON.stringify(change.after);
      return { ...location, replacement };
    })
    .sort((first, second) => second.start - first.start);
  let next = text;
  for (const edit of edits)
    next = next.slice(0, edit.start) + edit.replacement + next.slice(edit.end);
  const updated = definitionLiterals(next, grade);
  for (const [id, before] of locations) {
    const expected =
      changes.find((change) => change.id === id)?.after ?? before.value;
    if (updated.get(id)?.value !== expected)
      throw new Error(`교정 범위를 벗어난 변경: ${id}`);
  }
  if (updated.size !== locations.size)
    throw new Error("일반 설명 교정으로 ID 수가 바뀜");
  return next;
}
