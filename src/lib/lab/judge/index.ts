import { CUBE_OPPOSITE, CUBOID_OPPOSITE } from "../cubeNets";
import {
  clockMatch,
  isBundled,
  isLevel,
  isShaded,
  isShared,
  machineComplete,
  surfaceComplete,
  symmetryComplete,
} from "../domainMath";
import {
  DEMO_STACK,
  frontHeights,
  heightMapsEqual,
  hiddenFromFront,
  voxelCount,
} from "../stackMath";
import type { EngineSpec, HeightMap, JudgeResult } from "../types";
import {
  parallelogramArea,
  rectangleFromCut,
  triangleFromParallelogram,
  unitSquareCount,
} from "./area";
import {
  compareLonger,
  coverComplete,
  measuredLength,
  rulerAligned,
} from "./measure";

function asString(answer: unknown): string {
  return String(answer ?? "");
}

function asNumber(answer: unknown): number {
  if (typeof answer === "number") return answer;
  if (typeof answer === "string" && answer.trim() !== "") return Number(answer);
  return NaN;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export function judge(engine: EngineSpec, answer: unknown): JudgeResult {
  switch (engine.type) {
    case "choice": {
      const correct = Array.isArray(engine.correct)
        ? engine.correct
        : [engine.correct];
      const got = Array.isArray(answer)
        ? (answer as string[])
        : [asString(answer)];
      return {
        ok: sameSet(got, correct),
        message: "",
      };
    }
    case "number": {
      const n = asNumber(answer);
      const allowed = engine.allowed ?? [engine.correct];
      return { ok: allowed.includes(n), message: "" };
    }
    case "compare": {
      const expected = compareLonger(engine.left, engine.right);
      return { ok: asString(answer) === expected, message: "" };
    }
    case "ruler": {
      const body = (answer ?? {}) as {
        rulerZero?: number;
        value?: number;
      };
      const length = measuredLength(engine.objectStart, engine.objectEnd);
      if (
        engine.mode === "align" &&
        !rulerAligned(body.rulerZero ?? NaN, engine.objectStart)
      ) {
        return { ok: false, message: "align" };
      }
      return { ok: body.value === length, message: "" };
    }
    case "cover":
      return {
        ok: coverComplete(asNumber(answer), engine.length),
        observe: coverComplete(asNumber(answer), engine.length),
        message: "",
      };
    case "area-cut": {
      const body = (answer ?? {}) as {
        cut?: boolean;
        slide?: number;
        reason?: string;
      };
      const moved = rectangleFromCut(
        engine.base,
        engine.height,
        body.slide ?? 0,
        Boolean(body.cut),
      );
      if (!moved.complete) return { ok: false, message: "move" };
      return { ok: body.reason === "same", observe: true, message: "" };
    }
    case "unit-squares": {
      const n = Array.isArray(answer) ? new Set(answer).size : asNumber(answer);
      const ok = n === unitSquareCount(engine.cols, engine.rows);
      return { ok, observe: ok, message: "" };
    }
    case "error-hunt":
      return { ok: asString(answer) === engine.wrong, message: "" };
    case "cube-fold": {
      const body = (answer ?? {}) as {
        prediction?: string;
        fold?: number;
      };
      if (engine.foldable !== false && (body.fold ?? 0) < 100)
        return { ok: false, message: "fold" };
      const table = engine.model === "cube" ? CUBE_OPPOSITE : CUBOID_OPPOSITE;
      return {
        ok: body.prediction === table[engine.fromFace],
        observe: true,
        message: "",
      };
    }
    case "net-pick": {
      const got = Array.isArray(answer) ? (answer as string[]) : [];
      return { ok: sameSet(got, engine.correct), message: "" };
    }
    case "stack-view": {
      const heights = engine.heights.length ? engine.heights : DEMO_STACK;
      if (engine.question === "count")
        return { ok: asNumber(answer) === voxelCount(heights), message: "" };
      if (engine.question === "front") {
        const got = Array.isArray(answer)
          ? (answer as number[])
          : String(answer)
              .split(/[,\s]+/)
              .map(Number);
        const want = frontHeights(heights);
        return {
          ok: got.length === want.length && got.every((n, i) => n === want[i]),
          message: "",
        };
      }
      if (engine.question === "hidden-front")
        return {
          ok: asNumber(answer) === hiddenFromFront(heights),
          message: "",
        };
      return { ok: asString(answer) === String(engine.correct), message: "" };
    }
    case "stack-build": {
      const got = answer as HeightMap;
      return { ok: heightMapsEqual(got, engine.target), message: "" };
    }
    case "bundle":
      return {
        ok: isBundled(engine.total, asNumber(answer)),
        observe: isBundled(engine.total, asNumber(answer)),
        message: "",
      };
    case "fraction-bar": {
      const got = Array.isArray(answer) ? (answer as number[]) : [];
      const ok = isShaded(got, engine.parts, engine.filled);
      return { ok, observe: ok, message: "" };
    }
    case "symmetry": {
      const got = Array.isArray(answer) ? (answer as string[]) : [];
      const ok = symmetryComplete(
        engine.seed,
        got,
        engine.rows,
        engine.cols,
        engine.axis,
      );
      return { ok, observe: ok, message: "" };
    }
    case "machine": {
      const got = Array.isArray(answer) ? (answer as string[]) : [];
      const ok = machineComplete(got, engine.pairs.length);
      return { ok, observe: ok, message: "" };
    }
    case "ratio":
      return {
        ok: asNumber(answer) === engine.copies,
        observe: asNumber(answer) === engine.copies,
        message: "",
      };
    case "share": {
      const got = Array.isArray(answer) ? (answer as number[]) : [];
      const ok = isShared(got, engine.total, engine.groups);
      return { ok, observe: ok, message: "" };
    }
    case "clock": {
      const body = (answer ?? {}) as { hour?: number; minute?: number };
      const ok = clockMatch(
        body.hour ?? 0,
        body.minute ?? -1,
        engine.hour,
        engine.minute,
      );
      return { ok, observe: ok, message: "" };
    }
    case "angle": {
      const ok = asNumber(answer) === engine.degrees;
      return { ok, observe: ok, message: "" };
    }
    case "nline": {
      const ok = asNumber(answer) === engine.target;
      return { ok, observe: ok, message: "" };
    }
    case "chart": {
      const correct = Array.isArray(engine.correct)
        ? engine.correct
        : [engine.correct];
      const got = Array.isArray(answer)
        ? (answer as string[])
        : [asString(answer)];
      return { ok: sameSet(got, correct), message: "" };
    }
    case "level": {
      const got = Array.isArray(answer) ? (answer as number[]) : [];
      const ok = isLevel(got, engine.target);
      return { ok, observe: ok, message: "" };
    }
    case "surface": {
      const got = Array.isArray(answer) ? (answer as string[]) : [];
      const ok = surfaceComplete(got);
      return { ok, observe: ok, message: "" };
    }
    case "solid":
      return { ok: asString(answer) === engine.correct, message: "" };
  }
}

export function expectedNumber(engine: EngineSpec): number | null {
  if (engine.type === "number") return engine.correct;
  if (engine.type === "unit-squares")
    return unitSquareCount(engine.cols, engine.rows);
  if (engine.type === "area-cut")
    return parallelogramArea(engine.base, engine.height);
  if (engine.type === "ruler")
    return measuredLength(engine.objectStart, engine.objectEnd);
  if (engine.type === "cover") return engine.length;
  if (engine.type === "stack-view" && engine.question === "count")
    return voxelCount(engine.heights);
  if (engine.type === "stack-view" && engine.question === "hidden-front")
    return hiddenFromFront(engine.heights);
  if (engine.type === "choice" && engine.correct === "triangle-half")
    return triangleFromParallelogram(6, 4);
  return null;
}
