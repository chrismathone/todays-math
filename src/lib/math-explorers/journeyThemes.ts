/**
 * 진도판 테마 — 학원 전체 한 벌(원장님 2026-09-30). 기본은 지금 판(`classic`), 관리자가 «학습 관리» 화면에서 고른다.
 * 그림은 codex 이미지 생성 2차 시안(`public/images/journey/*`) — 판 한 장 + 그 세계의 탈것 한 대.
 */
export const JOURNEY_THEME_IDS = [
  "classic",
  "sky",
  "sea",
  "space",
  "forest",
  "shapes",
] as const;

export type JourneyThemeId = (typeof JOURNEY_THEME_IDS)[number];

export const DEFAULT_JOURNEY_THEME: JourneyThemeId = "classic";

export interface RiderImages {
  left: string;
  up: string;
  down: string;
  /** 바퀴 없는 옆모습 몸통 · 바퀴 한 개 · 옆모습 안 바퀴 자리(중심 x · y, 지름 d — 그림 폭에 대한 비). */
  body?: string;
  wheel?: string;
  wheels?: ReadonlyArray<{ x: number; y: number; d: number }>;
}

export interface JourneyTheme {
  id: JourneyThemeId;
  name: string;
  /** 탈것 이름 — 화면 읽기(«내 열기구, 3일 학습 완료»). */
  rider: string;
  /** 판 그림. 지금 판은 없다(CSS 칸 + 손 그린 말). */
  boardImage: string | null;
  /** 탈것 네 방향 — 오른쪽은 왼쪽을 뒤집어 쓴다. 바퀴가 있으면 옆모습을 몸통 + 바퀴로 나눠 바퀴만 돈다. */
  riderImages: RiderImages | null;
  /** 탈것이 칸을 옮길 때의 몸짓 — CSS 가 읽는다. */
  motion: "hop" | "sway" | "bob" | "drift" | "roll";
}

const riderSet = (id: string): RiderImages => ({
  left: `/images/journey/${id}-left.webp`,
  up: `/images/journey/${id}-up.webp`,
  down: `/images/journey/${id}-down.webp`,
});

export const JOURNEY_THEMES: Readonly<Record<JourneyThemeId, JourneyTheme>> = {
  classic: {
    id: "classic",
    name: "기본 판",
    rider: "말",
    boardImage: null,
    riderImages: null,
    motion: "hop",
  },
  sky: {
    id: "sky",
    name: "하늘섬",
    rider: "열기구",
    boardImage: "/images/journey/sky-board.webp",
    riderImages: riderSet("sky"),
    motion: "sway",
  },
  sea: {
    id: "sea",
    name: "바다 항해",
    rider: "돛단배",
    boardImage: "/images/journey/sea-board.webp",
    riderImages: riderSet("sea"),
    motion: "bob",
  },
  space: {
    id: "space",
    name: "우주 궤도",
    rider: "탐사선",
    boardImage: "/images/journey/space-board.webp",
    riderImages: riderSet("space"),
    motion: "drift",
  },
  forest: {
    id: "forest",
    name: "숲길 탐험",
    rider: "탐험 수레",
    boardImage: "/images/journey/forest-board.webp",
    riderImages: {
      ...riderSet("forest"),
      body: "/images/journey/forest-body.webp",
      wheel: "/images/journey/forest-wheel.webp",
      // codex 3차 좌표(1024 캔버스) — 앞 · 뒤 바퀴 중심과 지름
      wheels: [
        { x: 0.437, y: 0.618, d: 0.242 },
        { x: 0.799, y: 0.618, d: 0.242 },
      ],
    },
    motion: "roll",
  },
  shapes: {
    id: "shapes",
    name: "도형 마을",
    rider: "탐사 로버",
    boardImage: "/images/journey/shapes-board.webp",
    riderImages: {
      ...riderSet("shapes"),
      body: "/images/journey/shapes-body.webp",
      wheel: "/images/journey/shapes-wheel.webp",
      // codex 3차 좌표(1024 캔버스) — 앞 · 뒤 바퀴 중심과 지름
      wheels: [
        { x: 0.232, y: 0.701, d: 0.322 },
        { x: 0.765, y: 0.701, d: 0.322 },
      ],
    },
    motion: "roll",
  },
};

export function isJourneyThemeId(value: unknown): value is JourneyThemeId {
  return (
    typeof value === "string" &&
    (JOURNEY_THEME_IDS as readonly string[]).includes(value)
  );
}
