/**
 * 진도판 테마 소품(원장님 2026-09-30 확정 — 하늘섬 먼저) — 상자 · 기지 · 별이 테마 그림을 따른다.
 * 소품 그림이 없는 테마(지금 판 · 아직 안 그린 테마)는 지금 모양(SVG 상자 · ⌂ · ✦) 그대로.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BaseArt,
  JourneyArtProvider,
  StarMark,
} from "@/components/math-explorers/JourneyArt";
import {
  ChestRewardEffect,
  ExplorerChests,
  TileStars,
} from "@/components/math-explorers/ExplorerPieces";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import {
  JOURNEY_THEMES,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";

const chests = [
  { id: "a", after: 3, solved: 1, ready: false, claimed: false },
  { id: "b", after: 6, solved: 6, ready: true, claimed: false },
  { id: "c", after: 9, solved: 9, ready: true, claimed: true },
] as unknown as ExplorerState["chests"];

function inTheme(theme: JourneyThemeId, node: React.ReactNode) {
  return render(<JourneyArtProvider theme={theme}>{node}</JourneyArtProvider>);
}

const srcs = (container: HTMLElement) =>
  [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));

describe("journey theme props — chest, base and star follow the theme art", () => {
  it("sky draws its own chest: closed for locked and ready, open once claimed", () => {
    const { container } = inTheme(
      "sky",
      <ExplorerChests chests={chests} busy={false} onClaim={() => {}} />,
    );
    expect(srcs(container)).toEqual([
      "/images/journey/sky-chest.webp",
      "/images/journey/sky-chest.webp",
      "/images/journey/sky-chest-open.webp",
    ]);
    expect(container.querySelector("svg")).toBeNull();
    // 그림은 장식 — 이름은 단추의 aria-label 이 말한다
    for (const img of container.querySelectorAll("img"))
      expect(img.getAttribute("alt")).toBe("");
  });

  it("sky opens its own chest in the reward effect", () => {
    const { container } = inTheme("sky", <ChestRewardEffect stars={1} />);
    expect(srcs(container)).toContain("/images/journey/sky-chest-open.webp");
  });

  it("sky base grows through four pictures and stays on the last one", () => {
    const pick = (level: number) =>
      srcs(inTheme("sky", <BaseArt level={level} />).container)[0];
    expect([0, 1, 2, 3, 7].map(pick)).toEqual([
      "/images/journey/sky-base1.webp",
      "/images/journey/sky-base2.webp",
      "/images/journey/sky-base3.webp",
      "/images/journey/sky-base4.webp",
      "/images/journey/sky-base4.webp",
    ]);
  });

  it("sky stars are the star picture, still read as text around them", () => {
    const { container } = inTheme("sky", <TileStars cards={2} bonus={1} />);
    expect(srcs(container)).toEqual(["/images/journey/sky-star.webp"]);
    expect(container.textContent).toContain("+3");
    expect(container.textContent).toContain("별 3개");
    expect(container.textContent).not.toContain("✦");
  });

  it.each(["classic", "sea"] as const)(
    "%s has no prop art and keeps the drawn chest, ⌂ and ✦",
    (theme) => {
      const { container } = inTheme(
        theme,
        <>
          <ExplorerChests chests={chests} busy={false} onClaim={() => {}} />
          <BaseArt level={2} />
          <StarMark />
        </>,
      );
      expect(container.querySelectorAll("img")).toHaveLength(0);
      expect(container.querySelectorAll("svg")).toHaveLength(3);
      expect(container.textContent).toContain("⌂");
      expect(container.textContent).toContain("✦");
    },
  );

  it("without a provider the pieces look as before", () => {
    const { container } = render(<StarMark />);
    expect(container.textContent).toBe("✦");
  });

  it("only themes with a full prop set declare one (four bases)", () => {
    for (const theme of Object.values(JOURNEY_THEMES))
      if (theme.propArt) expect(theme.propArt.bases).toHaveLength(4);
    expect(JOURNEY_THEMES.sky.propArt).toBeDefined();
  });
});
