"use client";

import { useRef, useState } from "react";

import {
  bundleParts,
  clockAngle,
  cuboidSurface,
  hourFromAngle,
  minuteFromAngle,
  nudgeClock,
  nudgeCopies,
  nudgeShare,
  nudgeTens,
  ratioAmounts,
  remainingShare,
  SURFACE_FACES,
} from "@/lib/lab/domainMath";
import type { EngineSpec } from "@/lib/lab/types";

import { usePaintSet } from "./paintSet";
import styles from "./lab.module.css";

export function BundleStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "bundle" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  const { tens, ones } = bundleParts(spec.total, value);
  return (
    <div>
      <p className={styles.hintBox}>
        낱개 열 개를 묶어 십 묶음으로 바꾸세요. 오른쪽 클릭이나 풀기로
        되돌립니다.
      </p>
      <div
        className={styles.bundleRow}
        aria-label={`묶음 ${tens}개, 낱개 ${ones}개`}
      >
        {Array.from({ length: tens }, (_, i) => (
          <button
            key={`t${i}`}
            type="button"
            className={styles.tenRod}
            aria-label={`십 묶음 ${i + 1}`}
            onClick={() => onChange(nudgeTens(spec.total, tens, -1))}
            onContextMenu={(e) => {
              e.preventDefault();
              onChange(nudgeTens(spec.total, tens, -1));
            }}
          >
            10
          </button>
        ))}
        {Array.from({ length: ones }, (_, i) => (
          <span key={`o${i}`} className={styles.oneDot} />
        ))}
      </div>
      <p className={styles.meter}>
        묶음 {tens}개, 낱개 {ones}개
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.labBtnSecondary}
          onClick={() => onChange(nudgeTens(spec.total, tens, 1))}
        >
          열 개 묶기
        </button>
        <button
          type="button"
          className={styles.labBtnSecondary}
          onClick={() => onChange(nudgeTens(spec.total, tens, -1))}
        >
          묶음 풀기
        </button>
      </div>
    </div>
  );
}

export function FractionBarStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "fraction-bar" }>;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const on = new Set(value);
  const paint = usePaintSet(value, onChange);
  return (
    <div>
      <p className={styles.hintBox}>
        같은 크기로 나눈 칸을 끌어서 칠하세요. 칠한 칸에서 끌면 지워집니다.
      </p>
      <div
        className={styles.fractionBar}
        style={{ gridTemplateColumns: `repeat(${spec.parts}, 1fr)` }}
        onPointerDown={(e) =>
          paint.start(e, (raw) => {
            const n = Number(raw);
            return Number.isInteger(n) ? n : null;
          })
        }
        onPointerMove={(e) =>
          paint.move(e, (raw) => {
            const n = Number(raw);
            return Number.isInteger(n) ? n : null;
          })
        }
        onPointerUp={paint.end}
        onPointerCancel={paint.end}
      >
        {Array.from({ length: spec.parts }, (_, i) => (
          <button
            key={i}
            type="button"
            data-sq={i}
            className={styles.squareCell}
            aria-pressed={on.has(i)}
            aria-label={`${spec.parts}칸 중 ${i + 1}번째`}
            onKeyDown={(e) => {
              if (e.key !== " " && e.key !== "Enter") return;
              e.preventDefault();
              paint.apply(i, on.has(i) ? "off" : "on");
            }}
          />
        ))}
      </div>
      <p className={styles.meter}>
        칠한 칸 {on.size} / {spec.parts}
      </p>
    </div>
  );
}

export function SymmetryStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "symmetry" }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const seed = new Set(spec.seed.map(([r, c]) => `${r},${c}`));
  const filled = new Set(value);
  const paint = usePaintSet(value, onChange);
  return (
    <div>
      <p className={styles.hintBox}>
        점선 반대쪽에, 축에서 같은 거리인 칸을 끌어서 채우세요.
      </p>
      <div
        className={`${styles.squareGrid} ${spec.axis === "v" ? styles.axisV : styles.axisH}`}
        style={{
          gridTemplateColumns: `repeat(${spec.cols}, 1fr)`,
          width: "min(100%, 240px)",
        }}
        onPointerDown={(e) =>
          paint.start(e, (raw) => (seed.has(raw) ? null : raw))
        }
        onPointerMove={(e) =>
          paint.move(e, (raw) => (seed.has(raw) ? null : raw))
        }
        onPointerUp={paint.end}
        onPointerCancel={paint.end}
      >
        {Array.from({ length: spec.rows * spec.cols }, (_, i) => {
          const r = Math.floor(i / spec.cols);
          const c = i % spec.cols;
          const key = `${r},${c}`;
          const locked = seed.has(key);
          const on = locked || filled.has(key);
          return (
            <button
              key={key}
              type="button"
              data-sq={key}
              className={styles.squareCell}
              aria-pressed={on}
              aria-label={`${r + 1}행 ${c + 1}열`}
              disabled={locked}
              onKeyDown={(e) => {
                if (locked) return;
                if (e.key !== " " && e.key !== "Enter") return;
                e.preventDefault();
                paint.apply(key, filled.has(key) ? "off" : "on");
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function MachineStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "machine" }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const shown = new Set(value);
  return (
    <div>
      <p className={styles.hintBox}>수를 넣어 무엇이 나오는지 모두 보세요.</p>
      <div className={styles.choices}>
        {spec.pairs.map(([input, output], i) => {
          const id = String(i);
          const on = shown.has(id);
          return (
            <button
              key={id}
              type="button"
              className={on ? styles.labBtnPrimary : styles.labBtnSecondary}
              aria-pressed={on}
              onClick={() => onChange(on ? value : [...value, id])}
            >
              {on ? `${input} → ${output}` : `${input} 넣기`}
            </button>
          );
        })}
      </div>
      <p className={styles.meter}>
        {shown.size} / {spec.pairs.length}번 넣음
      </p>
    </div>
  );
}

export function RatioStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "ratio" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  const { left, right } = ratioAmounts(spec.a, spec.b, value);
  const max = spec.copies + 2;
  return (
    <div>
      <p className={styles.hintBox}>
        한 묶음은 {spec.a}와 {spec.b}입니다. 묶음을 더하거나 빼 목표에 맞추세요.
      </p>
      <div
        className={styles.ratioRow}
        aria-label={`왼쪽 ${left}, 오른쪽 ${right}`}
      >
        <div>
          <p className={styles.sub}>왼쪽 {left}</p>
          <div className={styles.bundleRow}>
            {Array.from({ length: left }, (_, i) => (
              <span key={`l${i}`} className={styles.oneDot} />
            ))}
          </div>
        </div>
        <div>
          <p className={styles.sub}>오른쪽 {right}</p>
          <div className={styles.bundleRow}>
            {Array.from({ length: right }, (_, i) => (
              <span
                key={`r${i}`}
                className={`${styles.oneDot} ${styles.oneDotAlt}`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className={styles.meter}>묶음 {value}개</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.labBtnSecondary}
          onClick={() => onChange(nudgeCopies(value, 1, max))}
        >
          한 묶음 더하기
        </button>
        <button
          type="button"
          className={styles.labBtnSecondary}
          onClick={() => onChange(nudgeCopies(value, -1, max))}
        >
          한 묶음 빼기
        </button>
      </div>
    </div>
  );
}

export function ShareStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "share" }>;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const placed =
    value.length === spec.groups
      ? value
      : Array.from({ length: spec.groups }, () => 0);
  const left = remainingShare(placed, spec.total);
  return (
    <div>
      <p className={styles.hintBox}>
        접시를 누르면 하나가 들어갑니다. 오른쪽 클릭이나 빼기로 되돌립니다.
      </p>
      <p className={styles.meter}>남은 것 {left}개</p>
      <div
        className={styles.ratioRow}
        style={{
          gridTemplateColumns: `repeat(${spec.groups}, minmax(0, 1fr))`,
        }}
      >
        {placed.map((n, i) => (
          <button
            key={i}
            type="button"
            className={styles.labBtnSecondary}
            aria-label={`${i + 1}번째 접시 ${n}개`}
            onClick={() => onChange(nudgeShare(placed, i, 1, spec.total))}
            onContextMenu={(e) => {
              e.preventDefault();
              onChange(nudgeShare(placed, i, -1, spec.total));
            }}
          >
            접시 {i + 1} · {n}개
          </button>
        ))}
      </div>
    </div>
  );
}

function angDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function pickClockHand(
  x: number,
  y: number,
  hourAngle: number,
  minuteAngle: number,
): "h" | "m" | null {
  const dx = x - 100;
  const dy = y - 100;
  const r = Math.hypot(dx, dy);
  if (r < 10 || r > 96) return null;
  const deg = clockAngle(x, y);
  const nearH = angDiff(deg, hourAngle) < 22 && r <= 58;
  const nearM = angDiff(deg, minuteAngle) < 22 && r <= 84;
  if (nearH && nearM) return r > 50 ? "m" : "h";
  if (nearM) return "m";
  if (nearH) return "h";
  return null;
}

export function ClockStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "clock" }>;
  value: { hour: number; minute: number };
  onChange: (value: { hour: number; minute: number }) => void;
}) {
  const hour = value.hour || 12;
  const minute = value.minute || 0;
  const ha = (hour % 12) * 30 + minute * 0.5;
  const ma = minute * 6;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    hand: "h" | "m";
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const [hand, setHand] = useState<"h" | "m">("h");

  function toSvg(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 100, y: 100 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 100, y: 100 };
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(ctm.inverse());
    return { x: q.x, y: q.y };
  }

  function applyHand(which: "h" | "m", deg: number) {
    if (which === "h") {
      onChange({ hour: hourFromAngle(deg, minute), minute });
      return;
    }
    onChange({ hour, minute: minuteFromAngle(deg) });
  }

  return (
    <div>
      <p className={styles.hintBox}>
        작은바늘을 눌러 시를, 큰바늘을 눌러 분을 맞추세요. 끌어 옮겨도 됩니다.{" "}
        {spec.hour}시 {spec.minute}분으로 맞추세요.
      </p>
      <svg
        ref={svgRef}
        className={styles.clockFace}
        viewBox="0 0 200 200"
        role="img"
        aria-label={`${hour}시 ${minute}분. 바늘을 누르거나 끌어 맞추세요.`}
        onContextMenu={(e) => {
          e.preventDefault();
          const svg = svgRef.current;
          if (!svg) return;
          const ctm = svg.getScreenCTM();
          if (!ctm) return;
          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const q = pt.matrixTransform(ctm.inverse());
          const which = pickClockHand(q.x, q.y, ha, ma) ?? hand;
          setHand(which);
          onChange(nudgeClock(hour, minute, which, which === "h" ? -1 : -5));
        }}
        onPointerDown={(e) => {
          const p = toSvg(e);
          const which = pickClockHand(p.x, p.y, ha, ma);
          if (!which) return;
          e.preventDefault();
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
          drag.current = {
            hand: which,
            x: e.clientX,
            y: e.clientY,
            moved: false,
          };
          setHand(which);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
          if (dist > 6) d.moved = true;
          if (!d.moved) return;
          const p = toSvg(e);
          applyHand(d.hand, clockAngle(p.x, p.y));
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (d.moved) return;
          onChange(nudgeClock(hour, minute, d.hand, d.hand === "h" ? 1 : 5));
        }}
      >
        <circle cx="100" cy="100" r="92" fill="#fff" stroke="#172b4d" />
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const a = (n / 12) * 2 * Math.PI - Math.PI / 2;
          const x = 100 + Math.cos(a) * 74;
          const y = 100 + Math.sin(a) * 74;
          return (
            <g key={n}>
              <circle
                cx={x}
                cy={y}
                r="12"
                fill="transparent"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setHand(hand);
                  if (hand === "m") {
                    onChange({ hour, minute: n === 12 ? 0 : n * 5 });
                  } else {
                    onChange({ hour: n, minute });
                  }
                }}
              />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                style={{ fontSize: 13, pointerEvents: "none" }}
              >
                {n}
              </text>
            </g>
          );
        })}
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((ha * Math.PI) / 180) * 46}
          y2={100 - Math.cos((ha * Math.PI) / 180) * 46}
          stroke="transparent"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((ma * Math.PI) / 180) * 72}
          y2={100 - Math.cos((ma * Math.PI) / 180) * 72}
          stroke="transparent"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((ha * Math.PI) / 180) * 46}
          y2={100 - Math.cos((ha * Math.PI) / 180) * 46}
          stroke={hand === "h" ? "#3159df" : "#172b4d"}
          strokeWidth={hand === "h" ? 7 : 6}
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((ma * Math.PI) / 180) * 72}
          y2={100 - Math.cos((ma * Math.PI) / 180) * 72}
          stroke={hand === "m" ? "#3159df" : "#172b4d"}
          strokeWidth={hand === "m" ? 4 : 3}
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill="#172b4d" />
      </svg>
      <p className={styles.meter}>
        {hour}시 {minute}분 · {hand === "h" ? "작은바늘" : "큰바늘"}
      </p>
    </div>
  );
}

export function AngleStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "angle" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  const deg = Number.isFinite(value) ? value : 0;
  const rad = (deg * Math.PI) / 180;
  const svgRef = useRef<SVGSVGElement>(null);
  function setFromPointer(e: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(ctm.inverse());
    let next = Math.round((-Math.atan2(q.y - 130, q.x - 40) * 180) / Math.PI);
    if (next < 0) next = 0;
    if (next > 180) next = 180;
    next = Math.round(next / 10) * 10;
    onChange(next);
  }
  return (
    <div>
      <p className={styles.hintBox}>
        파란 변을 끌어 {spec.degrees}도로 맞추세요.
      </p>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox="0 0 260 160"
        role="img"
        aria-label={`${deg}도`}
        style={{ touchAction: "none", cursor: "pointer", maxWidth: 320 }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          setFromPointer(e);
        }}
      >
        <line
          x1="40"
          y1="130"
          x2="220"
          y2="130"
          stroke="#172b4d"
          strokeWidth="3"
        />
        <line
          x1="40"
          y1="130"
          x2={40 + Math.cos(-rad) * 160}
          y2={130 + Math.sin(-rad) * 160}
          stroke="#3159df"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M 80 130 A 40 40 0 ${deg > 180 ? 1 : 0} 0 ${40 + Math.cos(-rad) * 40} ${130 + Math.sin(-rad) * 40}`}
          fill="none"
          stroke="#3159df"
        />
      </svg>
      <p className={styles.meter}>{deg}도</p>
    </div>
  );
}

export function ChartStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "chart" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const max = Math.max(...spec.values, spec.cutMin ?? 0, 1);
  const min = spec.cutMin ?? 0;
  const span = Math.max(max - min, 1);
  return (
    <div>
      <svg
        className={styles.svg}
        viewBox="0 0 360 180"
        role="img"
        aria-label="자료 그림"
      >
        {spec.kind === "bar" ? (
          spec.values.map((n, i) => {
            const h = ((n - min) / span) * 120;
            const x = 40 + i * 90;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={150 - h}
                  width="48"
                  height={h}
                  rx="4"
                  fill="#3159df"
                />
                <text
                  x={x + 24}
                  y="168"
                  textAnchor="middle"
                  style={{ fontSize: 12 }}
                >
                  {spec.labels[i]}
                </text>
              </g>
            );
          })
        ) : (
          <polyline
            fill="none"
            stroke="#3159df"
            strokeWidth="3"
            points={spec.values
              .map((n, i) => {
                const x = 40 + i * (260 / Math.max(spec.values.length - 1, 1));
                const y = 150 - ((n - min) / span) * 120;
                return `${x},${y}`;
              })
              .join(" ")}
          />
        )}
        {spec.labels.map((lab, i) =>
          spec.kind === "line" ? (
            <text
              key={lab}
              x={40 + i * (260 / Math.max(spec.values.length - 1, 1))}
              y="168"
              textAnchor="middle"
              style={{ fontSize: 12 }}
            >
              {lab}
            </text>
          ) : null,
        )}
        {spec.cutMin ? (
          <text x="12" y="24" style={{ fontSize: 11 }}>
            {spec.cutMin}부터
          </text>
        ) : null}
      </svg>
      <div className={styles.choices}>
        {spec.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={
              value === opt.id ? styles.labBtnPrimary : styles.labBtnSecondary
            }
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LevelStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "level" }>;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const piles = value.length === spec.piles.length ? value : spec.piles;
  const [from, setFrom] = useState<number | null>(null);
  return (
    <div>
      <p className={styles.hintBox}>
        높은 쪽을 누른 뒤 낮은 쪽을 눌러 하나를 옮기세요. 모두 {spec.target}이
        되게 합니다.
      </p>
      <div className={styles.ratioRow}>
        {piles.map((n, i) => (
          <button
            key={i}
            type="button"
            className={
              from === i ? styles.labBtnPrimary : styles.labBtnSecondary
            }
            aria-pressed={from === i}
            aria-label={`${i + 1}번 상자 ${n}개`}
            onClick={() => {
              if (from === null) {
                setFrom(i);
                return;
              }
              if (from === i) {
                setFrom(null);
                return;
              }
              const next = [...piles];
              if ((next[from] ?? 0) < 1) {
                setFrom(null);
                return;
              }
              next[from] -= 1;
              next[i] += 1;
              setFrom(null);
              onChange(next);
            }}
          >
            상자 {i + 1} · {n}개
          </button>
        ))}
      </div>
    </div>
  );
}

export function SurfaceStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "surface" }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const on = new Set(value);
  const labels: Record<(typeof SURFACE_FACES)[number], string> = {
    top: `위 ${spec.l}×${spec.w}`,
    bottom: `아래 ${spec.l}×${spec.w}`,
    front: `앞 ${spec.l}×${spec.h}`,
    back: `뒤 ${spec.l}×${spec.h}`,
    left: `왼쪽 ${spec.w}×${spec.h}`,
    right: `오른쪽 ${spec.w}×${spec.h}`,
  };
  return (
    <div>
      <p className={styles.hintBox}>펼친 여섯 면을 모두 눌러 덮으세요.</p>
      <div className={styles.surfaceNet}>
        {SURFACE_FACES.map((id) => (
          <button
            key={id}
            type="button"
            className={
              on.has(id) ? styles.labBtnPrimary : styles.labBtnSecondary
            }
            aria-pressed={on.has(id)}
            onClick={() =>
              onChange(
                on.has(id) ? value.filter((x) => x !== id) : [...value, id],
              )
            }
          >
            {labels[id]}
          </button>
        ))}
      </div>
      <p className={styles.meter}>
        덮은 면 {on.size} / 6 · 칸 {cuboidSurface(spec.l, spec.w, spec.h)}개면
        겉넓이
      </p>
    </div>
  );
}

export function NLineStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "nline" }>;
  value: number;
  onChange: (value: number) => void;
}) {
  const n = Number.isFinite(value) ? value : spec.min;
  const svgRef = useRef<SVGSVGElement>(null);
  const span = spec.max - spec.min || 1;
  function setFromPointer(e: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(ctm.inverse());
    const t = (q.x - 20) / 280;
    let v = spec.min + Math.round(t * span);
    if (v < spec.min) v = spec.min;
    if (v > spec.max) v = spec.max;
    onChange(v);
  }
  const x = 20 + ((n - spec.min) / span) * 280;
  return (
    <div>
      <p className={styles.hintBox}>점을 끌어 {spec.target}에 놓으세요.</p>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox="0 0 320 72"
        role="img"
        aria-label={`수직선 ${n}`}
        style={{ touchAction: "none", cursor: "pointer", maxWidth: 320 }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          setFromPointer(e);
        }}
      >
        <line
          x1="20"
          y1="36"
          x2="300"
          y2="36"
          stroke="#172b4d"
          strokeWidth="3"
        />
        {Array.from({ length: span + 1 }, (_, i) => {
          const v = spec.min + i;
          const tx = 20 + (i / span) * 280;
          return (
            <g key={v}>
              <line x1={tx} y1="28" x2={tx} y2="44" stroke="#172b4d" />
              <text x={tx} y="62" textAnchor="middle" style={{ fontSize: 11 }}>
                {v}
              </text>
            </g>
          );
        })}
        <circle cx={x} cy="36" r="10" fill="#3159df" />
      </svg>
      <p className={styles.meter}>{n}</p>
    </div>
  );
}

export function SolidStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "solid" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <svg
        className={styles.svg}
        viewBox="0 0 240 160"
        role="img"
        aria-label="입체"
      >
        {spec.shape === "cylinder" ? (
          <>
            <ellipse
              cx="120"
              cy="36"
              rx="50"
              ry="16"
              fill="#e8eef8"
              stroke="#172b4d"
            />
            <line x1="70" y1="36" x2="70" y2="124" stroke="#172b4d" />
            <line x1="170" y1="36" x2="170" y2="124" stroke="#172b4d" />
            <ellipse
              cx="120"
              cy="124"
              rx="50"
              ry="16"
              fill="#c5d4f0"
              stroke="#172b4d"
            />
          </>
        ) : spec.shape === "cone" ? (
          <>
            <polygon
              points="120,20 70,124 170,124"
              fill="#e8eef8"
              stroke="#172b4d"
            />
            <ellipse
              cx="120"
              cy="124"
              rx="50"
              ry="16"
              fill="#c5d4f0"
              stroke="#172b4d"
            />
          </>
        ) : (
          <circle cx="120" cy="80" r="54" fill="#e8eef8" stroke="#172b4d" />
        )}
      </svg>
      <div className={styles.choices}>
        {spec.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={
              value === opt.id ? styles.labBtnPrimary : styles.labBtnSecondary
            }
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
