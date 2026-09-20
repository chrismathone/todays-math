"use client";

import { useState } from "react";
import StudioFigureEditor, {
  type StudioFigureSaveResult,
} from "@/components/unified/figure-editor";
import { RELATION_FIGURE } from "./figure";

/**
 * 묶기·번호표·정렬 확인대 — 원장님 2026-09-21 넷을 브라우저에서 그대로 해 본다.
 * ⑴ 상자와 그 이름 글자를 골라 Ctrl+G · Ctrl+Shift+G ⑵ 묶으면 번호표가 하나로 합쳐지는지
 * ⑶ 새 묶음 이름이 A · B · C 인지 ⑷ 오른쪽 칸 «정렬»·«간격»으로 줄을 맞추는지.
 */
export function Bench() {
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <main className="p-6 space-y-3 text-sm">
      <h1 className="text-lg font-semibold">
        도형 편집기 — 묶기 · 번호표 · 정렬 확인대
      </h1>
      <p className="text-muted">
        상자(사각)와 그 이름 글자를 함께 고른 다음 Ctrl+G 로 묶습니다. 묶음은
        번호표 하나가 되고, 오른쪽 칸에서 이름과 정렬을 다룹니다.
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
      {saved && (
        <p data-testid="saved-groups" className="font-mono text-xs">
          저장본 묶음: {saved}
        </p>
      )}
      {open && (
        <StudioFigureEditor
          image={RELATION_FIGURE}
          initialSvg={RELATION_FIGURE}
          index={0}
          onSave={(result: StudioFigureSaveResult) => {
            setSaved(
              [...result.svg.matchAll(/data-group="([^"]*)"/g)]
                .map((m) => m[1] || "(밖)")
                .join(" ") || "(없음)",
            );
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  );
}
