import {
  assertJsonNumber,
  assertJsonString,
  type JsonValue,
} from "./canonical";

export interface JsonLimits {
  maxBytes: number;
  maxDepth: number;
  maxTokens: number;
  maxStringLength: number;
}
export const TEXTBOOK_JSON_LIMITS: Readonly<JsonLimits> = Object.freeze({
  maxBytes: 32 * 1024 * 1024,
  maxDepth: 64,
  maxTokens: 1_000_000,
  maxStringLength: 4 * 1024 * 1024,
});
export class StrictJsonError extends SyntaxError {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(`${message} (offset ${offset})`);
    this.name = "StrictJsonError";
  }
}

/** Bounded lexical validation happens BEFORE JSON.parse can discard duplicate keys or round numbers. */
export function parseStrictJson(
  input: Uint8Array | string,
  limits: Partial<JsonLimits> = {},
): JsonValue {
  const bound = { ...TEXTBOOK_JSON_LIMITS, ...limits };
  for (const n of Object.values(bound))
    if (!Number.isSafeInteger(n) || n < 1)
      throw new RangeError("Invalid JSON limit");
  if (typeof input === "string" && input.length > bound.maxBytes)
    throw new StrictJsonError("JSON byte limit exceeded", 0);
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  if (bytes.byteLength > bound.maxBytes)
    throw new StrictJsonError("JSON byte limit exceeded", 0);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    throw new StrictJsonError("JSON BOM is forbidden", 0);
  // A string input must be checked before TextEncoder replaces invalid surrogate code units.
  if (typeof input === "string") assertJsonString(input);
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new StrictJsonError("Invalid UTF-8", 0);
  }
  let at = 0,
    tokens = 0;
  const fail = (message: string): never => {
    throw new StrictJsonError(message, at);
  };
  const whitespace = () => {
    while (
      source[at] === " " ||
      source[at] === "\n" ||
      source[at] === "\r" ||
      source[at] === "\t"
    )
      at++;
  };
  const string = (): string => {
    if (source[at++] !== '"') fail("Expected string");
    let out = "";
    while (at < source.length) {
      let c = source[at++];
      if (c === '"') {
        assertJsonString(out);
        return out;
      }
      if (c === "\\") {
        c = source[at++];
        if (c === "u") {
          const hex = source.slice(at, at + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("Invalid Unicode escape");
          out += String.fromCharCode(parseInt(hex, 16));
          at += 4;
        } else {
          const escapes: Record<string, string> = {
            '"': '"',
            "\\": "\\",
            "/": "/",
            b: "\b",
            f: "\f",
            n: "\n",
            r: "\r",
            t: "\t",
          };
          if (!Object.hasOwn(escapes, c)) fail("Invalid string escape");
          out += escapes[c];
        }
      } else {
        if (c.charCodeAt(0) < 32) fail("Unescaped control character");
        out += c;
      }
      if (out.length > bound.maxStringLength)
        fail("JSON string limit exceeded");
    }
    return fail("Unterminated string");
  };
  const value = (depth: number): void => {
    if (depth > bound.maxDepth) fail("JSON depth limit exceeded");
    if (++tokens > bound.maxTokens) fail("JSON token limit exceeded");
    whitespace();
    const c = source[at];
    if (c === '"') {
      string();
      return;
    }
    if (c === "{" || c === "[") {
      const object = c === "{",
        end = object ? "}" : "]",
        keys = new Set<string>();
      at++;
      whitespace();
      if (source[at] === end) {
        at++;
        return;
      }
      while (at < source.length) {
        if (object) {
          if (++tokens > bound.maxTokens) fail("JSON token limit exceeded");
          const key = string();
          if (keys.has(key)) fail(`Duplicate JSON key ${JSON.stringify(key)}`);
          keys.add(key);
          whitespace();
          if (source[at++] !== ":") fail("Expected colon");
        }
        value(depth + 1);
        whitespace();
        if (source[at] === end) {
          at++;
          return;
        }
        if (source[at++] !== ",") fail("Expected comma");
        whitespace();
      }
      fail("Unterminated container");
    }
    for (const literal of ["true", "false", "null"]) {
      if (source.startsWith(literal, at)) {
        at += literal.length;
        return;
      }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      source.slice(at),
    );
    if (!number) fail("Expected JSON value");
    assertJsonNumber(Number(number![0]));
    at += number![0].length;
  };
  value(0);
  whitespace();
  if (at !== source.length) fail("Unexpected trailing JSON input");
  return JSON.parse(source) as JsonValue;
}

/** API adapter. Reads chunks under a hard actual-byte limit; never calls request.json(). */
export async function readStrictJson(
  request: Pick<Request, "body">,
  limits: Partial<JsonLimits> = {},
): Promise<JsonValue> {
  const maxBytes = limits.maxBytes ?? TEXTBOOK_JSON_LIMITS.maxBytes;
  const reader = request.body?.getReader();
  if (!reader) throw new StrictJsonError("Empty request body", 0);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new StrictJsonError("JSON byte limit exceeded", length);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return parseStrictJson(bytes, limits);
}
