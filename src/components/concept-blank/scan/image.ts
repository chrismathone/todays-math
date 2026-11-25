import {
  AI_IMAGE_BUDGET,
  fitAiImage,
  type AiImageFit,
} from "@/components/unified/aiImageBudget";
import { decodeAiImageSurface } from "@/components/unified/aiImageSurface";

/** Always rasterize: the pixels inspected by the server and shown in the browser share orientation, without EXIF. */
export async function encodeScanPhoto(file: File): Promise<AiImageFit> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error(
      "JPEG·PNG·WebP 사진을 골라 주세요. 다른 형식은 사진 앱에서 변환해 주세요.",
    );
  if (file.size > 32 * 1024 * 1024)
    throw new Error("사진 파일이 큽니다. 사진 앱에서 크기를 줄여 주세요.");
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("사진 파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
  const decoded = await decodeAiImageSurface(raw);
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
  const png = surface.encode(1, "image/png");
  const fit =
    png.length <= AI_IMAGE_BUDGET ? { dataUrl: png } : fitAiImage(surface);
  return {
    ...fit,
    ...(scale < 1 && !fit.reducedTo
      ? { reducedTo: Math.max(surface.width, surface.height) }
      : {}),
  };
}
