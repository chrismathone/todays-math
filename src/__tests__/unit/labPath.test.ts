/**
 * 수학 랩실 경로 판정 — src/lib/labPath.ts (트랙 53).
 *
 * 관문(src/proxy.ts 의 `isLabRead`)과 활동 기록기(src/components/account/ActivityReporter.tsx)가
 * **이 함수 하나**를 같이 부른다. 관문은 여기에 GET·HEAD 조건을 더한다.
 * 경계는 트랙 52 가 관문에서 못 박은 그대로다 — `startsWith("/lab")` 은 `/label` · `/labx` 까지 열었다.
 */
import { describe, expect, it } from "vitest";

import { isLabPath } from "@/lib/labPath";

describe("isLabPath — /lab 과 그 아래", () => {
  it.each([
    "/lab",
    "/lab/",
    "/lab/teacher",
    "/lab/play/area",
    "/lab/models/cuboid-fold.glb",
    "/lab/blender/cube-net-fold.glb",
  ])("%s 는 랩실이다", (pathname) => {
    expect(isLabPath(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/label",
    "/labels",
    "/labx",
    "/laboratory",
    "/lab-notes",
    "/labx/teacher",
    "/studio",
    "/learn",
    "/api/lab",
    "/dev/lab",
    "/dev/blender-assets/cuboid-fold.glb",
    "/LAB",
    "lab",
    "",
  ])("🔴 %s 는 랩실이 아니다", (pathname) => {
    expect(isLabPath(pathname)).toBe(false);
  });
});
