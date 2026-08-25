/**
 * 「진도가 없다」의 **이유**가 화면에 도달하는가 (2026-08-25).
 *
 * 이 검사의 급소: 세 상태가 **서로 다른 문장**을 내야 한다. 하나로 뭉개면
 * 원장님은 이미 있는 진도를 다시 입력하러 간다 — 오류도 경고도 없는 잘못된 안내다.
 * 실제로 MS2A 가 그 상태였다(학생 10명 · 단원 4개).
 */
import { describe, expect, it, vi } from "vitest";

import {
  NO_PROGRESS_AT_ALL,
  noProgressReason,
  type ProgressLookup,
} from "@/lib/progress/noProgressReason";

const UNIT_A = "aaaa";
const UNIT_B = "bbbb";

/** 최신순으로 이미 정렬해 돌려주는 가짜 — 실제 질의의 `orderBy` 와 같은 약속. */
function lookup(
  rows: Array<{ studentId: string | null; unitId: string; day: string }>,
): ProgressLookup {
  return {
    progress: {
      findMany: vi.fn(async () =>
        rows.map((r) => ({
          studentId: r.studentId,
          unitId: r.unitId,
          recordedAt: new Date(`${r.day}T00:00:00Z`),
          createdAt: new Date(`${r.day}T09:00:00Z`),
        })),
      ),
    },
  };
}

describe("[진도] 왜 없는지 갈라 말한다", () => {
  it("정말 아무도 없으면 그렇게 말한다", async () => {
    expect(await noProgressReason(lookup([]), "c1")).toBe(NO_PROGRESS_AT_ALL);
  });

  it("🔴 학생마다 갈리면 **개별진도반**이라고 말하고 무엇을 하면 되는지 적는다", async () => {
    const msg = await noProgressReason(
      lookup([
        { studentId: "s1", unitId: UNIT_A, day: "2026-08-25" },
        { studentId: "s2", unitId: UNIT_B, day: "2026-08-24" },
      ]),
      "c1",
    );
    expect(msg).not.toBe(NO_PROGRESS_AT_ALL);
    expect(msg).toContain("학생마다 진도가 다릅니다");
    expect(msg).toContain("단원 2개");
    expect(msg).toContain("학생 2명");
    // 「무엇을 하면 되는가」가 없으면 안내가 아니라 통보다.
    expect(msg).toMatch(/직접 고르거나|학생을 지정/);
  });

  it("모두 같은데 반 진도가 없으면 «동기화가 아직 안 돌았다»고 말한다", async () => {
    const msg = await noProgressReason(
      lookup([
        { studentId: "s1", unitId: UNIT_A, day: "2026-08-25" },
        { studentId: "s2", unitId: UNIT_A, day: "2026-08-24" },
      ]),
      "c1",
    );
    expect(msg).toContain("동기화");
    expect(msg).not.toContain("학생마다");
  });

  it("한 학생의 이력이 여럿이어도 **최신 하나**만 센다 (옛 단원이 «갈림»으로 보이면 안 된다)", async () => {
    const msg = await noProgressReason(
      lookup([
        { studentId: "s1", unitId: UNIT_A, day: "2026-08-25" },
        { studentId: "s1", unitId: UNIT_B, day: "2026-08-10" },
      ]),
      "c1",
    );
    expect(msg).not.toContain("학생마다");
  });
});
