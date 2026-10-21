import "server-only";
import { z } from "zod";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { withLabelMetrics } from "@/lib/figure/mathjaxSubstitute";
import { repairJsonString } from "@/lib/ai/jsonRepair";
import { abortError, ProcessSlots } from "./cli-process";
import type { DevAiFigureSpec, DevAiRequest, DevAiResult } from "./contracts";
import {
  buildFigureReviewPrompt,
  buildFigureSpecPrompt,
} from "./figure-prompt";
import {
  FigureRedrawError,
  figureReasonError,
  parseFigureSpecResult,
  withTransparentBackground,
} from "./figure-spec";
import {
  MAX_DROPPED,
  engineRejectionReason,
  repairFigureSpec,
} from "./figure-repair";
import { isEngineCapabilityRefusal } from "./figure-refusal";
import { validDevAiSvg } from "./svg";
import { buildFigureComparisonImage } from "./figure-comparison";
import { noteErrorLog } from "@/lib/errorLog/scope";

const slots = new ProcessSlots();
/** renderFigureSpec 이 엔진 검증 실패에 붙이는 머리 — 이것만 사양을 고쳐 다시 그릴 값이 있다. */
const ENGINE_REJECTED = "도형을 그리지 못했습니다:";
const ReviewSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string().trim().min(1).max(1000)).max(6),
});

function parseReview(raw: string) {
  try {
    if (raw.length > 16000) throw new Error();
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      json = JSON.parse(repairJsonString(raw));
    }
    const review = ReviewSchema.parse(json);
    // Contradictory output never silently converts a reported mismatch to pass.
    return { ...review, passed: review.passed && review.issues.length === 0 };
  } catch {
    throw new FigureRedrawError(
      "원본 대조 응답을 읽지 못했습니다. 원본은 유지됩니다.",
    );
  }
}

/**
 * 도형 작업의 추론 강도 — 생성·대조 모두 medium(원장님 2026-09-18 «도형 AI 추론 강도 하자»).
 * 작업실 세션 실측(그림 1662/q08, 재시도 없이 1회씩): Codex astra 사양 생성 **xhigh 242초** · medium 65초 · low 53초,
 * 대조 xhigh 26초 · medium 7~9초. Claude opus 기본 101초 · medium 32초. 출력의 약 90%가 생각이고 사양 JSON 은 약 700토큰.
 * 원장님 CLI 설정(xhigh)을 그대로 쓰면 사양 생성 한 번이 240초 도형 예산을 넘긴다. 모델 고르기는 그대로 따른다.
 */
export const FIGURE_REASONING_EFFORT = "medium" as const;

export type FigureInference = (input: {
  prompt: string;
  imageDataUrl: string;
  signal: AbortSignal;
  phase: "generate" | "review";
}) => Promise<string>;

/**
 * 도형 재작도 한 번의 **시도 기록** — 실패하면 오류 기록(`error_log.context.figureTrail`)에 실린다
 * (원장님 2026-09-22 «수집된 로그로 업그레이드 패치 가능하게»). 성공하면 버린다. 화면에는 안 나간다.
 * 2026-09-22 운영 422(`labels.val30.point conflicts with its key`)의 원문이 Vercel 실행 기록에만 있었던 까닭이다.
 */
export type FigureAttemptLog = {
  attempt: number;
  /** 이 시도의 지시문에 붙인 반박(앞 시도의 «엔진이 못 한다» 거절) */
  refusal?: string;
  /** 이 시도의 지시문에 되돌려 준 앞 시도의 사유(엔진 거절 · 원본 대조 지적) */
  repairPrompt?: string;
  /** 모델이 낸 것(앞부분) — 사양 JSON 이 여기 있다 */
  modelOutput?: string;
  modelOutputLength?: number;
  /** 모델의 note(그리지 않겠다는 사유 등) */
  note?: string;
  /** 엔진 거절 원문 — 교정하며 다시 그릴 때마다 하나씩 */
  engineErrors: string[];
  /** 적용한 교정(`repairFigureSpec` 의 note · warning)과 그 교정을 부른 엔진 사유 */
  repairs: { note: string; warning?: string; error: string }[];
  /** 교정을 거친 뒤의 사양(앞부분) — 교정이 하나라도 있었을 때만 */
  specAfterRepairs?: string;
  /** 원본 대조 결과 */
  review?: { passed: boolean; issues: string[] };
  /** 원본 대조 응답을 못 읽었을 때 그 앞부분 */
  reviewOutput?: string;
  outcome:
    | "pending"
    | "unreadable"
    | "declined"
    | "rebutted"
    | "engine-rejected"
    | "engine-failed"
    | "unsafe-svg"
    | "review-unreadable"
    | "review-failed"
    | "rendered"
    | "timeout"
    | "error";
  error?: string;
  ms?: number;
};
const TRAIL_TEXT_MAX = 6000;

/** 도형 한 장의 예산 — 칸을 얻은 뒤부터 잰다(결함 3, 2026-09-18). */
export const FIGURE_BUDGET_MS = 240_000;
/**
 * 처리기(handler.ts)가 끊기 전에 도형 쪽이 먼저 멈출 여유(리드 결정 2026-09-19). 처리기의 240초는 요청 시작부터라
 * 처리기가 먼저 끊으면 timedOut 이 안 서서 결함 4(마지막 렌더 돌려주기)가 운영에서 닿지 않고 504 가 됐다.
 */
export const HANDLER_MARGIN_MS = 10_000;

/**
 * Inject inference while retaining validated local geometry and source review.
 * `deadlineAt` 은 부르는 처리기의 끝 시각(ms) — 주면 마감이 min(칸을 얻은 뒤 240초, 끝 시각 − 10초)이 된다.
 */
export async function redrawDevAiFigure(
  request: DevAiRequest,
  signal?: AbortSignal,
  inference?: FigureInference,
  deadlineAt?: number,
): Promise<DevAiResult> {
  if (request.action !== "figure-redraw" || !request.imageDataUrl)
    throw new FigureRedrawError("재작도할 원본 도형 이미지가 필요합니다.");
  if (!inference && process.env.NODE_ENV === "production")
    throw new Error("운영 환경에서는 서버 API 연결이 필요합니다.");
  const invoke: FigureInference =
    inference ??
    (async (input) => {
      const { runSubscriptionCli } = await import("./cli");
      return runSubscriptionCli({
        ...input,
        provider: request.provider,
        model: request.model,
        reasoningEffort: FIGURE_REASONING_EFFORT,
      });
    });
  // 실패하면 오류 기록에 실린다 — 배열은 쓰는 때(실패한 뒤) 직렬화되므로 여기서 걸어 두고 채운다.
  // 크롭 이미지도 같이(원장님 2026-09-22 — 상한 2MB 는 기록기가 본다).
  const trail: FigureAttemptLog[] = [];
  noteErrorLog({
    action: "figure-redraw",
    context: { figureTrail: trail },
    image: request.imageDataUrl,
  });
  const deadline = new AbortController();
  const cancel = () => deadline.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  // 결함 3(2026-09-18): 240초 예산은 도형 칸을 얻은 뒤부터 잰다 — 줄 서서 기다린 시간은 깎지 않는다.
  // 기다리는 동안의 사용자 취소는 deadline 을 거쳐 acquire 를 그대로 깨운다.
  let timer: NodeJS.Timeout | undefined;
  const check = () => {
    if (deadline.signal.aborted) throw abortError();
  };
  // 결함 4(2026-09-18): 마지막으로 렌더에 성공한 결과 — 다음 바퀴가 제한 시간을 넘기면 버리지 않고
  // 시간 초과 안내와 함께 돌려준다(대조 지적은 figureReview 에만 — 2026-09-19). 사용자 취소는 여기에 해당하지 않는다.
  let lastRender:
    | {
        svg: string;
        spec: DevAiFigureSpec;
        warnings: string[];
        issues?: string[];
      }
    | undefined;
  let release: (() => void) | undefined;
  try {
    release = await slots.acquire(deadline.signal);
    // 줄 서서 기다린 시간은 깎지 않는다 — 다만 처리기 한도 안에서
    const budget = Math.min(
      FIGURE_BUDGET_MS,
      deadlineAt === undefined
        ? Infinity
        : deadlineAt - HANDLER_MARGIN_MS - Date.now(),
    );
    timer = setTimeout(
      () => {
        timedOut = true;
        cancel();
      },
      Math.max(0, budget),
    );
    let repair: { spec: DevAiFigureSpec; error: string; kind?: "engine-validation" | "source-review" } | undefined;
    // 원장님 2026-09-20 — 모델이 «엔진이 한글을 못 그린다»고 지어내 spec:null 로 끝냈다(422).
    // 그런 사유에만 반박 한 줄을 붙여 **딱 한 번** 다시 묻는다 — 사진·손그림 같은 진짜 사유는 그대로 422.
    // 되묻기는 아래 세 바퀴 안에서 한 칸을 쓸 뿐이라 토큰·시간 예산은 그대로다.
    let refusal: string | undefined;
    let rebutted = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      check();
      const log: FigureAttemptLog = {
        attempt,
        ...(refusal ? { refusal } : {}),
        ...(repair
          ? { repairPrompt: repair.error.slice(0, TRAIL_TEXT_MAX) }
          : {}),
        engineErrors: [],
        repairs: [],
        outcome: "pending",
      };
      trail.push(log);
      const started = Date.now();
      const finish = (outcome: FigureAttemptLog["outcome"]) => {
        log.outcome = outcome;
        log.ms = Date.now() - started;
      };
      const raw = await invoke({
        phase: "generate",
        prompt: buildFigureSpecPrompt(request, repair, refusal),
        imageDataUrl: request.imageDataUrl,
        signal: deadline.signal,
      });
      log.modelOutput = raw.slice(0, TRAIL_TEXT_MAX);
      if (raw.length > TRAIL_TEXT_MAX) log.modelOutputLength = raw.length;
      refusal = undefined; // 반박은 바로 다음 한 번에만 싣는다
      check();
      let generated: ReturnType<typeof parseFigureSpecResult>;
      try {
        generated = parseFigureSpecResult(raw);
      } catch (error) {
        finish("unreadable");
        throw error;
      }
      if (generated.note) log.note = generated.note;
      if (!generated.spec) {
        if (
          !rebutted &&
          attempt < 2 &&
          isEngineCapabilityRefusal(generated.note)
        ) {
          rebutted = true;
          refusal = generated.note;
          finish("rebutted");
          continue;
        }
        finish("declined");
        throw figureReasonError(
          generated.note || "도형 엔진으로 재현할 수 없습니다.",
        );
      }
      // v2 흰 바탕 rect 가 편집기 1번 «사각형»이 됐다(2026-09-19) — 렌더·대조·저장 모두 투명 바탕 spec 으로.
      let spec = withTransparentBackground(generated.spec);
      // Pass MathJax metrics to the authoritative geometry engine, but keep its
      // text labels editable. The Studio's existing typesetter owns final glyphs.
      const render = (value: DevAiFigureSpec) =>
        renderFigureSpec(withLabelMetrics(value), {
          typeset: false,
          strict: true,
          signal: deadline.signal,
        });
      let rendered = await render(spec);
      check();
      if (!rendered.ok) log.engineErrors.push(rendered.error);
      // 25(2026-09-19 운영 로그): 치수·라벨의 배치 실패는 기계적으로 교정한다.
      // 기계적으로 고쳐지는 사유는 AI 를 다시 부르기 전에 고쳐 바로 다시 그리고, 사유가 가리키는 요소 빼기는
      // 마지막 시도에서만 한다(figure-repair.ts). 직각 불일치·각의 변 누락은 조건을 보존해 모델에 되묻는다.
      // 고친 그림도 아래 원본 대조를 거친다.
      const repaired: string[] = [];
      for (
        let step = 0, dropped = 0;
        !rendered.ok && rendered.error.startsWith(ENGINE_REJECTED) && step < 8;
        step++
      ) {
        const fix = repairFigureSpec(
          spec,
          rendered.error,
          attempt === 2 && dropped < MAX_DROPPED,
        );
        if (!fix) break;
        if (fix.dropped) dropped++;
        if (fix.warning) repaired.push(fix.warning);
        log.repairs.push({
          note: fix.note,
          ...(fix.warning ? { warning: fix.warning } : {}),
          error: rendered.error,
        });
        // 조용히 고치지 않는다 — 원장님 화면에 안 적는 교정도 무엇을 고쳤는지 서버 기록에 남긴다(트랙 45)
        console.warn(
          `[도형 재작도] 엔진 거절을 사양 교정으로 풀었습니다: ${fix.note} (${rendered.error})`,
        );
        spec = fix.spec;
        rendered = await render(spec);
        check();
        if (!rendered.ok) log.engineErrors.push(rendered.error);
      }
      if (log.repairs.length)
        log.specAfterRepairs = JSON.stringify(spec).slice(0, TRAIL_TEXT_MAX);
      if (!rendered.ok) {
        // A successful generation response (or an earlier render that failed
        // source review) cannot turn this final engine rejection into success.
        finish(
          rendered.error.startsWith(ENGINE_REJECTED)
            ? "engine-rejected"
            : "engine-failed",
        );
        // Only a spec validation failure earns another inference. Missing
        // Python, sanitization failure, cancellation and timeouts terminate.
        if (attempt < 2 && rendered.error.startsWith(ENGINE_REJECTED)) {
          repair = { spec, error: rendered.error };
          continue;
        }
        // 엔진 검증 사유는 화면에 한국어 한 줄로, 엔진 원문은 개발자용 detail 로 간다(원장님 2026-09-21 — 영어 원문이
        // 그대로 나갔다). 엔진을 못 띄운 실패는 실행 파일 경로를 싣고 있어 가린다.
        throw rendered.error.startsWith(ENGINE_REJECTED)
          ? new FigureRedrawError(
              engineRejectionReason(rendered.error),
              rendered.error,
            )
          : new Error(`${rendered.error} 원본은 유지됩니다.`);
      }
      if (rendered.svg.length > 500000 || !validDevAiSvg(rendered.svg)) {
        finish("unsafe-svg");
        throw new FigureRedrawError(
          "도형 엔진의 정적 SVG 안전 검사를 통과하지 못했습니다. 원본은 유지됩니다.",
        );
      }
      const warnings = [...generated.warnings];
      if (generated.note) warnings.push(generated.note);
      warnings.push(...repaired);
      lastRender = { svg: rendered.svg, spec, warnings };
      const comparison = await buildFigureComparisonImage(
        request.imageDataUrl,
        rendered.svg,
        deadline.signal,
      );
      check();
      const reviewRaw = await invoke({
        phase: "review",
        prompt: buildFigureReviewPrompt(request, spec, rendered.svg),
        imageDataUrl: comparison,
        signal: deadline.signal,
      });
      let review: ReturnType<typeof parseReview>;
      try {
        review = parseReview(reviewRaw);
      } catch (error) {
        log.reviewOutput = reviewRaw.slice(0, TRAIL_TEXT_MAX);
        finish("review-unreadable");
        throw error;
      }
      log.review = { passed: review.passed, issues: review.issues };
      finish(review.passed ? "rendered" : "review-failed");
      check();
      if (!review.passed && attempt < 2) {
        lastRender.issues = review.issues;
        repair = {
          spec,
          kind: "source-review",
          error: `원본 대조: ${review.issues.join(" / ") || "도형의 원본 일치 여부를 확인할 수 없습니다."}`,
        };
        continue;
      }
      // 원장님 2026-09-19 «원본 대조 멘트는 생성하지 마» — 끝까지 안 맞아도 경고 문구는 싣지 않는다.
      // 대조 결과는 figureReview 에 그대로 남는다(초안 저장 형식 — draftStore.ts 가 검사한다).
      return {
        content: "",
        answer: "",
        solution: "",
        warnings,
        svg: rendered.svg,
        spec,
        engine: "todays-math-python",
        figureReview: { mode: "source-and-rendered-images", ...review },
      };
    }
    throw new FigureRedrawError(
      "도형 재작도에 실패했습니다. 원본은 유지됩니다.",
    );
  } catch (error) {
    const last = trail.at(-1);
    if (last?.outcome === "pending") {
      last.outcome = timedOut ? "timeout" : "error";
      last.error =
        error instanceof Error ? error.message.slice(0, 500) : String(error);
    }
    if (timedOut) {
      if (!lastRender)
        throw new FigureRedrawError(
          "도형 재작도가 오래 걸려 원본을 유지했습니다. 그림 편집에서 다시 시도해 주세요.",
        );
      const issues = lastRender.issues ?? [];
      return {
        content: "",
        answer: "",
        solution: "",
        warnings: [
          ...lastRender.warnings,
          "도형 재작도가 오래 걸려 마지막으로 그린 결과를 사용합니다.",
        ],
        svg: lastRender.svg,
        spec: lastRender.spec,
        engine: "todays-math-python",
        figureReview: {
          mode: "source-and-rendered-images",
          passed: false,
          issues,
        },
      };
    }
    throw error;
  } finally {
    release?.();
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
