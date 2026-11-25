import "server-only";
import qrCode from "qrcode";
import type { RenderQr, TextbookRenderModel } from "./model";

export function modelQrTargets(model: TextbookRenderModel): RenderQr[] {
  return model.sections.flatMap((s) =>
    s.blocks.flatMap((b) =>
      (b.kind === "problem" || b.kind === "concept") && b.qr ? [b.qr] : [],
    ),
  );
}
export async function generateTextbookQrs(
  model: TextbookRenderModel,
  officialOrigin: string,
): Promise<Map<string, { url: string; dataUrl: string }>> {
  const origin = new URL(officialOrigin);
  if (
    origin.protocol !== "https:" ||
    origin.origin !== officialOrigin ||
    /^(localhost|127\.|\[::1\])/.test(origin.hostname)
  )
    throw new Error("QR official HTTPS origin required");
  const result = new Map<string, { url: string; dataUrl: string }>();
  for (const qr of modelQrTargets(model)) {
    const target = new URL(qr.url);
    if (
      target.origin !== officialOrigin ||
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      !/^\/q\/[A-Za-z0-9_-]{16,100}$/.test(target.pathname)
    )
      throw new Error(`Invalid reserved QR URL ${qr.url}`);
    const prior = result.get(qr.id);
    if (prior && prior.url !== qr.url)
      throw new Error("QR id reused for a different target");
    if (prior) continue;
    const bytes = await qrCode.toBuffer(qr.url, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 4,
      scale: 6,
    });
    result.set(qr.id, {
      url: qr.url,
      dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
    });
  }
  return result;
}
