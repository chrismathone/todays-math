import QRCode from "qrcode";
import { browserQrDataUrl } from "@/components/textbook/browserQr";
import type { WireSample } from "../concept-blank-scan-wire/samples";

/** 시안의 고정 ID이며 실제 발행물이 아니다. 이름·정답·선택을 주소에 담지 않는다. */
export async function withHifiQrs(
  samples: WireSample[],
): Promise<WireSample[]> {
  return Promise.all(
    samples.map(async (sample, index) => {
      const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
      const make = (part: "student" | "key") =>
        Promise.all(
          sample.qr[part].map(async (_, page) => {
            const url = `https://today.aywa.co.kr/concept-blank/scan?p=${id}&page=${page + 1}&part=${part}`;
            const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
            return {
              url,
              dataUrl: await browserQrDataUrl(url),
              modules: qr.modules.size,
              version: qr.version,
            };
          }),
        );
      const [student, key] = await Promise.all([make("student"), make("key")]);
      return { ...sample, qr: { student, key } };
    }),
  );
}
