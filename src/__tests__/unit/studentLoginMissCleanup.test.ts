// @vitest-environment node
/**
 * 🔴 ⑦ 없는 아이디 실패 행 정리 — **Prisma 저장소 판**(`prismaLoginStore.pruneStaleMisses`)이 실제로 쓰는
 * 질의 모양으로 (learn-screens 브리프 §1.4 · 리드 결정 · student-auth §8-1).
 *
 * `student_login_miss` 는 없는 아이디를 두드릴 때마다 행이 는다. 따로 도는 작업 없이, **없는 아이디 실패를
 * 적을 때** `updated_at` 이 하루 넘게 지난 행을 한 번에 최대 100행 함께 지운다. 메모리 판의 같은 규칙은
 * `studentLogin.test.ts` 가 보고, 여기서는 가짜 DB(`learnTestDouble`) 위에서 **Prisma 질의가 무엇을 지우나**를 본다.
 *
 * ⚠️ 가짜 DB 의 쓰기는 `updatedAt` 을 **진짜 시계**로 찍는다(Prisma `@updatedAt` 흉내) — 그래서 «지금»도 진짜 시계다.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { studentLoginMissKey } from "@/lib/learn/pinHash";
import { prismaLoginStore } from "@/lib/learn/prismaLoginStore";
import { attemptStudentLogin, type LoginDeps } from "@/lib/learn/studentLogin";
import {
  learnRows,
  learnTestDouble,
  resetLearnTestDouble,
  seedStudentLoginMiss,
} from "@/mocks/learnTestDouble";

const SECRET = "miss-cleanup-secret";
const MIN = 60_000;
const HOUR = 60 * MIN;
const key = (n: number) => n.toString(16).padStart(64, "0");
const ghost = studentLoginMissKey("ghost-id", SECRET);

let now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms);

function deps(): LoginDeps {
  return {
    store: prismaLoginStore(learnTestDouble as never),
    now: () => now,
    comparePin: async () => false,
    missKey: (loginId) => studentLoginMissKey(loginId, SECRET),
    audit: async () => {},
  };
}
const unknownFailure = () =>
  attemptStudentLogin({ loginId: "ghost-id", pin: "0001" }, deps());
const keys = () => learnRows.studentLoginMisses().map((r) => r.keyHash);

beforeEach(() => {
  resetLearnTestDouble();
  now = new Date();
});

describe("🔴 ⑦ Prisma 판 — 없는 아이디 실패를 적을 때 하루 넘은 행을 함께 지운다", () => {
  it("🔴 경계 — 23시간 59분 지난 행은 남기고, 24시간 1분 지난 행은 지운다", async () => {
    seedStudentLoginMiss({ keyHash: key(1), updatedAt: ago(24 * HOUR - MIN) });
    seedStudentLoginMiss({ keyHash: key(2), updatedAt: ago(24 * HOUR + MIN) });
    expect(await unknownFailure()).toStrictEqual({
      ok: false,
      reason: "invalid",
    });
    expect(keys().sort()).toStrictEqual([key(1), ghost].sort());
  });

  it("🔴 한 번에 최대 100행 — 150행이 묵었으면 가장 오래된 100행만 지운다", async () => {
    for (let i = 1; i <= 150; i += 1)
      seedStudentLoginMiss({
        keyHash: key(i),
        updatedAt: ago(2 * 24 * HOUR + i * MIN),
      });
    await unknownFailure();
    const left = keys().filter((k) => k !== ghost);
    expect(left).toHaveLength(50);
    expect(left.sort()).toStrictEqual(
      Array.from({ length: 50 }, (_, i) => key(i + 1)).sort(),
    );
    // 다음 실패가 나머지를 마저 지운다 — 따로 도는 작업이 없어도 결국 비워진다
    await unknownFailure();
    expect(keys()).toStrictEqual([ghost]);
  });

  it("방금 적은 행 · 하루 안의 잠긴 행은 안 지운다", async () => {
    seedStudentLoginMiss({
      keyHash: key(7),
      failedCount: 5,
      lockedUntil: new Date(now.getTime() + 5 * MIN),
      updatedAt: ago(2 * MIN),
    });
    await unknownFailure();
    expect(keys().sort()).toStrictEqual([key(7), ghost].sort());
    expect(
      learnRows.studentLoginMisses().find((r) => r.keyHash === ghost)!
        .failedCount,
    ).toBe(1);
  });
});
