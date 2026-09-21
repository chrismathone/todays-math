"use client";

import type { EngineSpec } from "@/lib/lab/types";

import { CubeNetView } from "./CubeNetView";
import styles from "./lab.module.css";

export function ChoiceStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "choice" }>;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}) {
  const multi = Array.isArray(spec.correct);
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div>
      {spec.diagram === "cube-net" ? (
        <CubeNetView fold={0} foldable={false} />
      ) : null}
      <div className={styles.choices}>
        {spec.options.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={on ? styles.labBtnPrimary : styles.labBtnSecondary}
              aria-pressed={on}
              onClick={() => {
                if (!multi) {
                  onChange(opt.id);
                  return;
                }
                onChange(
                  on
                    ? selected.filter((id) => id !== opt.id)
                    : [...selected, opt.id],
                );
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NumberStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "number" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      {spec.diagram === "cube-net" ? (
        <CubeNetView fold={0} foldable={false} />
      ) : null}
      <div className={styles.field}>
        <label htmlFor="lab-number">{spec.label}</label>
        <input
          id="lab-number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={spec.label}
        />
        {spec.unit ? <span>{spec.unit}</span> : null}
      </div>
    </div>
  );
}

export function ErrorHuntStage({
  spec,
  value,
  onChange,
}: {
  spec: Extract<EngineSpec, { type: "error-hunt" }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.sceneList}>
      {spec.scenes.map((scene) => (
        <button
          key={scene.id}
          type="button"
          aria-pressed={value === scene.id}
          onClick={() => onChange(scene.id)}
        >
          <b>{scene.title}</b>
          <div className={styles.sub}>{scene.detail}</div>
        </button>
      ))}
    </div>
  );
}
