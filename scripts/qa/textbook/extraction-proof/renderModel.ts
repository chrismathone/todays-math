/**
 * Renders a whole exchange the way preview/PDF do — measurement HTML, then every placed page —
 * with fixed block heights so the page plan is a pure function of the manuscript.
 */
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import {
  blockWidthMm,
  paginateTextbookSections,
} from "@/lib/textbook/layout/paginate";
import {
  measurementHtml,
  renderPageHtml,
  type RenderResources,
} from "@/lib/textbook/render/html";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";

import { errorShape, type ProofArtifacts } from "./harness";

/** Resources that log every callback in call order: evaluation order is part of the contract. */
export function recordingResources(editorial = true): {
  calls: string[];
  resources: RenderResources;
} {
  const calls: string[] = [];
  return {
    calls,
    resources: {
      assetUrl: (id) => {
        calls.push(`asset ${id}`);
        return `/api/textbook/assets/${id}`;
      },
      qrDataUrl: (id, url) => {
        calls.push(`qr ${id} ${url}`);
        return `data:image/png;base64,${Buffer.from(`${id}|${url}`).toString("base64")}`;
      },
      ...(editorial
        ? {
            editorialAssetUrl: (name: string) => {
              calls.push(`editorial ${name}`);
              return `https://textbook.invalid/editorial/${name}`;
            },
          }
        : {}),
    },
  };
}

export function addModelArtifacts(
  artifacts: ProofArtifacts,
  prefix: string,
  exchange: TextbookExchange,
): void {
  for (const variant of ["student", "answers"] as const) {
    const { calls, resources } = recordingResources();
    try {
      const model = createTextbookRenderModel(exchange, variant);
      // The model is the renderer's input: a difference here is upstream of html.ts.
      artifacts.addJson(`${prefix}/${variant}.model.json`, model.sections);
      artifacts.add(
        `${prefix}/${variant}.measure.html`,
        measurementHtml(model, resources),
      );
      const measurements = model.sections.flatMap((section) =>
        section.blocks.map((block) => ({
          blockId: block.id,
          widthMm: blockWidthMm(model.config, block),
          heightMm: block.kind === "heading" ? 16 : 75,
        })),
      );
      const layout = paginateTextbookSections(
        model.sections,
        measurements,
        model.config,
        { includeCover: model.config.print.coverMode === "included" },
      );
      artifacts.addJson(`${prefix}/${variant}.layout.json`, {
        pages: layout.pages,
        issues: layout.issues,
      });
      artifacts.add(
        `${prefix}/${variant}.pages.html`,
        layout.pages
          .map((page) => renderPageHtml(page, model, resources))
          .join("\n"),
      );
      artifacts.addJson(`${prefix}/${variant}.resource-calls.json`, calls);
    } catch (error) {
      artifacts.addJson(`${prefix}/${variant}.error.json`, {
        error: errorShape(error),
        calls,
      });
    }
  }
}
