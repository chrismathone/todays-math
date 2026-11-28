import type { FadingConcept } from "./concepts";
import type { FadingTrap } from "./chips";
import type { FadingFigure } from "./figures";

/** 교사 미리 보기 한 조각 — 서버(`workspacePreview.ts`)가 만들고 화면이 이어 붙인다. */
export type FadingPreviewShard = {
  concepts: FadingConcept[];
  cards: true;
  traps: Record<string, FadingTrap[]>;
  figures: Record<string, FadingFigure>;
  today: string;
  shard: number;
  shards: number;
};

export function joinFadingPreviewShards(parts: readonly FadingPreviewShard[]) {
  const ordered = [...parts].sort((a, b) => a.shard - b.shard);
  if (
    ordered.length === 0 ||
    ordered.some(
      (part, index) => part.shard !== index || part.shards !== ordered.length,
    )
  )
    throw new Error("Fading preview shards are incomplete");
  return {
    concepts: ordered.flatMap((part) => part.concepts),
    cards: true as const,
    traps: Object.assign({}, ...ordered.map((part) => part.traps)),
    figures: Object.assign({}, ...ordered.map((part) => part.figures)),
    today: ordered[0]!.today,
  };
}
