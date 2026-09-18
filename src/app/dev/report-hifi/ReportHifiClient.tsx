"use client";

import { useMemo, useState } from "react";

import type { ReportSource } from "@/lib/achievement/reportAreas";
import type { AchievementFactors } from "@/lib/achievement/types";

import { DirectorScreen } from "./DirectorScreen";
import { EXAMPLE_TEACHER_NOTE, exampleFactors } from "./example";
import { ParentSheet } from "./ParentSheet";
import styles from "./ReportHifi.module.css";
import { HIFI_VARIANTS, type HifiVariant } from "./variants";

/**
 * **성취 리포트 Hi-fi 5안** (D-07 · D-134 ⑻, 2026-09-18).
 *
 * 🔴 **두 산출물, 한 원천** — 원장 화면(한 벌)과 학부모 A4(다섯 안)가 **같은 팩터 · 같은 문장 생성기**에서
 *    나온다. 안은 **학부모 지면만** 갈린다(기준 H1 + 한 축씩 바꾼 넷).
 * 🔴 ⓐ 실데이터와 ⓑ «다 찬 달» 예시를 갈아 끼운다. ⓑ 는 **지어낸 값**이라 화면이 그렇게 적는다 —
 *    ⓑ 만 보면 «이미 되는 것»으로 읽힌다.
 *
 * 인쇄(`Ctrl+P` · Playwright `page.pdf`)하면 **학부모 A4 한 장만** 나간다(이 시안 전용 CSS 모듈).
 * ⚠️ 읽기 전용 — 아무것도 저장하지 않는다.
 */

type Props = {
  real: AchievementFactors;
  /** 그 달에 진도가 있는 학생 수 — «가장 두꺼운 학생»이 몇 중 하나인가. */
  candidates: number;
  /** 지난달에 진도가 없어 가장 최근 진도가 있는 달로 옮겼나. */
  movedToLatest: boolean;
};

const BTN =
  "cursor-pointer border px-3 py-1.5 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue";
const ON = "border-ink bg-ink font-bold text-white";
const OFF = "border-control bg-white";
const NOTE = "text-[12px] leading-relaxed text-text-2";

export function ReportHifiClient({ real, candidates, movedToLatest }: Props) {
  const [variantKey, setVariantKey] = useState<HifiVariant["key"]>("H1");
  const [mode, setMode] = useState<"real" | "example">("real");

  const realSource = useMemo<ReportSource>(
    () => ({ factors: real, teacherNote: null }),
    [real],
  );
  const exampleSource = useMemo<ReportSource>(
    () => ({
      factors: exampleFactors(real),
      teacherNote: EXAMPLE_TEACHER_NOTE,
    }),
    [real],
  );
  const source = mode === "real" ? realSource : exampleSource;
  const variant = HIFI_VARIANTS.find((v) => v.key === variantKey)!;

  return (
    <main className={styles.shell}>
      <header
        className={`${styles.noPrint} flex flex-col gap-3 border-b-[3px] border-ink pb-4`}
      >
        <h1 className="text-[22px] font-black">
          성취 리포트 — Hi-fi 5안 (D-07)
        </h1>
        <p className={NOTE}>
          <b>{real.student.name}</b> ({real.student.className}) · 기간{" "}
          {real.period.from} ~ {real.period.to} — 이 달에 진도가 가장 두꺼운
          학생입니다 (진도가 있는 학생 {candidates}명 중).
          {movedToLatest
            ? " 지난달에 진도가 없어 진도가 있는 가장 최근 달로 옮겼습니다."
            : ""}
        </p>
        <p className={NOTE}>
          원장 화면은 <b>한 벌</b>이고, 다섯 안은 <b>학부모 A4</b>만 갈립니다 —
          기준안 H1 에서 <b>축 하나씩</b>만 바꿨습니다. 인쇄하면 학부모 A4 한
          장만 나갑니다.
        </p>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Hi-fi 안"
        >
          {HIFI_VARIANTS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setVariantKey(v.key)}
              aria-pressed={variantKey === v.key}
              className={`${BTN} ${variantKey === v.key ? ON : OFF}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="보는 상태"
        >
          <button
            type="button"
            onClick={() => setMode("real")}
            aria-pressed={mode === "real"}
            className={`${BTN} ${mode === "real" ? ON : OFF}`}
          >
            ⓐ 실데이터
          </button>
          <button
            type="button"
            onClick={() => setMode("example")}
            aria-pressed={mode === "example"}
            className={`${BTN} ${mode === "example" ? ON : OFF}`}
          >
            ⓑ 다 찬 달(예시)
          </button>
        </div>
        <p className="text-[13px]">
          <b>{variant.label}</b> — {variant.axis}
        </p>
      </header>

      {mode === "example" ? (
        <p
          className={`${styles.noPrint} border-2 border-g-red px-3 py-2 text-[13px] font-bold text-g-red-text`}
        >
          예시 데이터입니다 — 실제 기록이 아닙니다. 배운 것(진도)만 실제
          기록이고 시험 · 영상 · 숙제 · 선생님 의견은 원시 행을 지어내 같은
          집계기로 만든 값입니다.
        </p>
      ) : (
        <p
          className={`${styles.noPrint} border border-divider px-3 py-2 text-[13px]`}
        >
          실데이터입니다 — 지금 숫자가 있는 기록만 담깁니다. 비어 있는 영역의
          사유는 원장 화면에만 적습니다.
        </p>
      )}

      <div className={styles.stage}>
        <div className={`${styles.noPrint} min-w-0`}>
          <p className={styles.stageLabel}>원장 화면 (한 벌)</p>
          <DirectorScreen source={source} />
        </div>
        <div className="min-w-0">
          <p className={`${styles.stageLabel} ${styles.noPrint}`}>
            학부모 A4 — {variant.label}
          </p>
          <div className={styles.sheetScroller}>
            <ParentSheet
              key={`${variant.key}-${mode}`}
              source={source}
              variant={variant}
              example={mode === "example"}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
