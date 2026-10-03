/**
 * 발행이 바깥에 기대는 것 — 조판기 · 검증기 · 개념 굳히기. 전부 **서버 안의 코드**다.
 *
 * 🔴 여기로 들어오는 것 가운데 브라우저가 보낸 것은 없다. 조판기가 받는 것은 서버가 DB 정본에서 조립한 교환 형식과
 *    서버가 판본의 색인으로 읽어 준 자산 바이트뿐이고, 돌려주는 PDF · 쪽 계획 · 읽힌 QR 도 서버가 만든 값이다.
 *    발행 확정은 `requestId` 하나만 받는다 — 쪽 · 해시 · «통과» 표지를 본문으로 받지 않는다.
 *
 * 발행 코드(`reserve` · `step` · `finalize`)는 이 인터페이스에만 기댄다. 실제 조판기(`render/server.ts`)는
 * `codexRenderer.ts` 가 이 모양으로 감싼다 — 시험은 결정적인 대역 조판기를 넣어 문장의 차례 · 임대 · 검증을 잰다.
 */
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type {
  PagePlacement,
  TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";

export type PublishVariant = "student" | "answers";

/** 판본의 색인에 있는 자산만 읽어 준다 — 없는 id 면 던진다 */
export type ReadEditionAsset = (assetId: string) => Promise<Uint8Array>;

/** 만든 PDF 를 **다시 읽어** 확인한 QR 하나. `decodedUrl` 은 픽셀에서 읽힌 주소(못 읽었으면 null) */
export interface QrReadback {
  qrTargetId: string;
  url: string;
  decodedUrl: string | null;
  physicalPageIndex: number;
}

export interface RenderedChunk {
  pdf: Uint8Array;
  pageCount: number;
  pageMap: PagePlacement[];
  /** 넘침 · 수식 오류 · 빠진 그림 · 시작 면 위반 */
  issues: TextbookIssue[];
  qrChecks: QrReadback[];
  nextPhysicalPageIndex: number;
  /** 합칠 때 조판기가 다시 받는 값(QR 자리 등) — 서버가 걸음에 보관했다가 그대로 돌려준다 */
  carry: unknown;
}

export interface MergedPdf {
  pdf: Uint8Array;
  pageCount: number;
  /** 합친 파일에서 다시 읽은 QR 전부 */
  qrChecks: QrReadback[];
}

export interface TextbookRenderer {
  rendererVersion: string;
  templateVersion: string;
  renderChunk(input: {
    exchange: TextbookExchange;
    readAsset: ReadEditionAsset;
    officialOrigin: string;
    /** 목차 순으로 편 구획의 자리(0부터) — 이어진 묶음 */
    sectionIndices: number[];
    firstPhysicalPageIndex: number;
    variant: PublishVariant;
  }): Promise<RenderedChunk>;
  mergeChunks(
    chunks: Array<{ pdf: Uint8Array; pageCount: number; carry: unknown }>,
    maxBytes: number,
  ): Promise<MergedPdf>;
}

/**
 * 교환 형식 전체의 참조 · 해시 · 자산 바이트 검증(Codex 의 `validateTextbookIntegrity`).
 * `preflight` 는 QR 예약 전이라 QR 을 요구하지 않고, `publish` 는 요구한다.
 */
export type PublishValidator = (
  exchange: TextbookExchange,
  options: {
    stage: "preflight" | "publish";
    officialOrigin: string;
    readAsset?: ReadEditionAsset;
    requirePageMap: boolean;
  },
) => Promise<TextbookIssue[]>;

/**
 * 개념 굳히기(루트의 `freezeTextbookConcept`) — 확인한 은행 항목의 **내용**을 개념에 싣는다.
 * 확인 안 된 후보가 남았거나 확인한 항목이 그사이 바뀌었으면 사유를 던진다.
 */
export type ConceptFreezer = (
  concept: TextbookConcept,
  blankForms: readonly string[] | null,
) => TextbookConcept;

export interface PublishDeps {
  renderer: TextbookRenderer;
  validate: PublishValidator;
  freezeConcept: ConceptFreezer;
  /** 지면에 찍히는 정식 주소의 출처(`https://…`, 경로 없음). 없으면 발행하지 못한다 */
  officialOrigin: string | null;
  now: () => Date;
}

/** 정식 주소의 출처로 쓸 수 있는가 — https · 자격증명 · 경로 · 질의 없음 · 개발 주소 아님 */
export function officialOriginIssue(origin: string | null): string | null {
  if (!origin) return "QR 에 찍을 정식 주소가 설정되지 않았습니다.";
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return "QR 에 찍을 정식 주소가 올바르지 않습니다.";
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.origin !== origin.replace(/\/$/, "")
  )
    return "QR 에 찍을 정식 주소가 올바르지 않습니다.";
  if (
    /^(?:localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname) ||
    /\.(?:local|test|invalid|example)$/.test(url.hostname) ||
    /\.vercel\.app$/.test(url.hostname)
  )
    return "개발 · 임시 주소로는 발행하지 않습니다.";
  return null;
}
