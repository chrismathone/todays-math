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
import { parseFigureSpecResult } from "./figure-spec";
import { validDevAiSvg } from "./svg";
import { buildFigureComparisonImage } from "./figure-comparison";

const slots = new ProcessSlots();
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
    throw new Error("원본 대조 응답을 읽지 못했습니다. 원본은 유지됩니다.");
  }
}

export type FigureInference = (input: {
  prompt: string;
  imageDataUrl: string;
  signal: AbortSignal;
  phase: "generate" | "review";
}) => Promise<string>;

/** Inject inference while retaining validated local geometry and source review. */
export async function redrawDevAiFigure(
  request: DevAiRequest,
  signal?: AbortSignal,
  inference?: FigureInference,
): Promise<DevAiResult> {
  if (request.action !== "figure-redraw" || !request.imageDataUrl)
    throw new Error("재작도할 원본 도형 이미지가 필요합니다.");
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
      });
    });
  const deadline = new AbortController();
  const cancel = () => deadline.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    cancel();
  }, 240000);
  const check = () => {
    if (deadline.signal.aborted) throw abortError();
  };
  let release: (() => void) | undefined;
  try {
    release = await slots.acquire(deadline.signal);
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
        throw new Error(
          generated.note ||
            "도형 엔진으로 재현할 수 없습니다. 원본은 유지됩니다.",
        );
      // Pass MathJax metrics to the authoritative geometry engine, but keep its
      // text labels editable. The Studio's existing typesetter owns final glyphs.
      const rendered = await renderFigureSpec(
        withLabelMetrics(generated.spec),
        {
          typeset: false,
          strict: true,
          signal: deadline.signal,
        },
      );
      check();
      if (!rendered.ok) {
        // Only a spec validation failure earns another inference. Missing
        // Python, sanitization failure, cancellation and timeouts terminate.
        if (
          attempt < 2 &&
          rendered.error.startsWith("도형을 그리지 못했습니다:")
        ) {
          repair = { spec: generated.spec, error: rendered.error };
          continue;
        }
        throw new Error(`${rendered.error} 원본은 유지됩니다.`);
      }
      if (rendered.svg.length > 500000 || !validDevAiSvg(rendered.svg))
        throw new Error(
          "도형 엔진의 정적 SVG 안전 검사를 통과하지 못했습니다. 원본은 유지됩니다.",
        );
      const comparison = await buildFigureComparisonImage(
        request.imageDataUrl,
        rendered.svg,
        deadline.signal,
      );
      check();
      const review = parseReview(
        await invoke({
          phase: "review",
          prompt: buildFigureReviewPrompt(
            request,
            generated.spec,
            rendered.svg,
          ),
          imageDataUrl: comparison,
          signal: deadline.signal,
        }),
      );
      check();
      if (!review.passed && attempt < 2) {
        repair = {
          spec: generated.spec,
          error: `원본 대조: ${review.issues.join(" / ") || "도형의 원본 일치 여부를 확인할 수 없습니다."}`,
        };
        continue;
      }
      const warnings = [...generated.warnings];
      if (generated.note) warnings.push(generated.note);
      if (!review.passed)
        warnings.push(
          `원본 대조 확인 필요: ${review.issues.join(" / ") || "그림 편집에서 원본과 비교해 주세요."}`,
        );
      return {
        content: "",
        answer: "",
        solution: "",
        warnings,
        svg: rendered.svg,
        spec: generated.spec,
        engine: "todays-math-python",
        figureReview: { mode: "source-and-rendered-images", ...review },
      };
    }
    throw new Error("도형 재작도에 실패했습니다. 원본은 유지됩니다.");
  } catch (error) {
    if (timedOut)
      throw new Error(
        "도형 재작도가 오래 걸려 원본을 유지했습니다. 그림 편집에서 다시 시도해 주세요.",
      );
    throw error;
  } finally {
    release?.();
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
