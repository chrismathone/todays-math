"use client";

import { useEffect } from "react";

/**
 * 인쇄 페이지의 «바로 인쇄» — 화면의 인쇄하기가 `?print=1` 로 연 새 창에서, 지면이 그려지고 글꼴이 다 들어온 뒤
 * 인쇄 창을 한 번 띄운다(원장님 2026-10-01 «ctrl+p 말고 인쇄버튼으로 연결되게»). 글꼴 · KaTeX 가 늦게 들어오면 줄이
 * 밀린 채 찍히므로 `document.fonts.ready` 를 기다리고, 그린 뒤 두 프레임을 넘긴다. 화면에는 아무것도 그리지 않는다.
 */
export default function PrintNow() {
  useEffect(() => {
    let cancelled = false;
    const fonts = (
      document as Document & { fonts?: { ready?: Promise<unknown> } }
    ).fonts;
    void (fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) window.print();
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
