"use client";

import { useEffect, useState } from "react";
import {
  createLocalFadingRelearnSource,
  type LocalFadingRelearnSource,
} from "@/lib/fading/relearnLocal";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import type { FadingConcept } from "@/lib/fading/concepts";
import type { FadingTrap } from "@/lib/fading/chips";
import type { FadingFigure } from "@/lib/fading/figures";
import { chipTray } from "@/lib/fading/chips";
import { erasedTargets } from "@/lib/fading/erasure";
import {
  createLocalFadingSource,
  type LocalFadingSource,
} from "@/lib/fading/local";
import { fadingDateOf, fadingDayOfDate } from "@/lib/fading/schedule";
import { newFadingId } from "@/lib/fading/source";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import styles from "./preview.module.css";

type Props = {
  concepts: FadingConcept[];
  traps: Record<string, FadingTrap[]>;
  figures: Record<string, FadingFigure>;
  explorer: ExplorerState;
  today: string;
};

declare global {
  interface Window {
    __EXPLORER_SRS_PREVIEW__?: {
      source: LocalFadingSource;
      concepts: FadingConcept[];
      relearn?: LocalFadingRelearnSource;
      advance?: (milliseconds: number) => void;
    };
  }
}

async function createPreviewSource({ concepts, traps, figures, today }: Props) {
  const source = createLocalFadingSource({
    concepts,
    traps,
    figures,
    cards: true,
    today,
    defaultGrade: "초3",
    fresh: () => ({ sessionId: newFadingId(), seed: 42 }),
  });
  source.setToday(fadingDateOf(fadingDayOfDate(today) - 7));
  for (const concept of concepts.slice(0, 3)) {
    await source.act({ action: "pick", conceptId: concept.id });
    const opened = await source.act({ action: "open", conceptId: concept.id });
    const ref = { conceptId: concept.id, sessionId: opened.session!.id };
    await source.act({ action: "read", ...ref });
    for (const step of [2, 3, 4] as const) {
      const tray = chipTray(concept, step, {
        seed: opened.session!.seed,
        traps: opened.opened!.traps,
      });
      const placements = erasedTargets(concept, step).map((target) =>
        step === 4
          ? { targetId: target.id, text: target.text }
          : {
              targetId: target.id,
              chipId: tray.find(
                (chip) => chip.text === target.text.trim().replace(/\s+/g, " "),
              )!.id,
            },
      );
      await source.act({ action: "step", ...ref, step, placements });
    }
    await source.act({
      action: "rate",
      ...ref,
      rating: "good",
      requestId: newFadingId(),
    });
  }
  source.setToday(today);
  return source;
}

function createPreviewRelearn(source: LocalFadingSource, props: Props) {
  let offset = 0;
  const started = performance.now();
  const base = Date.parse(`${props.today}T03:00:00Z`);
  return {
    source: createLocalFadingRelearnSource({
      main: source,
      concepts: props.concepts,
      traps: props.traps,
      now: () => base + Math.floor(performance.now() - started) + offset,
    }),
    advance: (milliseconds: number) => {
      offset += milliseconds;
    },
  };
}

export function ExplorerSrsPreview(props: Props) {
  const [mode, setMode] = useState<"pc" | "mobile">("pc");
  const [source, setSource] = useState<LocalFadingSource | null>(null);
  const [shortRecall, setShortRecall] = useState<ReturnType<
    typeof createPreviewRelearn
  > | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void createPreviewSource(props)
      .then((next) => {
        if (live) {
          setShortRecall(createPreviewRelearn(next, props));
          setSource(next);
        }
      })
      .catch((error) => {
        if (live)
          setFailure(
            error instanceof Error
              ? error.message
              : "미리 보기를 준비하지 못했습니다.",
          );
      });
    return () => {
      live = false;
    };
  }, [props]);
  useEffect(() => {
    if (!source) return;
    const fixture = {
      source,
      concepts: props.concepts,
      relearn: shortRecall?.source,
      advance: shortRecall?.advance,
    };
    window.__EXPLORER_SRS_PREVIEW__ = fixture;
    return () => {
      if (window.__EXPLORER_SRS_PREVIEW__ === fixture)
        delete window.__EXPLORER_SRS_PREVIEW__;
    };
  }, [source, props.concepts, shortRecall]);
  return (
    <div className={styles.page}>
      <div className={styles.toolbar} aria-label="미리 보기 화면 크기">
        <button
          type="button"
          aria-pressed={mode === "pc"}
          onClick={() => setMode("pc")}
        >
          PC 미리 보기
        </button>
        <button
          type="button"
          aria-pressed={mode === "mobile"}
          onClick={() => setMode("mobile")}
        >
          모바일 미리 보기
        </button>
        <p>미리 보기 · 학습 결과는 저장되지 않습니다</p>
      </div>
      {failure ? (
        <p role="alert">{failure}</p>
      ) : source ? (
        <div className={styles.frame} data-preview-mode={mode}>
          <StudentAppShell student={props.explorer.student} preview>
            <StudentMathExplorers
              conceptMemoryEnabled
              fadingSource={source}
              fadingRelearnSource={shortRecall?.source}
              initialState={props.explorer}
              journeyTheme="classic"
              preview
            />
          </StudentAppShell>
        </div>
      ) : (
        <p role="status">미리 보기를 준비하고 있습니다…</p>
      )}
    </div>
  );
}
