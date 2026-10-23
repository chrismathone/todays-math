/** Provider formatting is not a repair loop: accept one complete JSON document,
 * optionally enclosed in a single JSON Markdown fence, and validate its schema. */
export function ontologyModelJson(raw: string, maxBytes = 10000): unknown {
  if (Buffer.byteLength(raw) > maxBytes) throw new Error("MODEL_OUTPUT_BUDGET");
  const text = raw.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/u.exec(text);
  const document = fenced ? fenced[1] : text;
  const value: unknown = JSON.parse(document);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("MODEL_OBJECT_REQUIRED");
  const stack: (
    | { kind: "object"; keys: Set<string>; expectsKey: boolean }
    | { kind: "array" }
  )[] = [];
  for (const token of document.match(
    /"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g,
  ) ?? []) {
    if (token === "{")
      stack.push({ kind: "object", keys: new Set(), expectsKey: true });
    else if (token === "[") stack.push({ kind: "array" });
    else if (token === "}" || token === "]") stack.pop();
    else {
      const current = stack.at(-1);
      if (current?.kind === "object") {
        if (token === ",") current.expectsKey = true;
        else if (token.startsWith('"') && current.expectsKey) {
          const key = JSON.parse(token) as string;
          if (current.keys.has(key)) throw new Error("DUPLICATE_MODEL_KEY");
          current.keys.add(key);
          current.expectsKey = false;
        }
      }
    }
  }
  return value;
}
export class OntologyModelOutputError extends Error {
  constructor(readonly stage: "intent" | "grounding" | "plan") {
    super("MODEL_OUTPUT_INVALID");
  }
}
export function validateOntologyModelOutput<T>(
  stage: OntologyModelOutputError["stage"],
  parse: () => T,
): T {
  try {
    return parse();
  } catch {
    throw new OntologyModelOutputError(stage);
  }
}
