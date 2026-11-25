import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import type { ScanLayoutPage } from "@/contracts/conceptBlankScanIssued.contract";
import type { ScanRegistration } from "@/contracts/conceptBlankScanPhoto.contract";
import type { inspectScanPhoto } from "./photo.server";
import { registerScanPhoto } from "./registration";
import {
  flattenedScanRegistration,
  flattenedScanSize,
  warpScanPage,
} from "./flatten";

/** 저장 · AI 읽기 · 화면 대조가 모두 같은 바이트를 본다: 맞춘 사진은 편 A4, 아니면 원래 사진. */
export async function prepareScanPhoto(
  inspected: Awaited<ReturnType<typeof inspectScanPhoto>>,
  page: ScanLayoutPage,
): Promise<{
  bytes: Buffer;
  mime: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  hash: string;
  registration: ScanRegistration;
}> {
  const registration = registerScanPhoto(
    inspected.pixels,
    page,
    inspected.geometry,
  );
  if (registration.status !== "matched")
    return {
      bytes: inspected.bytes,
      mime: inspected.mime,
      width: inspected.width,
      height: inspected.height,
      hash: inspected.hash,
      registration,
    };
  const size = flattenedScanSize(registration.transform, page);
  const pixels = warpScanPage(
    inspected.pixels,
    registration.transform,
    size.width,
    size.height,
    page,
  );
  const bytes = await sharp(Buffer.from(pixels.buffer), {
    raw: { width: size.width, height: size.height, channels: 4 },
  })
    .removeAlpha()
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return {
    bytes,
    mime: "image/jpeg",
    width: size.width,
    height: size.height,
    hash: createHash("sha256").update(bytes).digest("hex"),
    registration: flattenedScanRegistration(
      page,
      size.width,
      size.height,
      registration.qrErrorMm,
    ),
  };
}
