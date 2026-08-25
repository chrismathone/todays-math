/**
 * 수업보고서가 **반별로 갈리는가** (원장님 지시 2026-08-25).
 *
 * 원장님: *「지금 MS2A의 경우 본수업은 3-1을 진행중이고, 특강으로 3-2 진도를 진행하는데
 * 구분하지 않고 가져와서 3-2를 보고 있음.」*
 *
 * 🔴 이 검사의 급소는 **「학생이 여러 반에 있을 때」**다. 한 반짜리 픽스처만 보면
 *    학생 단위로 묶든 반 단위로 묶든 결과가 같아서, 결함이 구조적으로 안 보인다 —
 *    실제로 그래서 여덟 달을 지나왔다.
 */
import { describe, expect, it } from "vitest";

import { groupReportsByClassStudent, splitKey } from "@/lib/eywa/groupReports";
import type { EywaReport } from "@/lib/eywa/syncPlan";

const 본수업 = "11111111-1111-1111-1111-111111111111";
const 특강 = "22222222-2222-2222-2222-222222222222";
const 학생 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const 남 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function report(over: Partial<EywaReport> = {}): EywaReport {
  return {
    id: `r-${Math.abs(Number(over.reportDate?.replaceAll("-", "") ?? 1))}-${over.classId ?? "x"}`,
    studentId: 학생,
    reportDate: "2026-08-20",
    createdAt: "2026-08-20T09:00:00Z",
    progress: "수학 다항식의 곱셈",
    classId: 본수업,
    makeupClassId: null,
    ...over,
  } as EywaReport;
}

const ROSTER = new Set([학생]);
const ALLOWED = new Set([본수업]);
const NAMES = new Map([
  [본수업, "중등M 초6 MS2A"],
  [특강, "[특강]중3-2 개념 완성반"],
]);

describe("[eywa] 보고서를 (반, 학생)으로 가른다", () => {
  it("🔴 특강 보고서가 더 최신이어도 **본수업 묶음에 안 들어간다**", () => {
    const got = groupReportsByClassStudent(
      [
        report({ reportDate: "2026-08-20", classId: 본수업 }),
        report({ reportDate: "2026-08-25", classId: 특강 }),
      ],
      ROSTER,
      ALLOWED,
      NAMES,
    );
    expect([...got.byClassStudent.keys()]).toEqual([`${본수업}|${학생}`]);
    const rows = got.byClassStudent.get(`${본수업}|${학생}`)!;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.reportDate).toBe("2026-08-20");
    // 버린 것은 **이름과 함께** 세어 둔다 — 조용히 빠지면 「전부 가져왔다」로 읽힌다.
    expect(got.범위밖반보고서.get("[특강]중3-2 개념 완성반")).toBe(1);
  });

  it("한 학생이 범위 안 두 반에 있으면 **묶음이 둘**이다", () => {
    const 둘째반 = "33333333-3333-3333-3333-333333333333";
    const got = groupReportsByClassStudent(
      [report({ classId: 본수업 }), report({ classId: 둘째반 })],
      ROSTER,
      new Set([본수업, 둘째반]),
      NAMES,
    );
    expect(got.byClassStudent.size).toBe(2);
  });

  it("🔴 반이 안 적힌 보고서는 **버린다** — 주반에 몰아넣으면 그 결함이 되살아난다", () => {
    const got = groupReportsByClassStudent(
      [report({ classId: null })],
      ROSTER,
      ALLOWED,
      NAMES,
    );
    expect(got.byClassStudent.size).toBe(0);
    expect(got.반없는보고서).toBe(1);
  });

  it("명단 밖 학생은 세되 담지 않는다", () => {
    const got = groupReportsByClassStudent(
      [report({ studentId: 남 })],
      ROSTER,
      ALLOWED,
      NAMES,
    );
    expect(got.byClassStudent.size).toBe(0);
    expect(got.명단밖진도).toBe(1);
    expect([...got.명단밖학생]).toEqual([남]);
  });

  it("「마지막 보고서」용 학생 묶음에는 **채택된 것만** 들어간다", () => {
    const got = groupReportsByClassStudent(
      [
        report({ reportDate: "2026-08-20", classId: 본수업 }),
        report({ reportDate: "2026-08-25", classId: 특강 }),
      ],
      ROSTER,
      ALLOWED,
      NAMES,
    );
    // 특강이 섞이면 D-64 「마지막 보고서」가 특강 날짜를 말하게 된다.
    expect(got.byStudent.get(학생)!.map((r) => r.reportDate)).toEqual([
      "2026-08-20",
    ]);
  });

  it("키는 되돌릴 수 있다 (UUID 안에 `|` 가 없다는 전제)", () => {
    expect(splitKey(`${본수업}|${학생}`)).toEqual({
      classId: 본수업,
      studentId: 학생,
    });
  });
});
