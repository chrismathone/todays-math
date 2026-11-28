import "server-only";
import { createHash } from "node:crypto";
import { getConceptBlankBank } from "@/lib/concept-blank/bank/runtime";
import { fadingCatalog } from "./catalog";
import { fadingTrapMap } from "./traps";
import { fadingFigureMap } from "./figures";
import type { FadingPreviewShard } from "./previewShards";

export {
  joinFadingPreviewShards,
  type FadingPreviewShard,
} from "./previewShards";

/**
 * 교사 «미리 보기»의 로컬 표본 — 공용 은행 내용만, 지점 · 학생 기록은 읽지 않는다.
 *
 * 🔴 한 응답으로 내리면 4,744,895 B 로 Vercel 함수 응답 한도(4.5 MiB)를 넘는다
 * (2026-11-28 적대적 리뷰). 개념 목록을 차례대로 조각내 조각마다 그 개념의 함정 · 그림만 싣고,
 * 화면이 조각을 받은 차례대로 이어 붙인다(`joinFadingPreviewShards`). 함정 · 그림 지도는 개념마다
 * 따로 만들어지므로 이어 붙인 것은 한 번에 만든 것과 같다 — 시험이 글자 그대로 견준다.
 */
export const FADING_PREVIEW_SHARDS = 3;

type Preview = Omit<
  FadingPreviewShard,
  "today" | "shard" | "shards" | "revision"
>;

let built: { shards: Preview[]; revision: string } | undefined;

function buildShards(): Preview[] {
  const concepts = fadingCatalog();
  const figures = getConceptBlankBank().figures;
  const size = Math.ceil(concepts.length / FADING_PREVIEW_SHARDS);
  return Array.from({ length: FADING_PREVIEW_SHARDS }, (_, index) => {
    const part = concepts.slice(index * size, (index + 1) * size);
    return {
      concepts: part,
      cards: true as const,
      traps: fadingTrapMap(part),
      figures: fadingFigureMap(part, figures),
    };
  });
}

export function createWorkspaceFadingPreviewShard(
  today: string,
  shard: number,
): FadingPreviewShard {
  built ??= (() => {
    const shards = buildShards();
    const revision = createHash("sha256")
      .update(JSON.stringify(shards))
      .digest("hex")
      .slice(0, 16);
    return { shards, revision };
  })();
  const part = built.shards[shard];
  if (!part) throw new RangeError(`preview shard ${shard}`);
  return {
    ...part,
    today,
    shard,
    shards: FADING_PREVIEW_SHARDS,
    revision: built.revision,
  };
}

/** 한 번에 만든 표본 — 시험의 대조 기준. 운영 응답에는 쓰지 않는다(한도를 넘는다). */
export function createWorkspaceFadingPreview(today: string) {
  const concepts = fadingCatalog();
  return {
    concepts,
    cards: true as const,
    traps: fadingTrapMap(concepts),
    figures: fadingFigureMap(concepts, getConceptBlankBank().figures),
    today,
  };
}
