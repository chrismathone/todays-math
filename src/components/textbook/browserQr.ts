import type { TextbookRenderModel } from "@/lib/textbook/render/model";

import type { PreviewResources } from "./previewModel";

type QrCode = {
  toDataURL(
    text: string,
    options: {
      errorCorrectionLevel: "M";
      margin: 4;
      scale: 6;
      type: "image/png";
    },
  ): Promise<string>;
};

/** 서버 조판과 같은 오류 정정·여백·배율. 인쇄 주소는 이미지로만 넣고 요청하지 않는다. */
export async function browserQrDataUrl(url: string): Promise<string> {
  const imported = (await import("qrcode")) as QrCode & { default?: QrCode };
  const qrcode =
    imported.default && typeof imported.default.toDataURL === "function"
      ? imported.default
      : imported;
  const dataUrl = await qrcode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 4,
    scale: 6,
    type: "image/png",
  });
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("QR 이미지를 만들지 못했습니다.");
  }
  return dataUrl;
}

function modelQrs(model: TextbookRenderModel): { id: string; url: string }[] {
  const rows: { id: string; url: string }[] = [];
  for (const section of model.sections) {
    for (const block of section.blocks) {
      if ((block.kind === "problem" || block.kind === "concept") && block.qr) {
        rows.push(block.qr);
      }
    }
  }
  return rows;
}

export async function withBrowserQrImages(
  model: TextbookRenderModel,
  resources: PreviewResources,
): Promise<PreviewResources> {
  const targets = modelQrs(model);
  if (targets.length === 0) return resources;
  const images = new Map<string, { url: string; dataUrl: string }>();
  for (const qr of targets) {
    const prior = images.get(qr.id);
    if (prior && prior.url !== qr.url) {
      throw new Error("QR 식별자가 서로 다른 주소에 쓰였습니다.");
    }
    if (prior) continue;
    images.set(qr.id, {
      url: qr.url,
      dataUrl: await browserQrDataUrl(qr.url),
    });
  }
  return {
    ...resources,
    qrDataUrl: (id, url) => {
      const row = images.get(id);
      if (!row || row.url !== url) {
        throw new Error("예약된 QR 이미지가 없습니다.");
      }
      return row.dataUrl;
    },
  };
}
