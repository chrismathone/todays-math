/**
 * 함정 칩의 작은 표본 — «핵심어를 바꿔 넣은 문장»을 Jev 가 가릴 수 있는가 (규칙은 README.md · 결과를 보기 전에 적었다).
 *
 *   npx tsx scripts/qa/fading-traps/calibrate.ts --list          # 표본을 찍는다(보내지 않는다) — 이것을 읽고 손으로 딱지를 붙인다
 *   npx tsx scripts/qa/fading-traps/calibrate.ts                 # 묻는다(딱지가 다 있어야 돈다 — 답을 본 뒤에 붙인 딱지가 아니게)
 *   npx tsx scripts/qa/fading-traps/calibrate.ts --report-only   # 받은 답으로 표만 다시
 *
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
import { fadingTargets } from "../../../src/lib/fading/concepts";
import {
  CONFIDENT_FALSE,
  MODEL,
  USD_PER_INPUT_TOKEN,
  allConcepts,
  askNoul,
  candidatesFor,
  fnv,
  gradeOf,
  referenceOf,
  substituted,
  type FadingConcept,
} from "./lib";

const DIR = "scripts/qa/fading-traps";
const RAW_DIR = join(".qa-artifacts", "fading-traps");
const RAW = join(RAW_DIR, "calibration.jsonl");
/** 학년마다 뽑는 빈칸 수와, 빈칸마다 물어볼 이웃 후보 수. */
const PER_GRADE = 6;
const SIBLINGS = 3;
const FRAMINGS = ["ref", "ref-minus"] as const;
type Framing = (typeof FRAMINGS)[number];
export const RULES = {
  /** T1 원래 문장(답 그대로)을 참으로 본다 — noul ≥ 0.5 가 이만큼 이상. */
  t1MinOriginalTrue: 0.95,
  /** T2 해로운 틀림 — 내가 «넣어도 맞다»고 본 것을 확신하고 거짓이라 한 비율이 이만큼 이하. */
  t2MaxAcceptableJudgedFalse: 0.05,
  /** T3 쓸모 — 내가 «틀리다»고 본 이웃 후보를 확신하고 거짓이라 한 비율이 이만큼 이상. */
  t3MinWrongCaught: 0.5,
} as const;

type Sample = {
  n: number;
  concept: FadingConcept;
  targetId: string;
  answer: string;
  original: string;
  siblings: { text: string; statement: string }[];
};

function samples(): Sample[] {
  const concepts = allConcepts();
  const bySection = new Map<string, FadingConcept[]>();
  for (const c of concepts)
    bySection.set(c.section, [...(bySection.get(c.section) ?? []), c]);
  const byGrade = new Map<string, Sample[]>();
  const blanks = concepts
    .flatMap((concept) =>
      fadingTargets(concept)
        .filter((t) => t.tier === "text")
        .map((target) => ({ concept, target })),
    )
    .sort((a, b) => fnv(`cal:${a.target.id}`) - fnv(`cal:${b.target.id}`));
  for (const { concept, target } of blanks) {
    const grade = gradeOf(concept);
    const list = byGrade.get(grade) ?? byGrade.set(grade, []).get(grade)!;
    if (list.length >= PER_GRADE) continue;
    // 한 소단원에서 하나만 — 표본이 한 단원에 몰리지 않게
    if (list.some((s) => s.concept.section === concept.section)) continue;
    // 이 빈칸에 문법으로 들어가는 이웃 핵심어만(뒤 조사가 같다) — 조사가 안 맞는 조각은 후보가 아니다
    const candidates = candidatesFor(
      concept,
      bySection.get(concept.section)!,
    ).filter((c) => c.fits.includes(target.id));
    if (candidates.length < SIBLINGS) continue;
    list.push({
      n: 0,
      concept,
      targetId: target.id,
      answer: target.text,
      original: substituted(concept, target.id, target.text).text,
      siblings: candidates.slice(0, SIBLINGS).map((c) => ({
        text: c.text,
        statement: substituted(concept, target.id, c.text).text,
      })),
    });
  }
  return [...byGrade.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ko"))
    .flatMap(([, list]) => list)
    .map((s, i) => ({ ...s, n: i + 1 }));
}

const readJson = <T>(name: string): T | null =>
  existsSync(join(DIR, name))
    ? (JSON.parse(readFileSync(join(DIR, name), "utf8")) as T)
    : null;
type Label = "wrong" | "ok" | "unclear";

function list(all: Sample[]) {
  for (const s of all) {
    console.info(
      `#${String(s.n).padStart(2, "0")} [${gradeOf(s.concept)} ${s.concept.level}] ${s.targetId}  답 «${s.answer}»`,
    );
    console.info(`    ${s.original}`);
    s.siblings.forEach((sib, i) =>
      console.info(`    ${"abc"[i]}) «${sib.text}» → ${sib.statement}`),
    );
  }
  console.info(`\n표본 ${all.length} · 이웃 후보 ${all.length * SIBLINGS}`);
}

type Row = {
  targetId: string;
  framing: Framing;
  ok: boolean;
  error?: string;
  inputTokens?: number;
  model?: string;
  answers: Record<string, number | null>;
};
const readRows = (): Row[] =>
  existsSync(RAW)
    ? readFileSync(RAW, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Row)
    : [];

function report(
  all: Sample[],
  equivalents: Record<string, string | null>,
  labels: Record<string, Label>,
) {
  const rows = readRows();
  const summary: Record<string, unknown> = {
    model: MODEL,
    rules: RULES,
    confidentFalse: CONFIDENT_FALSE,
    samples: all.length,
  };
  for (const framing of FRAMINGS) {
    const answers = new Map<string, number | null>();
    let failed = 0;
    let tokens = 0;
    for (const row of rows.filter((r) => r.framing === framing)) {
      if (!row.ok) failed += 1;
      tokens += row.inputTokens ?? 0;
      for (const [id, noul] of Object.entries(row.answers))
        answers.set(`${row.targetId}|${id}`, noul);
    }
    const get = (key: string) => answers.get(key);
    const original = all.map((s) => get(`${s.targetId}|orig`));
    const acceptable: { key: string; noul: number | null | undefined }[] = [];
    const wrong: { key: string; noul: number | null | undefined }[] = [];
    const unclear: { key: string; noul: number | null | undefined }[] = [];
    for (const s of all) {
      if (equivalents[s.targetId])
        acceptable.push({
          key: `${s.targetId}|eq`,
          noul: get(`${s.targetId}|eq`),
        });
      s.siblings.forEach((sib, i) => {
        const label = labels[`${s.targetId}|${sib.text}`];
        const item = {
          key: `${s.targetId}|${sib.text}`,
          noul: get(`${s.targetId}|s${i}`),
        };
        (label === "ok"
          ? acceptable
          : label === "wrong"
            ? wrong
            : unclear
        ).push(item);
      });
    }
    const measured = <T extends { noul: number | null | undefined }>(
      items: T[],
    ) => items.filter((i) => typeof i.noul === "number");
    const low = <T extends { noul: number | null | undefined }>(items: T[]) =>
      measured(items).filter((i) => (i.noul as number) <= CONFIDENT_FALSE);
    const ratio = (a: number, b: number) => (b ? +(a / b).toFixed(4) : null);
    const originalTrue = original.filter(
      (n) => typeof n === "number" && n >= 0.5,
    ).length;
    const t1 = ratio(originalTrue, original.length);
    const t2 = ratio(low(acceptable).length, measured(acceptable).length);
    const t3 = ratio(low(wrong).length, measured(wrong).length);
    summary[framing] = {
      failedRequests: failed,
      inputTokens: tokens,
      usd: +(tokens * USD_PER_INPUT_TOKEN).toFixed(4),
      t1OriginalTrue: { value: t1, n: original.length },
      t1OriginalConfidentFalse: original.filter(
        (n) => typeof n === "number" && n <= CONFIDENT_FALSE,
      ).length,
      t2AcceptableJudgedFalse: {
        value: t2,
        n: measured(acceptable).length,
        items: low(acceptable).map((i) => i.key),
      },
      t3WrongCaught: { value: t3, n: measured(wrong).length },
      unclear: {
        n: measured(unclear).length,
        judgedFalse: low(unclear).length,
      },
      unmeasured:
        acceptable.length +
        wrong.length +
        unclear.length -
        measured(acceptable).length -
        measured(wrong).length -
        measured(unclear).length,
      pass: {
        t1: t1 !== null && t1 >= RULES.t1MinOriginalTrue,
        t2: t2 !== null && t2 <= RULES.t2MaxAcceptableJudgedFalse,
        t3: t3 !== null && t3 >= RULES.t3MinWrongCaught,
      },
    };
  }
  writeFileSync(
    join(DIR, "calibration-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.info(JSON.stringify(summary, null, 2));
}

async function main() {
  const all = samples();
  if (process.argv.includes("--list")) return list(all);
  const equivalents = readJson<Record<string, string | null>>(
    "calibration-equivalents.json",
  );
  const labels = readJson<Record<string, Label>>("calibration-labels.json");
  if (!equivalents || !labels)
    throw new Error(
      "딱지 파일이 없다 — --list 로 표본을 읽고 calibration-equivalents.json · calibration-labels.json 을 먼저 쓴다.",
    );
  for (const s of all) {
    if (!(s.targetId in equivalents))
      throw new Error(
        `같은 뜻 표현이 없다(없으면 null 로 적는다): ${s.targetId}`,
      );
    for (const sib of s.siblings)
      if (!labels[`${s.targetId}|${sib.text}`])
        throw new Error(`딱지가 없다: ${s.targetId}|${sib.text}`);
  }
  if (!process.argv.includes("--report-only")) {
    const apiKey = process.env.TYPESAFE_API_KEY?.trim();
    if (!apiKey) throw new Error("TYPESAFE_API_KEY 가 없다 — 재지 못했다.");
    mkdirSync(RAW_DIR, { recursive: true });
    const reference = referenceOf(allConcepts());
    const done = new Set(
      readRows()
        .filter((r) => r.ok)
        .map((r) => `${r.targetId}|${r.framing}`),
    );
    for (const s of all)
      for (const framing of FRAMINGS) {
        if (done.has(`${s.targetId}|${framing}`)) continue;
        const [grade, chapter, unit] = s.concept.section.split("::");
        const mine = substituted(s.concept, s.targetId, s.answer).propositionId;
        const state = {
          grade,
          chapter,
          unit,
          reference: reference
            .get(s.concept.section)!
            .filter((r) => framing === "ref" || r.id !== mine)
            .map((r) => r.text),
        };
        const equivalent = equivalents[s.targetId];
        const result = await askNoul(apiKey, state, [
          { id: "orig", statement: s.original },
          ...(equivalent
            ? [
                {
                  id: "eq",
                  statement: substituted(s.concept, s.targetId, equivalent)
                    .text,
                },
              ]
            : []),
          ...s.siblings.map((sib, i) => ({
            id: `s${i}`,
            statement: sib.statement,
          })),
        ]);
        appendFileSync(
          RAW,
          `${JSON.stringify({ targetId: s.targetId, framing, ...result })}\n`,
        );
      }
  }
  report(all, equivalents, labels);
}
void main();
