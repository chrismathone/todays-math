// @vitest-environment node
/**
 * 🔴 다른 지점 관리자 — 기존 교사 끝점 셋의 **경로 시험** (27번 문서 §4 공백 4).
 *
 *   GET      /api/classes/{id}/math-srs          반 복습 현황
 *   GET·POST /api/students/{id}/math-srs/course  학생 상세 · 학습 설정
 *   GET      /api/math-srs/course                «오늘의 기억» 명단
 *
 * 지금까지는 `ownerScope` 단위 시험(where 조각 · `withinOwnerScope`)뿐이었다 — 조각이 옳아도 끝점이 그 조각을
 * 안 지나면 샌다(20번 교훈 2026-09-21 «표지로 센 전수는 "그 파일이 조각을 안다"까지만 말한다»).
 * 여기서는 끝점을 실제로 불러, 관리자여도 **다른 지점**이면 막히고 **같은 지점**이면 열리는지 본다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/lib/auth",
  async () => (await import("../helpers/srsTeacherWorld")).authModule,
);
vi.mock(
  "@/lib/db",
  async () => (await import("../helpers/srsTeacherWorld")).dbModule,
);
vi.mock("@/lib/errorLog/record", () => ({
  recordErrorLog: vi.fn(async () => undefined),
}));

import { GET as classDashboard } from "@/app/api/classes/[id]/math-srs/route";
import { GET as roster } from "@/app/api/math-srs/course/route";
import {
  GET as courseDetail,
  POST as coursePlan,
} from "@/app/api/students/[id]/math-srs/course/route";
import { mathSrsClassResponseSchema } from "@/contracts/mathSrs.contract";
import {
  courseDashboardResponseSchema,
  courseStudentDetailResponseSchema,
} from "@/contracts/mathSrsCourse.contract";
import {
  BRANCH_2,
  ids,
  otherBranchAdmin,
  params,
  req,
  sameBranchAdmin,
  teacherSession,
  world,
} from "../helpers/srsTeacherWorld";

const classPath = `/api/classes/${ids.classId}/math-srs`;
const coursePath = `/api/students/${ids.studied}/math-srs/course`;
const plan = {
  startSectionId: "3-1-1-1",
  dailyQuestionCount: 10,
  enabled: true,
  expectedRevision: 0,
};
const readClass = () => classDashboard(req(classPath), params(ids.classId));
const readDetail = () => courseDetail(req(coursePath), params(ids.studied));
const writePlan = () =>
  coursePlan(req(coursePath, "POST", plan), params(ids.studied));
const readRoster = () => roster(req("/api/math-srs/course"));

beforeEach(() => {
  world.reset();
  vi.stubEnv("AUTH_URL", "http://localhost:3000");
});
afterEach(() => vi.unstubAllEnvs());

describe("반 복습 현황 — GET /api/classes/{id}/math-srs", () => {
  // 원장님 2026-10-06: «최고관리자는 무조건 열려야 하고, 지점장은 (메뉴가) 열려 있어야 열린다.»
  // 10월 3일에는 최고관리자도 메뉴 상한에 막히게 적혀 있었고, 10월 5일(`8feb51179`)에 코드가 먼저 바뀌었다.
  it("메뉴가 꺼진 지점장은 반 · 학생 · 명단 끝점이 전부 막힌다 — 켜면 열린다", async () => {
    world.session = sameBranchAdmin({ menus: [] });
    expect((await readClass()).status).toBe(403);
    expect((await readDetail()).status).toBe(403);
    expect((await writePlan()).status).toBe(403);
    expect((await readRoster()).status).toBe(403);
    expect(world.writes).toBe(0);
    expect(world.rows.size).toBe(0);
    world.session = sameBranchAdmin({ menus: ["srs"] });
    expect((await readDetail()).status).toBe(200);
    expect((await readRoster()).status).toBe(200);
  });

  it("최고관리자는 메뉴가 꺼져 있어도 SRS 관리 끝점이 열린다 — 읽기도 설정 저장도", async () => {
    world.session = sameBranchAdmin({ isSuperAdmin: true, menus: [] });
    expect((await readDetail()).status).toBe(200);
    expect((await readRoster()).status).toBe(200);
    expect((await writePlan()).status).toBe(200);
    expect(world.writes).toBe(1);
    // 반 관리의 반 복습 현황은 SRS 관리 끝점이 아니다 — «수업» 메뉴를 따른다(지점 관리 계획: 최고관리자도 업무 메뉴는 설정을 따른다).
    expect((await readClass()).status).toBe(403);
  });
  it("다른 지점 관리자는 403 · 같은 지점 관리자는 200", async () => {
    world.session = otherBranchAdmin();
    expect((await readClass()).status).toBe(403);
    world.session = sameBranchAdmin();
    const response = await readClass();
    expect(response.status).toBe(200);
    expect(
      mathSrsClassResponseSchema
        .parse(await response.json())
        .data.students.map((s) => s.name),
    ).toEqual(["서연", "민준", "하린", "다온"]);
  });

  it("지점이 빈 관리자는 넘지 않는다 · 관리자 표시를 내리면 다음 요청부터 막힌다", async () => {
    world.session = sameBranchAdmin({ branchId: null });
    expect((await readClass()).status).toBe(403);
    world.session = sameBranchAdmin();
    expect((await readClass()).status).toBe(200);
    world.session = sameBranchAdmin({ isAdmin: false });
    expect((await readClass()).status).toBe(403);
  });
});

describe("학생 상세 · 학습 설정 — /api/students/{id}/math-srs/course", () => {
  it("다른 지점 관리자는 읽기도 쓰기도 403 — 설정이 저장되지 않는다", async () => {
    world.session = otherBranchAdmin();
    expect((await readDetail()).status).toBe(403);
    expect((await writePlan()).status).toBe(403);
    expect(world.writes).toBe(0);
    expect(world.rows.size).toBe(0);
  });

  it("같은 지점 관리자는 읽고 쓴다", async () => {
    world.session = sameBranchAdmin();
    const detail = await readDetail();
    expect(detail.status).toBe(200);
    expect(
      courseStudentDetailResponseSchema.parse(await detail.json()).data.student
        .id,
    ).toBe(ids.studied);
    expect((await writePlan()).status).toBe(200);
    expect(world.writes).toBe(1);
  });

  it("지점이 빈 관리자는 넘지 않는다 · 관리자 표시를 내리면 다음 요청부터 막힌다", async () => {
    world.session = sameBranchAdmin({ branchId: null });
    expect((await readDetail()).status).toBe(403);
    expect((await writePlan()).status).toBe(403);
    world.session = sameBranchAdmin();
    expect((await readDetail()).status).toBe(200);
    world.session = sameBranchAdmin({ isAdmin: false });
    expect((await readDetail()).status).toBe(403);
    expect(world.writes).toBe(0);
  });
});

describe("«오늘의 기억» 명단 — GET /api/math-srs/course", () => {
  const rosterOf = async () => {
    const response = await readRoster();
    expect(response.status).toBe(200);
    return courseDashboardResponseSchema.parse(await response.json()).data;
  };

  it("다른 지점 관리자에게는 이 지점의 반도 학생도 안 나온다 — 질의에 제 지점 조건이 실린다", async () => {
    world.session = otherBranchAdmin();
    const data = await rosterOf();
    expect(data.students).toEqual([]);
    expect(data.classes).toEqual([]);
    expect(world.studentWhere).toBeNull();
    expect(world.classWhere).toEqual({ branchId: BRANCH_2 });
  });

  it("같은 지점 관리자는 그 지점의 학생을 본다(탈퇴 제외)", async () => {
    world.session = sameBranchAdmin();
    const data = await rosterOf();
    expect(data.students.map((s) => s.id).sort()).toEqual(
      [ids.studied, ids.noAccount, ids.fresh, ids.newAccount].sort(),
    );
    expect(data.classes).toEqual([{ id: ids.classId, name: "중1 A" }]);
    expect(world.studentWhere).toMatchObject({
      OR: expect.arrayContaining([
        expect.objectContaining({
          eywaBindingId: null,
          classId: { in: [ids.classId] },
        }),
      ]),
      eywaWithdrawnAt: null,
    });
  });

  it("지점이 빈 관리자 · 관리자 표시를 내린 계정은 제 반만 — 남의 반은 안 나온다", async () => {
    for (const session of [
      sameBranchAdmin({ branchId: null }),
      sameBranchAdmin({ isAdmin: false }),
    ]) {
      world.session = session;
      const data = await rosterOf();
      expect(data.students).toEqual([]);
      expect(world.studentWhere).toBeNull();
    }
    world.session = teacherSession();
    expect((await rosterOf()).students).toHaveLength(4);
  });
});
