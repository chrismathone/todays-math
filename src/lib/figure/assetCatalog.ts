/**
 * 실물 그림 조각(에셋) 목록 한 자리 — math-figure-editor 2026-10-21.
 *
 * 파일·모양은 `scripts/figure/assets/`(흑백 선화, 규격은 그 README), 배치는 `scripts/figure/scene_assets.py`.
 * 여기서는 이름표만 읽는다 — 명세 지시문(어떤 조각이 있는가)과 편집기(요소 이름 «건물»)가 같은 목록을 쓴다.
 * 모듈을 불러올 때 한 번 만들고 요청마다 다시 만들지 않는다(지시문은 캐시되는 앞부분에 들어간다).
 */
import core from "../../../scripts/figure/assets/manifest-core.json";
import exam from "../../../scripts/figure/assets/manifest-exam.json";
import objects from "../../../scripts/figure/assets/manifest-objects.json";
import outdoor from "../../../scripts/figure/assets/manifest-outdoor.json";
import pictures from "../../../scripts/figure/assets/picture-assets.json";

export interface FigureAsset {
  slug: string;
  label: string;
  tags: string[];
  /** 파일 이름(assets/ 안) — 편집기 «그림» 메뉴가 읽는다 */
  file: string;
  /** 에셋 좌표 틀 [너비, 높이] */
  viewBox: [number, number];
}

export const FIGURE_ASSETS: readonly FigureAsset[] = [core, objects, outdoor, exam].flatMap((manifest) =>
  manifest.assets.map(({ slug, label, tags, file, viewBox }) => ({
    slug,
    label,
    tags,
    file,
    viewBox: [viewBox[0], viewBox[1]] as [number, number],
  })),
);

const LABELS = new Map(FIGURE_ASSETS.map((asset) => [asset.slug, asset.label]));

/** 에셋 이름 → 한국어 이름(«building» → «건물»). 모르는 이름은 «그림». */
export const assetLabel = (slug: string | undefined) => (slug && LABELS.get(slug)) || "그림";

/**
 * 명세(v2·graph-1)에서 쓸 수 있는 조각 — 도형으로 못 그리는 실물만(엔진 scene_assets.py 와 같은 파일).
 * 컵·캔·주사위·그릇처럼 원기둥·직육면체·구로 그릴 수 있는 것은 빠진다(사용자 2026-10-21).
 */
const PICTURE_SLUGS = new Set<string>(pictures.picture);
export const PICTURE_ASSETS = FIGURE_ASSETS.filter((asset) => PICTURE_SLUGS.has(asset.slug));

/** 지시문 한 줄 — «house=집, building=건물, …». */
export const ASSET_PROMPT_LIST = PICTURE_ASSETS.map((asset) => `${asset.slug}=${asset.label}`).join(", ");

// Keep complete SVG bodies in review/edit evidence; a marker never authorizes stripping geometry.
