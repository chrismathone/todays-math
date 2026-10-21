import type { DevAiFigureSpec } from "@/lib/dev-ai/contracts";
import { MAX_DROPPED, engineRejectionReason, repairFigureSpec } from "@/lib/dev-ai/figure-repair";
import { isEngineCapabilityRefusal } from "@/lib/dev-ai/figure-refusal";
import { validDevAiSvg } from "@/lib/dev-ai/svg";
import { withLabelMetrics } from "@/lib/figure/mathjaxSubstitute";
import { postAi, renderSpec } from "@/lib/aiClient";
import { buildComparisonImage } from "./comparison";
import { annotateGrid, gridHint, gridReviewHint, measureGrid } from "./gridMeasure";
import { snapGraphSpecToGrid } from "./gridSnap";

/**
 * «다시 그리기» 지휘자 — todays-math `src/lib/dev-ai/figure-engine.ts` 의 `redrawDevAiFigure` 를 브라우저로 옮겼다.
 * 서버 함수 하나가 4분 동안 붙잡고 있지 않도록, 모델 호출(명세·대조)과 엔진 렌더를 **한 번씩 따로** 부른다.
 *
 *   한 바퀴 = AI 명세 → (라벨 치수 싣기) → 엔진 렌더 → [엔진 거절이면 기계 교정 ≤8걸음] → 대조 이미지 → AI 대조
 *   최대 세 바퀴(세 번째는 대조 없이 끝). 엔진 거절이 남으면 그 사유로, 대조가 어긋나면 지적을 붙여 명세를 다시 받는다.
 *   모델이 «엔진이 못 그린다»고 지어낸 거절에는 반박 한 줄을 붙여 **한 번만** 되묻는다.
 *   예산(4분)을 넘기면 마지막으로 그린 결과를 안내와 함께 돌려준다.
 */
const ENGINE_REJECTED = "도형을 그리지 못했습니다:";
const BUDGET_MS = 240_000;

export interface RedrawInput {
  originalImage: string;
  svg?: string;
  instructions: string;
  signal?: AbortSignal;
  onStage?: (stage: string) => void;
}

interface SpecReply {
  spec: DevAiFigureSpec | null;
  note: string;
  warnings: string[];
}

interface ReviewReply {
  passed: boolean;
  issues: string[];
}

export class RedrawError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedrawError";
  }
}

function reason(text: string) {
  const tail = " 원본은 유지됩니다.";
  const clean = text.replace(/\s+/g, " ").trim();
  const room = 240 - tail.length;
  return new RedrawError((clean.length > room ? `${clean.slice(0, room - 1)}…` : clean) + tail);
}

export async function redrawFigure(input: RedrawInput): Promise<{ svg: string; warnings: string[] }> {
  const { originalImage, signal, onStage } = input;
  if (!originalImage) throw new RedrawError("다시 그릴 원본 그림이 필요합니다.");
  // math-figure-editor: 원본에 모눈이 있으면 픽셀로 잰 칸 수·위치를 지시에 싣는다(모델은 칸을 잘 못 센다).
  // 사용자가 적은 수정 요청이 먼저, 측정값은 그 뒤. 명세·대조 둘 다 같은 지시를 본다.
  const measured = await measureGrid(originalImage);
  // 명세 모델에는 둘레에 격자 좌표 숫자를 적은 원본을 보낸다(칸을 세지 않고 숫자로 끝점을 읽게). 대조는 원본 그대로.
  const specImage = (measured && (await annotateGrid(originalImage, measured))) || originalImage;
  const annotated = specImage !== originalImage;
  const join = (...parts: string[]) => parts.filter(Boolean).join(" ");
  const instructions = join(input.instructions.trim(), measured ? gridHint(measured, annotated) : "");
  // 대조는 두 판 모두 좌표 숫자가 적힌 비교 그림을 본다 — 칸 수 대신 끝점 좌표를 맞대게
  const reviewInstructions = join(
    input.instructions.trim(),
    measured ? (annotated ? gridReviewHint(measured) : gridHint(measured)) : "",
  );
  const started = Date.now();
  const overBudget = () => Date.now() - started > BUDGET_MS;
  let repair: { spec: DevAiFigureSpec; error: string } | undefined;
  let refusal: string | undefined;
  let rebutted = false;
  let last: { svg: string; warnings: string[] } | undefined;
  const timedOut = () => {
    if (!last) throw new RedrawError("다시 그리기가 오래 걸려 멈췄습니다. 원본은 유지됩니다.");
    return { svg: last.svg, warnings: [...last.warnings, "다시 그리기가 오래 걸려 마지막으로 그린 결과를 씁니다."] };
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    if (overBudget()) return timedOut();
    onStage?.(attempt === 0 ? "AI 가 원본 그림을 읽는 중" : `AI 가 고쳐 그리는 중 (${attempt + 1}/3)`);
    const generated = await postAi<SpecReply>(
      {
        action: "spec",
        imageDataUrl: specImage,
        ...(input.svg ? { svg: input.svg.slice(0, 500_000) } : {}),
        instructions,
        ...(repair ? { repair } : {}),
        ...(refusal ? { refusal } : {}),
      },
      signal,
    );
    refusal = undefined; // 반박은 바로 다음 한 번에만
    if (!generated.spec) {
      if (!rebutted && attempt < 2 && isEngineCapabilityRefusal(generated.note)) {
        rebutted = true;
        refusal = generated.note;
        continue;
      }
      throw reason(generated.note || "도형 엔진으로 재현할 수 없습니다.");
    }

    // 모눈 그림이면 끝점을 격자점에 맞춘다(칸의 0.3 이내만) — 벡터 기울기를 원본대로.
    let spec = snapGraphSpecToGrid(generated.spec).spec;
    // 라벨 치수(MathJax 로 잰 폭·높이)를 실어 엔진이 그 크기로 자리를 잡게 한다(todays-math 와 같다).
    const render = (value: DevAiFigureSpec) => renderSpec(withLabelMetrics(value), signal);
    onStage?.("도형 엔진으로 그리는 중");
    let rendered = await render(spec);
    const repaired: string[] = [];
    for (let step = 0, dropped = 0; !rendered.ok && rendered.error.startsWith(ENGINE_REJECTED) && step < 8; step++) {
      const fix = repairFigureSpec(spec, rendered.error, attempt === 2 && dropped < MAX_DROPPED);
      if (!fix) break;
      if (fix.dropped) dropped++;
      if (fix.warning) repaired.push(fix.warning);
      console.info(`[다시 그리기] 엔진 거절을 명세 교정으로 풀었습니다: ${fix.note}`);
      spec = fix.spec;
      rendered = await render(spec);
    }
    if (!rendered.ok) {
      if (attempt < 2 && rendered.error.startsWith(ENGINE_REJECTED)) {
        repair = { spec, error: rendered.error };
        continue;
      }
      throw new RedrawError(
        rendered.error.startsWith(ENGINE_REJECTED)
          ? engineRejectionReason(rendered.error)
          : `${rendered.error} 원본은 유지됩니다.`,
      );
    }
    if (rendered.svg.length > 500_000 || !validDevAiSvg(rendered.svg))
      throw new RedrawError("도형 엔진의 SVG 안전 검사를 통과하지 못했습니다. 원본은 유지됩니다.");

    const warnings = [...generated.warnings, ...(generated.note ? [generated.note] : []), ...repaired];
    const drawn = { svg: rendered.svg, warnings };
    last = drawn;
    // 마지막 바퀴는 대조하지 않는다 — 어긋나도 더 고칠 바퀴가 없고, todays-math 와 같이 «원본 대조» 지적은
    // 경고로도 싣지 않으므로 그 판정은 버려졌다(math-figure-editor 2026-10-21 실측: 매번 약 4초).
    if (attempt === 2) return drawn;
    if (overBudget()) return timedOut();

    onStage?.("원본과 대조하는 중");
    const comparison = await buildComparisonImage(originalImage, rendered.svg, annotated ? specImage : undefined);
    const review = await postAi<ReviewReply>(
      { action: "review", imageDataUrl: comparison, spec, svg: rendered.svg, instructions: reviewInstructions },
      signal,
    );
    if (review.passed) return drawn;
    repair = {
      spec,
      error: `원본 대조: ${review.issues.join(" / ") || "도형의 원본 일치 여부를 확인할 수 없습니다."}`,
    };
  }
  throw new RedrawError("도형 재작도에 실패했습니다. 원본은 유지됩니다.");
}
