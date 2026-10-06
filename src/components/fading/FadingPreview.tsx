"use client";
import { useState } from "react";
import type { FadingConcept } from "@/lib/fading/concepts";
import type { FadingTrap } from "@/lib/fading/chips";
import type { FadingFigure } from "@/lib/fading/figures";
import { createLocalFadingSource } from "@/lib/fading/local";
import { FadingApp } from "./FadingApp";
import s from "./fading.module.css";

/** 작업실에 꽂을 알맹이. 부모가 서버에서 개념을 내려주며, 교사 메뉴에는 아직 배선하지 않는다. */
export function FadingPreview({
  concepts,
  today,
  traps,
  figures,
}: {
  concepts: readonly FadingConcept[];
  today: string;
  traps: Readonly<Record<string, readonly FadingTrap[]>>;
  figures: Readonly<Record<string, FadingFigure>>;
}) {
  const [source] = useState(() =>
    createLocalFadingSource({ concepts, today, traps, figures }),
  );
  return (
    <div className={s.preview}>
      <FadingApp source={source} preview />
    </div>
  );
}
