/**
 * 오늘의 영어 — 고쳐 쓰기 되먹임 (D-151 · 25 §12). 초안 하나에 대해 **기계가 잰 사실**만 한 줄씩 돌려준다:
 * 제품 검증기(`validate.ts` — 저장을 막는 규칙)의 사유 + 결정적 품질 검사(`quality.ts` — 막지 않는 규칙)의 실패.
 *
 * DeepSeek 생성이 검증기에 걸리면 이 목록을 모델에 되먹여 한 번 고쳐 쓰게 한다(`generate.ts`). 모델 벤치의 쪼기 루프
 * (`scripts/qa/english-bench/refine.ts`)도 같은 함수를 쓴다 — 벤치에서 잰 효과(DeepSeek 채택률 67% → 100%)가 제품과 같은 되먹임에서 나오게.
 * 모델 자신의 «반성»은 넣지 않는다(외부 피드백 없는 자기 수정은 안 된다 — ICLR 2024, codex 조사).
 */
import {
  englishQuestionSchema,
  type EnglishQuestion,
} from "@/contracts/english.contract";

import { reviewEnglishDraft, type EnglishQualityExpectation } from "./quality";
import {
  ENGLISH_EVIDENCE_NOT_FOUND,
  normalizeEnglishText,
  validateEnglishDraft,
} from "./validate";

function sentencesOf(text: string): string[] {
  return normalizeEnglishText(text)
    .split(/(?<=[.!?]["”’)]?)\s+/)
    .filter(Boolean);
}

function wordsOf(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z']+/g) ?? []);
}

/** 낱말이 충분히 겹칠 때만(자카드 ≥ 0.35) — 지문을 고친 뒤 옛 문장을 인용한 경우엔 엉뚱한 문장을 권하지 않는다 */
function closestSentence(target: string, pool: string[]): string | null {
  const want = wordsOf(target);
  let best: string | null = null;
  let score = 0.35;
  for (const sentence of pool) {
    const have = wordsOf(sentence);
    let shared = 0;
    for (const w of want) if (have.has(w)) shared += 1;
    const s = shared / Math.max(1, new Set([...want, ...have]).size);
    if (s > score) [best, score] = [sentence, s];
  }
  return best;
}

const clip = (text: string, n: number) =>
  text.length > n ? `${text.slice(0, n)}…` : text;

/**
 * 근거가 지문에 없을 때 **자리를 짚는다** — 어디까지 지문과 같고, 어디서 지문에 없는 말이 나오며, 지문은 무엇으로 이어지는지,
 * 가장 가까운 지문 문장은 무엇인지. 검증기 사유 한 줄만 되먹이면 gpt-6-luna 가 근거를 더 길게 다시 써 또 거절됐다
 * (벤치 2026-09-30: 고쳐 쓰기 3건 중 1건 실패 → 자리를 짚으니 4건 모두 한 번에 통과). 근거가 지문에 있으면 null.
 */
function evidenceDiagnosis(passage: string, raw: unknown): string | null {
  const evidence = normalizeEnglishText(String(raw ?? ""));
  if (!evidence || passage.includes(evidence)) return null;
  let k = 0;
  while (k < evidence.length && passage.includes(evidence.slice(0, k + 1)))
    k += 1;
  const parts = sentencesOf(evidence);
  const missing = parts.find((s) => !passage.includes(s)) ?? evidence;
  const near = closestSentence(missing, sentencesOf(passage));
  const at = passage.indexOf(evidence.slice(0, k));
  const where =
    k < 12
      ? `근거 첫머리 «${clip(evidence, 60)}» 부터 지문에 없습니다`
      : `근거가 «${evidence.slice(Math.max(0, k - 40), k)}» 까지는 지문과 같지만, 그 뒤 «${clip(evidence.slice(k), 50)}» 는 지문에 없습니다(지문은 «${clip(passage.slice(at + k), 50)}» 로 이어집니다)`;
  return `${where}. 근거는 ${parts.length}문장인데, ${parts.length > 1 ? "여러 문장을 옮기다 틀렸습니다. " : ""}지문의 문장 하나를 첫 글자부터 끝 문장부호까지 그대로 복사해 바꾸십시오${near ? ` — 가장 가까운 지문 문장: «${near}»` : ""}.`;
}

/**
 * **저장을 막은 사유만** — 검증기 사유와, 근거 거절이면 그 자리 짚기. 막지 않는 품질 검사(`quality.ts`)는 안 넣는다.
 * ChatGPT 길의 «고쳐 달라 요청문»이 이것만 쓴다(25 §12.8 「3」 — 정밀도 낮은 의심을 고치라 하면 맞는 답을 틀리게 바꾼다).
 * 통과한 초안이면 빈 배열.
 */
export function englishRejectionReasons(
  value: unknown,
  expect: EnglishQualityExpectation,
): string[] {
  const lines: string[] = [];
  const draft = (value ?? {}) as { passage?: unknown; questions?: unknown };
  const verdict = validateEnglishDraft(value, expect);
  if (verdict.ok) return lines;
  const passage = normalizeEnglishText(String(draft.passage ?? ""));
  const raws = Array.isArray(draft.questions) ? draft.questions : [];
  for (const issue of verdict.issues) {
    lines.push(
      `${issue.question === null ? "세트" : `q${issue.question + 1}`}: ${issue.message}`,
    );
    if (
      issue.question !== null &&
      issue.message === ENGLISH_EVIDENCE_NOT_FOUND
    ) {
      const hint = evidenceDiagnosis(
        passage,
        (raws[issue.question] as { evidence?: unknown } | undefined)?.evidence,
      );
      if (hint) lines.push(`q${issue.question + 1} 근거 진단: ${hint}`);
    }
  }
  return lines;
}

export function englishDraftFeedback(
  value: unknown,
  expect: EnglishQualityExpectation,
): string[] {
  const lines: string[] = englishRejectionReasons(value, expect);
  const draft = (value ?? {}) as {
    title?: unknown;
    passage?: unknown;
    questions?: unknown;
  };
  const parsed = (Array.isArray(draft.questions) ? draft.questions : []).map(
    (question) => englishQuestionSchema.safeParse(question),
  );
  const valid = parsed.flatMap((p) =>
    p.success ? [p.data] : [],
  ) as EnglishQuestion[];
  const index = parsed.flatMap((p, i) => (p.success ? [i] : []));
  const report = reviewEnglishDraft(
    {
      title: String(draft.title ?? ""),
      source: "deepseek",
      passage: String(draft.passage ?? ""),
      questions: valid,
    },
    expect,
  );
  for (const question of report.questions)
    for (const c of question.checks)
      if (!c.ok)
        lines.push(
          `q${index[question.question]! + 1} (${question.type}): ${c.message}`,
        );
  for (const c of report.set) if (!c.ok) lines.push(`세트: ${c.message}`);
  return [...new Set(lines)];
}
