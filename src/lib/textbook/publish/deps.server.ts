import "server-only";

import { createTextbookArchive } from "../archive/package.server";
import type { JsonValue } from "../canonical";
import { freezeTextbookConcept } from "../concepts";
import { validateTextbookIntegrity } from "../integrity.server";
import { codexRenderer } from "./codexRenderer";
import type {
  PackageArchive,
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

/** 사전 검사 때는 아직 만들 수 없는 것 — QR 은 예약이 만든다 */
const NOT_YET_AT_PREFLIGHT = new Set(["MISSING_QR"]);

/**
 * 교환 형식 전체의 참조 · 해시 · 자산 바이트 검증 — Codex 의 검증기를 그대로 쓴다.
 *
 * 🔴 사전 검사도 **발행 기준**으로 본다. 조판기는 걸음마다 발행 기준으로 원고를 다시 검증하므로(그림과 보기의 짝 ·
 *    빈 구획 · 연결 안 된 문항 · 필수 영상), 사전 검사가 초안 기준이면 «통과»라던 원고가 조판 걸음에서야 세 번 실패하고
 *    작업이 그만둔다. 사전 검사 때 아직 있을 수 없는 것(예약 전의 QR)만 뺀다 — 그 밖의 막는 사유는 여기서 다 알린다.
 */
export const validateForPublish: PublishValidator = async (
  exchange,
  options,
) => {
  const issues = await validateTextbookIntegrity(exchange, {
    mode: "publish",
    officialOrigin: options.officialOrigin,
    requirePageMap: options.requirePageMap,
    // manifest 는 확정이 지금의 줄들에서 새로 계산한다 — 여기서는 견줄 값이 아직 없다
    verifyManifest: false,
    readAsset: options.readAsset,
  });
  return options.stage === "publish"
    ? issues
    : issues.filter(
        (entry) =>
          !NOT_YET_AT_PREFLIGHT.has(entry.code) &&
          // 자산 바이트는 조판 걸음과 확정이 읽어 확인한다 — 사전 검사는 읽기만 하는 가벼운 길이다
          entry.code !== "ASSET_READER_REQUIRED",
      );
};

/** 교환 패키지 — Codex 의 꾸리는 함수를 그대로 쓴다(자산 바이트 · 해시를 꾸리기 전에 다시 본다) */
export const packageArchive: PackageArchive = async (
  exchange,
  readAsset,
  validation,
) => {
  const bytes = await createTextbookArchive(
    exchange,
    readAsset,
    validation as JsonValue,
  );
  if (!bytes) throw new Error("교환 패키지를 만들지 못했습니다.");
  return bytes;
};

/**
 * 제품의 발행 의존물 — 조판기는 실제 조판기(`codexRenderer` → `render/server.ts`)다.
 * 조판기는 서버의 Chromium 을 띄운다. 띄우지 못하는 환경에서는 걸음이 실패 사유를 남기고(세 번까지) 작업이 그만둔다 —
 * 조판하지 않은 것을 조판한 것처럼 적지 않는다.
 */
export function publishDeps(
  renderer: TextbookRenderer = codexRenderer,
): PublishDeps {
  return {
    renderer,
    validate: validateForPublish,
    freezeConcept: (concept) => freezeTextbookConcept(concept),
    packageArchive,
    officialOrigin: textbookPublicOrigin(),
    now: () => new Date(),
  };
}
