"use client";

/**
 * 오늘의 영어 지면 — 쪽 나눔 측정 (D-148 · 25 §5). `useMeasuredPages` 의 결:
 * 화면 밖 숨은 틀에 **출력과 같은 컴포넌트·같은 폭·같은 글꼴**로 한 번 그려 블록 높이를 재고,
 * 머리만 있는 빈 쪽 둘로 첫 쪽·이어지는 쪽의 본문 높이를 잰 뒤 `packEnglishBlocks` 로 채운다.
 *
 * 🔴 글꼴이 실리기 전에 재면 대체 글꼴 폭으로 잰다(교훈 2026-09-29 «재기 전에 글꼴을 싣는다») —
 *    `document.fonts.ready` 를 기다리고 두 프레임 뒤에 잰다. 그 뒤 크기가 바뀌면(늦게 실린 글꼴)
 *    `ResizeObserver` 가 다시 잰다.
 * 🔴 인쇄 매체에서 숨은 틀은 `display: none` 이라 높이가 0 이다 — 그때는 지난 측정을 지킨다.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  EnglishPaper,
  englishPaperSelection,
  type EnglishPaperProps,
} from "./EnglishPaper";
import styles from "./EnglishPrint.module.css";
import {
  ENGLISH_PARAGRAPH_GAP,
  englishPaperBlocks,
  packEnglishBlocks,
  type EnglishPackResult,
  type EnglishPaperSelection,
} from "./englishPaperLayout";

const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

interface Measured {
  key: string;
  result: EnglishPackResult;
  avail: { first: number; cont: number };
}

export interface EnglishPagesState {
  /** 잰 쪽 나눔 — 재기 전이면 `undefined`(지면은 한 쪽에 전부 그린다) */
  pages: EnglishPackResult["pages"] | undefined;
  ready: boolean;
  /** 본문 자리가 40px 도 안 나온다 — 틀이 깨진 것이므로 쪽 나눔을 믿지 않는다 */
  layoutError: boolean;
  /** 혼자서도 한 쪽에 안 들어가는 블록 번호 */
  oversized: number[];
  /** 화면 밖 측정 틀 — 미리보기가 어딘가에 붙여야 잰다 */
  measureNode: ReactNode;
}

export function useEnglishPages(
  props: Omit<EnglishPaperProps, "pages">,
): EnglishPagesState {
  const host = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const {
    set,
    exam,
    view,
    academyName,
    bundle,
    teacherNotes,
    questionNumbers,
  } = props;
  // 묶음 · 교사용 안내 줄이 바뀌면 실리는 블록과 머리 높이가 바뀐다 — 다시 잰다(D-151)
  const key = useMemo(
    () =>
      JSON.stringify([
        set,
        exam,
        view,
        academyName,
        bundle,
        teacherNotes,
        questionNumbers,
      ]),
    [set, exam, view, academyName, bundle, teacherNotes, questionNumbers],
  );
  // 🔴 재는 쪽과 그리는 쪽이 같은 블록 목록을 써야 한다 — 묶음을 빼고 재면 잰 높이가 엉뚱한 문항에 붙는다
  //    (묶음 객체는 그릴 때마다 새로 만들어질 수 있어, 내용으로 견주려고 글자로 바꿔 의존에 건다)
  const selectionKey = JSON.stringify(
    englishPaperSelection(view, bundle) ?? null,
  );
  const blocks = useMemo(
    () =>
      englishPaperBlocks(
        set,
        (JSON.parse(selectionKey) as EnglishPaperSelection | null) ?? undefined,
      ),
    [set, selectionKey],
  );
  const paragraphCount = blocks.filter(
    (block) => block.kind === "passage",
  ).length;

  useEffect(() => {
    let cancelled = false;
    let scheduled = 0;
    let observer: ResizeObserver | undefined;

    const measure = () => {
      const root = host.current;
      if (cancelled || !root || !root.getClientRects().length) return;
      const items = root.querySelector<HTMLElement>("[data-measure-items]");
      if (!items) return;
      const heights = blocks.map(
        (_, index) =>
          items
            .querySelector<HTMLElement>(`[data-measure-idx="${index}"]`)
            ?.getBoundingClientRect().height ?? 0,
      );
      const box = items.querySelector<HTMLElement>("[data-english-passage]");
      const paragraphSum = heights
        .slice(0, paragraphCount)
        .reduce((sum, height) => sum + height, 0);
      const passageChrome = box
        ? Math.max(
            0,
            box.getBoundingClientRect().height -
              paragraphSum -
              ENGLISH_PARAGRAPH_GAP * Math.max(0, paragraphCount - 1),
          )
        : 0;
      const bodyHeight = (page: number) => {
        const body = root.querySelector<HTMLElement>(
          `[data-measure-probe] [data-english-body="${page}"]`,
        );
        if (!body) return 0;
        const style = getComputedStyle(body);
        return (
          body.getBoundingClientRect().height -
          (parseFloat(style.paddingTop) || 0) -
          (parseFloat(style.paddingBottom) || 0)
        );
      };
      const avail = { first: bodyHeight(1), cont: bodyHeight(2) };
      const result = packEnglishBlocks({
        blocks: blocks.map((block, index) => ({
          kind: block.kind,
          height: heights[index] ?? 0,
        })),
        avail,
        passageChrome,
      });
      setMeasured((previous) => {
        const next = { key, result, avail };
        return previous && JSON.stringify(previous) === JSON.stringify(next)
          ? previous
          : next;
      });
    };

    void (async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* 글꼴 상태를 못 읽는 환경 — 그대로 잰다 */
      }
      await frame();
      await frame();
      if (cancelled) return;
      measure();
      if (typeof ResizeObserver !== "undefined" && host.current) {
        observer = new ResizeObserver(() => {
          cancelAnimationFrame(scheduled);
          scheduled = requestAnimationFrame(measure);
        });
        host.current
          .querySelectorAll<HTMLElement>(
            "[data-measure-idx], [data-english-body]",
          )
          .forEach((element) => observer!.observe(element));
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelAnimationFrame(scheduled);
    };
  }, [key, blocks, paragraphCount]);

  const ready = measured?.key === key;
  const layoutError =
    ready && (measured.avail.first < 40 || measured.avail.cont < 40);
  const everything = useMemo(() => [blocks.map((_, index) => index)], [blocks]);
  const measureNode = (
    <div aria-hidden="true" className={styles.measureHost} ref={host}>
      <div data-measure-items>
        <EnglishPaper {...props} pages={everything} />
      </div>
      <div data-measure-probe>
        <EnglishPaper {...props} pages={[[], []]} />
      </div>
    </div>
  );

  // 🔴 틀이 깨졌으면(layoutError) 쪽 나눔도 «너무 큼» 목록도 믿지 않는다 — 본문이 40px 도 안 되면
  //    모든 블록이 oversized 로 잡혀 소음만 된다(리드 검토 D1, 2026-09-30).
  return {
    pages: ready && !layoutError ? measured.result.pages : undefined,
    ready,
    layoutError,
    oversized: ready && !layoutError ? measured.result.oversized : [],
    measureNode,
  };
}
