import { describe, expect, it } from "vitest";
import { prerequisiteVersionsSchema } from "@/contracts/mathPrerequisite.contract";
import {
  mappingInfo,
  PILOT_CHECK_SECTION_IDS,
  PILOT_CHECK_UNIT_ID,
  PILOT_SECTION_IDS,
  PILOT_TARGET_SECTION_IDS,
  PILOT_TARGET_UNIT_ID,
  pilotTargetForCourse,
  sectionUnitId,
  targetForCourse,
} from "@/lib/math-prerequisite/mapping";
import {
  MAPPING_VERSION,
  POLICY_VERSION,
  PREREQUISITE_POLICY,
  prerequisiteVersions,
  SCHEMA_VERSION,
} from "@/lib/math-prerequisite/versions";
import { courseSummary, emptyCourseState } from "@/lib/math-srs/courseAutomation";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { explorerUnitForSection } from "@/lib/math-explorers/curriculumBridge";
import {
  at,
  FAIL,
  PASS,
  plannedCourse,
  practise,
} from "../helpers/mathPrerequisiteCourse";

describe("선수 확인 매핑 — 손으로 쓴 시범 범위", () => {
  it("목표 둘 · 확인 둘의 차례가 고정이고 모두 실제 코스 소단원이다", () => {
    expect(PILOT_TARGET_SECTION_IDS).toEqual(["5-2-2-1", "5-2-2-2"]);
    expect(PILOT_CHECK_SECTION_IDS).toEqual(["5-1-5-4", "5-1-5-3"]);
    expect(PILOT_SECTION_IDS).toEqual([
      "5-2-2-1",
      "5-2-2-2",
      "5-1-5-4",
      "5-1-5-3",
    ]);
    for (const id of PILOT_SECTION_IDS) expect(getCourseSection(id)).toBeDefined();
    expect(getCourseSection("5-2-2-1")!.title).toBe("(분수)×(자연수)의 계산");
    expect(getCourseSection("5-1-5-4")!.title).toBe("대분수의 뺄셈");
  });

  it("넷 다 같은 탐험 단원이라 열린 미션의 가드를 지난다", () => {
    for (const id of PILOT_SECTION_IDS)
      expect(explorerUnitForSection(id)).toBe("g5-fractions");
  });

  it("목표는 E56-N04, 확인은 E56-N03 — 단원 간선 한 줄이고 소단원 간선이 아니다", () => {
    expect(PILOT_TARGET_UNIT_ID).toBe("E56-N04");
    expect(PILOT_CHECK_UNIT_ID).toBe("E56-N03");
    expect(PILOT_TARGET_SECTION_IDS.map(sectionUnitId)).toEqual([
      "E56-N04",
      "E56-N04",
    ]);
    expect(PILOT_CHECK_SECTION_IDS.map(sectionUnitId)).toEqual([
      "E56-N03",
      "E56-N03",
    ]);
    expect(sectionUnitId("5-1-4-2")).toBeNull();
    expect(sectionUnitId("5-2-2-3")).toBeNull();
  });

  it("단원 정보는 늘 부분 확인이고, 공급은 시범 단원만", () => {
    expect(mappingInfo("E56-N04")).toEqual({
      unitId: "E56-N04",
      mappingStatus: "verified",
      supply: "available",
      role: "target",
      sectionIds: ["5-2-2-1", "5-2-2-2"],
      partial: true,
    });
    expect(mappingInfo("E56-N03")).toMatchObject({
      mappingStatus: "verified",
      supply: "available",
      role: "check",
      sectionIds: ["5-1-5-4", "5-1-5-3"],
      partial: true,
    });
    for (const unitId of ["M3-R02", "H-C1-01", "H-BAS1-01", "E12-N01", "E56-N01"])
      expect(mappingInfo(unitId)).toEqual({
        unitId,
        mappingStatus: "unmapped",
        supply: "unavailable",
        role: null,
        sectionIds: [],
        partial: true,
      });
  });

  it("목표는 지금 코스의 다음 학습 소단원과 같다(제목 · 탐험 단원으로 고르지 않는다)", () => {
    const t0 = at("2026-10-01T01:00:00.000Z");
    const states = [
      plannedCourse("5-2-2-1", t0),
      plannedCourse("5-1-5-3", t0),
      plannedCourse("3-1-1-1", t0),
      practise(plannedCourse("5-2-2-1", t0), "5-2-2-1", "learn", t0, PASS),
      practise(plannedCourse("5-2-2-1", t0), "5-2-2-1", "learn", t0, FAIL),
    ];
    for (const state of states) {
      const summary = courseSummary(state, at("2026-10-05T01:00:00.000Z"));
      expect(targetForCourse(state)).toBe(summary.currentSectionId);
    }
    expect(targetForCourse(states[3])).toBe("5-2-2-2");
    expect(pilotTargetForCourse(states[0])).toBe("5-2-2-1");
    expect(pilotTargetForCourse(states[1])).toBeNull();
    expect(pilotTargetForCourse(states[2])).toBeNull();
    expect(pilotTargetForCourse(emptyCourseState())).toBeNull();
  });
});

describe("선수 확인 판 — 넷을 따로 둔다", () => {
  it("형식 · 매핑 · 정책의 판과 정책 수치", () => {
    expect(SCHEMA_VERSION).toBe("1.1.0");
    expect(MAPPING_VERSION).toBe(1);
    expect(POLICY_VERSION).toBe(1);
    expect(PREREQUISITE_POLICY).toEqual({
      sessionSize: 5,
      triggerSessions: 2,
      passIndependentCorrect: 4,
      failIndependentIncorrect: 2,
      evidenceWindowDays: 14,
      checkCooldownDays: 14,
      checksPerKstDay: 1,
      maxCheckSections: 2,
      depth: 1,
      supplyCandidates: 20,
    });
  });

  it("내용 해시는 부르는 쪽이 넣고, 계약의 모양으로만 나간다", () => {
    const hash = "a".repeat(64);
    const versions = prerequisiteVersions(hash);
    expect(prerequisiteVersionsSchema.parse(versions)).toEqual({
      graphSchemaVersion: "1.1.0",
      graphContentHash: hash,
      mappingVersion: 1,
      policyVersion: 1,
    });
    expect(() => prerequisiteVersions("not-a-hash")).toThrow();
  });
});
