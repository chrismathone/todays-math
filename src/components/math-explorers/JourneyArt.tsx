"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  JOURNEY_THEMES,
  type JourneyPropArt,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";
import s from "./math-explorers.module.css";

/**
 * 진도판 테마 소품(원장님 2026-09-30) — 상자 · 기지 · 별이 테마 그림을 따른다.
 * 소품 그림이 없는 테마는 지금 모양(SVG 상자 · ⌂ · ✦) 그대로. 그림은 모두 장식(alt="") —
 * 뜻은 둘레의 글자와 aria-label 이 말한다.
 */
const PropArtContext = createContext<JourneyPropArt | undefined>(undefined);

export function JourneyArtProvider({
  theme,
  children,
}: {
  theme?: JourneyThemeId;
  children: ReactNode;
}) {
  const art = theme ? JOURNEY_THEMES[theme]?.propArt : undefined;
  return (
    <PropArtContext.Provider value={art}>{children}</PropArtContext.Provider>
  );
}

export function ChestIcon({ opened = false }: { opened?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d={opened ? "m9 27 4-14 41 6-3 13" : "M9 29v-9c0-7 46-7 46 0v9"}
        fill="#ffda78"
        stroke="#9d6c27"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 29h46v24H9z"
        fill="#edb345"
        stroke="#9d6c27"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M19 29v24m26-24v24M9 37h46" stroke="#9d6c27" strokeWidth="2.5" />
      <rect
        x="27"
        y="33"
        width="10"
        height="12"
        rx="2"
        fill="#fff1b2"
        stroke="#9d6c27"
        strokeWidth="2"
      />
      {opened ? (
        <path d="m32 7 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill="#ffd05a" />
      ) : null}
    </svg>
  );
}

export function ChestArt({ opened = false }: { opened?: boolean }) {
  const art = useContext(PropArtContext);
  if (!art) return <ChestIcon opened={opened} />;
  return (
    <img
      className={s.propImage}
      src={opened ? art.chestOpen : art.chest}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

export function BaseArt({ level }: { level: number }) {
  const art = useContext(PropArtContext);
  if (!art)
    return (
      <span className={s.baseEmblem} aria-hidden="true">
        ⌂
      </span>
    );
  const index = Math.max(0, Math.min(level, art.bases.length - 1));
  return (
    <img
      className={s.baseImage}
      src={art.bases[index]}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

export function StarMark() {
  const art = useContext(PropArtContext);
  if (!art) return <>✦</>;
  return (
    <img
      className={s.starImage}
      src={art.star}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
