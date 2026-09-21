"use client";

import { useLayoutEffect, useRef } from "react";

export function usePaintSet<K extends string | number>(
  value: K[],
  onChange: (next: K[]) => void,
) {
  // 끌기 도중 다음 렌더 전에 들어온 칸도 이어 칠하도록 ref 에 모은다. 렌더 중 쓰기는
  // react-hooks/refs 가 막아 커밋 직후(포인터·키 처리기가 돌기 전)에 값에 맞춘다.
  const setRef = useRef(new Set(value));
  useLayoutEffect(() => {
    setRef.current = new Set(value);
  });
  const paint = useRef<"on" | "off" | null>(null);

  function apply(key: K, mode: "on" | "off") {
    const next = new Set(setRef.current);
    if (mode === "on") next.add(key);
    else next.delete(key);
    setRef.current = next;
    onChange([...next]);
  }

  function keyAt(e: { clientX: number; clientY: number }): string | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const node = el?.closest("[data-sq]") as HTMLElement | null;
    return node?.getAttribute("data-sq") ?? null;
  }

  function start(e: React.PointerEvent, parse: (raw: string) => K | null) {
    const raw = keyAt(e);
    if (raw === null) return;
    const k = parse(raw);
    if (k === null) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const mode = setRef.current.has(k) ? "off" : "on";
    paint.current = mode;
    apply(k, mode);
  }

  function move(e: React.PointerEvent, parse: (raw: string) => K | null) {
    if (!paint.current) return;
    const raw = keyAt(e);
    if (raw === null) return;
    const k = parse(raw);
    if (k === null) return;
    apply(k, paint.current);
  }

  function end() {
    paint.current = null;
  }

  return { apply, start, move, end };
}
