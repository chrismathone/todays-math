/**
 * Jev 눈금 실험 — 개념 백지 은행의 ○×(참 · 거짓이 붙은 문장)를 Jev 에게 묻고 은행의 답과 견준다.
 * 규칙 · 변형 · 실행법은 같은 폴더의 README.md. 판정 문턱은 결과를 보기 전에 적었다(아래 RULES).
 *
 * 실행(저장소 뿌리): npx tsx scripts/qa/fading-jev-bench/run.ts [--dry] [--split dev|test|all]
 *   [--variant ref-en|ref-ko|noref-en] [--limit N] [--concurrency N] [--report-only]
 * 키: 환경의 TYPESAFE_API_KEY 만 읽는다. 값 · 응답 본문을 찍지 않는다.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { splitBlankSentence } from "../../../src/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK } from "../../../src/lib/concept-blank/bank";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
/** 문턱을 재는 동안 별칭이 옮겨 가지 않게 판을 고정한다. */
const MODEL = "jev-1.13.0";
const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;
const RULES = {
  confidentLow: 0.1,
  confidentHigh: 0.9,
  r1MinAccuracy: 0.97,
  r1MinCoverage: 0.6,
  r2MaxTrueJudgedFalse: 0.01,
} as const;

const VARIANTS = ["ref-en", "ref-ko", "noref-en"] as const;
type Variant = (typeof VARIANTS)[number];
const SPLITS = ["dev", "test", "all"] as const;
type Split = (typeof SPLITS)[number];

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);
const pick = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T => {
  if (value === undefined) return fallback;
  if (!(allowed as readonly string[]).includes(value))
    throw new Error(`알 수 없는 값: ${value} (${allowed.join(" | ")})`);
  return value as T;
};
const variant = pick<Variant>(arg("variant"), VARIANTS, "ref-en");
const split = pick<Split>(arg("split"), SPLITS, "dev");
const limit = Number(arg("limit") ?? Infinity);
const concurrency = Math.max(1, Number(arg("concurrency") ?? 4));

/** FNV-1a — 소단원을 dev/test 로 가르는 고정 해시. */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
const splitOf = (section: string): "dev" | "test" =>
  hash(section) % 10 === 0 ? "dev" : "test";

const plain = (definition: string) =>
  splitBlankSentence(definition)
    .map((piece) => piece.text)
    .join("");

const INSTRUCTIONS: Record<Variant, string> = {
  "ref-en":
    "Is `statement` a mathematically correct statement? Judge it with the definitions and properties listed in `reference`, together with standard school mathematics for this unit.",
  "ref-ko":
    "`statement` 는 수학적으로 옳은 문장인가? `reference` 에 적힌 뜻과 성질, 그리고 이 단원의 학교 수학에 비추어 판단한다.",
  "noref-en":
    "Is `statement` a mathematically correct statement in standard school mathematics for this unit?",
};
const CRITERIA: Record<Variant, { true: string; false: string }> = {
  "ref-en": {
    true: "The statement is correct as written, in every case it covers.",
    false:
      "The statement is wrong, or it fails in at least one case it covers.",
  },
  "ref-ko": {
    true: "적힌 그대로 옳다 — 문장이 가리키는 모든 경우에 성립한다.",
    false: "틀렸다 — 문장이 가리키는 경우 가운데 하나라도 성립하지 않는다.",
  },
  "noref-en": {
    true: "The statement is correct as written, in every case it covers.",
    false:
      "The statement is wrong, or it fails in at least one case it covers.",
  },
};

type Item = { id: string; statement: string; answer: boolean; level: string };
type Job = { section: string; state: unknown; items: Item[] };

function jobs(): Job[] {
  const sections = [...new Set(CONCEPT_BLANK_BANK.ox.map((o) => o.section))]
    .filter((section) => split === "all" || splitOf(section) === split)
    .sort();
  return sections.slice(0, limit).map((section) => {
    const [grade, chapter, unit] = section.split("::");
    const reference = CONCEPT_BLANK_BANK.concepts
      .filter((c) => c.section === section)
      .map((c) => plain(c.definition));
    return {
      section,
      state:
        variant === "noref-en"
          ? { grade, chapter, unit }
          : { grade, chapter, unit, reference },
      items: CONCEPT_BLANK_BANK.ox
        .filter((o) => o.section === section)
        .map((o) => ({
          id: o.id,
          statement: o.statement,
          answer: o.answer,
          level: o.level,
        })),
    };
  });
}

type Row = {
  section: string;
  ok: boolean;
  model?: string;
  ms?: number;
  inputTokens?: number;
  error?: string;
  answers?: Record<string, number | null>;
};

async function ask(job: Job, apiKey: string): Promise<Row> {
  const questions = Object.fromEntries(
    job.items.map((item) => [
      item.id,
      {
        type: "noul",
        instructions: {
          statement: item.statement,
          question: INSTRUCTIONS[variant],
        },
        criteria: CRITERIA[variant],
      },
    ]),
  );
  const body = JSON.stringify({ model: MODEL, state: job.state, questions });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        redirect: "error",
        signal: AbortSignal.timeout(60_000),
      });
      const ms = Date.now() - started;
      if (response.status === 429 || response.status === 529) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      if (!response.ok)
        return {
          section: job.section,
          ok: false,
          error: `HTTP ${response.status}`,
        };
      const data: unknown = await response.json();
      const record =
        data !== null && typeof data === "object"
          ? (data as Record<string, unknown>)
          : {};
      const raw =
        record.answers !== null && typeof record.answers === "object"
          ? (record.answers as Record<string, unknown>)
          : {};
      const usage =
        record.usage !== null && typeof record.usage === "object"
          ? (record.usage as Record<string, unknown>)
          : {};
      const answers: Record<string, number | null> = {};
      for (const item of job.items) {
        const answer = raw[item.id];
        const noul =
          answer !== null && typeof answer === "object"
            ? (answer as Record<string, unknown>).noul
            : undefined;
        answers[item.id] =
          typeof noul === "number" && noul >= 0 && noul <= 1 ? noul : null;
      }
      return {
        section: job.section,
        ok: true,
        model: typeof record.model === "string" ? record.model : undefined,
        ms,
        inputTokens:
          typeof usage.input_tokens === "number"
            ? usage.input_tokens
            : undefined,
        answers,
      };
    } catch (error) {
      if (attempt === 4)
        return {
          section: job.section,
          ok: false,
          error: error instanceof Error ? error.name : "error",
        };
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  return { section: job.section, ok: false, error: "한도 초과가 이어졌다" };
}

const rawDir = join(".qa-artifacts", "fading-jev-bench");
const rawPath = join(rawDir, `${variant}-${split}.jsonl`);
const readRows = (): Row[] =>
  existsSync(rawPath)
    ? readFileSync(rawPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Row)
    : [];

function report(all: Job[]) {
  const rows = new Map(
    readRows()
      .filter((row) => row.ok)
      .map((row) => [row.section, row]),
  );
  type Scored = Item & { section: string; noul: number };
  const scored: Scored[] = [];
  let unmeasured = 0;
  for (const job of all) {
    const row = rows.get(job.section);
    for (const item of job.items) {
      const noul = row?.answers?.[item.id];
      if (typeof noul === "number")
        scored.push({ ...item, section: job.section, noul });
      else unmeasured += 1;
    }
  }
  const right = (s: Scored) => s.noul >= 0.5 === s.answer;
  const rate = (hit: number, of: number) =>
    of === 0 ? null : +(hit / of).toFixed(4);
  const measure = (list: Scored[]) => {
    const confident = list.filter(
      (s) => s.noul <= RULES.confidentLow || s.noul >= RULES.confidentHigh,
    );
    const truths = list.filter((s) => s.answer);
    const falses = list.filter((s) => !s.answer);
    return {
      n: list.length,
      accuracyAtHalf: rate(list.filter(right).length, list.length),
      confidentCoverage: rate(confident.length, list.length),
      confidentAccuracy: rate(confident.filter(right).length, confident.length),
      trueItems: truths.length,
      trueJudgedFalseConfidently: rate(
        truths.filter((s) => s.noul <= RULES.confidentLow).length,
        truths.length,
      ),
      falseItems: falses.length,
      falseJudgedTrueConfidently: rate(
        falses.filter((s) => s.noul >= RULES.confidentHigh).length,
        falses.length,
      ),
    };
  };
  const group = (key: (s: Scored) => string) =>
    Object.fromEntries(
      [...new Set(scored.map(key))]
        .sort()
        .map((name) => [name, measure(scored.filter((s) => key(s) === name))]),
    );
  const overall = measure(scored);
  const ok = [...rows.values()];
  const times = ok
    .map((row) => row.ms)
    .filter((ms): ms is number => typeof ms === "number")
    .sort((a, b) => a - b);
  const inputTokens = ok.reduce((sum, row) => sum + (row.inputTokens ?? 0), 0);
  const summary = {
    recordedAt: new Date().toISOString(),
    variant,
    split,
    model: MODEL,
    responseModels: [...new Set(ok.map((row) => row.model ?? "?"))],
    rules: RULES,
    sections: all.length,
    sectionsAnswered: ok.length,
    items: all.reduce((sum, job) => sum + job.items.length, 0),
    unmeasured,
    overall,
    r1:
      overall.confidentAccuracy !== null &&
      overall.confidentCoverage !== null &&
      overall.confidentAccuracy >= RULES.r1MinAccuracy &&
      overall.confidentCoverage >= RULES.r1MinCoverage,
    r2:
      overall.trueJudgedFalseConfidently !== null &&
      overall.trueJudgedFalseConfidently <= RULES.r2MaxTrueJudgedFalse,
    byGrade: group((s) => s.section.split("::")[0]!),
    byLevel: group((s) => s.level),
    byMath: group((s) => (s.statement.includes("$") ? "수식 있음" : "글만")),
    medianMs: times.length ? times[Math.floor(times.length / 2)] : null,
    inputTokens,
    estimatedUsd: +(inputTokens * USD_PER_INPUT_TOKEN).toFixed(4),
    /** 확신하고 틀린 것 — 문장은 싣지 않고 id 만. */
    confidentErrors: scored
      .filter(
        (s) =>
          !right(s) &&
          (s.noul <= RULES.confidentLow || s.noul >= RULES.confidentHigh),
      )
      .map((s) => ({ id: s.id, bank: s.answer, noul: +s.noul.toFixed(3) })),
  };
  const out = join(
    "scripts",
    "qa",
    "fading-jev-bench",
    `summary-${variant}-${split}.json`,
  );
  writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
  const { confidentErrors, byGrade, byLevel, byMath, ...head } = summary;
  console.log(JSON.stringify(head, null, 2));
  console.log("확신하고 틀린 것:", confidentErrors.length, "개 →", out);
  void byGrade;
  void byLevel;
  void byMath;
}

async function main() {
  const all = jobs();
  const items = all.reduce((sum, job) => sum + job.items.length, 0);
  if (flag("dry")) {
    const chars = all.reduce(
      (sum, job) =>
        sum +
        JSON.stringify(job.state).length +
        job.items.reduce(
          (n, item) => n + item.statement.length + INSTRUCTIONS[variant].length,
          0,
        ),
      0,
    );
    const truths = all.reduce(
      (sum, job) => sum + job.items.filter((item) => item.answer).length,
      0,
    );
    console.log(
      JSON.stringify({
        variant,
        split,
        requests: all.length,
        items,
        truths,
        chars,
      }),
    );
    return;
  }
  if (!flag("report-only")) {
    const apiKey = process.env.TYPESAFE_API_KEY?.trim();
    if (!apiKey) throw new Error("TYPESAFE_API_KEY 가 없다 — 재지 못했다.");
    mkdirSync(rawDir, { recursive: true });
    const done = new Set(
      readRows()
        .filter((row) => row.ok)
        .map((row) => row.section),
    );
    const queue = all.filter((job) => !done.has(job.section));
    console.log(`보낼 요청 ${queue.length} (끝난 것 ${done.size})`);
    let next = 0;
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (next < queue.length) {
          const job = queue[next]!;
          next += 1;
          appendFileSync(
            rawPath,
            `${JSON.stringify(await ask(job, apiKey))}\n`,
          );
        }
      }),
    );
  }
  report(all);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "실패");
  process.exit(1);
});
