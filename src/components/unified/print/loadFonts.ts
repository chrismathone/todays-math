import { getFontPack, type FontPackId } from "./fontPacks";

// Same licensed Google font pairs as Mathgen/index.html, loaded only when selected.
const STYLESHEETS: Partial<Record<FontPackId, string>> = {
  nanum:
    "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Nanum+Gothic:wght@400;700;800&display=swap",
  noto: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@400;500;700;900&display=swap",
  gowun:
    "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&display=swap",
  pretendard:
    "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap",
};
const pending = new Map<string, Promise<void>>();

function ensureStylesheet(id: FontPackId): Promise<void> | undefined {
  const href = STYLESHEETS[id];
  if (href) {
    let promise = pending.get(href);
    if (!promise) {
      promise = new Promise<void>((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.mathgenFont = id;
        const timeout = setTimeout(() => {
          link.remove();
          pending.delete(href);
          reject(new Error("Font stylesheet timeout"));
        }, 15000);
        link.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        link.onerror = () => {
          clearTimeout(timeout);
          link.remove();
          pending.delete(href);
          reject(new Error("Font stylesheet failed"));
        };
        document.head.append(link);
      });
      pending.set(href, promise);
    }
    return promise;
  }
}

/** 서식 설정의 폰트 단추가 제 글꼴로 보이게 — 스타일시트만 건다(글자 조각은 브라우저가 단추 글자만 받는다). */
export function loadFontPreviews(): void {
  for (const id of Object.keys(STYLESHEETS) as FontPackId[])
    ensureStylesheet(id)?.catch(() => {});
}

export async function loadPrintFonts(id: FontPackId): Promise<void> {
  await ensureStylesheet(id);
  if (document.fonts) {
    const pack = getFontPack(id);
    // FontFaceSet.ready alone doesn't request an unused face; load Korean glyphs explicitly.
    const fonts = [pack.serif.split(",")[0], pack.sans.split(",")[0]];
    if (id === "pretendard")
      fonts[1] =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-pretendard")
          .split(",")[0]
          .trim() || "Pretendard";
    await Promise.all(
      fonts.flatMap((font) =>
        [400, 700, 800].map((weight) =>
          document.fonts.load(`${weight} 14px ${font}`, "수학 시험지 정답 123"),
        ),
      ),
    );
    await document.fonts.ready;
  }
}
