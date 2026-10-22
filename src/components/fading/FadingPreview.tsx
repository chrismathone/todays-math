"use client";
import { useState } from "react";
import type { FadingConcept } from "@/lib/fading/concepts";
import type { FadingTrap } from "@/lib/fading/chips";
import type { FadingFigure } from "@/lib/fading/figures";
import { createLocalFadingSource } from "@/lib/fading/local";
import { FadingApp } from "./FadingApp";
import s from "./fading.module.css";

/** 기기 전환은 같은 앱의 폭만 바꾼다. 학생 기록은 로컬 소스의 메모리에만 남는다. */
export function FadingPreview({
  concepts,
  today,
  traps,
  figures,
  cards = false,
}: {
  concepts: readonly FadingConcept[];
  today: string;
  traps: Readonly<Record<string, readonly FadingTrap[]>>;
  figures: Readonly<Record<string, FadingFigure>>;
  cards?: boolean;
}) {
  const [source] = useState(() =>
    createLocalFadingSource({ concepts, today, traps, figures, cards }),
  );
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <section className={s.previewPanel} aria-label="미리 보기 화면 크기">
      <div className={s.previewControls}>
        <div
          role="group"
          aria-label="미리 보기 기기"
          className={s.previewDevices}
        >
          <button
            type="button"
            aria-pressed={device === "desktop"}
            onClick={() => setDevice("desktop")}
          >
            PC 미리 보기
          </button>
          <button
            type="button"
            aria-pressed={device === "mobile"}
            onClick={() => setDevice("mobile")}
          >
            모바일 미리 보기
          </button>
        </div>
        <p>기억 학습만 미리 봅니다 · 저장되지 않음</p>
      </div>
      <div className={s.preview} data-preview-device={device}>
        <FadingApp source={source} preview />
      </div>
    </section>
  );
}
