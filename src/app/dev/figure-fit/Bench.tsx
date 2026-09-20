"use client";

import { useState } from "react";
import StudioFigureEditor, {
  type StudioFigureSaveResult,
} from "@/components/unified/figure-editor";
import { ENGINE_FIGURE } from "./figure";

const viewBoxOf = (svg: string) =>
  svg.match(/viewBox=["']([^"']+)/)?.[1] ?? "(없음)";

/**
 * «다 보이게» 확인대 — 원장님 2026-09-20 화면을 브라우저에서 그대로 만든다.
 * 점 하나를 끌어 틀 밖으로 내보내면 편집 화면에서 잘린다 → 오른쪽 칸 «다 보이게» 를 누르면 다 들어온다.
 * «도형 적용» 을 누르면 **저장본의 틀**을 아래에 적는다 — 화면의 틀과 글자까지 같아야 한다.
 */
export function Bench() {
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <main className="p-6 space-y-3 text-sm">
      <h1 className="text-lg font-semibold">
        도형 편집기 — 틀 «다 보이게» 확인대
      </h1>
      <p className="text-muted">
        점(예: C)을 끌어 틀 밖으로 내보낸 다음 오른쪽 칸 «다 보이게» 를
        누릅니다. «도형 적용» 을 누르면 저장본의 틀을 아래에 적습니다.
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
        <p data-testid="saved-viewbox" className="font-mono text-xs">
          저장본 viewBox: {saved}
        </p>
      )}
      {open && (
        <StudioFigureEditor
          image={ENGINE_FIGURE}
          initialSvg={ENGINE_FIGURE}
          index={0}
          onSave={(result: StudioFigureSaveResult) => {
            setSaved(viewBoxOf(result.svg));
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  );
}
