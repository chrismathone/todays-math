import {
  AI_IMAGE_BUDGET,
  fitAiImage,
  type AiImageFit,
} from "@/components/unified/aiImageBudget";
import { decodeAiImageSurface } from "@/components/unified/aiImageSurface";

export const SCAN_PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

/** Always rasterize: the pixels inspected by the server and shown in the browser share orientation, without EXIF. */
export async function encodeScanPhoto(file: File): Promise<AiImageFit> {
  const heic =
    /^image\/(heic|heif)(-sequence)?$/.test(file.type) ||
    ((!file.type || file.type === "application/octet-stream") &&
      /\.hei[cf]$/i.test(file.name));
  if (!heic && !/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error("JPEG·PNG·WebP·HEIC 사진을 골라 주세요.");
  if (file.size > 32 * 1024 * 1024)
    throw new Error("사진 파일이 큽니다. 사진 앱에서 크기를 줄여 주세요.");
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("사진 파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
  const decoded = await decodeAiImageSurface(raw).catch((error) => {
    if (heic)
      throw new Error(
        "이 브라우저에서는 HEIC 사진을 열 수 없습니다. 사진 앱에서 JPEG로 변환한 뒤 골라 주세요.",
      );
    throw error;
  });
  // Round down with a margin, since the shared encoder rounds each dimension.
  const scale = Math.min(
    1,
    Math.sqrt(15_990_000 / (decoded.width * decoded.height)),
    9999 / Math.max(decoded.width, decoded.height),
  );
  const surface = {
    width: Math.round(decoded.width * scale),
    height: Math.round(decoded.height * scale),
    encode: (factor: number, type: string, quality?: number) =>
      quality === undefined
        ? decoded.encode(scale * factor, type)
        : decoded.encode(scale * factor, type, quality),
  };
  // The shared ladder first tries WebP; a HEIC surface deliberately encodes JPEG
  // on that probe too, so its existing JPEG fallback/size ladder always stays JPEG.
  const raster = surface.encode(
    1,
    heic ? "image/jpeg" : "image/png",
    heic ? 0.92 : undefined,
  );
  const fit =
    raster.length <= AI_IMAGE_BUDGET
      ? { dataUrl: raster }
      : fitAiImage(
          heic
            ? {
                ...surface,
                encode: (factor, type, quality) =>
                  surface.encode(factor, "image/jpeg", quality),
              }
            : surface,
        );
  if (heic && !fit.dataUrl.startsWith("data:image/jpeg;"))
    throw new Error(
      "JPEG 사진으로 변환하지 못했습니다. 사진 앱에서 JPEG로 변환한 뒤 골라 주세요.",
    );
  return {
    ...fit,
    ...(scale < 1 && !fit.reducedTo
      ? { reducedTo: Math.max(surface.width, surface.height) }
      : {}),
  };
}
