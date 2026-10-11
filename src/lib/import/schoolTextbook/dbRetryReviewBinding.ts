/** Stateless review validation and content/image bindings. No inference or provider imports. */
import { createHash } from "node:crypto";
import { z } from "zod";
import { intervalAnswerKey } from "./intervalAnswerNotation";
import { compareScalarAnswerNotation } from "./scalarAnswerNotation";
import { positiveRadicalAnswerKey } from "./positiveRadicalAnswerNotation";
import { compareDomainRangeAnswerNotation } from "./domainRangeAnswerNotation";
import type {
  DbRetryCandidate,
  DbRetryFigures,
  DbRetryOrigin,
  DbRetryPairReview,
} from "./dbRetry.types";
import { reviewDigest } from "./qualification";
import { textbookVariantSourceDigest } from "./variants";

const nonempty = z.string().trim().min(1);
const candidateSchema = z.object({
  sourceId: nonempty,
  sourceDigest: nonempty,
  originProblemId: nonempty,
  sourceMaterialId: nonempty.nullable(),
  unitId: nonempty,
  sourceExternalId: z.string().nullable(),
  sourceFile: z.string().nullable(),
  familyKey: nonempty,
  externalId: nonempty,
  source: z.literal("transformed"),
  questionType: z.enum(["객관식", "단답형", "서술형"]),
  slot: z.union([z.literal(1), z.literal(2)]),
  recipe: z.enum(["ai-db-numbers-v1", "ai-db-conditions-v1"]),
  method: nonempty,
  content: nonempty,
  answer: nonempty,
  solution: nonempty,
  figureSvg: nonempty.nullable(),
  figureUrls: z.array(nonempty),
  figureDims: z.array(z.number().int().positive()),
  figureSourceMm: z.array(z.number().positive()),
  choiceFigureIndex: z.array(z.number().int().min(0).max(10)),
  validation: z.object({
    version: nonempty,
    originalAnswerRecomputed: nonempty,
    checks: z.array(nonempty),
  }),
});
const figuresSchema = z.object({
  digest: nonempty,
  images: z.array(
    z.object({
      dataUrl: nonempty,
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      sourceSha256: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
      choiceIndex: z.number().int().min(0).max(10),
      origin: z.enum(["database-raster", "database-svg", "generated-svg"]),
    }),
  ),
});

export const dbRetryUnknownAnswer = (text: string) =>
  !text.trim() ||
  /^(?:unknown|uncertain|undefined|null|nan|infinity|미상|모름|모르겠.*|알\s*수\s*없.*|판단\s*불가|\?+)$/i.test(
    text.trim(),
  );
const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

/** Decode exactly the bytes that the vision request will consume, never trust the supplied SHA alone. */
function imageBytes(dataUrl: string): Buffer {
  const match =
    /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      dataUrl,
    );
  if (!match || match[2].length % 4 !== 0)
    throw new Error("invalid-image-data-url");
  const bytes = Buffer.from(match[2], "base64");
  if (
    !bytes.length ||
    bytes.toString("base64") !== match[2] ||
    bytes.length > 32 * 1024 * 1024
  )
    throw new Error("invalid-image-bytes");
  const mime = match[1];
  const valid =
    mime === "png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === "gif"
          ? /^(GIF87a|GIF89a)$/.test(bytes.subarray(0, 6).toString("ascii"))
          : bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
            bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!valid) throw new Error("invalid-image-format");
  return bytes;
}
export function dbRetryFigureDigest(figures: DbRetryFigures): string {
  return reviewDigest(
    figures.images.map((image) => ({
      sha256: sha256(imageBytes(image.dataUrl)),
      choiceIndex: image.choiceIndex,
      origin: image.origin,
      sourceSha256: image.sourceSha256 ?? null,
    })),
  );
}
function figureBinding(figures: DbRetryFigures | undefined): unknown {
  if (!figures) return null;
  return {
    ...figures,
    images: figures.images.map((image) => {
      try {
        return { ...image, actualSha256: sha256(imageBytes(image.dataUrl)) };
      } catch {
        return { ...image, actualSha256: null };
      }
    }),
  };
}
/** Call again before reuse/promotion. Every field of the origin/pair and every image byte is bound. */
export function dbRetryReviewBinding(
  origin: DbRetryOrigin,
  candidates: readonly DbRetryCandidate[],
  sourceFigures: DbRetryFigures,
  candidateFigures: readonly DbRetryFigures[],
): Pick<
  DbRetryPairReview,
  | "sourceId"
  | "sourceDigest"
  | "candidatePayloadDigest"
  | "sourceFigureDigest"
  | "candidateFigureDigests"
  | "bindingDigest"
> {
  const pair = [...candidates].sort((a, b) => a.slot - b.slot);
  return {
    sourceId: origin.problem.id,
    sourceDigest: textbookVariantSourceDigest(origin.problem),
    candidatePayloadDigest: reviewDigest(pair),
    sourceFigureDigest: sourceFigures.digest,
    candidateFigureDigests: [
      candidateFigures[0]?.digest ?? "",
      candidateFigures[1]?.digest ?? "",
    ],
    bindingDigest: reviewDigest({
      origin,
      candidates: pair,
      sourceFigures: figureBinding(sourceFigures),
      candidateFigures: candidateFigures.map(figureBinding),
    }),
  };
}

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";
/** Only explicit sequential choices; an unparseable MC item remains unreviewable. */
function choicesOf(content: string): string[] | null {
  // Mask math so numbered subexpressions cannot become choice boundaries.
  const masked = content.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, (match) =>
    " ".repeat(match.length),
  );
  const circled = [...masked.matchAll(/[①②③④⑤⑥⑦⑧⑨⑩]/g)];
  const numeric = [...masked.matchAll(/(?:^|\n)[ \t]*([1-9]|10)[.)][ \t]+/g)];
  const matches =
    circled.length >= 2
      ? circled.map((m) => ({
          index: m.index!,
          end: m.index! + 1,
          number: CIRCLED.indexOf(m[0]) + 1,
        }))
      : numeric.map((m) => ({
          index: m.index!,
          end: m.index! + m[0].indexOf(m[1]) + m[1].length + 1,
          number: Number(m[1]),
        }));
  if (matches.length < 2 || matches.some((m, i) => m.number !== i + 1))
    return null;
  const choices = matches.map((m, i) =>
    content.slice(m.end, matches[i + 1]?.index).trim(),
  );
  return choices.some((choice) => !choice) ? null : choices;
}
function unwrap(text: string): string {
  let result = text.trim().normalize("NFC");
  if (/^\$\$[^$]*\$\$$/.test(result)) result = result.slice(2, -2);
  else if (/^\$[^$]*\$$/.test(result)) result = result.slice(1, -1);
  else if (
    (result.startsWith("\\(") && result.endsWith("\\)")) ||
    (result.startsWith("\\[") && result.endsWith("\\]"))
  )
    result = result.slice(2, -2);
  return result
    .trim()
    .replace(/\$([^$\n]*)\$/g, "$1")
    .replace(/\\text\{\s*\((\d+)\)\s*\}/g, "($1)")
    .replace(/[⑴-⒇]/g, (label) => `(${label.charCodeAt(0) - 0x2474 + 1})`)
    .replace(/−/g, "-")
    .replace(/\\pm\b/g, "±")
    .replace(/~/g, " ")
    .replace(/\\(?:dfrac|tfrac)\b/g, "\\frac")
    .replace(/\\frac([0-9])([0-9])(?![0-9])/g, "\\frac{$1}{$2}")
    .replace(/\\sqrt(\[\d{1,2}\])?([0-9])(?![0-9])/g, "\\sqrt$1{$2}")
    .replace(
      /log([₀₁₂₃₄₅₆₇₈₉]+)(?=[0-9{])/g,
      (_all, index: string) =>
        `\\log_{${[...index].map((char) => "₀₁₂₃₄₅₆₇₈₉".indexOf(char)).join("")}}`,
    )
    .replace(
      /\\log\s*_\s*(?:\{(\d{1,6})\}|(\d))\s*(?:\{(\d{1,6})\}|(\d{1,6}))/g,
      (
        _all,
        bracedBase: string | undefined,
        singleBase: string | undefined,
        bracedArg: string | undefined,
        plainArg: string | undefined,
      ) => `\\log_{${bracedBase ?? singleBase}}{${bracedArg ?? plainArg}}`,
    )
    .replace(/\\(?:left|right)\b/g, "")
    .replace(/\\(?:[,;:!]|quad\b|qquad\b| )/g, " ")
    .replace(/\s+/g, " ");
}
function scalarKey(text: string): string | null {
  const bare = text.replace(/\s+/g, "");
  if (bare.length > 200) return null;
  const fraction =
    /^([+-]?)\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}$/.exec(bare) ??
    /^([+-]?)(\d+)\/([+-]?\d+)$/.exec(bare);
  let numerator: bigint, denominator: bigint;
  if (fraction) {
    numerator =
      BigInt(fraction[2]) * (fraction[1] === "-" ? BigInt(-1) : BigInt(1));
    denominator = BigInt(fraction[3]);
  } else if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(bare)) {
    const [integer, decimal = ""] = bare.split(".");
    numerator = BigInt(`${integer || "0"}${decimal}`);
    denominator = BigInt(10) ** BigInt(decimal.length);
  } else return null;
  if (denominator === BigInt(0)) return null;
  if (denominator < BigInt(0)) {
    numerator = -numerator;
    denominator = -denominator;
  }
  let a = numerator < BigInt(0) ? -numerator : numerator,
    b = denominator;
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return `r:${numerator / a}/${denominator / a}`;
}
function mathKey(text: string, numericRootSet = false): string | null {
  const bare = unwrap(text);
  if (dbRetryUnknownAnswer(bare) || bare.length > 4000) return null;
  const positiveRadical = positiveRadicalAnswerKey(bare);
  if (positiveRadical !== null) return positiveRadical;
  const interval = intervalAnswerKey(bare);
  if (interval !== null) return interval;
  const unitText = bare.replace(
    /\\(?:mathrm|text)\{(W|dB|cm|mm|km|kg|mL|min|m|g|s|h|L)\}/g,
    "$1",
  );
  const quantity = /^(.+?)\s*(W|dB|cm|mm|km|kg|mL|min|m|g|s|h|L)$/.exec(
    unitText,
  );
  if (quantity) {
    const value = scalarKey(quantity[1]);
    if (value !== null) return `quantity:${quantity[2]}:${value}`;
  }
  const unitRangeText = bare.replace(
    /\\(?:mathrm|text)\{(W|dB|m|cm|mm|km|g|kg|s|min|h|L|mL)\}/g,
    "$1",
  );
  const unitRange =
    /^(.+?)\s*(W|dB|cm|mm|km|kg|mL|min|m|g|s|h|L)\s*(이상|초과)\s*(.+?)\s*\2\s*(이하|미만)$/.exec(
      unitRangeText,
    );
  if (unitRange) {
    const lower = scalarKey(unitRange[1]),
      upper = scalarKey(unitRange[4]);
    if (lower !== null && upper !== null)
      return `unit-range:${unitRange[2]}:${unitRange[3]}:${lower}:${unitRange[5]}:${upper}`;
  }
  // Sequential subpart labels preserve every answer and its position. Only
  // punctuation between subparts is formatting; a missing/reordered part fails.
  const parts = [...bare.matchAll(/\((\d+)\)\s*/g)];
  if (/^\(1\)/.test(bare) && parts.length >= 2) {
    if (parts.some((part, index) => Number(part[1]) !== index + 1)) return null;
    const keys = parts.map((part, index) =>
      mathKey(
        bare
          .slice(part.index! + part[0].length, parts[index + 1]?.index)
          .trim()
          .replace(/[,;，；]+$/, ""),
        numericRootSet,
      ),
    );
    return keys.every((key) => key !== null) ? `parts:${keys.join("|")}` : null;
  }
  const compact = bare
    .replace(/\s+/g, "")
    .replace(
      /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g,
      (exponent) =>
        `^${[...exponent].map((char) => (char === "⁺" ? "+" : char === "⁻" ? "-" : "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(char))).join("")}`,
    )
    .replace(/\^\{\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}\}/g, "^($1/$2)")
    .replace(/\^\{([+-]?\d+\/[+-]?\d+)\}/g, "^($1)")
    .replace(/\^\{([+-]?\d+|[a-zA-Z])\}/g, "^$1")
    .replace(
      /\\sqrt\[(\d+)\]\{(\d+)\}/g,
      (_all, degree: string, radicand: string) =>
        degree === "2" ? `sqrt(${radicand})` : `root(${degree},${radicand})`,
    )
    .replace(
      /[∛∜](\d+)/g,
      (all, radicand: string) => `root(${all[0] === "∛" ? 3 : 4},${radicand})`,
    )
    .replace(
      /\\sqrt\{(\d+)\}|√(\d+)/g,
      (_all, latex: string | undefined, unicode: string | undefined) =>
        `sqrt(${latex ?? unicode})`,
    );
  if (
    /(?:^|[=,({])(?:NaN|undefined|null|unknown|미상)(?:$|[,)}])/i.test(
      compact,
    ) ||
    /\\frac\{[^{}]+\}\{[+-]?0+\}/.test(compact) ||
    /\/[+-]?0+(?:\.0+)?(?:$|[,)}])/.test(compact)
  )
    return null;
  // Only a question explicitly asking for real roots, without counts/tuples,
  // permits an unordered numeric root set. Counts, variable assignments and
  // coordinates retain order and identity. This does not solve an equation.
  if (numericRootSet) {
    if (/^(?:없다|없음|\\varnothing|\\emptyset)$/.test(compact))
      return "real-roots:empty";
    const pm = /^±(.+)$/.exec(compact);
    const values = pm ? [pm[1], `-${pm[1]}`] : compact.split(",");
    const keys = values.map(scalarKey);
    if (keys.every((key) => key !== null))
      return `real-roots:${[...new Set(keys)].sort().join(",")}`;
  }
  const scalar = scalarKey(bare);
  if (scalar) return scalar;
  // Labeled tuple and labeled individual assignments preserve variable identity and all values.
  const tuple = /^\(([a-z](?:,[a-z])+)\)=\(([^()]+)\)$/.exec(compact);
  const assignments = tuple
    ? tuple[1]
        .split(",")
        .map((name, i) => `${name}=${tuple[2].split(",")[i] ?? ""}`)
    : compact.split(",");
  if (tuple && tuple[1].split(",").length !== tuple[2].split(",").length)
    return null;
  const mapped = assignments.map((value) => /^([a-z])=(.+)$/.exec(value));
  if (mapped.length && mapped.every((value) => value && scalarKey(value[2]))) {
    const variables = mapped.map((value) => value![1]);
    if (new Set(variables).size !== variables.length) return null;
    return `assign:${mapped
      .map((value) => `${value![1]}=${scalarKey(value![2])}`)
      .sort()
      .join(",")}`;
  }
  // Formatting only. Do not simplify algebra, round floats, discard units or extract a number from prose.
  if (
    /^[0-9a-zA-Z\\{}()[\]=.,+\-*/^±<>|]+$/.test(compact) &&
    !/\s/.test(bare.replace(/\s*([=,+\-*/^{}()[\]<>|])\s*/g, "$1"))
  )
    return `math:${compact}`;
  return `literal:${bare}`;
}
function choiceIndex(answer: string): number | null {
  const bare = unwrap(answer);
  if (bare.length === 1 && CIRCLED.includes(bare))
    return CIRCLED.indexOf(bare) + 1;
  const match =
    /^(?:(?:정답\s*[:：]?\s*)?(?:보기\s*)?([1-9]|10)(?:번|[.)])?)$/.exec(bare);
  return match ? Number(match[1]) : null;
}
function answersHaveSameNotation(
  stored: string,
  blind: string,
  content: string,
  numericRootSet: boolean,
): boolean {
  const key = mathKey(stored, numericRootSet);
  if (key !== null && key === mathKey(blind, numericRootSet)) return true;
  if (compareDomainRangeAnswerNotation(stored, blind, content) === true)
    return true;
  const left = unwrap(stored),
    right = unwrap(blind);
  if (/몇\s*년\s*후/.test(content)) {
    const duration = (value: string) =>
      /^([0-9]{1,100})\s*년(?:\s*후)?$/.exec(value)?.[1];
    const a = duration(left),
      b = duration(right);
    if (a !== undefined && b !== undefined) return BigInt(a) === BigInt(b);
  }
  const extrema =
    /(최댓값|최솟값)과\s*(최댓값|최솟값)[^.!?\n]{0,20}각각[^.!?\n]{0,20}구하/.exec(
      content,
    );
  if (extrema && extrema[1] !== extrema[2]) {
    const values = (value: string): (string | null)[] | null => {
      const labels = new RegExp(
        `^${extrema[1]}\\s*:?\\s*(.+?)\\s*,?\\s*${extrema[2]}\\s*:?\\s*(.+)$`,
      ).exec(value);
      const numbered = /^\(1\)\s*(.+?)\s*,?\s*\(2\)\s*(.+)$/.exec(value);
      const matched = labels ?? numbered;
      return matched
        ? [scalarKey(matched[1].trim()), scalarKey(matched[2].trim())]
        : null;
    };
    const a = values(left),
      b = values(right);
    if (
      a &&
      b &&
      a.every((key) => key !== null) &&
      b.every((key) => key !== null)
    )
      return reviewDigest(a) === reviewDigest(b);
  }
  if (/개수(?:를|을|는|가)|몇\s*개/.test(content)) {
    const count = (value: string) =>
      /^([0-9]{1,100})\s*(?:개)?$/.exec(value)?.[1];
    const a = count(left),
      b = count(right);
    if (a !== undefined && b !== undefined) return BigInt(a) === BigInt(b);
  }
  const leftParts = [...left.matchAll(/\((\d+)\)\s*/g)];
  const rightParts = [...right.matchAll(/\((\d+)\)\s*/g)];
  if (/^\(1\)/.test(left) || /^\(1\)/.test(right)) {
    if (
      leftParts.length < 2 ||
      leftParts.length !== rightParts.length ||
      leftParts.some((part, i) => Number(part[1]) !== i + 1) ||
      rightParts.some((part, i) => Number(part[1]) !== i + 1)
    )
      return false;
    // Strip only line-leading part labels from the classifier context. The
    // actual questions, ordered answers and hashed review inputs stay intact.
    const scalarContext = content.replace(
      /(^|\n)\s*(?:\(\d+\)|[⑴-⒇])\s*/g,
      "$1",
    );
    return leftParts.every((part, i) =>
      answersHaveSameNotation(
        left
          .slice(part.index! + part[0].length, leftParts[i + 1]?.index)
          .trim()
          .replace(/[,;，；]+$/, ""),
        right
          .slice(
            rightParts[i].index! + rightParts[i][0].length,
            rightParts[i + 1]?.index,
          )
          .trim()
          .replace(/[,;，；]+$/, ""),
        scalarContext,
        numericRootSet,
      ),
    );
  }
  return compareScalarAnswerNotation(left, right, content) === true;
}
/** Equality evidence only: this does not solve the question or prove the worked solution. */
export function dbRetryAnswersAgree(
  stored: string,
  blind: string,
  questionType: string,
  content: string,
): boolean {
  if (dbRetryUnknownAnswer(stored) || dbRetryUnknownAnswer(blind)) return false;
  if (questionType !== "객관식") {
    const numericRootSet =
      /제곱근[^\n]{0,50}실수|실수(?:인)?\s*(?:근|해)(?:을|를|\s|[,.])|실수\s*\$?[a-z]\$?의\s*값을\s*모두/.test(
        content,
      ) &&
      !/개수|몇\s*개|순서|순으로|좌표|오름차순|내림차순|작은[^\n.]{0,10}부터|큰[^\n.]{0,10}부터/.test(
        content,
      );
    return answersHaveSameNotation(stored, blind, content, numericRootSet);
  }
  const choices = choicesOf(content);
  if (!choices) return false;
  if (/모두\s*(?:고르|선택)|(?:고르|선택)[^\n?]{0,12}모두/.test(content)) {
    const indexes = (answer: string): number[] | null => {
      const pieces = unwrap(answer).split(/\s*[,，;、]\s*/);
      const values = pieces.map(choiceIndex);
      if (
        !values.length ||
        values.some((value) => value === null || value > choices.length) ||
        new Set(values).size !== values.length
      )
        return null;
      return (values as number[]).sort((a, b) => a - b);
    };
    const expected = indexes(stored),
      actual = indexes(blind);
    return (
      expected !== null &&
      actual !== null &&
      reviewDigest(expected) === reviewDigest(actual)
    );
  }
  const resolve = (answer: string): number | null => {
    const index = choiceIndex(answer);
    if (index !== null) return index <= choices.length ? index : null;
    const labeled = /^([①②③④⑤⑥⑦⑧⑨⑩])\s*(.+)$/.exec(unwrap(answer));
    if (labeled) {
      const selected = CIRCLED.indexOf(labeled[1]) + 1;
      const value = mathKey(labeled[2]);
      const wrapped = /^\((.*)\)$/.exec(labeled[2]);
      const unwrappedValue = wrapped ? mathKey(wrapped[1]) : null;
      const selectedValue =
        selected <= choices.length ? mathKey(choices[selected - 1]) : null;
      return selectedValue !== null &&
        ((value !== null && value === selectedValue) ||
          (unwrappedValue !== null && unwrappedValue === selectedValue))
        ? selected
        : null;
    }
    const key = mathKey(answer);
    const matched = choices
      .map((choice, i) => ({ key: mathKey(choice), i: i + 1 }))
      .filter((choice) => key !== null && choice.key === key);
    return matched.length === 1 ? matched[0].i : null;
  };
  const expected = resolve(stored);
  if (expected !== null && !choices[expected - 1].includes("[그림]")) {
    const selectedKey = mathKey(choices[expected - 1]);
    if (
      selectedKey === null ||
      choices.filter((choice) => mathKey(choice) === selectedKey).length !== 1
    )
      return false;
  }
  return expected !== null && expected === resolve(blind);
}

export function dbRetryReviewPreflight(
  origin: DbRetryOrigin,
  candidates: readonly DbRetryCandidate[],
  figures: readonly DbRetryFigures[],
): string[] {
  const issues: string[] = [];
  const source = origin.problem;
  if (
    !nonempty.safeParse(source.id).success ||
    !nonempty.safeParse(source.content).success ||
    !nonempty.safeParse(source.answer).success ||
    !["객관식", "단답형", "서술형"].includes(source.question_type) ||
    source.source !== "school_textbook" ||
    source.origin_problem_id !== null
  )
    issues.push("invalid-original");
  if (
    ![origin.grade, origin.chapter, origin.section].every(
      (value) => nonempty.safeParse(value).success,
    )
  )
    issues.push("missing-curriculum");
  if (
    candidates.length !== 2 ||
    candidates[0]?.slot !== 1 ||
    candidates[1]?.slot !== 2
  )
    issues.push("malformed-pair");
  if (figures.length !== 3) issues.push("malformed-figure-pair");
  for (const candidate of candidates) {
    const label = `slot-${candidate?.slot ?? "unknown"}`;
    if (!candidateSchema.safeParse(candidate).success) {
      issues.push(`${label}:malformed-candidate`);
      continue;
    }
    if (
      candidate.sourceId !== source.id ||
      candidate.originProblemId !== source.id ||
      candidate.sourceDigest !== textbookVariantSourceDigest(source) ||
      candidate.unitId !== source.unit_id ||
      candidate.familyKey !== source.family_key ||
      candidate.sourceMaterialId !== source.source_material_id ||
      candidate.sourceExternalId !== (source.external_id ?? null) ||
      candidate.sourceFile !== (source.source_file ?? null) ||
      candidate.externalId !== `tb-retry-v1:${source.id}:${candidate.slot}` ||
      candidate.questionType !== source.question_type
    )
      issues.push(`${label}:source-binding-mismatch`);
    if (
      (candidate.slot === 1 && candidate.recipe !== "ai-db-numbers-v1") ||
      (candidate.slot === 2 && candidate.recipe !== "ai-db-conditions-v1")
    )
      issues.push(`${label}:recipe-slot-mismatch`);
    if (
      candidate.figureUrls.length * 2 !== candidate.figureDims.length ||
      candidate.figureUrls.length !== candidate.figureSourceMm.length ||
      candidate.figureUrls.length !== candidate.choiceFigureIndex.length
    )
      issues.push(`${label}:figure-metadata-mismatch`);
    if (candidate.figureUrls.length)
      issues.push(`${label}:candidate-raster-reuse`);
  }
  if (
    issues.some((issue) => issue.includes("malformed-candidate")) ||
    issues.includes("invalid-original")
  )
    return issues;
  const questions = [
    source,
    ...candidates.map((candidate) => ({
      content: candidate.content,
      question_type: candidate.questionType,
      figure_svg: candidate.figureSvg,
      figure_urls: candidate.figureUrls,
      choice_figure_index: candidate.choiceFigureIndex,
    })),
  ];
  for (const [i, question] of questions.entries()) {
    const label = i === 0 ? "original" : `slot-${i}`;
    const bundle = figures[i];
    if (!figuresSchema.safeParse(bundle).success) {
      issues.push(`${label}:malformed-figures`);
      continue;
    }
    try {
      if (
        bundle.images.some(
          (image) => sha256(imageBytes(image.dataUrl)) !== image.sha256,
        ) ||
        dbRetryFigureDigest(bundle) !== bundle.digest
      )
        issues.push(`${label}:figure-bytes-digest-mismatch`);
    } catch {
      issues.push(`${label}:invalid-figure-bytes`);
    }
    const urls = question.figure_urls ?? [];
    const declared = Math.max(
      urls.length,
      question.figure_svg ? 1 : 0,
      question.content.split("[그림]").length - 1,
    );
    if (
      bundle.images.length < declared ||
      (!bundle.images.length &&
        /(?:아래|위|오른쪽|왼쪽|다음)의?\s*(?:그림|그래프)|그림과\s*같|(?:the|following)\s*(?:figure|diagram)/i.test(
          question.content,
        ))
    )
      issues.push(`${label}:missing-figure`);
    const indexes = question.choice_figure_index;
    if (
      urls.length &&
      (!Array.isArray(indexes) ||
        indexes.length !== urls.length ||
        urls.some((_, n) => bundle.images[n]?.choiceIndex !== indexes[n]))
    )
      issues.push(`${label}:figure-choice-binding-mismatch`);
    if (i && bundle.images.some((image) => image.origin !== "generated-svg"))
      issues.push(`${label}:candidate-figure-not-generated`);
    if (question.question_type === "객관식") {
      const choices = choicesOf(question.content);
      if (!choices) issues.push(`${label}:malformed-choices`);
      else if (
        bundle.images.some((image) => image.choiceIndex > choices.length)
      )
        issues.push(`${label}:invalid-choice-image-index`);
    } else if (bundle.images.some((image) => image.choiceIndex !== 0))
      issues.push(`${label}:invalid-choice-image-index`);
  }
  if (
    candidates.length === 2 &&
    figures.length === 3 &&
    figures.every((bundle) => figuresSchema.safeParse(bundle).success)
  ) {
    const questionKey = (content: string, bundle: DbRetryFigures) =>
      reviewDigest({
        content: content.normalize("NFC").replace(/\s+/g, ""),
        figures: bundle.digest,
      });
    const keys = [
      questionKey(source.content, figures[0]),
      ...candidates.map((candidate, i) =>
        questionKey(candidate.content, figures[i + 1]),
      ),
    ];
    if (new Set(keys).size !== 3) issues.push("duplicate-question");
  }
  return issues;
}
