"use client";

import type { EngineSpec, HeightMap } from "@/lib/lab/types";

import { AreaCutStage, UnitSquaresStage } from "./AreaStages";
import { ChoiceStage, ErrorHuntStage, NumberStage } from "./ChoiceStages";
import { CompareStage, CoverStage, RulerStage } from "./MeasureStages";
import {
  AngleStage,
  BundleStage,
  ChartStage,
  ClockStage,
  FractionBarStage,
  LevelStage,
  MachineStage,
  NLineStage,
  RatioStage,
  ShareStage,
  SolidStage,
  SurfaceStage,
  SymmetryStage,
} from "./DomainStages";
import {
  CubeFoldStage,
  NetPickStage,
  StackBuildStage,
  StackViewStage,
} from "./SpaceStages";

export type EngineValue =
  | string
  | string[]
  | number[]
  | number
  | { rulerZero: number; value: string }
  | { cut: boolean; slide: number; reason: string }
  | { prediction: string; fold: number }
  | { hour: number; minute: number }
  | HeightMap;

export function emptyValue(spec: EngineSpec): EngineValue {
  switch (spec.type) {
    case "choice":
      return Array.isArray(spec.correct) ? [] : "";
    case "number":
    case "compare":
    case "error-hunt":
    case "stack-view":
      return "";
    case "ruler":
      return { rulerZero: spec.rulerZero, value: "" };
    case "cover":
      return 0;
    case "area-cut":
      return { cut: false, slide: 0, reason: "" };
    case "cube-fold":
      return { prediction: "", fold: 0 };
    case "net-pick":
      return [];
    case "stack-build":
      return spec.target.map((row) => row.map(() => 0));
    case "bundle":
    case "ratio":
    case "angle":
      return 0;
    case "nline":
      return spec.min;
    case "fraction-bar":
    case "share":
    case "unit-squares":
      return [] as number[];
    case "symmetry":
    case "machine":
    case "surface":
      return [] as string[];
    case "clock":
      return { hour: 12, minute: 0 };
    case "chart":
    case "solid":
      return "";
    case "level":
      return [...spec.piles];
  }
}

export function toJudgeAnswer(spec: EngineSpec, value: EngineValue): unknown {
  if (spec.type === "ruler") {
    const v = value as { rulerZero: number; value: string };
    return { rulerZero: v.rulerZero, value: Number(v.value) };
  }
  if (spec.type === "number") return Number(value);
  if (spec.type === "unit-squares")
    return Array.isArray(value) ? value.length : Number(value);
  if (spec.type === "cover") return Number(value);
  return value;
}

export function ActivityEngine({
  spec,
  value,
  onChange,
  reducedMotion,
}: {
  spec: EngineSpec;
  value: EngineValue;
  onChange: (value: EngineValue) => void;
  reducedMotion: boolean;
}) {
  switch (spec.type) {
    case "choice":
      return (
        <ChoiceStage
          spec={spec}
          value={value as string | string[]}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <NumberStage spec={spec} value={String(value)} onChange={onChange} />
      );
    case "error-hunt":
      return (
        <ErrorHuntStage spec={spec} value={String(value)} onChange={onChange} />
      );
    case "compare":
      return (
        <CompareStage spec={spec} value={String(value)} onChange={onChange} />
      );
    case "ruler":
      return (
        <RulerStage
          spec={spec}
          value={value as { rulerZero: number; value: string }}
          onChange={onChange}
        />
      );
    case "cover":
      return (
        <CoverStage spec={spec} value={Number(value)} onChange={onChange} />
      );
    case "unit-squares":
      return (
        <UnitSquaresStage
          spec={spec}
          value={
            Array.isArray(value)
              ? (value as number[])
              : Array.from({ length: Number(value) || 0 }, (_, i) => i)
          }
          onChange={onChange}
        />
      );
    case "area-cut":
      return (
        <AreaCutStage
          spec={spec}
          value={value as { cut: boolean; slide: number; reason: string }}
          onChange={onChange}
        />
      );
    case "cube-fold":
      return (
        <CubeFoldStage
          spec={spec}
          value={value as { prediction: string; fold: number }}
          onChange={onChange}
          reducedMotion={reducedMotion}
        />
      );
    case "net-pick":
      return (
        <NetPickStage
          spec={spec}
          value={value as string[]}
          onChange={onChange}
        />
      );
    case "stack-view":
      return (
        <StackViewStage
          spec={spec}
          value={String(value)}
          onChange={onChange}
          reducedMotion={reducedMotion}
        />
      );
    case "stack-build":
      return (
        <StackBuildStage
          spec={spec}
          value={value as HeightMap}
          onChange={onChange}
        />
      );
    case "bundle":
      return (
        <BundleStage spec={spec} value={Number(value)} onChange={onChange} />
      );
    case "fraction-bar":
      return (
        <FractionBarStage
          spec={spec}
          value={value as number[]}
          onChange={onChange}
        />
      );
    case "symmetry":
      return (
        <SymmetryStage
          spec={spec}
          value={value as string[]}
          onChange={onChange}
        />
      );
    case "machine":
      return (
        <MachineStage
          spec={spec}
          value={value as string[]}
          onChange={onChange}
        />
      );
    case "ratio":
      return (
        <RatioStage spec={spec} value={Number(value)} onChange={onChange} />
      );
    case "share":
      return (
        <ShareStage spec={spec} value={value as number[]} onChange={onChange} />
      );
    case "clock":
      return (
        <ClockStage
          spec={spec}
          value={value as { hour: number; minute: number }}
          onChange={onChange}
        />
      );
    case "angle":
      return (
        <AngleStage spec={spec} value={Number(value)} onChange={onChange} />
      );
    case "chart":
      return (
        <ChartStage spec={spec} value={String(value)} onChange={onChange} />
      );
    case "level":
      return (
        <LevelStage spec={spec} value={value as number[]} onChange={onChange} />
      );
    case "surface":
      return (
        <SurfaceStage
          spec={spec}
          value={value as string[]}
          onChange={onChange}
        />
      );
    case "solid":
      return (
        <SolidStage spec={spec} value={String(value)} onChange={onChange} />
      );
    case "nline":
      return (
        <NLineStage spec={spec} value={Number(value)} onChange={onChange} />
      );
  }
}
