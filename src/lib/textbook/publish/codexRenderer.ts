import "server-only";

import type { TextbookPage } from "../layout/paginate";
import type { QrPixelCheck, QrPlacement } from "../render/qrVerify.server";
import {
  createTextbookSpreadPdf,
  mergeTextbookPdfs,
  planTextbookChunks,
  renderTextbookChunk,
  renderTextbookOfflineHtml,
} from "../render/server";
import {
  TEXTBOOK_RENDERER_VERSION,
  TEXTBOOK_TEMPLATE_VERSION,
} from "../render/versions";
import type { QrReadback, TextbookRenderer } from "./rendererAdapter";

/**
 * 실제 조판기(`render/server.ts`)를 발행 코드가 기대는 모양(`TextbookRenderer`)으로 감싼다.
 *
 * 조판기가 다음 걸음에 다시 받아야 하는 것(쪽의 블록 자리 · QR 자리 · 조각 해시)은 `carry` 에 실어 걸음 줄에 보관한다.
 * 그 값은 **서버가 만들어 서버가 보관한 것**이다 — 요청 본문에서 오지 않는다.
 * 합칠 때 조판기는 보관한 조각 바이트의 해시를 `carry.artifactHash` 와 다시 견준다(바뀐 바이트를 합치지 않는다).
 */
interface ChunkCarry {
  pages: TextbookPage[];
  qrPlacements: QrPlacement[];
  artifactHash: string;
}
interface MergedCarry {
  qrPlacements: QrPlacement[];
  artifactHash: string;
}

/** 조각 하나의 원고 블록 수 — 조판기의 한도(600)보다 넉넉히 작게 */
const CHUNK_MAX_BLOCKS = 300;

const readback = (check: QrPixelCheck): QrReadback => ({
  qrTargetId: check.qrTargetId,
  url: check.url,
  decodedUrl: check.decodedUrl,
  physicalPageIndex: check.physicalPageIndex,
});

function chunkCarry(value: unknown): ChunkCarry {
  const carry = value as Partial<ChunkCarry> | null;
  if (
    !carry ||
    !Array.isArray(carry.pages) ||
    !Array.isArray(carry.qrPlacements) ||
    typeof carry.artifactHash !== "string"
  )
    throw new Error("보관한 조판 결과를 읽을 수 없습니다.");
  return carry as ChunkCarry;
}

export const codexRenderer: TextbookRenderer = {
  rendererVersion: TEXTBOOK_RENDERER_VERSION,
  templateVersion: TEXTBOOK_TEMPLATE_VERSION,

  // 구획을 많이 묶을수록 걸음이 준다. 블록이 넘치면 덜 묶는다 — 한 구획씩으로도 넘치면 원고를 나눠야 한다
  planChunks(exchange) {
    const blocks = exchange.units.flatMap((unit) =>
      unit.sections.map((section) => section.blocks.length),
    );
    for (let size = 4; size >= 1; size -= 1) {
      const plan = planTextbookChunks(exchange, size);
      if (
        plan.every(
          (chunk) =>
            chunk.reduce((sum, index) => sum + blocks[index]!, 0) <=
            CHUNK_MAX_BLOCKS,
        )
      )
        return plan;
    }
    throw new Error("조판 묶음 하나의 블록이 너무 많습니다.");
  },

  async renderChunk(input) {
    if (input.variant === "answers" && input.studentCarry === undefined)
      throw new Error("해설판에는 검증한 학생용 쪽 참조가 필요합니다.");
    const result = await renderTextbookChunk({
      exchange: input.exchange,
      readAsset: input.readAsset,
      officialOrigin: input.officialOrigin,
      sectionIndices: input.sectionIndices,
      firstPhysicalPageIndex: input.firstPhysicalPageIndex,
      variant: input.variant,
      mode: "publish",
      ...(input.referenceCarries
        ? {
            referencePages: input.referenceCarries.flatMap(
              (carry) => chunkCarry(carry).pages,
            ),
          }
        : {}),
      ...(input.reservedCarry
        ? { reservedPages: chunkCarry(input.reservedCarry).pages }
        : {}),
      // 학생용 묶음은 원문 쪽 참조만 제공한다. 해설은 실제 분량으로 따로 조판한다.
      ...(input.studentCarry === undefined
        ? {}
        : { studentPages: chunkCarry(input.studentCarry).pages }),
    });
    const carry: ChunkCarry = {
      pages: result.pages,
      qrPlacements: result.qrPlacements,
      artifactHash: result.artifactHash,
    };
    return {
      pdf: result.pdf,
      pageCount: result.pages.length,
      pageMap: result.pageMap,
      issues: result.issues,
      qrChecks: result.qrChecks.map(readback),
      nextPhysicalPageIndex: result.nextPhysicalPageIndex,
      carry,
    };
  },

  async mergeChunks(chunks, maxBytes) {
    const merged = await mergeTextbookPdfs(
      chunks.map((chunk) => {
        const carry = chunkCarry(chunk.carry);
        return {
          pdf: chunk.pdf,
          pages: carry.pages,
          qrPlacements: carry.qrPlacements,
          artifactHash: carry.artifactHash,
        };
      }),
      maxBytes,
    );
    const carry: MergedCarry = {
      qrPlacements: merged.qrPlacements,
      artifactHash: merged.artifactHash,
    };
    return {
      pdf: merged.pdf,
      pageCount: merged.pageCount,
      qrChecks: merged.qrChecks.map(readback),
      carry,
    };
  },

  async spread(merged, firstPhysicalPageIndex) {
    const carry = merged.carry as MergedCarry;
    const spread = await createTextbookSpreadPdf(
      {
        pdf: merged.pdf,
        artifactHash: carry.artifactHash,
        pageCount: merged.pageCount,
        qrChecks: [],
        qrPlacements: carry.qrPlacements,
      },
      firstPhysicalPageIndex,
    );
    return {
      pdf: spread.pdf,
      pageCount: spread.pageCount,
      qrChecks: spread.qrChecks.map(readback),
      carry: {
        qrPlacements: spread.qrPlacements,
        artifactHash: spread.artifactHash,
      },
    };
  },

  async offlineHtml(input) {
    const html = await renderTextbookOfflineHtml({
      exchange: input.exchange,
      pages: input.chunkCarries.flatMap((carry) => chunkCarry(carry).pages),
      readAsset: input.readAsset,
      officialOrigin: input.officialOrigin,
      // 학생용 지면이다 — 정답 · 해설 · 교사용 원문을 싣지 않는다
      variant: "student",
      includeTeacherArchiveData: false,
    });
    return new TextEncoder().encode(html);
  },
};
