"use client";

import { useState } from "react";

import { Input } from "@/components/ui/Input";
import { netSvgMetrics } from "@/lib/lab/cubeNets";
import { DEMO_STACK, nudgeStackHeight } from "@/lib/lab/stackMath";
import type { EngineSpec, HeightMap, NetCell } from "@/lib/lab/types";

import { CubeNetView } from "./CubeNetView";
import { LabModelViewer } from "./LabModelViewer";
import styles from "./lab.module.css";

function NetSvg({ cells }: { cells: NetCell[] }) {
  const m = netSvgMetrics(cells);
  return (
    <svg
      className={styles.netSvg}
      viewBox={`0 0 ${m.width} ${m.height}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      aria-hidden="true"
    >
      {cells.map(([r, c]) => (
        <rect
          key={`${r},${c}`}
          x={m.pad + (c - m.minC) * m.size}
          y={m.pad + (r - m.minR) * m.size}
          width={m.size}
          height={m.size}
          rx={3}
          fill="#e8eef8"
          stroke="#172b4d"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

export function CubeFoldStage({
  spec,
  value,
  onChange,
  reducedMotion,
}: {
  spec: Extract<EngineSpec, { type: "cube-fold" }>;
  value: { prediction: string; fold: number };
  onChange: (value: { prediction: string; fold: number }) => void;
  reducedMotion: boolean;
}) {
  const cube = spec.model === "cube";
  const fold = Number.isFinite(value.fold) ? value.fold : 0;
  const prediction =
    typeof value.prediction === "string" ? value.prediction : "";
  const foldable = spec.foldable !== false;
  return (
    <div>
      {cube ? (
        <CubeNetView
          fold={fold}
          foldable={foldable}
          highlight={spec.fromFace}
          onFold={(next) => onChange({ prediction, fold: next })}
        />
      ) : (
        <LabModelViewer
          src="/lab/models/cuboid-fold.glb"
          animationName="Fold"
          alt="가로 4cm 세로 3cm 높이 2cm 직육면체 전개도"
          percent={fold}
          onPercent={(next) =>
            onChange({ prediction, fold: Number.isFinite(next) ? next : 0 })
          }
          defaultOrbit="25deg 65deg 105%"
          reducedMotion={reducedMotion}
          poseLabel={
            fold === 100 ? "접힌 상자" : fold === 0 ? "펼친 전개도" : "접는 중"
          }
          views={[
            { id: "iso", label: "비스듬히", orbit: "25deg 65deg 105%" },
            { id: "top", label: "전개도 위에서", orbit: "0deg 90deg 105%" },
          ]}
        />
      )}
      <div className={styles.choices}>
        {spec.choices.map((id) => (
          <button
            key={id}
            type="button"
            className={
              prediction === id ? styles.labBtnPrimary : styles.labBtnSecondary
            }
            aria-pressed={prediction === id}
            onClick={() => onChange({ prediction: id, fold })}
          >
            {id}면
          </button>
        ))}
      </div>
    </div>
  );
}

export function NetPickStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "net-pick" }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className={styles.netGrid}>
      {spec.nets.map((net) => {
        const on = value.includes(net.id);
        return (
          <button
            key={net.id}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(
                on ? value.filter((id) => id !== net.id) : [...value, net.id],
              )
            }
          >
            <span className={styles.netSvgSlot}>
              <NetSvg cells={net.cells} />
            </span>
            <span>{on ? "선택함" : "선택"}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StackViewStage({
  spec,
  value,
  onChange,
  reducedMotion,
}: {
  spec: Extract<EngineSpec, { type: "stack-view" }>;
  value: string;
  onChange: (value: string) => void;
  reducedMotion: boolean;
}) {
  const demo = JSON.stringify(spec.heights) === JSON.stringify(DEMO_STACK);
  const [fold, setFold] = useState(0);
  return (
    <div>
      {demo ? (
        <LabModelViewer
          src="/lab/models/stack-cubes.glb"
          animationName="Separate"
          alt="쌓기나무 12개"
          percent={fold}
          onPercent={setFold}
          defaultOrbit="30deg 60deg 0.13m"
          cameraTarget="0m 0.018m 0m"
          reducedMotion={reducedMotion}
          poseLabel="쌓기나무"
          views={[
            { id: "iso", label: "입체", orbit: "30deg 60deg 0.13m" },
            { id: "front", label: "앞", orbit: "0deg 90deg 0.13m" },
            { id: "top", label: "위", orbit: "0deg 0deg 0.13m" },
            { id: "right", label: "오른쪽", orbit: "90deg 90deg 0.13m" },
          ]}
        />
      ) : (
        <HeightSvg heights={spec.heights} />
      )}
      {spec.picks && spec.picks.length > 0 ? (
        <div className={styles.choices}>
          {spec.picks.map((opt) => (
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
      ) : (
        <div className={styles.field}>
          <label htmlFor="lab-stack">답</label>
          <Input
            id="lab-stack"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function HeightSvg({ heights }: { heights: HeightMap }) {
  const w = heights[0]?.length ?? 0;
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${w * 28 + 8} ${heights.length * 28 + 8}`}
      role="img"
      aria-label="위에서 본 높이"
    >
      {heights.map((row, z) =>
        row.map((h, x) => (
          <g key={`${z}-${x}`}>
            <rect
              x={4 + x * 28}
              y={4 + z * 28}
              width="24"
              height="24"
              fill="var(--side)"
              stroke="var(--ink)"
            />
            <text
              x={16 + x * 28}
              y={21 + z * 28}
              textAnchor="middle"
              style={{ fontSize: "12px" }}
            >
              {h}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}

export function StackBuildStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "stack-build" }>;
  value: HeightMap;
  onChange: (value: HeightMap) => void;
}) {
  const grid = value.length
    ? value
    : spec.target.map((row) => row.map(() => 0));
  function setCell(z: number, x: number, delta: number) {
    const next = grid.map((r) => [...r]);
    next[z][x] = nudgeStackHeight(grid[z][x], delta);
    onChange(next);
  }
  return (
    <div>
      <p className={styles.sub}>목표 위 모양</p>
      <HeightSvg heights={spec.target} />
      <p className={styles.sub}>내가 쌓은 모양</p>
      <div
        className={styles.buildGrid}
        style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, 1fr)` }}
      >
        {grid.map((row, z) =>
          row.map((h, x) => (
            <button
              key={`${z}-${x}`}
              type="button"
              aria-label={`${z + 1}행 ${x + 1}열 높이 ${h}. 왼쪽 클릭은 올리고 오른쪽 클릭은 내립니다.`}
              onClick={() => setCell(z, x, 1)}
              onContextMenu={(e) => {
                e.preventDefault();
                setCell(z, x, -1);
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "ArrowDown" ||
                  e.key === "-" ||
                  e.key === "Subtract"
                ) {
                  e.preventDefault();
                  setCell(z, x, -1);
                }
                if (e.key === "ArrowUp" || e.key === "+" || e.key === "Add") {
                  e.preventDefault();
                  setCell(z, x, 1);
                }
              }}
            >
              {h}
            </button>
          )),
        )}
      </div>
      <p className={styles.sub}>왼쪽 클릭은 올리고, 오른쪽 클릭은 내립니다.</p>
    </div>
  );
}
