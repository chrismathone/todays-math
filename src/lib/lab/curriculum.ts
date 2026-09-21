import { COURSES } from "./courses";
import { labScopeById } from "./scope";
import type { UnitRecord } from "./types";
import raw from "./units.json";

type RawUnit = {
  id: string;
  grade: number;
  semester: number;
  unit: number;
  title: string;
  engine: string;
  domain: string;
  concept: string;
  action: string;
  evidence: string;
  limit: string;
  blender: string;
  demos: string[];
  source: string;
};

const IMPLEMENTED: Record<string, string[]> = {
  "1-1-4": ["measure"],
  "1-1-5": ["number"],
  "1-2-1": ["number"],
  "1-2-3": ["shape"],
  "1-2-4": ["number"],
  "1-2-5": ["pattern"],
  "1-2-6": ["number"],
  "2-1-1": ["number"],
  "2-1-2": ["shape"],
  "2-1-4": ["measure"],
  "2-1-6": ["calc"],
  "2-2-1": ["number"],
  "2-2-3": ["measure"],
  "2-2-4": ["clock"],
  "2-2-6": ["pattern"],
  "3-1-2": ["shape"],
  "3-1-3": ["calc"],
  "3-1-4": ["calc"],
  "3-1-5": ["clock"],
  "3-1-6": ["fraction"],
  "3-2-2": ["calc"],
  "3-2-3": ["shape"],
  "3-2-4": ["fraction"],
  "4-1-1": ["number"],
  "4-1-2": ["clock"],
  "4-1-4": ["shape"],
  "4-1-6": ["pattern"],
  "4-1-5": ["data"],
  "4-2-1": ["fraction"],
  "4-2-2": ["shape"],
  "4-2-3": ["fraction"],
  "4-2-4": ["shape"],
  "4-2-5": ["data"],
  "4-2-6": ["shape"],
  "5-1-2": ["calc"],
  "5-1-3": ["pattern"],
  "5-1-4": ["fraction"],
  "5-1-5": ["fraction"],
  "5-1-6": ["area"],
  "5-2-1": ["number"],
  "5-2-2": ["fraction"],
  "5-2-3": ["shape"],
  "5-2-4": ["fraction"],
  "5-2-5": ["space"],
  "5-2-6": ["data"],
  "6-1-1": ["fraction"],
  "6-1-2": ["volume"],
  "6-1-3": ["fraction"],
  "6-1-4": ["ratio"],
  "6-1-5": ["data"],
  "6-1-6": ["volume"],
  "6-2-1": ["fraction"],
  "6-2-2": ["space"],
  "6-2-3": ["fraction"],
  "6-2-4": ["ratio"],
  "6-2-5": ["area"],
  "6-2-6": ["volume"],
};

const PARTIAL: Record<string, string[]> = {};

export const CURRICULUM_SOURCES = raw.sources as Record<
  string,
  { name: string; url: string }
>;

export function units(): UnitRecord[] {
  const scopeMap = labScopeById();
  return (raw.units as RawUnit[]).map((u) => {
    const scope = scopeMap[u.id];
    if (!scope) {
      throw new Error(`단원 ${u.id} 에 실험실 문지기가 없습니다`);
    }
    const courses = IMPLEMENTED[u.id] ?? PARTIAL[u.id] ?? [];
    let status: UnitRecord["status"] = "hold";
    if (scope.gate === "exclude") status = "excluded";
    else if (IMPLEMENTED[u.id]) status = "implemented";
    else if (PARTIAL[u.id]) status = "partial";
    return {
      ...u,
      status,
      courses,
      gate: scope.gate,
      scopeReason: scope.reason,
      excludeKind: scope.excludeKind,
    };
  });
}

export function unitById(id: string): UnitRecord | undefined {
  return units().find((u) => u.id === id);
}

export function implementationSummary() {
  const all = units();
  return {
    catalog: all.length,
    implemented: all.filter((u) => u.status === "implemented").length,
    partial: all.filter((u) => u.status === "partial").length,
    hold: all.filter((u) => u.status === "hold").length,
    excluded: all.filter((u) => u.status === "excluded").length,
    play: all.filter((u) => u.gate === "play").length,
    courses: COURSES.map((c) => ({
      id: c.id,
      title: c.title,
      activities: c.activities.length,
      units: c.unitIds,
    })),
  };
}
