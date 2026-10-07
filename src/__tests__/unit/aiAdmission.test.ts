/**
 * 유료 AI 호출의 **사용자별 동시 실행 한도** (`src/lib/aiAdmission.ts`).
 *
 * 2026-10-07 검수: `/api/problems/generate` · `/transform` · `/api/english/generate` 는 로그인만 하면
 * 병렬로 얼마든지 부를 수 있었다(호출 하나가 40초 ~ 5분 · 모델 호출 최대 셋). 작업실 AI(`studio-ai/handler.ts`)와
 * 사진 읽기(`english/materials/[id]/read`)에는 이미 «한 사람 둘까지»가 있었고, 이 셋에만 없었다.
 *
 * 🔴 여기서 가장 중요한 시험은 **«풀리는가»** 다 — 자리를 안 돌려주면 그 사람은 다시는 못 만든다.
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  AI_ADMISSION_LIMIT,
  admitAiWork,
  resetAiAdmission,
} from "@/lib/aiAdmission";

beforeEach(() => resetAiAdmission());

describe("admitAiWork", () => {
  it("한 사람이 한도까지는 들어가고, 넘으면 거절한다", () => {
    for (let i = 0; i < AI_ADMISSION_LIMIT; i++)
      expect(admitAiWork("problems", "u1")).not.toBeNull();
    expect(admitAiWork("problems", "u1")).toBeNull();
  });

  it("🔴 자리를 돌려주면 다시 들어간다", () => {
    const releases = Array.from({ length: AI_ADMISSION_LIMIT }, () =>
      admitAiWork("problems", "u1"),
    );
    expect(admitAiWork("problems", "u1")).toBeNull();
    releases[0]!();
    expect(admitAiWork("problems", "u1")).not.toBeNull();
    expect(admitAiWork("problems", "u1")).toBeNull();
  });

  it("같은 자리를 두 번 돌려줘도 한 번만 센다 — 남의 자리가 열리지 않는다", () => {
    const first = admitAiWork("problems", "u1")!;
    for (let i = 1; i < AI_ADMISSION_LIMIT; i++) admitAiWork("problems", "u1");
    first();
    first();
    expect(admitAiWork("problems", "u1")).not.toBeNull();
    expect(admitAiWork("problems", "u1")).toBeNull();
  });

  it("사람이 다르면 서로 막지 않는다", () => {
    for (let i = 0; i < AI_ADMISSION_LIMIT; i++) admitAiWork("problems", "u1");
    expect(admitAiWork("problems", "u2")).not.toBeNull();
  });

  it("갈래가 다르면 서로 막지 않는다 — 수학 변형 중에도 영어 생성은 들어간다", () => {
    for (let i = 0; i < AI_ADMISSION_LIMIT; i++) admitAiWork("problems", "u1");
    expect(admitAiWork("english-generate", "u1")).not.toBeNull();
  });
});
