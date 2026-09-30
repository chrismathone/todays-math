/**
 * 진도판 테마 소품(원장님 2026-09-30 확정 — 하늘섬 먼저) — 상자 · 기지 · 별이 테마 그림을 따른다.
 * 소품 그림이 없는 테마(지금 판 · 아직 안 그린 테마)는 지금 모양(SVG 상자 · ⌂ · ✦) 그대로.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
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

  it.each(["classic", "space"] as const)(
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

  it("sea and forest draw their own chest and base, and share the one sky star", () => {
    for (const theme of ["sea", "forest"] as const) {
      const { container } = inTheme(
        theme,
        <>
          <ChestRewardEffect stars={1} />
          <BaseArt level={0} />
        </>,
      );
      expect(srcs(container)).toEqual([
        `/images/journey/${theme}-chest-open.webp`,
        "/images/journey/sky-star.webp",
        "/images/journey/sky-star.webp",
        "/images/journey/sky-star.webp",
        "/images/journey/sky-star.webp",
        "/images/journey/sky-star.webp",
        "/images/journey/sky-star.webp",
        `/images/journey/${theme}-base1.webp`,
      ]);
    }
  });

  it("every declared prop picture is in public, four bases each, one star for all", () => {
    for (const theme of Object.values(JOURNEY_THEMES)) {
      if (!theme.propArt) continue;
      const { chest, chestOpen, bases, star } = theme.propArt;
      expect(bases).toHaveLength(4);
      expect(star).toBe("/images/journey/sky-star.webp");
      for (const src of [chest, chestOpen, ...bases, star])
        expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
    }
    expect(JOURNEY_THEMES.sky.propArt).toBeDefined();
  });
});
