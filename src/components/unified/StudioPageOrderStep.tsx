"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  PaperStrip,
  type PaperStripPage,
} from "@/components/paper-strip/PaperStrip";
import {
  activePageOrder,
  pageNumber,
  studioPageKey,
  type StudioPageMove,
  type StudioOrderedPage,
} from "./studioPageOrder";
import s from "./StudioPageOrder.module.css";

type PagePreview = { url: string; error?: string; loading?: boolean };

export type StudioPageOrderProps = {
  sources: readonly { id: string; name: string; pages: number }[];
  order: readonly StudioOrderedPage[];
  previews: Readonly<Record<string, PagePreview>>;
  busy?: boolean;
  onMove: (key: string, direction: StudioPageMove) => void;
  onToggle: (key: string) => void;
  onRetryPreview?: (key: string) => void;
};

const FILE_COLORS = [
  "var(--learn-accent)",
  "var(--learn-done)",
  "var(--learn-warning)",
];

/** Browser-local page images must bypass the Next image optimizer. */
function Preview({
  preview,
  identity,
  busy,
  onRetry,
}: {
  preview?: PagePreview;
  identity: string;
  busy: boolean;
  onRetry?: () => void;
}) {
  // A fresh result may have the same URL. Track the failed result, not its bytes.
  const [failedPreview, setFailedPreview] = useState<PagePreview | null>(null);
  const { url, error, loading } = preview ?? {};
  const failed = !!error || (!!preview && failedPreview === preview);
  if (failed || loading) {
    return (
      <div className={s.placeholder} aria-busy={loading || undefined}>
        <span>
          {loading ? "미리보기 준비 중" : "미리보기를 불러오지 못했습니다."}
        </span>
        {!loading && error && <span>{error}</span>}
        {onRetry && (failed || url) && (
          <button
            type="button"
            className={s.button}
            aria-label={`${identity} 미리보기 다시 시도`}
            disabled={busy || loading}
            onClick={onRetry}
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }
  if (!url) return <div className={s.placeholder}>미리보기 준비 중</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Browser-local blob URLs bypass the image optimizer.
    <img
      className={s.image}
      src={url}
      alt={identity}
      draggable={false}
      onError={() => setFailedPreview(preview!)}
    />
  );
}

/** H3-B owns only selection and gestures. The parent/model own order and history. */
export default function StudioPageOrder({
  sources,
  order,
  previews,
  busy = false,
  onMove,
  onToggle,
  onRetryPreview,
}: StudioPageOrderProps) {
  const active = activePageOrder(order);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected =
    order.find((page) => studioPageKey(page) === selectedKey) ??
    active[0] ??
    order[0];
  const selectedId = selected ? studioPageKey(selected) : null;
  const selectedNumber = selectedId ? pageNumber(order, selectedId) : null;
  const selectedActiveIndex = active.findIndex(
    (page) => studioPageKey(page) === selectedId,
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const dragKey = useRef<string | null>(null);
  const [drop, setDrop] = useState<{
    target: string;
    edge: "before" | "after";
    before: string | null;
  } | null>(null);
  const sourceMap = new Map(
    sources.map((source, index) => [
      source.id,
      { ...source, color: FILE_COLORS[index % FILE_COLORS.length] },
    ]),
  );
  const orderedPages = new Map(
    order.map((page) => [studioPageKey(page), page]),
  );
  const sourceOf = (page: StudioOrderedPage) => sourceMap.get(page.sourceId);
  const identity = (page: StudioOrderedPage) =>
    `${sourceOf(page)?.name ?? "원본 파일"} 원본 ${page.page}쪽`;
  const accent = (page: StudioOrderedPage) =>
    sourceOf(page)?.color ?? FILE_COLORS[0];
  const canMoveBack = !!selected && !selected.out && selectedActiveIndex > 0;
  const canMoveForward =
    !!selected && !selected.out && selectedActiveIndex < active.length - 1;

  const move = (
    direction: Extract<StudioPageMove, string>,
    key = selectedId,
  ) => {
    if (busy || !key) return;
    const moving = order.find((page) => studioPageKey(page) === key);
    if (!moving || moving.out) return;
    const index = active.findIndex((page) => studioPageKey(page) === key);
    if (
      direction === "first" || direction === "previous"
        ? index <= 0
        : index >= active.length - 1
    )
      return;
    setSelectedKey(key);
    onMove(key, direction);
  };

  // Excluded pages remain selectable, but navigation goes to a live neighbor.
  const neighbor = (direction: -1 | 1) => {
    if (!selected) return undefined;
    if (!selected.out) return active[selectedActiveIndex + direction];
    const index = order.findIndex((page) => studioPageKey(page) === selectedId);
    return direction === 1
      ? order.slice(index + 1).find((page) => !page.out)
      : order.slice(0, index).findLast((page) => !page.out);
  };
  const navigate = (direction: -1 | 1) => {
    const page = neighbor(direction);
    if (page) setSelectedKey(studioPageKey(page));
  };
  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (
      !selected ||
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.closest(
          'input, select, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]',
        ))
    )
      return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    if (event.altKey) {
      const handle =
        target instanceof HTMLElement
          ? target.closest<HTMLElement>("button[data-studio-page-key]")
          : null;
      move(
        direction === -1 ? "previous" : "next",
        handle?.dataset.studioPageKey ?? selectedId,
      );
    } else navigate(direction);
  };
  const toggle = (key: string) => {
    if (busy) return;
    setSelectedKey(key);
    onToggle(key);
  };
  const clearDrag = () => {
    dragKey.current = null;
    setDragging(null);
    setDrop(null);
  };
  const dragStart = (
    event: DragEvent<HTMLButtonElement>,
    page: StudioOrderedPage,
  ) => {
    if (busy || page.out) {
      event.preventDefault();
      return;
    }
    const key = studioPageKey(page);
    dragKey.current = key;
    setDragging(key);
    setSelectedKey(key);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
    const card = event.currentTarget.closest("figure");
    if (card) event.dataTransfer.setDragImage(card, 24, 24);
  };
  const destination = (
    event: DragEvent<HTMLElement>,
    page: StudioOrderedPage,
  ) => {
    const moving = dragKey.current;
    if (
      busy ||
      !moving ||
      studioPageKey(page) === moving ||
      !order.some((item) => studioPageKey(item) === moving && !item.out)
    )
      return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientX > rect.left + rect.width / 2;
    const index = order.findIndex(
      (item) => studioPageKey(item) === studioPageKey(page),
    );
    const before = after
      ? order.slice(index + 1).find((item) => studioPageKey(item) !== moving)
      : page;
    const beforeKey = before ? studioPageKey(before) : null;
    // Dropping straight back into the current gap is not an edit.
    const movingIndex = order.findIndex(
      (item) => studioPageKey(item) === moving,
    );
    const currentNext = order[movingIndex + 1];
    if (beforeKey === (currentNext ? studioPageKey(currentNext) : null))
      return null;
    return {
      target: studioPageKey(page),
      edge: after ? ("after" as const) : ("before" as const),
      before: beforeKey,
    };
  };
  const handleDragOver = (
    event: DragEvent<HTMLElement>,
    page: StudioOrderedPage,
  ) => {
    const next = destination(event, page);
    setDrop(next);
    if (!next) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (
    event: DragEvent<HTMLElement>,
    page: StudioOrderedPage,
  ) => {
    const next = destination(event, page);
    const moving = dragKey.current;
    if (next && moving) {
      event.preventDefault();
      onMove(moving, { before: next.before });
    }
    clearDrag();
  };

  const cards: PaperStripPage[] = order.map((page) => {
    const key = studioPageKey(page);
    const number = pageNumber(order, key);
    const name = sourceOf(page)?.name ?? "원본 파일";
    return {
      key,
      node: (
        <Preview
          key={key}
          preview={previews[key]}
          identity={identity(page)}
          busy={busy}
          onRetry={onRetryPreview ? () => onRetryPreview(key) : undefined}
        />
      ),
      enlargeLabel: `${identity(page)} 크게 보기`,
      caption: (
        <div key={key} className={s.caption}>
          <div className={s.captionIdentity} title={identity(page)}>
            <strong className={s.number}>
              {page.out ? "뺀 쪽" : `새 ${number}쪽`}
            </strong>
            <span className={s.original}>
              {name.replace(/\.[^.]+$/, "")} 원본 {page.page}쪽
            </span>
          </div>
          <button
            type="button"
            className={page.out ? s.restore : s.exclude}
            disabled={busy}
            aria-label={`${identity(page)} ${page.out ? "되살리기" : "빼기"}`}
            onClick={() => toggle(key)}
          >
            {page.out ? "되살리기" : <span aria-hidden="true">−</span>}
          </button>
        </div>
      ),
    };
  });
  const byKey = (key: string) => orderedPages.get(key)!;
  const autoExcluded = order.filter((page) => page.out && page.autoOut);

  return (
    <section
      className={s.root}
      role="region"
      aria-label="쪽 순서 편집"
      tabIndex={0}
      onKeyDown={handleKeys}
    >
      <div className={s.fileRow}>
        <div className={s.files} aria-label="원본 파일">
          {sources.map((source, index) => (
            <span className={s.fileChip} key={source.id}>
              <span
                className={s.swatch}
                style={{ background: FILE_COLORS[index % FILE_COLORS.length] }}
                aria-hidden="true"
              />
              <b>{source.name}</b>
              <span className={s.filePages}>{source.pages}쪽</span>
            </span>
          ))}
        </div>
        <span className={s.summary}>
          시작할 쪽 {active.length} · 뺀 쪽 {order.length - active.length}
        </span>
      </div>
      <PaperStrip
        pages={cards}
        hint={null}
        label="쪽 카드"
        busy={busy}
        editable={{
          selectedKey: selectedId,
          onSelect: setSelectedKey,
          before: (
            <>
              {autoExcluded.map((page) => (
                <div className={s.notice} key={studioPageKey(page)}>
                  <span>
                    {identity(page)}은{" "}
                    {page.autoOut === "빈 쪽"
                      ? "빈 쪽으로 보여 미리 뺐습니다 — 인쇄된 내용이 거의 없습니다."
                      : "이전 작업에서 뺀 쪽입니다."}
                  </span>
                  <button
                    type="button"
                    className={s.button}
                    disabled={busy}
                    aria-label={`${identity(page)} ${page.autoOut === "빈 쪽" ? "미리 뺀 쪽" : "이전 작업에서 뺀 쪽"} 되살리기`}
                    onClick={() => toggle(studioPageKey(page))}
                  >
                    되살리기
                  </button>
                </div>
              ))}
              {active.length === 0 && (
                <p className={s.empty} role="status">
                  {order.length
                    ? "시작할 쪽이 없습니다. 쪽을 되살려 주세요."
                    : "원본 파일을 올려 주세요."}
                </p>
              )}
            </>
          ),
          toolbar: (card) => {
            const page = byKey(card.key);
            return (
              !page.out && (
                <button
                  type="button"
                  className={s.grip}
                  draggable={!busy}
                  disabled={busy}
                  data-studio-page-key={card.key}
                  aria-label={`${identity(page)} 끌어서 옮기기`}
                  title="끌어서 옮기기"
                  onClick={() => setSelectedKey(card.key)}
                  onDragStart={(event) => dragStart(event, page)}
                  onDragEnd={clearDrag}
                >
                  <span aria-hidden="true">⠿</span>
                </button>
              )
            );
          },
          overlay: (card) =>
            byKey(card.key).out ? <span className={s.badge}>뺌</span> : null,
          itemProps: (card) => ({
            style: {
              "--paper-strip-accent": accent(byKey(card.key)),
            } as CSSProperties,
            "data-excluded": byKey(card.key).out,
            "data-dragging": dragging === card.key,
            "data-drop": drop?.target === card.key ? drop.edge : undefined,
            onDragOver: (event) => handleDragOver(event, byKey(card.key)),
            onDrop: (event) => handleDrop(event, byKey(card.key)),
            onDragLeave: (event) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              )
                setDrop(null);
            },
          }),
          aside: selected ? (
            <>
              <div className={s.sideHeading}>
                <h2>{selected.out ? "뺀 쪽" : `새 ${selectedNumber}쪽`}</h2>
                <div className={s.sideNavigation}>
                  <button
                    type="button"
                    className={s.iconButton}
                    aria-label="앞 쪽 보기"
                    disabled={!neighbor(-1)}
                    onClick={() => navigate(-1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={s.iconButton}
                    aria-label="다음 쪽 보기"
                    disabled={!neighbor(1)}
                    onClick={() => navigate(1)}
                  >
                    →
                  </button>
                </div>
              </div>
              <div className={s.big}>
                <Preview
                  key={selectedId}
                  preview={previews[selectedId!]}
                  identity={identity(selected)}
                  busy={busy}
                  onRetry={
                    onRetryPreview
                      ? () => onRetryPreview(selectedId!)
                      : undefined
                  }
                />
              </div>
              <p className={s.where}>
                {selected.out ? "뺀 쪽" : `새 ${selectedNumber}쪽`} ←{" "}
                <span
                  className={s.swatch}
                  style={{ background: accent(selected) }}
                  aria-hidden="true"
                />
                {identity(selected)}
              </p>
              {!selected.out && (
                <div className={s.moveButtons}>
                  <button
                    type="button"
                    className={s.button}
                    disabled={busy || !canMoveBack}
                    onClick={() => move("first")}
                  >
                    맨 앞
                  </button>
                  <button
                    type="button"
                    className={s.button}
                    disabled={busy || !canMoveBack}
                    onClick={() => move("previous")}
                  >
                    앞으로
                  </button>
                  <button
                    type="button"
                    className={s.button}
                    disabled={busy || !canMoveForward}
                    onClick={() => move("next")}
                  >
                    뒤로
                  </button>
                  <button
                    type="button"
                    className={s.button}
                    disabled={busy || !canMoveForward}
                    onClick={() => move("last")}
                  >
                    맨 뒤
                  </button>
                </div>
              )}
              <button
                type="button"
                className={s.button}
                disabled={busy}
                onClick={() => toggle(selectedId!)}
              >
                {selected.out ? "되살리기" : "이 쪽 빼기"}
              </button>
              <p className={s.keyboardHint}>
                <kbd>←</kbd> <kbd>→</kbd> 쪽 넘기기 · <kbd>Alt</kbd>+
                <kbd>←</kbd> <kbd>→</kbd> 옮기기
              </p>
            </>
          ) : (
            <h2 className={s.sideEmpty}>쪽을 고르세요</h2>
          ),
        }}
      />
    </section>
  );
}
