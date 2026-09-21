"use client";

import { useLayoutEffect, useRef } from "react";

import type { EngineSpec } from "@/lib/lab/types";

import styles from "./lab.module.css";

export function UnitSquaresStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "unit-squares" }>;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const total = spec.cols * spec.rows;
  const filled = new Set(value);
  // 끌기 도중 다음 렌더 전에 들어온 칸도 이어 칠하도록 ref 에 모은다. 렌더 중 쓰기는
  // react-hooks/refs 가 막아 커밋 직후(포인터 처리기가 돌기 전)에 값에 맞춘다.
  const filledRef = useRef(filled);
  useLayoutEffect(() => {
    filledRef.current = filled;
  });
  const paint = useRef<"on" | "off" | null>(null);

  function apply(i: number, mode: "on" | "off") {
    const next = new Set(filledRef.current);
    if (mode === "on") next.add(i);
    else next.delete(i);
    filledRef.current = next;
    onChange([...next]);
  }

  function indexAt(e: { clientX: number; clientY: number }): number | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el?.closest("[data-sq]") as HTMLElement | null;
    if (!btn) return null;
    const n = Number(btn.dataset.sq);
    return Number.isInteger(n) ? n : null;
  }

  return (
    <div>
      <p className={styles.hintBox}>
        한 칸이 1cm²입니다. 끌어서 덮으세요. 이미 덮인 칸에서 끌면 지워집니다.
      </p>
      <div
        className={styles.squareGrid}
        style={{ gridTemplateColumns: `repeat(${spec.cols}, 1fr)` }}
        onPointerDown={(e) => {
          const i = indexAt(e);
          if (i === null) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          const mode = filledRef.current.has(i) ? "off" : "on";
          paint.current = mode;
          apply(i, mode);
        }}
        onPointerMove={(e) => {
          if (!paint.current) return;
          const i = indexAt(e);
          if (i === null) return;
          apply(i, paint.current);
        }}
        onPointerUp={() => {
          paint.current = null;
        }}
        onPointerCancel={() => {
          paint.current = null;
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            data-sq={i}
            className={styles.squareCell}
            aria-pressed={filled.has(i)}
            aria-label={`${i + 1}번째 칸`}
            onKeyDown={(e) => {
              if (e.key !== " " && e.key !== "Enter") return;
              e.preventDefault();
              apply(i, filledRef.current.has(i) ? "off" : "on");
            }}
          />
        ))}
      </div>
      <p className={styles.meter}>
        덮은 칸 {filled.size} / {total}
      </p>
    </div>
  );
}

export function AreaCutStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "area-cut" }>;
  value: { cut: boolean; slide: number; reason: string };
  onChange: (value: { cut: boolean; slide: number; reason: string }) => void;
}) {
  const shift = value.cut ? spec.base * (value.slide / 100) : 0;
  const s = 36;
  const p = (x: number, y: number) => `${36 + x * s},${36 + y * s}`;
  const body = [
    [spec.skew, 0],
    [spec.skew + spec.base, 0],
    [spec.base, spec.height],
    [0, spec.height],
  ];
  const tri = [
    [0 + shift, spec.height],
    [spec.skew + shift, 0],
    [spec.skew + shift, spec.height],
  ];
  const rest = [
    [spec.skew, 0],
    [spec.skew + spec.base, 0],
    [spec.base, spec.height],
    [spec.skew, spec.height],
  ];
  return (
    <div>
      <svg
        className={styles.svg}
        viewBox="0 0 360 220"
        role="img"
        aria-label={`밑변 ${spec.base}cm 높이 ${spec.height}cm 평행사변형`}
      >
        <polygon
          points={(value.cut ? rest : body).map((v) => p(v[0], v[1])).join(" ")}
          fill="#c8dd9a"
          stroke="#172b4d"
        />
        <polygon
          points={tri.map((v) => p(v[0], v[1])).join(" ")}
          fill="#f0c67e"
          stroke="#172b4d"
        />
        <line
          x1={p(spec.skew, 0).split(",")[0]}
          y1="36"
          x2={p(spec.skew, spec.height).split(",")[0]}
          y2={36 + spec.height * s}
          stroke="#3159df"
          strokeDasharray="4 3"
        />
        <text x="36" y="208" style={{ fontSize: 14, fontWeight: 700 }}>
          밑변 {spec.base}cm · 높이 {spec.height}cm
        </text>
      </svg>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.labBtnSecondary}
          disabled={value.cut}
          onClick={() => onChange({ ...value, cut: true })}
        >
          {value.cut ? "잘랐습니다" : "왼쪽 삼각형 자르기"}
        </button>
      </div>
      <label>
        조각 옮기기 {value.slide}%
        <input
          className={styles.range}
          type="range"
          min={0}
          max={100}
          step={5}
          value={value.slide}
          disabled={!value.cut}
          aria-label="조각 옮기기"
          onChange={(e) =>
            onChange({ ...value, slide: Number(e.target.value) })
          }
        />
      </label>
      <p className={styles.intro}>직사각형이 되어도 넓이가 같은 이유는?</p>
      <div className={styles.choices}>
        <button
          type="button"
          className={
            value.reason === "same"
              ? styles.labBtnPrimary
              : styles.labBtnSecondary
          }
          aria-pressed={value.reason === "same"}
          onClick={() => onChange({ ...value, reason: "same" })}
        >
          버리거나 겹친 조각이 없습니다
        </button>
        <button
          type="button"
          className={
            value.reason === "looks"
              ? styles.labBtnPrimary
              : styles.labBtnSecondary
          }
          aria-pressed={value.reason === "looks"}
          onClick={() => onChange({ ...value, reason: "looks" })}
        >
          반듯해 보이기 때문입니다
        </button>
      </div>
    </div>
  );
}
