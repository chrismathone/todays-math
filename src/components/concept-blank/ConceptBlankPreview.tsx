"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from "react";
import { A4_DIMENSIONS } from "@/components/print/tokens";
import {
  conceptBlankPages,
  type ConceptBlankPaperProps,
} from "./ConceptBlankPaper";
import s from "./preview.module.css";

/** 쪽 수와 관계없이 같은 배율. 작은 화면에서만 가로 폭에 맞춘다. */
function usePageScroll(maxScale: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(maxScale);
  const [edges, setEdges] = useState({ above: false, below: false });
  const measureEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const above = el.scrollTop > 2;
    const below = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setEdges((old) =>
      old.above === above && old.below === below ? old : { above, below },
    );
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const available = el.clientWidth - 32;
      if (available > 0)
        setScale(Math.min(maxScale, available / A4_DIMENSIONS.widthPx));
      measureEdges();
    };
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    measure();
    return () => observer.disconnect();
  }, [maxScale, measureEdges]);
  return {
    ref,
    edges,
    measureEdges,
    scale,
    style: { "--cb-paper-scale": scale } as CSSProperties,
  };
}

function Fades({ above, below }: { above: boolean; below: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`${s.fade} ${s.fadeTop}`}
        data-visible={above}
      />
      <span
        aria-hidden="true"
        className={`${s.fade} ${s.fadeBottom}`}
        data-visible={below}
      />
    </>
  );
}

export default function ConceptBlankPreview({
  sheets,
  view,
  code,
}: ConceptBlankPaperProps) {
  const pages = useMemo(
    () => conceptBlankPages({ sheets, view, code }),
    [sheets, view, code],
  );
  const { ref: deskRef, style, edges, measureEdges } = usePageScroll(0.58);
  const [expanded, setExpanded] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <p className={s.hint}>
        페이지를 누르면 크게 볼 수 있습니다. · {pages.length}쪽
      </p>
      <div className={s.frame}>
        <div
          ref={deskRef}
          className={s.desk}
          style={style}
          onScroll={measureEdges}
          tabIndex={0}
          role="region"
          aria-label="지면 미리보기"
          data-paper-desk=""
        >
          <div className={s.pages}>
            {pages.map((page, i) => (
              <div className={s.thumbnail} key={page.key}>
                {page}
                <button
                  type="button"
                  className={s.enlarge}
                  aria-label={`${i + 1}쪽 확대`}
                  onClick={(event) => {
                    opener.current = event.currentTarget;
                    setExpanded(i);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <Fades {...edges} />
      </div>
      {expanded !== null && (
        <ExpandedPages
          pages={pages}
          start={expanded}
          returnFocus={opener}
          onClose={() => setExpanded(null)}
        />
      )}
    </>
  );
}

function ExpandedPages({
  pages,
  start,
  returnFocus,
  onClose,
}: {
  pages: ReactElement[];
  start: number;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const [current, setCurrent] = useState(start);
  const currentRef = useRef(start);
  const { ref: deskRef, style, edges, measureEdges, scale } = usePageScroll(1);
  const titleId = useId();
  const goTo = useCallback(
    (index: number) => {
      const el = deskRef.current;
      const item = items.current[index];
      if (!el || !item || index < 0 || index >= pages.length) return;
      el.scrollTo({
        top:
          item.getBoundingClientRect().top -
          el.getBoundingClientRect().top +
          el.scrollTop -
          16,
      });
      currentRef.current = index;
      setCurrent(index);
      measureEdges();
    },
    [deskRef, measureEdges, pages.length],
  );
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    const opener = returnFocus.current;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => goTo(currentRef.current));
    return () => cancelAnimationFrame(frame);
  }, [scale, goTo]);
  const track = () => {
    measureEdges();
    const el = deskRef.current;
    if (!el) return;
    const line = el.getBoundingClientRect().top + el.clientHeight / 3;
    let index = 0;
    items.current.forEach((item, i) => {
      if (item && item.getBoundingClientRect().top <= line) index = i;
    });
    currentRef.current = index;
    setCurrent(index);
  };
  return (
    <dialog
      ref={dialogRef}
      className={s.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          goTo(current + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <header className={s.toolbar}>
        <h2 id={titleId}>지면 확대 보기</h2>
        <div className={s.navigation}>
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
          >
            ←
          </button>
          <span aria-live="polite">
            {current + 1} / {pages.length}쪽
          </span>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={current === pages.length - 1}
            onClick={() => goTo(current + 1)}
          >
            →
          </button>
        </div>
        <button type="button" ref={closeRef} onClick={onClose}>
          닫기
        </button>
      </header>
      <div className={`${s.frame} ${s.expandedFrame}`}>
        <div
          ref={deskRef}
          className={`${s.desk} ${s.expandedDesk}`}
          style={style}
          tabIndex={0}
          role="region"
          aria-label="확대한 지면"
          onScroll={track}
        >
          <div className={s.pages}>
            {pages.map((page, i) => (
              <div
                ref={(el) => {
                  items.current[i] = el;
                }}
                className={s.expandedPage}
                key={page.key}
              >
                {page}
              </div>
            ))}
          </div>
        </div>
        <Fades {...edges} />
      </div>
      <p className={s.dialogHint}>
        스크롤하거나 ← → 키로 페이지를 이동합니다. Esc로 닫습니다.
      </p>
    </dialog>
  );
}
