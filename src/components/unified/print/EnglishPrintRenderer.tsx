"use client";

import { createContext, useContext, type ComponentType } from "react";
import type { StudioProblem } from "../types";

type EnglishContent = NonNullable<StudioProblem["english"]>;

/** English question/answer renderers, supplied by the English output screen.
 * The shared print shell must not import English modules (englishFence): math
 * grading, retry and QA fixtures reach this shell, and must not reach English.
 */
export type EnglishPrintRenderer = {
  Question: ComponentType<{ content: EnglishContent }>;
  Answer: ComponentType<{ content: EnglishContent; quick?: boolean }>;
};

const EnglishPrintRendererContext = createContext<EnglishPrintRenderer | null>(
  null,
);

export const EnglishPrintRendererProvider =
  EnglishPrintRendererContext.Provider;

export function useEnglishPrintRenderer(): EnglishPrintRenderer {
  const renderer = useContext(EnglishPrintRendererContext);
  // An English problem can only come from the English output screen, which
  // always provides the renderer; failing loudly beats printing a blank item.
  if (!renderer) throw new Error("영어 문항 인쇄 렌더러가 연결되지 않았습니다");
  return renderer;
}
