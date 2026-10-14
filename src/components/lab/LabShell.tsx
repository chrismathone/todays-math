"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import TodayMathMark from "@/components/brand/TodayMathMark";
import type { LabSave } from "@/lib/lab/types";

import styles from "./lab.module.css";

export function LabShell({
  save,
  onSave,
  children,
  kicker,
}: {
  save: LabSave;
  onSave: (next: LabSave) => void;
  children: ReactNode;
  kicker?: string;
}) {
  return (
    <div
      className={`${styles.page} ${save.reducedMotion ? styles.reduceMotion : ""}`}
    >
      <header className={styles.chrome}>
        <Link href="/lab" className={styles.wordmark}>
          <TodayMathMark size={28} />
          오늘 수학
        </Link>
        <span className={styles.sub}>{kicker ?? "개념 실험실"}</span>
        <div className={styles.tools}>
          <span className={styles.meter}>{save.xp} XP</span>
          <span className={styles.meter}>{save.combo} 콤보</span>
          <button
            type="button"
            className={styles.labBtnGhost}
            aria-pressed={save.sound}
            onClick={() => onSave({ ...save, sound: !save.sound })}
          >
            {save.sound ? "소리 켜짐" : "소리 꺼짐"}
          </button>
          <button
            type="button"
            className={styles.labBtnGhost}
            aria-pressed={save.reducedMotion}
            onClick={() =>
              onSave({ ...save, reducedMotion: !save.reducedMotion })
            }
          >
            {save.reducedMotion ? "움직임 줄임" : "움직임 줄이기"}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
