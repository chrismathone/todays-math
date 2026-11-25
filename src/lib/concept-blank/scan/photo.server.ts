import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import jsQR from "jsqr";
import {
  STUDIO_AI_IMAGE_BUDGET,
  STUDIO_AI_TOO_LARGE,
} from "@/lib/studio-ai/limits";
import { parseScanQr } from "./layout";
import type { ScanPixels, ScanQrGeometry } from "./registration";

export class ScanPhotoError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ScanPhotoError";
  }
}

/** Server checks the decoded file and its QR; request page/part/dimensions are never authoritative. */
export async function inspectScanPhoto(
  imageDataUrl: string,
  expected: { printedSheetId: string; pageCount: number; origin: string },
) {
  if (imageDataUrl.length > STUDIO_AI_IMAGE_BUDGET)
    throw new ScanPhotoError(STUDIO_AI_TOO_LARGE);
  const match = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(imageDataUrl);
  if (!match) throw new ScanPhotoError("PNG·JPEG·WebP 사진을 올려 주세요.");
  const base64 = imageDataUrl.slice(match[0].length),
    bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.toString("base64") !== base64)
    throw new ScanPhotoError("사진 파일이 올바르지 않습니다.");
  let image: ScanPixels;
  try {
    const decoder = sharp(bytes, {
      limitInputPixels: 16_000_000,
      failOn: "warning",
    });
    const metadata = await decoder.metadata();
    const mime =
      metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
    if (
      mime !== match[1] ||
      (metadata.pages ?? 1) !== 1 ||
      (metadata.orientation ?? 1) !== 1
    )
      throw new ScanPhotoError(
        "사진 형식·회전 정보를 확인하지 못했습니다. 다시 골라 올려 주세요.",
      );
    const { data, info } = await decoder
      .flatten({ background: "#ffffff" })
      .toColourspace("srgb")
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width > 10000 || info.height > 10000 || info.channels !== 4)
      throw new ScanPhotoError("사진 크기를 줄여 다시 올려 주세요.");
    image = {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
    };
  } catch (error) {
    if (error instanceof ScanPhotoError) throw error;
    throw new ScanPhotoError(
      "사진을 열 수 없습니다. 다른 사진으로 다시 올려 주세요.",
    );
  }
  const decoded = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "dontInvert",
  });
  if (!decoded)
    throw new ScanPhotoError(
      "사진 속 QR을 읽지 못했습니다. QR과 네 모서리가 모두 보이게 다시 찍어 주세요.",
    );
  let qr;
  try {
    qr = parseScanQr(decoded.data, expected.origin);
  } catch {
    throw new ScanPhotoError(
      "이 서비스의 발행 QR이 아닙니다. 저장 전 옛 지면은 새로 발행해 주세요.",
    );
  }
  if (qr.part === "key")
    throw new ScanPhotoError(
      "채점표 사진은 제출할 수 없습니다. 학생 답안을 찍어 주세요.",
    );
  if (qr.printedSheetId !== expected.printedSheetId)
    throw new ScanPhotoError(
      "다른 발행 지면의 사진입니다. 같은 지면을 찍어 주세요.",
    );
  if (qr.page > expected.pageCount)
    throw new ScanPhotoError("저장된 지면에 없는 쪽 번호입니다.");
  const geometry: ScanQrGeometry = {
    version: decoded.version,
    corners: [
      decoded.location.topLeftCorner,
      decoded.location.topRightCorner,
      decoded.location.bottomRightCorner,
      decoded.location.bottomLeftCorner,
    ],
  };
  // A photo must contain one page. Mask the first code only in a scratch copy, never in stored/AI bytes.
  const scratch = new Uint8ClampedArray(image.data),
    corners = geometry.corners;
  const padding =
    Math.max(
      ...corners.map((p, i) =>
        Math.hypot(p.x - corners[(i + 1) % 4].x, p.y - corners[(i + 1) % 4].y),
      ),
    ) * 0.2;
  const x0 = Math.max(
    0,
    Math.floor(Math.min(...corners.map((p) => p.x)) - padding),
  );
  const x1 = Math.min(
    image.width,
    Math.ceil(Math.max(...corners.map((p) => p.x)) + padding),
  );
  const y0 = Math.max(
    0,
    Math.floor(Math.min(...corners.map((p) => p.y)) - padding),
  );
  const y1 = Math.min(
    image.height,
    Math.ceil(Math.max(...corners.map((p) => p.y)) + padding),
  );
  for (let y = y0; y < y1; y++)
    scratch.fill(255, (y * image.width + x0) * 4, (y * image.width + x1) * 4);
  if (
    jsQR(scratch, image.width, image.height, {
      inversionAttempts: "dontInvert",
    })
  )
    throw new ScanPhotoError(
      "사진에 QR이 여러 개 있습니다. 한 쪽씩 찍어 주세요.",
    );
  return {
    qr,
    geometry,
    pixels: image,
    width: image.width,
    height: image.height,
    bytes,
    mime: match[1] as "image/jpeg" | "image/png" | "image/webp",
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
}
