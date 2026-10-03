import "server-only";

import { freezeTextbookConcept } from "../concepts";
import { validateTextbookIntegrity } from "../integrity.server";
import {
  TEXTBOOK_RENDERER_VERSION,
  TEXTBOOK_TEMPLATE_VERSION,
} from "../render/versions";
import { TextbookError } from "../server/errors";
import type {
  PublishDeps,
  PublishValidator,
  TextbookRenderer,
} from "./rendererAdapter";

/**
 * 지면에 찍히는 정식 주소의 출처 — 운영 환경변수 `TEXTBOOK_PUBLIC_ORIGIN`(예: `https://today.aywa.co.kr`).
 * 없거나 개발 주소면 발행 사전 검사가 막는다(`officialOriginIssue`). 요청의 Host 로 대신하지 않는다 —
 * 미리보기 배포에서 누른 발행이 미리보기 주소를 종이에 찍으면 안 된다.
 */
export function textbookPublicOrigin(): string | null {
  const value = process.env.TEXTBOOK_PUBLIC_ORIGIN?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

/** 교환 형식 전체의 참조 · 해시 · 자산 바이트 검증 — Codex 의 검증기를 그대로 쓴다 */
export const validateForPublish: PublishValidator = (exchange, options) =>
  validateTextbookIntegrity(exchange, {
    mode: options.stage === "publish" ? "publish" : "draft",
    officialOrigin: options.officialOrigin,
    requirePageMap: options.requirePageMap,
    // manifest 는 확정이 지금의 줄들에서 새로 계산한다 — 여기서는 견줄 값이 아직 없다
    verifyManifest: false,
    readAsset: options.readAsset,
  });

const NOT_CONNECTED =
  "조판기가 아직 연결되지 않았습니다. 발행을 시작할 수 없습니다.";

/**
 * 조판기 자리 — 실제 조판기(`render/server.ts` 의 `renderTextbookChunk` · `mergeTextbookPdfs`)가 병합되면
 * `codexRenderer.ts` 가 이 자리를 채운다. 그때까지는 **발행을 시작하지 못하게** 막는다 —
 * 조판하지 않은 것을 조판한 것처럼 적지 않는다.
 */
const pendingRenderer: TextbookRenderer = {
  rendererVersion: TEXTBOOK_RENDERER_VERSION,
  templateVersion: TEXTBOOK_TEMPLATE_VERSION,
  unavailableReason: NOT_CONNECTED,
  renderChunk: async () => {
    throw new TextbookError(503, "INTERNAL_ERROR", NOT_CONNECTED);
  },
  mergeChunks: async () => {
    throw new TextbookError(503, "INTERNAL_ERROR", NOT_CONNECTED);
  },
};

export function publishDeps(
  renderer: TextbookRenderer = pendingRenderer,
): PublishDeps {
  return {
    renderer,
    validate: validateForPublish,
    freezeConcept: (concept) => freezeTextbookConcept(concept),
    officialOrigin: textbookPublicOrigin(),
    now: () => new Date(),
  };
}
