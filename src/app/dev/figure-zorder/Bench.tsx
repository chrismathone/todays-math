"use client";

import { useState } from "react";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { PARABOLA_FIGURE } from "./figure";

/** 원본 크롭 자리 — 원장님 화면처럼 왼쪽 «분리한 원본» 칸이 서게 한다(내용은 빈 흰 칸). */
const CROP =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

/**
 * 요소 순서 확인대 — 원장님 2026-09-21 «y축이 가려져버렸어»를 브라우저에서 그대로 해 본다.
 * 삼각형(요소 5)을 골라 «맨 뒤로»(Ctrl+Shift+[) — y축이 삼각형 위로 다시 지나가는지 본다.
 * 오른쪽 설정 칸의 폭(정렬 단추 여섯이 한 줄에 서는지)도 여기서 잰다.
 */
export function Bench() {
  const [open, setOpen] = useState(true);
  return (
    <main className="p-6 space-y-3 text-sm">
      <h1 className="text-lg font-semibold">도형 편집기 — 요소 순서 확인대</h1>
      <p className="text-muted">
        채운 삼각형 ABC 가 y축을 덮은 그림입니다. 삼각형을 골라 맨 뒤로
        보냅니다.
      </p>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded border border-control px-2 py-1 hover:bg-side"
        >
          편집기 다시 열기
        </button>
      )}
      {open && (
        <StudioFigureEditor
          image={CROP}
          initialSvg={PARABOLA_FIGURE}
          index={4}
          onSave={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  );
}
