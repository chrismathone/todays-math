"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { StudioCrop } from "./studioHelpers";
import type { StudioProblem } from "./types";
import {
  studioCartLabel,
  studioCartMeaning,
  studioCartRows,
  studioCartState,
  type StudioCartRemoval,
  type StudioCartState,
} from "./studioCart";
import { worksheetRowLabel } from "./worksheetOrder";
import studio from "./StudioView.module.css";
import s from "./StudioCart.module.css";

/**
 * 담음 표시 — 카드 바닥 줄 끝·② 자른 문제 목록이 같은 글자·같은 모양을 쓴다. 읽기 전용.
 * 줄인 글자(«반영 전»)는 보이기만 하고, 긴 뜻(«담음 · 고친 내용 반영 전»)은 숨은 글자로 읽고
 * 마우스를 올리면 `title` 로 보인다(원장님 2026-09-21 확정, 트랙 47). 줄이지 않은 글자는 그대로 읽는다.
 */
export function StudioCartChip({ state }: { state: StudioCartState }) {
  const label = studioCartLabel(state);
  const meaning = studioCartMeaning(state);
  if (!label) return null;
  return meaning === label ? (
    <span className={s.chip} data-state={state} data-studio-cart-chip>
      {label}
    </span>
  ) : (
    <span
      className={s.chip}
      data-state={state}
      data-studio-cart-chip
      title={meaning ?? undefined}
    >
      <span aria-hidden="true">{label}</span>
      <span className={s.srOnly}>{meaning}</span>
    </span>
  );
}

/**
 * 담은 문항 목록 — 안 D(원장님 2026-09-21 확정, 트랙 44). 시안 `e2e/cart-review/wire.tsx` 의 안 D 그대로.
 *
 * - 범위는 **시험지 전체**다 — 문제은행에서 담은 것까지, 출처(이 원본·내 자료·문제은행)를 붙인다.
 * - 줄마다 × 로 뺀다(④·문제은행과 같은 빼기 길). 뺀 줄은 흐리게 남아 «다시 담기»로 제자리에 돌린다 —
 *   편집창 확대 중에는 위 알림 줄의 «되돌리기»가 안 닿아(바깥이 inert), 되돌리기를 여기 둔 것이다.
 * - 이 원본 문항은 이름을 누르면 그 검수 카드로 간다. 줄 자체는 누르는 표면이 아니다(D-30).
 */
export default function StudioCartPanel({
  id,
  crops,
  picked,
  removed,
  canExport,
  onJump,
  onRemove,
  onRemoveAll,
  onRestore,
  onClose,
  onExport,
}: {
  id: string;
  crops: StudioCrop[];
  picked: StudioProblem[];
  removed: StudioCartRemoval[];
  canExport: boolean;
  onJump: (cropId: string) => void;
  onRemove: (problem: StudioProblem) => void;
  /** 머리의 «모두 빼기» — 시험지 전체(원장님 2026-11-11). 확인 창 없이 빼고, 뺀 줄은 흐리게 남는다. */
  onRemoveAll: () => void;
  onRestore: (problem: StudioProblem) => void;
  /** `returnFocus` — 키보드로 닫으면 여는 단추로 초점을 돌린다. */
  onClose: (returnFocus: boolean) => void;
  onExport: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLOListElement>(null);
  // 빼거나 되돌린 줄은 제자리에 남으니, 장부가 바뀐 뒤 그 줄의 반대 단추로 초점을 옮긴다.
  const focusRow = useRef<string | null>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const id = focusRow.current;
    if (!id) return;
    focusRow.current = null;
    Array.from(
      list.current?.querySelectorAll<HTMLElement>("[data-cart-row]") ?? [],
    )
      .find((row) => row.dataset.cartRow === id)
      ?.querySelector<HTMLButtonElement>("[data-cart-action]")
      ?.focus({ preventScroll: true });
  }, [picked, removed]);

  const rows = studioCartRows(picked, removed);
  const here = picked.filter((problem) =>
    crops.some((crop) => crop.id === problem.id),
  ).length;
  const keydown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    // 편집창 확대의 Esc(창 전체 듣기)가 같이 닫히지 않게 — 거기는 defaultPrevented 를 본다.
    event.preventDefault();
    onClose(true);
  };

  return (
    <section
      id={id}
      className={s.panel}
      aria-label="담은 문항 목록"
      onKeyDown={keydown}
    >
      <div className={s.head}>
        <h3 ref={heading} tabIndex={-1}>
          담은 문항 {picked.length}
        </h3>
        <span>
          이 원본 {here} · 다른 곳 {picked.length - here}
        </span>
        {picked.length > 0 && (
          <button
            type="button"
            className={`${s.text} ${s.headAction}`}
            onClick={() => {
              onRemoveAll();
              heading.current?.focus({ preventScroll: true });
            }}
          >
            모두 빼기
          </button>
        )}
      </div>
      <ol ref={list} className={s.list}>
        {rows.length === 0 && (
          <li className={s.empty}>검수한 문제를 담으면 여기에 모입니다.</li>
        )}
        {rows.map((row) => {
          const cropIndex = crops.findIndex(
            (crop) => crop.id === row.problem.id,
          );
          const crop = crops[cropIndex];
          const label = worksheetRowLabel(row.problem);
          const name = crop
            ? `문제 ${String(cropIndex + 1).padStart(2, "0")}`
            : label.text;
          const source = crop
            ? "이 원본"
            : row.problem.studioCrop
              ? "내 자료"
              : "문제은행";
          const place = crop ?? row.problem.studioCrop;
          const detail = place
            ? `${place.page}쪽 · ${crop?.grade ?? row.problem.grade}`
            : [row.problem.grade, row.problem.difficulty]
                .filter(Boolean)
                .join(" · ") || row.problem.problemCode;
          const stale =
            crop && studioCartState(crop, picked, removed) === "stale";
          return (
            <li
              key={row.problem.id}
              className={s.row}
              data-removed={row.removed}
              data-cart-row={row.problem.id}
            >
              <span className={s.number}>
                {row.removed ? "–" : String(row.order).padStart(2, "0")}
              </span>
              <div className={s.main}>
                {crop ? (
                  <button
                    type="button"
                    className={s.jump}
                    onClick={() => onJump(crop.id)}
                  >
                    {name}
                  </button>
                ) : (
                  <strong className={s.name} title={label.title}>
                    {name}
                  </strong>
                )}
                <span className={s.source}>{source}</span>
                <small
                  title={stale ? `${detail} · 고친 내용 반영 전` : undefined}
                >
                  {row.removed
                    ? "뺐습니다"
                    : stale
                      ? `${detail} · 고친 내용 반영 전`
                      : detail}
                </small>
              </div>
              <div className={s.actions}>
                {row.removed ? (
                  <button
                    type="button"
                    className={s.text}
                    data-cart-action
                    aria-label={`${name} 다시 담기`}
                    onClick={() => {
                      focusRow.current = row.problem.id;
                      onRestore(row.problem);
                    }}
                  >
                    다시 담기
                  </button>
                ) : (
                  <button
                    type="button"
                    className={s.icon}
                    data-cart-action
                    aria-label={`${name} 빼기`}
                    onClick={() => {
                      focusRow.current = row.problem.id;
                      onRemove(row.problem);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className={s.foot}>
        <button
          type="button"
          className={studio.secondaryButton}
          onClick={() => onClose(true)}
        >
          닫기
        </button>
        {canExport && (
          <button
            type="button"
            className={studio.primaryButton}
            disabled={!picked.length}
            onClick={onExport}
          >
            시험지 구성 →
          </button>
        )}
      </div>
    </section>
  );
}
