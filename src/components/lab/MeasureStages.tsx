"use client";

import { useLayoutEffect, useRef } from "react";

import type { EngineSpec } from "@/lib/lab/types";

import styles from "./lab.module.css";

export function CompareStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "compare" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <svg
        className={styles.svg}
        viewBox="0 0 420 120"
        role="img"
        aria-label="시작을 맞춘 두 막대"
      >
        <text x="16" y="22" style={{ fontSize: 13 }}>
          시작
        </text>
        <line
          x1="24"
          y1="28"
          x2="24"
          y2="100"
          stroke="#3159df"
          strokeDasharray="4 3"
        />
        <rect
          x="24"
          y="36"
          width={spec.left * 28}
          height="26"
          rx="6"
          fill="#3159df"
        />
        <rect
          x="24"
          y="74"
          width={spec.right * 28}
          height="26"
          rx="6"
          fill="#8da2c7"
        />
      </svg>
      <div className={styles.choices}>
        {(
          [
            ["left", "위 막대가 더 깁니다"],
            ["right", "아래 막대가 더 깁니다"],
            ["same", "같습니다"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              value === id ? styles.labBtnPrimary : styles.labBtnSecondary
            }
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RulerStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "ruler" }>;
  value: { rulerZero: number; value: string };
  onChange: (value: { rulerZero: number; value: string }) => void;
}) {
  const u = 22;
  const pad = 28;
  const x = (n: number) => pad + n * u;
  const zero = spec.mode === "align" ? value.rulerZero : spec.rulerZero;
  const ticks = Array.from({ length: 13 }, (_, i) => i);
  const width = pad * 2 + 16 * u;
  return (
    <div>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} 200`}
        role="img"
        aria-label={`막대는 ${spec.objectStart}에서 ${spec.objectEnd}, 자의 0은 ${zero}. 한 칸은 1cm`}
      >
        <text
          x={(x(spec.objectStart) + x(spec.objectEnd)) / 2}
          y="28"
          textAnchor="middle"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          측정할 막대
        </text>
        <rect
          x={x(spec.objectStart)}
          y="38"
          width={(spec.objectEnd - spec.objectStart) * u}
          height="28"
          rx="6"
          fill="#f0c67e"
        />
        <line
          x1={x(spec.objectStart)}
          y1="68"
          x2={x(spec.objectStart)}
          y2="108"
          stroke="#3159df"
          strokeDasharray="4 3"
        />
        <line
          x1={x(spec.objectEnd)}
          y1="68"
          x2={x(spec.objectEnd)}
          y2="108"
          stroke="#3159df"
          strokeDasharray="4 3"
        />
        <rect
          x={x(zero) - 8}
          y="108"
          width={12 * u + 16}
          height="56"
          rx="6"
          fill="#eef2ff"
          stroke="#b8c4d6"
        />
        {ticks.map((i) => (
          <g key={i}>
            <line
              x1={x(zero + i)}
              y1="108"
              x2={x(zero + i)}
              y2={i % 5 === 0 ? 138 : 126}
              stroke="#172b4d"
            />
            <text
              x={x(zero + i)}
              y="158"
              textAnchor="middle"
              style={{ fontSize: 12 }}
            >
              {i}
            </text>
          </g>
        ))}
        <text
          x={x(zero + 6)}
          y="186"
          textAnchor="middle"
          style={{ fontSize: 13 }}
        >
          자 눈금 (cm)
        </text>
      </svg>
      {spec.mode === "align" ? (
        <label className={styles.rangeLabel}>
          자의 위치
          <input
            className={styles.range}
            type="range"
            min={0}
            max={5}
            step={1}
            value={value.rulerZero}
            aria-label="자의 위치"
            onChange={(e) =>
              onChange({ ...value, rulerZero: Number(e.target.value) })
            }
          />
        </label>
      ) : null}
      <div className={styles.choices}>
        {(spec.picks ?? []).map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={
              value.value === opt.id
                ? styles.labBtnPrimary
                : styles.labBtnSecondary
            }
            aria-pressed={value.value === opt.id}
            onClick={() => onChange({ ...value, value: opt.id })}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CoverStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "cover" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  // 끌기 도중 다음 렌더 전에 들어온 칸도 이어 세도록 ref 에 둔다. 렌더 중 쓰기는
  // react-hooks/refs 가 막아 커밋 직후(포인터 처리기가 돌기 전)에 값에 맞춘다.
  const count = useRef(value);
  useLayoutEffect(() => {
    count.current = value;
  });
  const paint = useRef<"on" | "off" | null>(null);
  const max = spec.length + 3;

  function indexAt(e: { clientX: number; clientY: number }): number | null {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const node = el?.closest("[data-sq]") as HTMLElement | null;
    if (!node) return null;
    const n = Number(node.dataset.sq);
    return Number.isInteger(n) ? n : null;
  }

  function apply(i: number, mode: "on" | "off") {
    const next =
      mode === "on"
        ? Math.max(count.current, i + 1)
        : Math.min(count.current, i);
    count.current = next;
    onChange(next);
  }

  return (
    <div>
      <p className={styles.hintBox}>
        1cm 조각을 끌어서 막대 위에 올리세요. 덮인 칸에서 끌면 줄어듭니다.
      </p>
      <div
        className={styles.tiles}
        style={{
          gridTemplateColumns: `repeat(${spec.length}, 36px)`,
          touchAction: "none",
        }}
        role="img"
        aria-label={`1cm 조각 ${value}개, 막대 ${spec.length}cm`}
        onPointerDown={(e) => {
          const i = indexAt(e);
          if (i === null) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          const mode = i < count.current ? "off" : "on";
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
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            data-sq={i}
            className={`${styles.tile} ${i < value ? styles.tileOn : ""}`}
            aria-label={`${i + 1}cm 칸`}
            aria-pressed={i < value}
          />
        ))}
      </div>
      <p className={styles.meter}>
        올린 조각 {value}개 / 막대 {spec.length}cm
      </p>
    </div>
  );
}
