/** Server/offline DB-source drafts. Self-reproduction is evidence, never mathematical approval. */
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma, Problem } from "@prisma/client";
import { difficultySchema } from "@/contracts/common.contract";
import { problemTypeSchema } from "@/contracts/problem.contract";
import { CLAUDE_HARD_MODEL, claudeModelFor } from "@/lib/ai/claudeModels";
import { AiParseError } from "@/lib/ai/errors";
import {
  normalizeAiAnswer,
  normalizeAiText,
  normalizeLatex,
  parseAiJsonArray,
} from "@/lib/ai/jsonRepair";
import { verifiesOriginalReproduction } from "@/lib/ai/originalReproduction";
import {
  buildTransformSystemPrompt,
  buildTransformUserPrompt,
  TRANSFORM_PROMPT_VERSION,
} from "@/lib/ai/prompts/transform";
import { speakWordyOperators } from "@/lib/ai/wordyOperators";
import { originNeedsFigure } from "@/lib/figure/transformFigureBlock";
import {
  callClaudeMessages,
  type ClaudeTransportPart,
} from "./claudeTransport";
import type {
  DbRetryCandidate,
  DbRetryFigures,
  DbRetryOrigin,
} from "./dbRetry.types";
import { reviewDigest } from "./qualification";
import {
  prepareTextbookRetryPair,
  textbookRetryExternalId,
  textbookRetrySourceFingerprint,
  type TextbookRetrySource,
} from "./retryPairPlan";
import {
  textbookVariantSourceDigest,
  type TextbookVariantSource,
} from "./variants";

export const DB_RETRY_GENERATION_VERSION = "db-retry-generation-v1";

/**
 * 생성 모델 — 원문 문항의 난이도로 고른다(원장님 2026-11-11): «심화상»이면 Claude Opus 5.5, 그 밖은 Sonnet 5.5.
 * 그림이 있든 없든 같은 모델이다(전에는 DeepSeek 글 모델 · 그림 모델이 갈렸다). 기록에 남은 옛 `deepseek-*`
 * 이름은 그때 만든 것이라는 뜻 그대로 둔다.
 */
export function dbRetryGenerationModel(difficulty: string | null | undefined) {
  return claudeModelFor(difficulty);
}

export interface DbRetryCall {
  slot: 1 | 2;
  attempt: number;
  requestedModel: string;
  model: string;
  startedAt: string;
  latencyMs: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    reasoningTokens?: number;
    cacheHitTokens?: number;
  } | null;
  finishReason: string | null;
  status: "received" | "transport-failed";
  httpStatus?: number;
}
export interface DbRetryGeneratedPair {
  version: typeof DB_RETRY_GENERATION_VERSION;
  promptVersion: string;
  sourceId: string;
  sourceDigest: string;
  originDigest: string;
  sourceFigureDigest: string;
  candidatePayloadDigest: string;
  candidates: [DbRetryCandidate, DbRetryCandidate];
  calls: DbRetryCall[];
  mathematicalApproval: false;
}
export interface DbRetryCompletion {
  content: string;
  model: string;
  usage: DbRetryCall["usage"];
  finishReason: string | null;
}
export interface DbRetryRequest {
  model: string;
  system: string;
  prompt: string;
  figures: DbRetryFigures;
}
export interface DbRetryGenerationOptions {
  /** Offline transports can record their own requested model without changing app defaults. */
  requestedModel?: string;
  complete?: (request: DbRetryRequest) => Promise<DbRetryCompletion>;
  renderFigure?: (
    spec: Record<string, unknown>,
    content: string,
  ) => Promise<{ svg: string; figures: DbRetryFigures }>;
  now?: () => number;
}
export class DbRetryGenerationError extends Error {
  constructor(
    public readonly code: string,
    public readonly calls: DbRetryCall[] = [],
  ) {
    super(code);
    this.name = "DbRetryGenerationError";
  }
}

const itemSchema = z.strictObject({
  content: z.string().min(1),
  answer: z.string().min(1),
  solution: z.string().min(1),
  originalAnswerRecomputed: z.string().min(1),
  figureSpec: z.record(z.string(), z.unknown()).nullable().optional(),
});

export function dbRetryNeedsFigure(source: TextbookVariantSource): boolean {
  return originNeedsFigure({
    content: source.content,
    figureUrls: [...(source.figure_urls ?? [])],
    figureSvg: source.figure_svg ?? null,
  });
}

/** Held originals, recovery children and unsupported provenance cannot enter this run. */
export function dbRetryOriginIssue(origin: DbRetryOrigin): string | null {
  const p = origin.problem;
  if (
    p.source !== "school_textbook" ||
    p.pool !== "shared" ||
    p.origin_problem_id !== null
  )
    return "source-not-shared-original";
  if (!p.direct_use_allowed || p.review_status !== "approved")
    return "source-held";
  if (!p.id || !p.unit_id || !p.family_key?.trim())
    return "source-provenance-missing";
  if (!p.content.trim() || !p.answer.trim()) return "source-text-missing";
  if (!["객관식", "단답형", "서술형"].includes(p.question_type))
    return "source-question-type";
  if (
    ![origin.grade, origin.chapter, origin.section].every(
      (value) => typeof value === "string" && value.trim(),
    )
  )
    return "source-unit-context-missing";
  if (
    !difficultySchema.safeParse(p.difficulty).success ||
    !problemTypeSchema.safeParse(p.problem_type).success
  )
    return "source-classification";
  return null;
}

export function dbRetrySourceRecord(
  p: TextbookVariantSource,
): TextbookRetrySource {
  return {
    id: p.id,
    source: p.source as Problem["source"],
    unitId: p.unit_id!,
    familyKey: p.family_key ?? null,
    sourceMaterialId: p.source_material_id,
    difficulty: difficultySchema.parse(p.difficulty),
    problemType: problemTypeSchema.parse(p.problem_type),
    questionType: p.question_type,
    content: p.content,
    answer: p.answer,
    solution: p.solution,
    figureSvg: p.figure_svg ?? null,
    figureUrls: [...(p.figure_urls ?? [])],
    figureDims: (p.figure_dims ?? []) as number[],
    figureSourceMm: (p.figure_source_mm ?? []) as number[],
    choiceFigureIndex: (p.choice_figure_index ?? []) as number[],
    pool: p.pool as Problem["pool"],
    reviewStatus: p.review_status as Problem["reviewStatus"],
    directUseAllowed: p.direct_use_allowed,
  };
}

/** Reuse the existing transform instructions, with actual DB grade/format and observed images. */
export function buildDbRetryPrompts(
  origin: DbRetryOrigin,
  slot: 1 | 2,
  figures: DbRetryFigures,
  previousContent?: string,
): { system: string; prompt: string } {
  const p = origin.problem;
  const required = dbRetryNeedsFigure(p);
  return {
    system: buildTransformSystemPrompt().replace(
      "한국 중학교 수학",
      `한국 ${origin.grade} 수학`,
    ),
    prompt: [
      `[DB 교육 범위] ${origin.grade} / ${origin.chapter} / ${origin.section}`,
      `문항 형식은 ${p.question_type} 그대로 유지하십시오. 같은 학습 목표와 풀이 수준을 지키고 다른 단원 도구를 끌어오지 마십시오.`,
      buildTransformUserPrompt({
        originContent: p.content,
        originAnswer: p.answer,
        originSolution: p.solution,
        problemType: problemTypeSchema.parse(p.problem_type),
        difficulty: difficultySchema.parse(p.difficulty),
        count: 1,
        mode: slot === 1 ? "numbers" : "conditions",
        difficultyShift: "keep",
        figureRequired: required,
      }),
      "풀이 solution은 생략하거나 null로 두지 말고 계산 및 결론을 끝까지 적으십시오. 객관식은 모든 보기를 본문에 포함하고 정답 번호와 보기 값을 맞추십시오.",
      required
        ? `이 요청에는 DB에서 실제 읽은 그림 ${figures.images.length}장이 원래 순서로 첨부됩니다. 원본 그림을 직접 보고 조건을 확인하십시오. 새 숫자에 맞는 figureSpec을 작성하고 본문에는 [그림] 표지 하나를 넣으십시오. 필요한 도형을 확정할 수 없으면 figureSpec=null로 남기십시오. 없는 조건이나 치수를 지어내지 마십시오.`
        : "원문은 그림이 없는 문항입니다. 그림 조건을 추가하지 마십시오.",
      required
        ? "FigureSpec 좌표는 픽셀 좌표가 아니라 장면 단위입니다. 보통 -10부터 10 사이의 작은 좌표를 쓰고 400, 800 같은 화면 픽셀값을 좌표로 넣지 마십시오. 원의 반지름도 같은 장면 단위입니다. 분기·표·배열을 그릴 때 본문의 개수 조건과 실제 점·연결선·칸 개수를 일치시키십시오."
        : "",
      previousContent
        ? `앞서 만든 변형과도 달라야 합니다: ${previousContent}`
        : "",
      "출력은 요청된 변형 하나의 JSON 배열입니다. originalAnswerRecomputed는 자기 재현 근거이며 정답 승인을 뜻하지 않습니다.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/**
 * Claude 한 번 — 재시도 없이(부르는 쪽이 시도를 세어 기록한다), 원문 응답 없이 메타데이터만 남긴다.
 * 끝난 까닭은 이 도구가 쓰던 말로 옮긴다: `end_turn` → `"stop"` · `max_tokens` → `"length"`(그 밖은 그대로 —
 * `refusal` 따위는 `generation-no-final-answer` 가 된다). 생각도 출력 한도를 같이 쓴다.
 * 한도는 `TEXTBOOK_RETRY_MAX_TOKENS`(4096 ~ 128000, 기본 64000).
 */
export async function completeDbRetry(
  request: DbRetryRequest,
): Promise<DbRetryCompletion> {
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    throw new DbRetryGenerationError("anthropic-key-missing");
  const maxTokens = Number(
    process.env.TEXTBOOK_RETRY_MAX_TOKENS?.trim() || 64000,
  );
  if (!Number.isInteger(maxTokens) || maxTokens < 4096 || maxTokens > 128000)
    throw new DbRetryGenerationError("claude-token-limit");
  const parts: ClaudeTransportPart[] = [{ type: "text", text: request.prompt }];
  request.figures.images.forEach((image, index) => {
    parts.push({
      type: "text",
      text: `DB 그림 ${index + 1}, ${image.choiceIndex ? `보기 ${image.choiceIndex}` : "발문 그림"}`,
    });
    parts.push({ type: "image", dataUrl: image.dataUrl });
  });
  const response = await callClaudeMessages({
    model: request.model,
    system: request.system,
    parts,
    maxTokens,
    // 문항 생성과 같은 깊이 — 심화상(Opus)은 high, 그 밖은 medium
    effort: request.model === CLAUDE_HARD_MODEL ? "high" : "medium",
    signal: AbortSignal.timeout(600000),
  });
  const inputTokens = response.usage?.inputTokens;
  const outputTokens = response.usage?.outputTokens;
  const cacheHitTokens = response.usage?.cacheReadInputTokens;
  return {
    content: response.text,
    model: response.model,
    finishReason:
      response.stopReason === "end_turn"
        ? "stop"
        : response.stopReason === "max_tokens"
          ? "length"
          : response.stopReason,
    usage:
      inputTokens !== undefined && outputTokens !== undefined
        ? {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
            ...(cacheHitTokens === undefined ? {} : { cacheHitTokens }),
          }
        : null,
  };
}

/** Strict provenance, exact two slots and pending insertion shape; no answer approval is performed. */
export function prepareDbRetryInsertion(
  origin: DbRetryOrigin,
  candidates: readonly DbRetryCandidate[],
): Prisma.ProblemCreateManyInput[] {
  const issue = dbRetryOriginIssue(origin);
  if (issue) throw new DbRetryGenerationError(issue);
  const p = origin.problem;
  const digest = textbookVariantSourceDigest(p);
  for (const c of candidates) {
    if (c.sourceDigest !== digest)
      throw new DbRetryGenerationError("source-digest-changed");
    if (
      c.sourceId !== p.id ||
      c.originProblemId !== p.id ||
      c.sourceMaterialId !== p.source_material_id ||
      c.unitId !== p.unit_id ||
      c.familyKey !== p.family_key ||
      c.sourceExternalId !== (p.external_id ?? null) ||
      c.sourceFile !== (p.source_file ?? null) ||
      c.source !== "transformed" ||
      c.questionType !== p.question_type ||
      c.externalId !== textbookRetryExternalId(p.id, c.slot) ||
      c.recipe !== (c.slot === 1 ? "ai-db-numbers-v1" : "ai-db-conditions-v1")
    )
      throw new DbRetryGenerationError("candidate-provenance-changed");
    if (dbRetryNeedsFigure(p) && !c.figureSvg)
      throw new DbRetryGenerationError("candidate-figure-missing");
  }
  const source = dbRetrySourceRecord(p);
  return prepareTextbookRetryPair(
    source,
    textbookRetrySourceFingerprint(source),
    candidates.map((c) => ({
      slot: c.slot,
      content: c.content,
      answer: c.answer,
      solution: c.solution,
      figureSvg: c.figureSvg,
      figureUrls: c.figureUrls,
      figureDims: c.figureDims,
      figureSourceMm: c.figureSourceMm,
      choiceFigureIndex: c.choiceFigureIndex,
      recipe: c.recipe,
      mathEvidence: JSON.stringify({
        kind: "generator-self-reproduction-only",
        ...c.validation,
        mathematicalApproval: false,
      }),
    })),
  ).rows.map((row) => ({ ...row, sourceFile: p.source_file ?? null }));
}

export async function generateDbRetryPair(
  input: DbRetryOrigin,
  sourceFigures: DbRetryFigures,
  options: DbRetryGenerationOptions = {},
): Promise<DbRetryGeneratedPair> {
  const origin = structuredClone(input);
  const issue = dbRetryOriginIssue(origin);
  if (issue) throw new DbRetryGenerationError(issue);
  const p = origin.problem;
  const sourceDigest = textbookVariantSourceDigest(p);
  const originDigest = reviewDigest(origin);
  const required = dbRetryNeedsFigure(p);
  if (required && !sourceFigures.images.length)
    throw new DbRetryGenerationError("source-figure-missing");
  if (!required && sourceFigures.images.length)
    throw new DbRetryGenerationError("unexpected-source-figure");
  if (
    sourceFigures.images.some(
      (image) =>
        !/^data:image\/(png|jpeg|webp|gif);base64,/.test(image.dataUrl),
    )
  )
    throw new DbRetryGenerationError("source-figure-format");
  const metadata = sourceFigures.images.map((image) => {
    const sourceSha256 =
      (image as typeof image & { sourceSha256?: string }).sourceSha256 ?? null;
    const bytes = Buffer.from(
      image.dataUrl.slice(image.dataUrl.indexOf(",") + 1),
      "base64",
    );
    if (
      !bytes.length ||
      createHash("sha256").update(bytes).digest("hex") !== image.sha256 ||
      (sourceSha256 !== null && !/^[a-f0-9]{64}$/.test(sourceSha256))
    )
      throw new DbRetryGenerationError("source-figure-hash-mismatch");
    if (!["database-svg", "database-raster"].includes(image.origin))
      throw new DbRetryGenerationError("source-figure-origin");
    return {
      sha256: image.sha256,
      choiceIndex: image.choiceIndex,
      origin: image.origin,
      sourceSha256,
    };
  });
  if (reviewDigest(metadata) !== sourceFigures.digest)
    throw new DbRetryGenerationError("source-figure-digest-mismatch");
  const figureEvidence = structuredClone(sourceFigures);
  const calls: DbRetryCall[] = [];
  const candidates: DbRetryCandidate[] = [];
  const complete = options.complete ?? completeDbRetry;
  const now = options.now ?? Date.now;
  try {
    for (const slot of [1, 2] as const) {
      const prompts = buildDbRetryPrompts(
        origin,
        slot,
        figureEvidence,
        candidates[0]?.content,
      );
      const model =
        options.requestedModel ??
        dbRetryGenerationModel(
          typeof p.difficulty === "string" ? p.difficulty : null,
        );
      let item: z.infer<typeof itemSchema> | undefined;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const start = now();
        let response: DbRetryCompletion;
        try {
          response = await complete({
            model,
            ...prompts,
            figures: structuredClone(figureEvidence),
          });
        } catch (error) {
          const httpStatus =
            error instanceof Error &&
            "status" in error &&
            typeof error.status === "number" &&
            Number.isInteger(error.status)
              ? error.status
              : undefined;
          calls.push({
            slot,
            attempt,
            requestedModel: model,
            model,
            startedAt: new Date(start).toISOString(),
            latencyMs: now() - start,
            usage: null,
            finishReason: null,
            status: "transport-failed",
            ...(httpStatus === undefined ? {} : { httpStatus }),
          });
          throw new DbRetryGenerationError(
            httpStatus === 402
              ? "provider-balance-insufficient"
              : "generation-transport",
            calls,
          );
        }
        calls.push({
          slot,
          attempt,
          requestedModel: model,
          model: response.model,
          startedAt: new Date(start).toISOString(),
          latencyMs: now() - start,
          usage: response.usage,
          finishReason: response.finishReason,
          status: "received",
        });
        if (response.finishReason === "length")
          throw new DbRetryGenerationError("generation-truncated", calls);
        if (response.finishReason !== "stop")
          throw new DbRetryGenerationError("generation-no-final-answer", calls);
        try {
          const items = parseAiJsonArray(response.content, itemSchema);
          if (items.length !== 1)
            throw new DbRetryGenerationError("generation-wrong-count", calls);
          item = items[0]!;
          break;
        } catch (error) {
          if (error instanceof AiParseError && attempt === 1) continue;
          throw new DbRetryGenerationError("generation-response-shape", calls);
        }
      }
      if (!item) throw new DbRetryGenerationError("generation-empty", calls);
      const content = speakWordyOperators(normalizeAiText(item.content)).out;
      let svg: string | null = null;
      if (required) {
        if (!item.figureSpec)
          throw new DbRetryGenerationError(
            "candidate-figure-spec-missing",
            calls,
          );
        if (!options.renderFigure)
          throw new DbRetryGenerationError("figure-renderer-missing", calls);
        const rendered = await options.renderFigure(item.figureSpec, content);
        if (!rendered.svg || !rendered.figures.images.length)
          throw new DbRetryGenerationError(
            "candidate-figure-render-failed",
            calls,
          );
        svg = rendered.svg;
      }
      candidates.push({
        sourceId: p.id,
        sourceDigest,
        originProblemId: p.id,
        sourceMaterialId: p.source_material_id,
        unitId: p.unit_id!,
        sourceExternalId: p.external_id ?? null,
        sourceFile: p.source_file ?? null,
        familyKey: p.family_key!,
        externalId: textbookRetryExternalId(p.id, slot),
        source: "transformed",
        questionType: p.question_type as DbRetryCandidate["questionType"],
        slot,
        recipe: slot === 1 ? "ai-db-numbers-v1" : "ai-db-conditions-v1",
        method:
          slot === 1 ? "DB 원문 숫자 변형" : "DB 원문 같은 목표의 조건 변형",
        content,
        answer: speakWordyOperators(normalizeAiAnswer(item.answer)).out,
        solution: speakWordyOperators(normalizeAiText(item.solution)).out,
        figureSvg: svg,
        figureUrls: [],
        figureDims: [],
        figureSourceMm: [],
        choiceFigureIndex: [],
        validation: {
          version: DB_RETRY_GENERATION_VERSION,
          originalAnswerRecomputed: normalizeLatex(
            item.originalAnswerRecomputed,
          ),
          checks: [
            `generator-self-reproduction:${verifiesOriginalReproduction(p, item) ? "matched" : "mismatched"}`,
            "mathematical-approval:not-performed",
            `source-figure-digest:${figureEvidence.digest}`,
          ],
        },
      });
    }
    if (reviewDigest(input) !== originDigest)
      throw new DbRetryGenerationError(
        "source-mutated-during-generation",
        calls,
      );
    prepareDbRetryInsertion(origin, candidates);
    return {
      version: DB_RETRY_GENERATION_VERSION,
      promptVersion: TRANSFORM_PROMPT_VERSION,
      sourceId: p.id,
      sourceDigest,
      originDigest,
      sourceFigureDigest: figureEvidence.digest,
      candidatePayloadDigest: reviewDigest(candidates),
      candidates: candidates as [DbRetryCandidate, DbRetryCandidate],
      calls,
      mathematicalApproval: false,
    };
  } catch (error) {
    if (error instanceof DbRetryGenerationError)
      throw new DbRetryGenerationError(error.code, calls);
    throw new DbRetryGenerationError(
      "candidate-structure-or-figure-invalid",
      calls,
    );
  }
}
