/**
 * 개별 진도 → **반 진도** 유도가 옳은가 (원장님 확정 2026-08-25).
 *
 * 원장님: *「에이와에 반 진도는 없어. 개별 진도만 존재할뿐.」* ·
 * *「이 반은 전부 진도가 같으면 오히려 테스트하기에 합리적이네. 하지만 개별진도반도
 * 존재하긴해.」*
 *
 * 🔴 이 검사의 급소는 **「만들지 않는 자리」**다. 만드는 쪽은 화면에서 바로 보이지만,
 *    갈린 반에 임의로 하나를 고르는 실수는 **뒤처진 학생이 못 푸는 시험지**로만
 *    드러난다 — 지면에 나가기 전에는 아무 신호가 없다.
 */
import { describe, expect, it } from "vitest";

import {
  assertNoIdCollision,
  deriveClassProgress,
  type StudentProgressRow,
} from "@/lib/eywa/deriveClassProgress";

const CLASS = "11111111-1111-1111-1111-111111111111";
const EYWA_CLASS = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UNIT_A = "22222222-2222-2222-2222-222222222222";
const UNIT_B = "33333333-3333-3333-3333-333333333333";

const MAP = new Map([[CLASS, EYWA_CLASS]]);

function row(over: Partial<StudentProgressRow> = {}): StudentProgressRow {
  return {
    eywaReportId: "99999999-9999-9999-9999-999999999999",
    unitId: UNIT_A,
    classId: CLASS,
    studentId: "s1",
    recordedAt: new Date("2026-08-20T00:00:00Z"),
    createdAt: new Date("2026-08-20T09:00:00Z"),
    ...over,
  };
}

describe("[진도] 단체진도반은 반 진도를 유도한다", () => {
  it("모두 같은 단원이면 반 행 하나가 생긴다", () => {
    const { rows, diverged } = deriveClassProgress(
      [row({ studentId: "s1" }), row({ studentId: "s2" })],
      MAP,
    );
    expect(diverged).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.studentId).toBeNull();
    expect(rows[0]!.unitId).toBe(UNIT_A);
  });

  it("표식은 **그 반의 eywa 반 id** 다 — 다음 실행이 지우고 다시 쓰려면 NULL 이면 안 된다", () => {
    const { rows } = deriveClassProgress([row()], MAP);
    expect(rows[0]!.eywaReportId).toBe(EYWA_CLASS);
  });

  it("가장 최신 기록일을 쓴다", () => {
    const { rows } = deriveClassProgress(
      [
        row({ studentId: "s1", recordedAt: new Date("2026-08-18T00:00:00Z") }),
        row({ studentId: "s2", recordedAt: new Date("2026-08-24T00:00:00Z") }),
      ],
      MAP,
    );
    expect(rows[0]!.recordedAt.toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  it("기록일이 같으면 나중에 적은 것이 최신이다", () => {
    const { rows } = deriveClassProgress(
      [
        row({
          studentId: "s1",
          unitId: UNIT_A,
          createdAt: new Date("2026-08-20T09:00:00Z"),
        }),
        row({
          studentId: "s1",
          unitId: UNIT_B,
          createdAt: new Date("2026-08-20T18:00:00Z"),
        }),
      ],
      MAP,
    );
    expect(rows[0]!.unitId).toBe(UNIT_B);
  });
});

describe("[진도] 🔴 만들지 않는 자리 — 여기가 급소다", () => {
  it("학생마다 최신 단원이 갈리면 **만들지 않는다** (개별진도반)", () => {
    const { rows, diverged } = deriveClassProgress(
      [
        row({ studentId: "s1", unitId: UNIT_A }),
        row({ studentId: "s2", unitId: UNIT_B }),
      ],
      MAP,
    );
    expect(rows).toHaveLength(0);
    expect(diverged).toEqual([{ classId: CLASS, units: 2, students: 2 }]);
  });

  it("진도가 한 건도 없으면 만들지 않는다 — 「모두 같다」가 공허참이 되면 안 된다", () => {
    const { rows, diverged } = deriveClassProgress([], MAP);
    expect(rows).toHaveLength(0);
    expect(diverged).toHaveLength(0);
  });

  it("eywa 반 id 를 모르면 만들지 않는다 — 청소 안 되는 행을 남기느니 없는 게 낫다", () => {
    const { rows } = deriveClassProgress([row()], new Map());
    expect(rows).toHaveLength(0);
  });
});

describe("[진도] 표식이 수업보고서 id 와 겹치면 멈춘다", () => {
  it("겹치면 던진다 — 조용히 한 행이 다른 행을 밀어내면 안 된다", () => {
    const studentRows = [row({ eywaReportId: EYWA_CLASS })];
    const derived = deriveClassProgress(studentRows, MAP).rows;
    expect(() => assertNoIdCollision(studentRows, derived)).toThrow(/겹친다/);
  });

  it("안 겹치면 조용하다 (거짓 경보를 내면 가드가 꺼진다)", () => {
    const studentRows = [row()];
    const derived = deriveClassProgress(studentRows, MAP).rows;
    expect(() => assertNoIdCollision(studentRows, derived)).not.toThrow();
  });
});
