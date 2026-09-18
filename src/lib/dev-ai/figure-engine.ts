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
import { MAX_DROPPED, repairFigureSpec } from "./figure-repair";
import { validDevAiSvg } from "./svg";
import { buildFigureComparisonImage } from "./figure-comparison";

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
    let repair: { spec: DevAiFigureSpec; error: string } | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      check();
      const raw = await invoke({
        phase: "generate",
        prompt: buildFigureSpecPrompt(request, repair),
        imageDataUrl: request.imageDataUrl,
        signal: deadline.signal,
      });
      check();
      const generated = parseFigureSpecResult(raw);
      if (!generated.spec)
        throw figureReasonError(
          generated.note || "도형 엔진으로 재현할 수 없습니다.",
        );
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
      // 25(2026-09-19 운영 로그): 치수 하나·라벨 하나·직각 표시 하나 때문에 그림 전체를 버렸다.
      // 기계적으로 고쳐지는 사유는 AI 를 다시 부르기 전에 고쳐 바로 다시 그리고, 사유가 가리키는 요소 빼기는
      // 마지막 시도에서만 한다(figure-repair.ts). 고친 그림도 아래 원본 대조를 거친다.
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
        spec = fix.spec;
        rendered = await render(spec);
        check();
      }
      if (!rendered.ok) {
        // Only a spec validation failure earns another inference. Missing
        // Python, sanitization failure, cancellation and timeouts terminate.
        if (attempt < 2 && rendered.error.startsWith(ENGINE_REJECTED)) {
          repair = { spec, error: rendered.error };
          continue;
        }
        // 엔진 검증 사유는 화면까지 간다. 엔진을 못 띄운 실패는 실행 파일 경로를 싣고 있어 가린다.
        throw rendered.error.startsWith(ENGINE_REJECTED)
          ? figureReasonError(rendered.error)
          : new Error(`${rendered.error} 원본은 유지됩니다.`);
      }
      if (rendered.svg.length > 500000 || !validDevAiSvg(rendered.svg))
        throw new FigureRedrawError(
          "도형 엔진의 정적 SVG 안전 검사를 통과하지 못했습니다. 원본은 유지됩니다.",
        );
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
      const review = parseReview(
        await invoke({
          phase: "review",
          prompt: buildFigureReviewPrompt(request, spec, rendered.svg),
          imageDataUrl: comparison,
          signal: deadline.signal,
        }),
      );
      check();
      if (!review.passed && attempt < 2) {
        lastRender.issues = review.issues;
        repair = {
          spec,
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
