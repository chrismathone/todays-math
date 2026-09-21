"use client";

import { useMemo, useRef, useState } from "react";

import data from "@/lib/lab/cubeNetFrames.json";

import styles from "./lab.module.css";

type Frame = number[][][];

const FRAMES = data.frames as Frame[];
const LABELS = data.labels as string[];

function project(
  [x, y, z]: number[],
  yaw: number,
  pitch: number,
): [number, number, number] {
  const yy = y - 0.4;
  const a = x * Math.cos(yaw) - yy * Math.sin(yaw);
  const b = x * Math.sin(yaw) + yy * Math.cos(yaw);
  return [
    a,
    b * Math.sin(pitch) - z * Math.cos(pitch),
    b * Math.cos(pitch) + z * Math.sin(pitch),
  ];
}

export function CubeNetView({
  fold,
  onFold,
  foldable,
  highlight,
}: {
  fold: number;
  onFold?: (value: number) => void;
  foldable: boolean;
  highlight?: string;
}) {
  const [yaw, setYaw] = useState(0.35);
  const [pitch, setPitch] = useState(0.55);
  const drag = useRef<{
    x: number;
    y: number;
    yaw: number;
    pitch: number;
  } | null>(null);
  const shownFold = foldable ? fold : 0;
  const frame =
    FRAMES[
      Math.max(0, Math.min(FRAMES.length - 1, Math.round(shownFold / 5)))
    ] ?? FRAMES[0];

  const { polys, w, h } = useMemo(() => {
    const width = 640;
    const height = 420;
    const projected = frame.map((face, i) => ({
      i,
      pts: face.map((v) => project(v, yaw, pitch)),
    }));
    const pts = projected.flatMap((f) => f.pts);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const sc = Math.min(
      (width - 48) / (maxX - minX || 1),
      (height - 48) / (maxY - minY || 1),
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const sorted = [...projected].sort(
      (a, b) =>
        a.pts.reduce((n, p) => n + p[2], 0) -
        b.pts.reduce((n, p) => n + p[2], 0),
    );
    return {
      w: width,
      h: height,
      polys: sorted.map((f) => ({
        i: f.i,
        label: LABELS[f.i],
        xy: f.pts.map(
          (p) =>
            [width / 2 + (p[0] - cx) * sc, height / 2 + (p[1] - cy) * sc] as [
              number,
              number,
            ],
        ),
      })),
    };
  }, [frame, pitch, yaw]);

  return (
    <div>
      <svg
        className={styles.cubeSvg}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`정육면체 전개도 ${shownFold}% 접힘. 면 ${LABELS.join(" ")}`}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, yaw, pitch };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setYaw(drag.current.yaw + (e.clientX - drag.current.x) * 0.01);
          setPitch(
            Math.max(
              0.15,
              Math.min(
                1.45,
                drag.current.pitch + (e.clientY - drag.current.y) * 0.01,
              ),
            ),
          );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        {polys.map((f) => {
          const x = f.xy.reduce((n, p) => n + p[0], 0) / 4;
          const y = f.xy.reduce((n, p) => n + p[1], 0) / 4;
          const on = highlight === f.label;
          return (
            <g key={f.label}>
              <polygon
                points={f.xy.map((p) => p.join(",")).join(" ")}
                className={
                  [
                    styles.face1,
                    styles.face2,
                    styles.face3,
                    styles.face4,
                    styles.face5,
                    styles.face6,
                  ][f.i]
                }
                stroke={on ? "#3159df" : "#172b4d"}
                strokeWidth={on ? 3.2 : 1.4}
              />
              <text
                x={x}
                y={y + 7}
                textAnchor="middle"
                className={styles.faceLabel}
              >
                {f.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.labBtnSecondary}
          onClick={() => setYaw((v) => v - 0.35)}
        >
          왼쪽으로
        </button>
        <button
          type="button"
          className={styles.labBtnSecondary}
          onClick={() => setYaw((v) => v + 0.35)}
        >
          오른쪽으로
        </button>
        <button
          type="button"
          className={styles.labBtnSecondary}
          onClick={() => setPitch((v) => (v > 0.9 ? 0.35 : 1.2))}
        >
          위에서
        </button>
      </div>
      {foldable ? (
        <label className={styles.rangeLabel}>
          접기 {shownFold}%
          <input
            className={styles.range}
            type="range"
            min={0}
            max={100}
            step={5}
            value={shownFold}
            aria-label="전개도 접기"
            onChange={(e) => onFold?.(Number(e.target.value))}
          />
        </label>
      ) : (
        <p className={styles.hintBox}>
          여섯 면에 A부터 F까지 적혀 있습니다. 그림을 끌면 보는 방향이 바뀝니다.
        </p>
      )}
    </div>
  );
}
