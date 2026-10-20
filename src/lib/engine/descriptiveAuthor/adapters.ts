import type {
  NativeFigureRequest,
  NativeHelperAdapters,
  NativeHelperResult,
  NativeFigureOutput,
} from "../../../contracts/descriptiveAuthor.contract";
import { generateMiddleProblem } from "../../middle/generate";
import {
  renderFigureSpec,
  type RenderFigureResult,
} from "../../figure/renderFigureSpec";

type FigureRenderer = (
  spec: Record<string, unknown>,
) => Promise<RenderFigureResult>;
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Deterministic helpers only. Strict rendering never drops a required dimension. */
export function createNativeHelperAdapters(
  render: FigureRenderer = (spec) => renderFigureSpec(spec, { strict: true }),
): NativeHelperAdapters {
  const draw = async (
    request: NativeFigureRequest,
  ): Promise<NativeHelperResult<NativeFigureOutput>> => {
    try {
      if (request.kind === "graph" && request.spec.version !== "graph-1")
        throw new Error("그래프 보조는 기존 graph-1 스펙을 받습니다");
      const spec = structuredClone(request.spec);
      const result = await render(structuredClone(spec));
      if (!result.ok) return result;
      if (result.droppedDimensions?.length || !result.svg.trim())
        throw new Error("그림의 필수 치수 또는 SVG가 없습니다");
      return {
        ok: true,
        output: { id: request.id, kind: request.kind, spec, svg: result.svg },
      };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  };
  return {
    async calculation(request) {
      try {
        const problem = generateMiddleProblem(
          request.typeKey,
          request.seed,
          request.variant,
        );
        return {
          ok: true,
          output: {
            id: request.id,
            kind: "calculation",
            engine: "middle",
            typeKey: request.typeKey,
            problem,
          },
        };
      } catch (error) {
        return { ok: false, error: message(error) };
      }
    },
    figure: draw,
    graph: draw,
  };
}
