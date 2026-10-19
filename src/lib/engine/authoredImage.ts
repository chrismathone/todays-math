/** Saved imagegen illustrations. Pixels are presentation, never a math oracle.
 * The server supplies the asset and review record; request JSON supplies IDs only.
 * No filesystem/network/skill calls and no problem approval or DB writer live here.
 */
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { z } from "zod";

const sha = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().trim().min(1).max(4000);
const fact = z.union([z.string().min(1).max(1000), z.number().finite()]);
export const AUTHORED_IMAGE_KIND = "authored-image-panel/v1";
export const IMAGE_REVIEW_CHECKS = [
  "stem",
  "choices",
  "figuresAndTables",
  "notation",
  "answer",
  "studentSolution",
  "prerequisites",
  "withinGradeMethod",
  "math",
  "classification",
  "rights",
  "similarity",
  "nativePresentation",
] as const;

export const authoredImageSpecSchema = z.strictObject({
  kind: z.literal(AUTHORED_IMAGE_KIND),
  assetId: text,
  assetSha256: sha,
  bindingSha256: sha,
  generationSha256: sha,
  promptSha256: sha,
});

export const imageMathBindingSchema = z.strictObject({
  templateId: text,
  templateVersion: text,
  studentContentSha256: sha,
  diagramSha256: sha,
  curriculum: z.strictObject({
    grade: z.literal("중3"),
    edition: z.enum(["2015", "2022"]),
    // This pilot's verified application schedule; later years need a policy update.
    examYear: z.number().int().min(2025).max(2027),
  }),
  unitId: z.string().uuid().nullable(),
  familyKey: text.nullable(),
  classificationSnapshotSha256: sha.nullable(),
  calculationAuthority: z.literal("explicit-math-facts-not-image-pixels"),
  facts: z.record(text, fact).refine((x) => Object.keys(x).length > 0),
  factRelations: z.array(text).min(1).max(100),
  constraints: z.array(text).min(1).max(100),
  pointRoles: z.record(text, text).refine((x) => Object.keys(x).length > 0),
  variant: z.strictObject({
    modes: z
      .array(
        z.enum(["structure", "context", "representation", "inverse-target"]),
      )
      .min(1),
    sharedConcept: text,
    sharedProcedure: text,
    changeEvidence: text,
  }),
});
export type ImageMathBinding = z.infer<typeof imageMathBindingSchema>;

const reviewCheck = z.strictObject({
  status: z.enum(["pass", "hold", "reject"]),
  evidenceSha256: sha.nullable(),
});
const reviewSchema = z.strictObject({
  assetSha256: sha,
  bindingSha256: sha,
  generationSha256: sha,
  promptSha256: sha,
  checks: z.record(z.enum(IMAGE_REVIEW_CHECKS), reviewCheck),
});
export type ImageAssetReview = z.infer<typeof reviewSchema>;

/** Trusted server resources; never deserialize this from an API request. */
export type SavedAuthoredImage = {
  assetId: string;
  png: Uint8Array;
  generation: {
    tool: "built-in image_gen.imagegen";
    paidApiCliFallback: false;
    generationSha256: string;
    promptSha256: string;
  };
  binding: ImageMathBinding;
  review: ImageAssetReview | null;
};

export function imageBytesSha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// Ordered object keys make parameter/diagram/candidate changes stale the review,
// independent of JSON indentation. Reject non-JSON values rather than omit them.
export function imageBindingSha256(value: ImageMathBinding): string {
  const canonical = (x: unknown): string => {
    if (Array.isArray(x)) return `[${x.map(canonical).join(",")}]`;
    if (x !== null && typeof x === "object")
      return `{${Object.keys(x)
        .sort()
        .map(
          (k) =>
            `${JSON.stringify(k)}:${canonical((x as Record<string, unknown>)[k])}`,
        )
        .join(",")}}`;
    if (x === undefined || (typeof x === "number" && !Number.isFinite(x)))
      throw new Error("Invalid image binding value");
    return JSON.stringify(x);
  };
  return imageBytesSha256(canonical(imageMathBindingSchema.parse(value)));
}

/** Check bytes, dimensions, chunk boundaries/CRCs and single-image PNG identity. */
function pngDimensions(bytes: Buffer): { width: number; height: number } {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    bytes.length < 57 ||
    bytes.length > 2 * 1024 * 1024 ||
    !bytes.subarray(0, 8).equals(signature)
  )
    throw new Error("저장 이미지는 2MB 이하의 PNG여야 합니다");
  const crc32 = (data: Buffer): number => {
    let crc = 0xffffffff;
    for (const b of data) {
      crc ^= b;
      for (let k = 0; k < 8; k += 1)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  let pos = 8;
  let width = 0,
    height = 0,
    dataChunks = 0;
  let channels = 0,
    paletteSeen = false,
    dataEnded = false;
  const compressed: Buffer[] = [];
  while (pos + 12 <= bytes.length) {
    const len = bytes.readUInt32BE(pos);
    const end = pos + 12 + len;
    if (end > bytes.length) throw new Error("잘린 PNG 청크입니다");
    const type = bytes.toString("latin1", pos + 4, pos + 8);
    if (
      !/^[A-Za-z]{4}$/.test(type) ||
      crc32(bytes.subarray(pos + 4, end - 4)) !== bytes.readUInt32BE(end - 4)
    )
      throw new Error("PNG 청크 검사가 실패했습니다");
    if (
      (pos === 8 && (type !== "IHDR" || len !== 13)) ||
      (type === "IHDR" && pos !== 8)
    )
      throw new Error("잘못된 PNG 헤더입니다");
    if (
      type === "acTL" ||
      (type[0] === type[0]!.toUpperCase() &&
        !["IHDR", "PLTE", "IDAT", "IEND"].includes(type))
    )
      throw new Error("단일 PNG 이미지만 허용합니다");
    if (type === "IHDR") {
      width = bytes.readUInt32BE(pos + 8);
      height = bytes.readUInt32BE(pos + 12);
      if (
        !width ||
        !height ||
        width > 4096 ||
        height > 4096 ||
        width * height > 4_194_304
      )
        throw new Error("PNG 표시 크기가 허용 범위를 넘습니다");
      // Bounded initial support: non-interlaced 8-bit grayscale/RGB/(gray)alpha.
      // Unsupported PNG encodings stay held, never silently become broken art.
      const colorType = bytes[pos + 17]!;
      channels =
        ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[colorType] ?? 0;
      if (
        bytes[pos + 16] !== 8 ||
        !channels ||
        bytes[pos + 18] !== 0 ||
        bytes[pos + 19] !== 0 ||
        bytes[pos + 20] !== 0
      )
        throw new Error("지원하지 않는 PNG 인코딩입니다");
    }
    if (type === "PLTE") {
      if (
        paletteSeen ||
        dataChunks > 0 ||
        channels === 1 ||
        channels === 2 ||
        len === 0 ||
        len > 768 ||
        len % 3 !== 0
      )
        throw new Error("잘못된 PNG 팔레트입니다");
      paletteSeen = true;
    }
    if (type === "IDAT") {
      if (dataEnded) throw new Error("PNG 데이터 청크의 순서가 잘못되었습니다");
      dataChunks += 1;
      compressed.push(bytes.subarray(pos + 8, end - 4));
    } else if (dataChunks > 0) dataEnded = true;
    if (type === "IEND") {
      if (len !== 0 || end !== bytes.length || dataChunks === 0)
        throw new Error("잘못된 PNG 끝입니다");
      const rowBytes = width * channels + 1;
      const expectedBytes = rowBytes * height;
      const pixels = inflateSync(Buffer.concat(compressed), {
        maxOutputLength: expectedBytes,
      });
      if (pixels.length !== expectedBytes)
        throw new Error("PNG 픽셀 데이터 길이가 잘못되었습니다");
      for (let row = 0; row < height; row += 1)
        if (pixels[row * rowBytes]! > 4)
          throw new Error("잘못된 PNG 행 필터입니다");
      return { width, height };
    }
    pos = end;
  }
  throw new Error("PNG 끝 청크가 없습니다");
}

export type AuthoredImageResult =
  | { ok: false; error: string }
  | {
      ok: true;
      svg: string;
      authoredImage: {
        assetId: string;
        assetSha256: string;
        bindingSha256: string;
        generationSha256: string;
        promptSha256: string;
        purpose: "preview" | "approved-display";
        heldChecks: string[];
        problemApproval: false;
      };
    };

export function renderSavedAuthoredImage(
  rawSpec: unknown,
  assets: ReadonlyMap<string, SavedAuthoredImage>,
  purpose: "preview" | "approved-display" = "approved-display",
): AuthoredImageResult {
  try {
    const spec = authoredImageSpecSchema.parse(rawSpec);
    const asset = assets.get(spec.assetId);
    if (!asset || asset.assetId !== spec.assetId)
      throw new Error("서버에 등록된 이미지 자산이 없습니다");
    const binding = imageMathBindingSchema.parse(asset.binding);
    const expectedEdition =
      binding.curriculum.examYear >= 2027 ? "2022" : "2015";
    if (binding.curriculum.edition !== expectedEdition)
      throw new Error("학년·시험 연도와 적용 교육과정이 일치하지 않습니다");
    if (
      asset.generation.tool !== "built-in image_gen.imagegen" ||
      asset.generation.paidApiCliFallback !== false ||
      !sha.safeParse(asset.generation.generationSha256).success ||
      !sha.safeParse(asset.generation.promptSha256).success
    )
      throw new Error("내장 imagegen 제작 기록이 필요합니다");
    const png = Buffer.from(asset.png);
    const assetHash = imageBytesSha256(png);
    const bindingHash = imageBindingSha256(binding);
    if (
      assetHash !== spec.assetSha256 ||
      bindingHash !== spec.bindingSha256 ||
      spec.generationSha256 !== asset.generation.generationSha256 ||
      spec.promptSha256 !== asset.generation.promptSha256
    )
      throw new Error("이미지 또는 수학 조건의 버전이 변경되었습니다");
    const dims = pngDimensions(png);
    const heldChecks: string[] = [];
    const review =
      asset.review === null ? null : reviewSchema.parse(asset.review);
    const currentReview =
      review?.assetSha256 === assetHash &&
      review?.bindingSha256 === bindingHash &&
      review?.generationSha256 === asset.generation.generationSha256 &&
      review?.promptSha256 === asset.generation.promptSha256;
    for (const name of IMAGE_REVIEW_CHECKS) {
      const check = currentReview ? review!.checks[name] : null;
      if (
        check?.status === "reject" &&
        IMAGE_REVIEW_CHECKS.indexOf(name) <=
          IMAGE_REVIEW_CHECKS.indexOf("withinGradeMethod")
      )
        throw new Error(`학년 범위에서 제외된 자산입니다: ${name}`);
      if (check?.status !== "pass" || !check.evidenceSha256)
        heldChecks.push(name);
    }
    if (
      !binding.unitId ||
      !binding.familyKey ||
      !binding.classificationSnapshotSha256
    )
      if (!heldChecks.includes("classification"))
        heldChecks.push("classification");
    if (purpose !== "preview" && heldChecks.length > 0)
      throw new Error(
        `이미지 검수가 보류되어 미리보기만 허용합니다: ${heldChecks.join(", ")}`,
      );
    // Only fixed markup and checked base64 PNG bytes enter this SVG. Generic
    // FigureSpec/image/URL permissions in the vector engine remain unchanged.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dims.width} ${dims.height}"><desc>authored-illustration-only-v1</desc><image width="${dims.width}" height="${dims.height}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${png.toString("base64")}"/></svg>`;
    return {
      ok: true,
      svg,
      authoredImage: {
        assetId: spec.assetId,
        assetSha256: assetHash,
        bindingSha256: bindingHash,
        generationSha256: asset.generation.generationSha256,
        promptSha256: asset.generation.promptSha256,
        purpose,
        heldChecks,
        problemApproval: false,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof z.ZodError
          ? "이미지 템플릿 계약이 유효하지 않습니다"
          : error instanceof Error
            ? error.message
            : "이미지 자산을 읽지 못했습니다",
    };
  }
}
