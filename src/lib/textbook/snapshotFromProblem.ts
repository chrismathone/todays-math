/**
 * 은행 문항 한 줄 → 문항 확정본. **유일한 어댑터**다.
 *
 * 🔴 손실 없이 담는다. `serializeProblem` · `toPrintProblem` 을 입력으로 쓰지 않는다 — 앞의 것은 그림 치수 · 물리 폭 ·
 *    보기 짝을 버리고, 뒤의 것은 화면용으로 글을 바꾼다(초등 가분수 → 대분수). 확정본은 DB 원문이다.
 * 🔴 원본 행의 그림 배열 넷은 **글자 그대로** `rawSource` 에 남긴다. 길이가 안 맞는 배열도 고치거나 자르지 않는다.
 *    지면이 쓰는 해석(`payload.figures`)은 따로 만든다 — 짝을 모르면 `null` 이다. 아무 그림이나 ①에 붙이지 않는다.
 * 🔴 담을 수 없으면 **담지 않고 사유를 낸다.** 그림 하나를 못 읽었다고 그림 없는 확정본을 만들지 않는다.
 *
 * 그림 바이트를 어디서 읽는지는 이 파일이 모른다(`loadFigure` 가 준다). 해시는 `hash.server.ts` 가 계산한다.
 */
import {
  type ProblemPayload,
  type ProblemSourceRef,
  textbookProblemPayloadSchema,
  textbookRawSourceSchema,
  textbookSourceMetadataSchema,
  textbookSourceRefSchema,
} from "@/contracts/textbookExchange.contract";
import { readImageDimensions } from "@/lib/printImageDimensions";
import { checkChoiceFigureIndex } from "@/lib/problem/choiceFigureIndex";

import { contentHash, sha256, snapshotHash } from "./hash.server";

/** 은행 문항 행 — 확정본에 들어가는 칸 전부(와 단원 이름) */
export interface ProblemSourceRow {
  id: string;
  problemCode: string;
  unitId: string;
  familyKey: string | null;
  difficulty: string;
  problemType: string;
  questionType: string | null;
  content: string;
  answer: string;
  solution: string | null;
  figureSvg: string | null;
  figureUrls: string[];
  figureDims: number[];
  figureSourceMm: number[];
  choiceFigureIndex: number[];
  score: number | null;
  /** ISO 글자(UTC) */
  updatedAt: string;
  unitGrade: string;
  unitChapter: string;
  unitSection: string;
}

export type FrozenMimeType =
  "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

/** 얼린 그림 한 장 — `assetId` 는 내용 해시다 */
export interface FrozenAsset {
  assetId: string;
  mimeType: FrozenMimeType;
  name: string;
  widthPx: number | null;
  heightPx: number | null;
  bytes: Uint8Array;
}

export interface CapturedSnapshot {
  source: Extract<ProblemSourceRef, { system: "todays-math" }>;
  sourceUpdatedAt: string;
  unitId: string;
  familyKey: string | null;
  difficulty: string;
  problemType: string;
  payload: ProblemPayload;
  rawSource: {
    figureUrls: string[];
    figureDims: number[];
    figureSourceMm: number[];
    choiceFigureIndex: number[];
    figureSvgAssetId: string | null;
  };
  sourceMetadata: {
    unitId: string;
    grade: string;
    chapter: string;
    section: string;
    difficulty: string;
    originalScore: number | null;
  };
  contentHash: string;
  snapshotHash: string;
  assets: FrozenAsset[];
}

export type CaptureOutcome =
  { ok: true; snapshot: CapturedSnapshot } | { ok: false; reason: string };

/** 그림 주소 → 바이트. 못 읽으면 null */
export type FigureLoader = (path: string) => Promise<Uint8Array | null>;

const FIGURE_PATH = /^\/(?:figures|figures-svg)\/[^?#\\]+$/;

/**
 * 인라인 SVG 에 실행되거나 바깥을 부르는 것이 있는가. 있으면 **고치지 않고 거절한다** —
 * 지운 뒤의 그림이 원래 그림과 같다고 보장할 수 없고, 확정본은 원문이어야 한다.
 */
export function unsafeSvgReason(svg: string): string | null {
  if (!/<svg[\s>]/i.test(svg)) return "SVG 가 아닙니다.";
  if (/<\s*script[\s>]/i.test(svg)) return "스크립트가 들어 있습니다.";
  if (/<\s*foreignObject[\s>]/i.test(svg))
    return "foreignObject 가 들어 있습니다.";
  if (/\son[a-z]+\s*=/i.test(svg)) return "이벤트 속성이 들어 있습니다.";
  if (/javascript\s*:/i.test(svg)) return "javascript: 주소가 들어 있습니다.";
  if (/<\s*(?:iframe|embed|object|link|meta|style\s[^>]*@import)/i.test(svg))
    return "허용되지 않는 요소가 들어 있습니다.";
  if (/@import/i.test(svg)) return "바깥 스타일을 부릅니다.";
  // 안쪽 조각(#id)과 data: 그림만 허용한다
  for (const match of svg.matchAll(
    /\b(?:xlink:href|href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
  )) {
    const target = (match[1] ?? match[2] ?? "").trim();
    if (
      !target.startsWith("#") &&
      !/^data:image\/(?:png|jpeg|webp);base64,/i.test(target)
    )
      return "바깥 자원을 부릅니다.";
  }
  if (/url\(\s*["']?(?!#)/i.test(svg)) return "바깥 자원을 부릅니다.";
  return null;
}

function sniffMime(bytes: Uint8Array): FrozenMimeType | null {
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length > 12 &&
    Buffer.from(bytes.subarray(0, 4)).toString("latin1") === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString("latin1") === "WEBP"
  )
    return "image/webp";
  return null;
}

/** 바이트 → 얼린 자산. 형식은 주소의 확장자가 아니라 **바이트**가 정한다 */
export function freezeFigureBytes(
  bytes: Uint8Array,
  name: string,
  isSvg: boolean,
): { asset: FrozenAsset } | { reason: string } {
  if (bytes.byteLength === 0) return { reason: "빈 그림입니다." };
  if (isSvg) {
    const text = Buffer.from(bytes).toString("utf8");
    const unsafe = unsafeSvgReason(text);
    if (unsafe) return { reason: `그림(SVG)을 담을 수 없습니다 — ${unsafe}` };
    return {
      asset: {
        assetId: sha256(bytes),
        mimeType: "image/svg+xml",
        name,
        widthPx: null,
        heightPx: null,
        bytes,
      },
    };
  }
  const mimeType = sniffMime(bytes);
  if (!mimeType) return { reason: "지원하지 않는 그림 형식입니다." };
  const dims =
    mimeType === "image/webp" ? null : readImageDimensions(Buffer.from(bytes));
  return {
    asset: {
      assetId: sha256(bytes),
      mimeType,
      name,
      widthPx: dims?.width ?? null,
      heightPx: dims?.height ?? null,
      bytes,
    },
  };
}

export async function captureProblemSnapshot(
  row: ProblemSourceRow,
  loadFigure: FigureLoader,
): Promise<CaptureOutcome> {
  const assets = new Map<string, FrozenAsset>();
  const figures: ProblemPayload["figures"] = [];

  // ① 엔진이 그린 인라인 SVG — 있으면 그림의 첫 자리다
  let figureSvgAssetId: string | null = null;
  if (row.figureSvg !== null && row.figureSvg !== "") {
    const frozen = freezeFigureBytes(
      Buffer.from(row.figureSvg, "utf8"),
      `${row.problemCode}.svg`,
      true,
    );
    if ("reason" in frozen) return { ok: false, reason: frozen.reason };
    assets.set(frozen.asset.assetId, frozen.asset);
    figureSvgAssetId = frozen.asset.assetId;
    figures.push({
      assetId: frozen.asset.assetId,
      sha256: frozen.asset.assetId,
      // 인라인 SVG 는 늘 **발문의 그림**이다 — 보기 그림은 스캔 그림 배열과 그 짝 배열로만 온다. 짝을 모르는 그림이 아니다
      choiceIndex: 0,
      sourceWidthMm: null,
      altText: null,
    });
  }

  // ② 스캔 그림 — 원본 배열의 차례 그대로. 짝 · 물리 폭은 배열이 규약을 지킬 때만 읽는다(반쪽은 안 받는다)
  const choiceKnown = checkChoiceFigureIndex(
    row.figureUrls.length,
    row.choiceFigureIndex,
  ).ok;
  const widthKnown = row.figureSourceMm.length === row.figureUrls.length;
  for (const [index, url] of row.figureUrls.entries()) {
    if (!FIGURE_PATH.test(url) || url.split("/").some((part) => part === ".."))
      return { ok: false, reason: `그림 주소를 읽을 수 없습니다: ${url}` };
    const bytes = await loadFigure(url);
    if (!bytes)
      return { ok: false, reason: `그림 파일을 읽지 못했습니다: ${url}` };
    const frozen = freezeFigureBytes(
      bytes,
      url.split("/").at(-1)!,
      url.startsWith("/figures-svg/") || url.toLowerCase().endsWith(".svg"),
    );
    if ("reason" in frozen)
      return { ok: false, reason: `${frozen.reason} (${url})` };
    assets.set(frozen.asset.assetId, frozen.asset);
    const width = widthKnown ? row.figureSourceMm[index]! : null;
    figures.push({
      assetId: frozen.asset.assetId,
      sha256: frozen.asset.assetId,
      choiceIndex: choiceKnown ? row.choiceFigureIndex[index]! : null,
      sourceWidthMm:
        width !== null && Number.isFinite(width) && width > 0 && width <= 1000
          ? width
          : null,
      altText: null,
    });
  }

  const source = textbookSourceRefSchema.safeParse({
    system: "todays-math",
    problemId: row.id,
    problemCode: row.problemCode,
  });
  const payload = textbookProblemPayloadSchema.safeParse({
    format: "markdown-latex",
    content: row.content,
    answer: row.answer,
    solution: row.solution,
    questionType: row.questionType,
    figures,
  });
  const rawSource = textbookRawSourceSchema.safeParse({
    figureUrls: row.figureUrls,
    figureDims: row.figureDims,
    figureSourceMm: row.figureSourceMm,
    choiceFigureIndex: row.choiceFigureIndex,
    figureSvgAssetId,
  });
  const sourceMetadata = textbookSourceMetadataSchema.safeParse({
    unitId: row.unitId,
    grade: row.unitGrade,
    chapter: row.unitChapter,
    section: row.unitSection,
    difficulty: row.difficulty,
    originalScore: row.score,
  });
  if (
    !source.success ||
    source.data.system !== "todays-math" ||
    !payload.success ||
    !rawSource.success ||
    !sourceMetadata.success
  )
    return { ok: false, reason: "확정본 형식에 담을 수 없는 값이 있습니다." };

  const base = {
    source: source.data,
    sourceUpdatedAt: row.updatedAt,
    unitId: row.unitId,
    familyKey: row.familyKey,
    difficulty: row.difficulty,
    problemType: row.problemType,
    payload: payload.data,
    rawSource: rawSource.data,
    sourceMetadata: sourceMetadata.data as CapturedSnapshot["sourceMetadata"],
  };
  try {
    // 정규 JSON 이 받지 않는 값(U+0000 · 짝 없는 서러게이트 · NaN · -0)이 원문에 있으면 여기서 던진다
    const hashedContent = contentHash(base.payload);
    const hashedSnapshot = snapshotHash({
      ...base,
      snapshotId: row.id,
      capturedAt: row.updatedAt,
      contentHash: hashedContent,
    });
    return {
      ok: true,
      snapshot: {
        ...base,
        contentHash: hashedContent,
        snapshotHash: hashedSnapshot,
        assets: [...assets.values()],
      },
    };
  } catch {
    return {
      ok: false,
      reason: "원문에 확정본으로 고정할 수 없는 글자나 수가 있습니다.",
    };
  }
}
