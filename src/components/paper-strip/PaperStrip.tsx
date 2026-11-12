"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { A4_DIMENSIONS } from "@/components/print/tokens";
import {
  EditablePaperStrip,
  type PaperStripEditable,
} from "./EditablePaperStrip";
import s from "./paper-strip.module.css";

export type { PaperStripEditable } from "./EditablePaperStrip";

/**
 * 지면 띠 — 여러 쪽을 옆으로 넘겨 보고, 쪽을 누르면 크게 보는 공용 부품.
 *
 * 개념 백지 미리보기에서 떼어 냈다(원장님 2026-10-07 «비슷한 류는 하나의 방식으로 묶기»). 지면을 여러 쪽 보여 주는 화면은
 * 이 부품을 쓴다 — 이전 · 다음 단추나 배율 단추를 따로 짓지 않는다. 지금 쓰는 곳: 개념 백지 · 교재 제작의 완성 보기.
 *
 * H3-B의 편집 격자는 `editable`로 선택한다. 선택·도구·상태·옆 미리보기는 부르는 쪽이 제공하고 기존 띠는 그대로 둔다.
 * 지면은 부르는 쪽이 그린다. 띠 모드는 배율을 CSS 변수 `--paper-strip-scale` 로 내려 주고(띠에서는 줄여서, 크게 보기에서는 한 쪽에 맞춰),
 * 지면이 그 값으로 제 크기를 줄인다. 다른 이름을 읽는 지면이면 `scaleVars` 에 그 이름을 더한다.
 */
export type PaperStripPage = {
  key: string;
  /** 지면 — 띠와 크게 보기에 같은 것이 그려진다. */
  node: ReactNode;
  /** 쪽 아래의 글. */
  caption: ReactNode;
  /** 크게 보기 단추의 이름(예: «3쪽 확대»). 없으면 누를 수 없는 자리다 — 아직 조판 중이거나 조판하지 못한 구획. */
  enlargeLabel?: string;
};

const SCALE_VAR = "--paper-strip-scale";
type PreviewZoom = "page" | "width" | number;

/** 쪽 수와 관계없이 같은 배율. 가용 폭과 높이 안에 온전한 지면을 놓는다. */
function usePageScroll(
  maxScale: number,
  scaleVars: readonly string[],
  horizontal = false,
  zoom: PreviewZoom = "page",
  fill = false,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(maxScale);
  const [edges, setEdges] = useState({ before: false, after: false });
  const measureEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const position = horizontal ? el.scrollLeft : el.scrollTop;
    const viewport = horizontal ? el.clientWidth : el.clientHeight;
    const extent = horizontal ? el.scrollWidth : el.scrollHeight;
    const before = position > 2;
    const after = position + viewport < extent - 2;
    setEdges((old) =>
      old.before === before && old.after === after ? old : { before, after },
    );
  }, [horizontal]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth - 32;
      if (width > 0) {
        const caption =
          el.querySelector("figcaption")?.getBoundingClientRect().height ?? 0;
        const remaining =
          window.innerHeight - Math.max(0, el.getBoundingClientRect().top) - 16;
        // The strip fills the viewport below its top edge (owner, 2026-10-16: a
        // large monitor left most of the output step empty), capped so some
        // page context stays visible. A stacked preview that starts below the
        // fold keeps a useful overview height until the user scrolls to it.
        const overviewHeight = Math.min(
          window.innerHeight * 0.85,
          remaining > 180 ? remaining : window.innerHeight * 0.68,
        );
        // A filled strip takes its height from the caller's flex column, so the
        // pages and the horizontal scrollbar stay inside that column. Its own
        // box height does not depend on the pages, only on that column.
        const filled =
          fill &&
          /flex$/.test(
            getComputedStyle(el.parentElement?.parentElement ?? el).display,
          );
        const height = horizontal
          ? (filled ? el.getBoundingClientRect().height : overviewHeight) -
            32 -
            caption -
            16 // padding + caption + horizontal scrollbar
          : el.clientHeight - 32;
        const widthFit = Math.min(maxScale, width / A4_DIMENSIONS.widthPx);
        setScale(
          typeof zoom === "number"
            ? zoom
            : zoom === "width" || height <= 0
              ? widthFit
              : Math.min(widthFit, height / A4_DIMENSIONS.heightPx),
        );
      }
      measureEdges();
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(el);
    if (el.firstElementChild) observer?.observe(el.firstElementChild);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [fill, horizontal, maxScale, measureEdges, zoom]);
  useEffect(() => {
    const el = ref.current;
    if (!horizontal || !el) return;
    const scrollHorizontally = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      )
        return;
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1;
      const delta = event.deltaY * unit;
      const end = el.scrollWidth - el.clientWidth;
      const next = Math.max(0, Math.min(end, el.scrollLeft + delta));
      // Release the wheel to the surrounding page when the strip reaches an end.
      if (Math.abs(next - el.scrollLeft) < 1) return;
      event.preventDefault();
      el.scrollLeft = next;
    };
    el.addEventListener("wheel", scrollHorizontally, { passive: false });
    return () => el.removeEventListener("wheel", scrollHorizontally);
  }, [horizontal]);
  return {
    ref,
    edges,
    measureEdges,
    scale,
    style: Object.fromEntries(
      [SCALE_VAR, ...scaleVars].map((name) => [name, scale]),
    ) as CSSProperties,
  };
}

function Fades({
  before,
  after,
  horizontal = false,
}: {
  before: boolean;
  after: boolean;
  horizontal?: boolean;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`${s.fade} ${horizontal ? s.fadeLeft : s.fadeTop}`}
        data-visible={before}
      />
      <span
        aria-hidden="true"
        className={`${s.fade} ${horizontal ? s.fadeRight : s.fadeBottom}`}
        data-visible={after}
      />
    </>
  );
}

const itemsOf = (desk: HTMLElement) =>
  desk.querySelectorAll<HTMLElement>("[data-strip-key]");

/** 띠의 맨 앞에 보이는 쪽과, 띠의 왼쪽 끝에서 그 쪽까지의 거리. */
function leadingItem(desk: HTMLElement) {
  const left = desk.getBoundingClientRect().left;
  for (const item of itemsOf(desk)) {
    const rect = item.getBoundingClientRect();
    if (rect.right > left + 1)
      return { key: item.dataset.stripKey!, offset: rect.left - left };
  }
  return null;
}

export type PaperStripProps = {
  pages: readonly PaperStripPage[];
  /** 띠 위의 안내 한 줄. */
  hint: ReactNode;
  /** 외부의 미리보기 바로가기가 초점을 옮길 영역. */
  id?: string;
  busy?: boolean;
  /** 띠 또는 편집 격자 영역의 이름. */
  label?: string;
  /** 띠에서의 최대 배율 — 가용 폭과 높이에 맞춰 더 줄인다. */
  maxScale?: number;
  /** 배율을 같이 내려 줄 CSS 변수 이름(`--paper-strip-scale` 은 늘 내려 준다). */
  scaleVars?: readonly string[];
  /** 띠를 이 쪽으로 옮긴다. 같은 쪽을 다시 가리키려면 `nonce` 를 바꾼다. */
  scrollTo?: { key: string; nonce: number } | null;
  /** 넘길 때마다 맨 앞에 보이는 쪽을 알린다. */
  onVisible?: (key: string) => void;
  /** 높이가 정해진 세로 flex 칸 안에서 띠가 남은 높이를 채운다(원장님 2026-10-21). 쌓일 때는 창 높이에 맞춘다. */
  fill?: boolean;
  /** Editable cards with a controlled selection and an inline aside preview. Existing strip callers are unchanged. */
  editable?: PaperStripEditable;
};

export function PaperStrip(props: PaperStripProps) {
  return props.editable ? (
    <EditablePaperStrip {...props} editable={props.editable} />
  ) : (
    <HorizontalPaperStrip {...props} />
  );
}

function HorizontalPaperStrip({
  pages,
  hint,
  id,
  busy = false,
  label = "지면 미리보기",
  // Thumbnails are bounded by the available height, not a fixed fraction.
  maxScale = 1,
  scaleVars = [],
  scrollTo,
  onVisible,
  fill = false,
}: PaperStripProps) {
  const {
    ref: deskRef,
    style,
    edges,
    measureEdges,
    scale,
  } = usePageScroll(maxScale, scaleVars, true, "page", fill);
  const [expanded, setExpanded] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  /** 보고 있는 쪽 — 그 앞에 쪽이 끼어들어도(뒤늦게 조판된 구획) 이 쪽을 제자리에 둔다. */
  const anchor = useRef<{ key: string; offset: number } | null>(null);
  const reported = useRef<string | null>(null);
  const track = () => {
    measureEdges();
    const desk = deskRef.current;
    if (!desk) return;
    const leading = leadingItem(desk);
    anchor.current = leading;
    if (leading && leading.key !== reported.current) {
      reported.current = leading.key;
      onVisible?.(leading.key);
    }
  };
  useLayoutEffect(() => {
    const desk = deskRef.current;
    const held = anchor.current;
    if (!desk || !held) return;
    const item = [...itemsOf(desk)].find(
      (el) => el.dataset.stripKey === held.key,
    );
    if (!item) return;
    const offset =
      item.getBoundingClientRect().left - desk.getBoundingClientRect().left;
    if (Math.abs(offset - held.offset) > 1)
      desk.scrollLeft += offset - held.offset;
  }, [deskRef, pages, scale]);
  const target = scrollTo?.key;
  const nonce = scrollTo?.nonce;
  // 쪽이 아직 없을 때 가리켰으면, 그 쪽이 생긴 뒤에 옮긴다.
  const targetPresent =
    target !== undefined && pages.some((page) => page.key === target);
  useEffect(() => {
    const desk = deskRef.current;
    if (!desk || target === undefined || !targetPresent) return;
    const item = [...itemsOf(desk)].find(
      (el) => el.dataset.stripKey === target,
    );
    if (!item) return;
    const left =
      item.getBoundingClientRect().left -
      desk.getBoundingClientRect().left +
      desk.scrollLeft -
      16;
    // 값을 바로 넣는다 — 띠를 미끄러뜨리지 않고 그 쪽에서 연다.
    desk.scrollLeft = left;
    anchor.current = { key: target, offset: 16 };
  }, [deskRef, target, nonce, targetPresent]);
  const enlargeable = pages.filter((page) => page.enlargeLabel !== undefined);
  return (
    <>
      <p className={s.hint}>{hint}</p>
      <div className={`${s.frame} ${fill ? s.fillFrame : ""}`}>
        <div
          id={id}
          ref={deskRef}
          className={`${s.desk} ${s.thumbnailDesk}`}
          style={style}
          onScroll={track}
          tabIndex={0}
          role="region"
          aria-label={label}
          aria-busy={busy}
          data-paper-desk=""
        >
          <div className={`${s.pages} ${s.thumbnailPages}`}>
            {pages.map((page) => (
              <figure
                className={s.pageItem}
                key={page.key}
                data-strip-key={page.key}
              >
                <div className={s.thumbnail}>
                  {page.node}
                  {page.enlargeLabel !== undefined && (
                    <button
                      type="button"
                      className={s.enlarge}
                      aria-label={page.enlargeLabel}
                      onClick={(event) => {
                        opener.current = event.currentTarget;
                        setExpanded(page.key);
                      }}
                    />
                  )}
                </div>
                <figcaption className={s.pageNumber}>{page.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        <Fades {...edges} horizontal />
      </div>
      {expanded !== null && (
        <ExpandedPages
          pages={enlargeable}
          start={Math.max(
            0,
            enlargeable.findIndex((page) => page.key === expanded),
          )}
          scaleVars={scaleVars}
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
  scaleVars,
  returnFocus,
  onClose,
}: {
  pages: readonly PaperStripPage[];
  start: number;
  scaleVars: readonly string[];
  returnFocus: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const [current, setCurrent] = useState(start);
  const [zoom, setZoom] = useState<PreviewZoom>("page");
  const currentRef = useRef(start);
  const {
    ref: deskRef,
    style,
    edges,
    measureEdges,
    scale,
  } = usePageScroll(1, scaleVars, false, zoom);
  const titleId = useId();
  const goTo = useCallback(
    (index: number) => {
      const el = deskRef.current;
      const item = items.current[index];
      if (!el || !item || index < 0 || index >= pages.length) return;
      el.scrollTop =
        item.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop -
        16;
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
        if (
          (event.target as HTMLElement).closest("select, input, textarea") ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          goTo(current + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <header className={s.toolbar}>
        <h2 id={titleId}>지면 확대 보기</h2>
        <label className={s.zoomControl}>
          확대
          <select
            aria-label="미리보기 확대"
            value={zoom}
            onChange={(event) => {
              const value = event.target.value;
              setZoom(
                value === "page" || value === "width" ? value : Number(value),
              );
            }}
          >
            <option value="page">한 쪽 맞춤</option>
            <option value="width">너비 맞춤</option>
            {[0.5, 0.65, 0.85, 1, 1.25].map((value) => (
              <option key={value} value={value}>
                {Math.round(value * 100)}%
              </option>
            ))}
          </select>
        </label>
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
                {page.node}
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
