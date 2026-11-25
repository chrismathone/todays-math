"use client";

import { useEffect, useState } from "react";

/**
 * 인쇄 페이지의 «바로 인쇄» — 화면의 인쇄하기가 `?print=1` 로 연 새 창에서, 지면이 그려지고 글꼴이 다 들어온 뒤
 * 인쇄 창을 한 번 띄운다(원장님 2026-10-01 «ctrl+p 말고 인쇄버튼으로 연결되게»). 글꼴 · KaTeX 가 늦게 들어오면 줄이
 * 밀린 채 찍히므로 `document.fonts.ready` 를 기다리고, 그린 뒤 두 프레임을 넘긴다. 화면에는 아무것도 그리지 않는다.
 */
export default function PrintNow({
  stylesheetHref,
  autoPrint = true,
}: { stylesheetHref?: string; autoPrint?: boolean } = {}) {
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fonts = (
      document as Document & { fonts?: { ready?: Promise<unknown> } }
    ).fonts;
    const sheet = stylesheetHref
      ? [
          ...document.querySelectorAll<HTMLLinkElement>(
            'link[rel="stylesheet"]',
          ),
        ].find((link) => link.getAttribute("href") === stylesheetHref)
      : null;
    let cleanupSheet = () => {};
    const loaded =
      !stylesheetHref || sheet?.sheet
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              clean();
              reject(new Error("stylesheet timeout"));
            }, 30_000);
            const done = () => {
              clean();
              resolve();
            };
            const fail = () => {
              clean();
              reject(new Error("stylesheet unavailable"));
            };
            const clean = () => {
              clearTimeout(timer);
              sheet?.removeEventListener("load", done);
              sheet?.removeEventListener("error", fail);
            };
            cleanupSheet = clean;
            sheet?.addEventListener("load", done, { once: true });
            sheet?.addEventListener("error", fail, { once: true });
          });
    void loaded
      .then(async () => {
        if (stylesheetHref && document.fonts?.load) {
          const faces = await Promise.all(
            ["Noto Serif KR", "Pretendard"].flatMap((family) =>
              [400, 700, 800].map((weight) =>
                document.fonts.load(`${weight} 16px "${family}"`, "가힣수학9A"),
              ),
            ),
          );
          if (faces.some((face) => !face.length))
            throw new Error("font unavailable");
        }
        await (document.fonts?.ready ?? fonts?.ready ?? Promise.resolve());
      })
      .then(() => {
        if (cancelled || !autoPrint) return;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (!cancelled) window.print();
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      cleanupSheet();
    };
  }, [stylesheetHref, autoPrint]);
  return error ? (
    <p role="alert">
      인쇄 글꼴·스타일을 읽지 못했습니다. 새로고침한 뒤 다시 인쇄해 주세요.
    </p>
  ) : null;
}
