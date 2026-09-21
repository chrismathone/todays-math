import { describe, expect, it } from "vitest";

import { MEASURE_COURSE } from "@/lib/lab/courses/measure";
import {
  applyAttempt,
  emptySave,
  parseSave,
  recordHint,
  startActivity,
} from "@/lib/lab/progress";
import * as progress from "@/lib/lab/progress";

describe("학습 기록", () => {
  const apply = MEASURE_COURSE.activities.find((a) => a.id === "offset-read")!;
  const recall = MEASURE_COURSE.activities.find(
    (a) => a.id === "compare-start",
  )!;

  it("같은 확인을 다시 해도 XP를 중복으로 주지 않는다", () => {
    const save = startActivity(emptySave(), "measure", apply);
    const first = applyAttempt(save, "measure", apply, true, false);
    const again = applyAttempt(first.save, "measure", apply, true, false);
    expect(first.xpDelta).toBe(20);
    expect(again.xpDelta).toBe(0);
    expect(first.save.xp).toBe(20);
  });

  it("힌트를 쓴 적용 문제는 독립 이해로 치지 않는다", () => {
    let save = startActivity(emptySave(), "measure", apply);
    save = recordHint(save, "measure", apply.id);
    const result = applyAttempt(save, "measure", apply, true, false);
    expect(result.awards).not.toContain("independent");
    expect(result.save.courses.measure.activities[apply.id].independent).toBe(
      false,
    );
  });

  it("힌트 없이 한 번에 맞힌 적용만 독립 이해다", () => {
    const save = startActivity(emptySave(), "measure", apply);
    const result = applyAttempt(save, "measure", apply, true, false);
    expect(result.awards).toContain("independent");
    expect(result.save.courses.measure.activities[apply.id].independent).toBe(
      true,
    );
  });

  it("회상 단계는 맞춰도 독립 이해 칸을 올리지 않는다", () => {
    const save = startActivity(emptySave(), "measure", recall);
    const result = applyAttempt(save, "measure", recall, true, false);
    expect(result.awards).not.toContain("independent");
  });

  // 기록 함수는 렌더와 무관한 순수 함수다. 이름이 `use` 로 시작하면 ESLint rules-of-hooks 가
  // 훅으로 읽어 «도움» 처리기 안의 호출을 막는다(2026-09-21 병합 검사 — 이름을 recordHint 로 바꿨다).
  it("기록 함수는 use 로 시작하는 이름을 내보내지 않는다", () => {
    const names = Object.keys(progress).filter((k) => /^use[A-Z]/.test(k));
    expect(names).toEqual([]);
  });

  it("깨진 저장본은 빈 기록으로 되돌린다", () => {
    expect(parseSave({ v: 2, xp: 999 }).xp).toBe(0);
    expect(parseSave(null).v).toBe(1);
  });
});
