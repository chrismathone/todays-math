/**
 * «오늘의 기억» 함정 칩 — 후보 만들기와 Jev 물음의 공통 조각 (규칙 · 결과는 같은 폴더의 README.md).
 * 화면도 DB 도 모른다. 보내는 글은 개념 백지 은행의 우리 문장뿐이다.
 */
import { CONCEPT_BLANK_BANK } from "../../../src/lib/concept-blank/bank";
import {
  buildFadingConcepts,
  fadingTargets,
  type FadingConcept,
  type FadingTarget,
} from "../../../src/lib/fading/concepts";
import { FADING_GROUPS } from "../../../src/lib/fading/groups";

export const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
/** 눈금 실험(`fading-jev-bench`)과 같은 판 — 문턱을 잰 판에서 옮기지 않는다. */
export const MODEL = "jev-1.13.0";
export const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;
/** «확신하고 틀렸다» — 눈금 실험이 쓴 문턱 그대로. 재기 전에 적은 값이고, 잰 뒤에 옮기지 않는다. */
export const CONFIDENT_FALSE = 0.1;

/** 후보 한 낱말의 글자 수 상한 — 칩으로 쓸 만한 길이. */
export const CANDIDATE_MAX_LENGTH = 20;
/** 개념 하나에 물어볼 이웃 후보 수. */
export const CANDIDATES_PER_CONCEPT = 8;

export const normalized = (text: string) => text.trim().replace(/\s+/g, " ");

/** FNV-1a — 표본과 후보의 차례를 정하는 고정 해시. */
export function fnv(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export const allConcepts = () =>
  buildFadingConcepts(CONCEPT_BLANK_BANK.concepts, FADING_GROUPS);

/** 소단원의 기준 문장 — 빈칸 표시를 걷은 뜻 문장 전부(난이도 셋). */
export function referenceOf(concepts: readonly FadingConcept[]) {
  const bySection = new Map<string, { id: string; text: string }[]>();
  for (const concept of concepts)
    for (const proposition of concept.propositions) {
      const text = proposition.pieces
        .map((p) => (p.kind === "text" ? p.text : p.target.text))
        .join("");
      const list =
        bySection.get(concept.section) ??
        bySection.set(concept.section, []).get(concept.section)!;
      list.push({ id: proposition.id, text });
    }
  return bySection;
}

/** 마지막 글자에 받침이 있는가 — 한글이 아니면 `null`(조사를 건드리지 않는다). */
function hasFinal(word: string): boolean | null {
  const last = word.trim().at(-1);
  if (!last) return null;
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return code % 28 !== 0;
}
/** 받침이 있을 때 · 없을 때의 조사 짝. 뒤 글이 이 조사로 시작하고 그 뒤가 낱말의 끝일 때만 바꾼다. */
const PARTICLES: [string, string][] = [
  ["이라", "라"],
  ["으로", "로"],
  ["이며", "며"],
  ["이고", "고"],
  ["이다", "다"],
  ["이", "가"],
  ["을", "를"],
  ["은", "는"],
  ["과", "와"],
];
const PARTICLE_END = /^(?:[\s,.)]|고|는|도|$)/;

/** 낱말을 바꿔 넣을 때 바로 뒤의 조사를 맞춘다 — 원래 답과 받침이 다를 때만. 문법이 어긋난 것으로 «틀렸다»가 나오지 않게. */
export function fixParticle(original: string, word: string, after: string) {
  const before = hasFinal(original);
  const now = hasFinal(word);
  if (before === null || now === null || before === now) return after;
  for (const [withFinal, without] of PARTICLES) {
    const from = before ? withFinal : without;
    const to = now ? withFinal : without;
    if (after.startsWith(from) && PARTICLE_END.test(after.slice(from.length)))
      return to + after.slice(from.length);
  }
  return after;
}

/** 그 빈칸에 낱말을 넣은 문장 — 다른 빈칸은 원래 답 그대로. 그 빈칸이 든 명제 하나만 돌려준다. */
export function substituted(
  concept: FadingConcept,
  targetId: string,
  word: string,
): { propositionId: string; text: string } {
  for (const proposition of concept.propositions) {
    const index = proposition.pieces.findIndex(
      (p) => p.kind === "target" && p.target.id === targetId,
    );
    if (index < 0) continue;
    const text = proposition.pieces
      .map((piece, i) => {
        if (i === index) return word;
        const raw = piece.kind === "text" ? piece.text : piece.target.text;
        const hit = proposition.pieces[index]!;
        return i === index + 1 && hit.kind === "target"
          ? fixParticle(hit.target.text, word, raw)
          : raw;
      })
      .join("");
    return { propositionId: proposition.id, text };
  }
  throw new Error(`이 개념에 없는 빈칸: ${targetId}`);
}

/** 표적 바로 뒤의 글 — 다음 조각이 글이면 그 글, 아니면 빈 글. */
export function afterOf(concept: FadingConcept, targetId: string): string {
  for (const proposition of concept.propositions) {
    const index = proposition.pieces.findIndex(
      (p) => p.kind === "target" && p.target.id === targetId,
    );
    if (index < 0) continue;
    const next = proposition.pieces[index + 1];
    return next && next.kind === "text" ? next.text : "";
  }
  return "";
}

/** 표적 뒤에 붙는 조사의 갈래 — 같은 갈래의 핵심어끼리는 문법으로 바꿔 넣을 수 있다. 조사가 안 붙으면 `null`. */
const PARTICLE_CLASSES: [RegExp, string][] = [
  [/^(이라|라)(?=[\s고는])/, "라"],
  [/^(을|를)(?=\s)/, "를"],
  [/^(이|가)(?=\s)/, "가"],
  [/^(은|는)(?=\s)/, "는"],
  [/^의(?=\s)/, "의"],
  [/^(에|에서)(?=\s)/, "에"],
  [/^(으로|로)(?=\s)/, "로"],
  [/^(과|와)(?=\s)/, "와"],
  [/^(이다|다)(?=[.\s]|$)/, "다"],
  [/^(이며|며|이고|고)(?=[\s,])/, "고"],
  [/^도(?=\s)/, "도"],
  [/^보다(?=\s)/, "보다"],
];
export const particleClass = (after: string): string | null =>
  PARTICLE_CLASSES.find(([re]) => re.test(after))?.[1] ?? null;

export type Candidate = {
  text: string;
  /** 어디서 왔는가 — 이웃 핵심어의 표적 id, 또는 ○× 거짓 문항의 id. */
  from: string;
  source: "neighbor" | "ox";
  /** 이 낱말이 문법으로 들어가는 그 개념의 빈칸(뒤 조사가 같다) — 하나도 없으면 후보가 아니다. */
  fits: string[];
  /** ○× 에서 온 것만 — 은행이 «틀렸다»고 적은 빈칸과 그 까닭. */
  authored?: { targetId: string; why: string };
  sameCell: boolean;
};

/**
 * 개념 하나의 함정 후보 — 같은 소단원의 다른 **글** 핵심어 가운데 **문법으로 들어가는 것**만.
 * - 뒤에 붙는 조사가 같은 빈칸이 그 개념에 하나는 있어야 한다. 조사가 안 맞는 조각은 넣는 순간 틀린 줄 알아 함정이 못 된다
 *   (처음 규칙 «같은 소단원의 다른 핵심어 전부»는 표본 126개 가운데 대부분이 그런 조각이었다 — README).
 * - 그 개념의 답과 글이 같은 것 · 서로를 품는 것은 뺀다(«십의 자리» 와 «십의 자리 숫자» 같은 것은 넣어도 맞기 쉽다).
 * - 수식이 든 핵심어는 후보로 쓰지 않는다(Jev 가 약한 자리).
 * - 같은 칸(소단원 × 난이도)의 다른 개념에서 온 것을 앞에, 그 뒤는 열쇠의 해시 차례.
 */
export function candidatesFor(
  concept: FadingConcept,
  sectionConcepts: readonly FadingConcept[],
): Candidate[] {
  const targets = fadingTargets(concept);
  const own = targets.map((t) => normalized(t.text));
  const classes = new Map<string, string[]>();
  for (const target of targets) {
    const kind = particleClass(afterOf(concept, target.id));
    if (kind) classes.set(kind, [...(classes.get(kind) ?? []), target.id]);
  }
  const seen = new Set(own);
  const pool: Candidate[] = [];
  for (const other of sectionConcepts) {
    if (other.id === concept.id) continue;
    for (const target of fadingTargets(other)) {
      if (target.tier !== "text") continue;
      const fits = classes.get(particleClass(afterOf(other, target.id)) ?? "");
      const text = normalized(target.text);
      if (!fits || !text || text.length > CANDIDATE_MAX_LENGTH) continue;
      if (seen.has(text)) continue;
      if (own.some((answer) => answer.includes(text) || text.includes(answer)))
        continue;
      seen.add(text);
      pool.push({
        text,
        from: target.id,
        source: "neighbor",
        fits,
        sameCell: other.level === concept.level,
      });
    }
  }
  const rank = (c: Candidate) => fnv(`${concept.id}:${c.text}`);
  return pool.sort(
    (a, b) => Number(b.sameCell) - Number(a.sameCell) || rank(a) - rank(b),
  );
}

/**
 * ○× 거짓 문항에서 바로 나오는 함정 — 거짓 문장이 뜻 문장과 **표적 하나만** 다르면, 그 자리에 적힌 낱말은
 * 은행이 «틀렸다»고 적은 답이다(까닭도 있다). 그 빈칸에는 Jev 를 묻지 않는다 — 은행의 답이 기준이다.
 */
export function authoredTraps(concept: FadingConcept): Candidate[] {
  const own = fadingTargets(concept).map((t) => normalized(t.text));
  const falses = CONCEPT_BLANK_BANK.ox.filter(
    (o) => !o.answer && o.section === concept.section,
  );
  const found: Candidate[] = [];
  for (const proposition of concept.propositions)
    proposition.pieces.forEach((piece, index) => {
      if (piece.kind !== "target") return;
      const join = (pieces: typeof proposition.pieces) =>
        pieces
          .map((p) => (p.kind === "text" ? p.text : p.target.text))
          .join("");
      const before = join(proposition.pieces.slice(0, index));
      const after = join(proposition.pieces.slice(index + 1));
      if (before.length + after.length < 8) return;
      for (const ox of falses) {
        const s = ox.statement;
        if (s.length <= before.length + after.length) continue;
        if (!s.startsWith(before) || !s.endsWith(after)) continue;
        const text = normalized(
          s.slice(before.length, s.length - after.length),
        );
        if (!text || text.length > CANDIDATE_MAX_LENGTH) continue;
        if (own.includes(text) || found.some((f) => f.text === text)) continue;
        found.push({
          text,
          from: ox.id,
          source: "ox",
          fits: [piece.target.id],
          authored: { targetId: piece.target.id, why: ox.why },
          sameCell: true,
        });
      }
    });
  return found;
}

export type NoulQuestion = { id: string; statement: string };
export type NoulResult = {
  ok: boolean;
  error?: string;
  inputTokens?: number;
  model?: string;
  answers: Record<string, number | null>;
};

const INSTRUCTION =
  "Is `statement` a mathematically correct statement? Judge it with the definitions and properties listed in `reference`, together with standard school mathematics for this unit.";
const CRITERIA = {
  true: "The statement is correct as written, in every case it covers.",
  false: "The statement is wrong, or it fails in at least one case it covers.",
};

/** 요청 하나 — state 하나에 Noul 물음 여럿. 값 · 응답 본문을 찍지 않는다. 눈금 실험의 `ref-en` 지시문 그대로. */
export async function askNoul(
  apiKey: string,
  state: unknown,
  questions: readonly NoulQuestion[],
): Promise<NoulResult> {
  const body = JSON.stringify({
    model: MODEL,
    state,
    questions: Object.fromEntries(
      questions.map((q) => [
        q.id,
        {
          type: "noul",
          instructions: { statement: q.statement, question: INSTRUCTION },
          criteria: CRITERIA,
        },
      ]),
    ),
  });
  const empty = Object.fromEntries(questions.map((q) => [q.id, null]));
  for (let attempt = 0; attempt < 5; attempt += 1) {
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
      if (response.status === 429 || response.status === 529) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      if (!response.ok)
        return { ok: false, error: `HTTP ${response.status}`, answers: empty };
      const data = (await response.json()) as Record<string, unknown> | null;
      const raw = (data?.answers ?? {}) as Record<string, unknown>;
      const usage = (data?.usage ?? {}) as Record<string, unknown>;
      const answers: Record<string, number | null> = {};
      for (const q of questions) {
        const answer = raw[q.id] as Record<string, unknown> | null | undefined;
        const noul = answer && typeof answer === "object" ? answer.noul : null;
        answers[q.id] =
          typeof noul === "number" && noul >= 0 && noul <= 1 ? noul : null;
      }
      return {
        ok: true,
        model: typeof data?.model === "string" ? data.model : undefined,
        inputTokens:
          typeof usage.input_tokens === "number"
            ? usage.input_tokens
            : undefined,
        answers,
      };
    } catch (error) {
      if (attempt === 4)
        return {
          ok: false,
          error: error instanceof Error ? error.name : "error",
          answers: empty,
        };
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  return { ok: false, error: "한도 초과가 이어졌다", answers: empty };
}

export const gradeOf = (concept: FadingConcept) =>
  concept.section.split("::")[0]!;
export type { FadingConcept, FadingTarget };
