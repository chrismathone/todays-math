// @vitest-environment node
/**
 * 개념 카드(탐험) 기록의 교사 끝점 둘 — 27번 문서 §4 공백 1 · 2 · 4.
 *
 *   GET /api/classes/{id}/math-srs/explorers   문지기 = `/api/classes/{id}/math-srs` 와 같게
 *   GET /api/students/{id}/math-srs/explorers  문지기 = `/api/students/{id}/math-srs/course` 와 같게
 *
 * «같게»는 짝 시험으로 잠근다 — 같은 세션 표를 옛 끝점과 새 끝점에 같이 넣어 상태 코드를 견준다.
 */
import { randomUUID } from "node:crypto";
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

import * as classRoute from "@/app/api/classes/[id]/math-srs/explorers/route";
import { GET as classDashboard } from "@/app/api/classes/[id]/math-srs/route";
import * as studentRoute from "@/app/api/students/[id]/math-srs/explorers/route";
import { GET as courseDetail } from "@/app/api/students/[id]/math-srs/course/route";
import type { ExplorerAction } from "@/contracts/mathExplorers.contract";
import {
  explorerTeacherClassResponseSchema,
  explorerTeacherStudentResponseSchema,
} from "@/contracts/mathExplorersTeacher.contract";
import {
  definitionCard,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
} from "@/lib/math-explorers/engine";
import { TEACHER_FLAG_POLICY } from "@/lib/math-explorers/teacherSummary";
import { emptySrsState } from "@/lib/math-srs/serverState";
import {
  ids,
  otherBranchAdmin,
  params,
  req,
  sameBranchAdmin,
  studentSession,
  teacherSession,
  world,
} from "../helpers/srsTeacherWorld";

const classPath = (id: string = ids.classId) =>
  `/api/classes/${id}/math-srs/explorers`;
const studentPath = (id: string = ids.studied) =>
  `/api/students/${id}/math-srs/explorers`;
const readClass = (id: string = ids.classId) =>
  classRoute.GET(req(classPath(id)), params(id));
const readStudent = (id: string = ids.studied) =>
  studentRoute.GET(req(studentPath(id)), params(id));

/** 엔진으로 «소인수분해» 한 단원을 푼 기록 — `wrong` 카드는 세 바퀴 내내 틀려 미해결로 남는다. */
function explorerAfterUnit(studentId: string, date: string, wrong?: string) {
  let state = createExplorerState(studentId, 7);
  const act = (action: ExplorerAction) => {
    state = applyExplorerAction(state, action, date, randomUUID()).state;
  };
  act({ type: "start", route: "unit", unitId: "factors" });
  for (let safety = 0; safety < 80; safety++) {
    let session = state.profile.definitions!.session!;
    if (session.done) break;
    if (definitionNeedsRead(state.profile, session)) {
      act({ type: "read", questionId: definitionQuestionId(session) });
      session = state.profile.definitions!.session!;
    }
    const task = session.queue[session.index]!;
    const card = definitionCard(task.cardId);
    const miss = task.cardId === wrong;
    const sourceIds =
      task.kind === 0
        ? miss
          ? [1, 0]
          : [0, 1]
        : task.kind === 1
          ? miss
            ? []
            : card.examples.flatMap((e, i) => (e.yes ? [i] : []))
          : [miss ? (card.truth ? 0 : 1) : card.truth ? 1 : 0];
    const options = definitionOptions(session, task);
    act({
      type: "answer",
      questionId: definitionQuestionId(session),
      choiceIds: sourceIds.map((id) => options.indexOf(id)),
    });
  }
  return state;
}
const bankAward = (date: string) => {
  const missionId = randomUUID();
  const review = {
    kind: "elementary" as const,
    dayId: `expedition:${missionId}`,
    title: "은행 날",
    subtitle: "",
    reviewCount: 10,
  };
  return {
    day: {
      id: `expedition:${missionId}`,
      date,
      completedAt: `${date}T03:00:00.000Z`,
      title: review.title,
      subtitle: "",
      reviewCount: 10,
      kind: review.kind,
      dayId: review.dayId,
      reviews: [review],
    },
    missionId,
    references: [],
  };
};
function save(studentId: string, payload: object) {
  world.rows.set(studentId, {
    studentId,
    revision: 1,
    payload: { ...emptySrsState(), ...payload },
  });
}
const flagCodes = (flags: { code: string }[]) => flags.map((f) => f.code);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // KST 2026-10-05 00:00 — UTC 로는 아직 10-04 다
  vi.setSystemTime(new Date("2026-10-04T15:00:00.000Z"));
  world.reset();
  world.session = teacherSession();
  vi.stubEnv("AUTH_URL", "http://localhost:3000");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/classes/{id}/math-srs/explorers — 반 학생마다 요약", () => {
  it("읽기 전용이다 — 내보낸 메서드는 GET 하나", () => {
    expect(Object.keys(classRoute)).toEqual(["GET"]);
    expect(Object.keys(studentRoute)).toEqual(["GET"]);
  });

  it("로그인 없음 · 학생 세션은 401", async () => {
    for (const session of [null, studentSession()]) {
      world.session = session;
      expect((await readClass()).status).toBe(401);
    }
  });

  it("승인 · 메뉴 · 역할 · 다른 소유자 · 🔴 다른 지점 관리자는 403 — 옛 반 현황 끝점과 같은 문지기", async () => {
    const table: [string, unknown, number][] = [
      ["승인 대기", teacherSession({ approvalStatus: "pending" }), 403],
      ["메뉴 없음", teacherSession({ menus: [] }), 403],
      ["SRS 메뉴만", teacherSession({ menus: ["srs"] }), 403],
      ["검수 계정", teacherSession({ role: "reviewer" }), 403],
      ["다른 소유자", teacherSession({ id: ids.colleague }), 403],
      ["다른 지점 관리자", otherBranchAdmin(), 403],
      ["지점 없는 관리자", sameBranchAdmin({ branchId: null }), 403],
      ["제 반", teacherSession(), 200],
      ["수업 메뉴만", teacherSession({ menus: ["teaching"] }), 200],
      ["같은 지점 관리자", sameBranchAdmin(), 200],
      ["메뉴 없는 같은 지점 관리자", sameBranchAdmin({ menus: [] }), 200],
      ["최고관리자", otherBranchAdmin({ isSuperAdmin: true }), 200],
    ];
    for (const [label, session, status] of table) {
      world.session = session;
      expect((await readClass()).status, label).toBe(status);
      expect(
        (
          await classDashboard(
            req(`/api/classes/${ids.classId}/math-srs`),
            params(ids.classId),
          )
        ).status,
        `${label} — 옛 끝점`,
      ).toBe(status);
    }
  });

  it("관리자 표시를 내리면 다음 요청부터 막힌다(권한 회수 뒤 다시 읽기)", async () => {
    world.session = sameBranchAdmin();
    expect((await readClass()).status).toBe(200);
    world.session = sameBranchAdmin({ isAdmin: false });
    expect((await readClass()).status).toBe(403);
  });

  it("없는 반은 404 · 식별자 꼴이 아니면 400", async () => {
    expect((await readClass(randomUUID())).status).toBe(404);
    expect((await readClass("not-a-uuid")).status).toBe(400);
  });

  it("제 반 — 탈퇴 학생은 빠지고, 기록 없는 학생도 줄에 나온다", async () => {
    save(ids.studied, {
      explorers: explorerAfterUnit(ids.studied, "2026-10-03", "prime"),
    });
    const response = await readClass();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    const { data } = explorerTeacherClassResponseSchema.parse(body);
    expect(data.class).toEqual({ id: ids.classId, name: "중1 A" });
    expect(data.today).toBe("2026-10-05");
    expect(data.policy).toBe(TEACHER_FLAG_POLICY);
    expect(data.students.map((s) => [s.name, s.hasAccount])).toEqual([
      ["서연", true],
      ["민준", false],
      ["하린", true],
      ["다온", true],
    ]);
    expect(world.studentWhere).toMatchObject({
      classId: ids.classId,
      eywaWithdrawnAt: null,
    });
    const [studied, noAccount, fresh, newAccount] = data.students;
    expect(studied.summary).toMatchObject({
      started: true,
      collected: 4,
      openSession: { startedOn: "2026-10-03", status: "retry", unresolved: 3 },
      operationFlags: [],
    });
    // 학습 개입 — 차례대로
    expect(flagCodes(studied.summary.learningFlags)).toEqual([
      "unresolved",
      "carried-over",
    ]);
    expect(studied.summary.learningFlags[0]).toMatchObject({
      value: 3,
      cards: [{ id: "prime", name: definitionCard("prime").name }],
    });
    // 운영 확인 — 학습 목록과 섞이지 않는다
    expect(noAccount.summary).toMatchObject({
      started: false,
      learningFlags: [],
      operationFlags: [{ code: "no-account", value: null, date: null }],
    });
    expect(fresh.summary).toMatchObject({
      learningFlags: [],
      operationFlags: [{ code: "not-started", value: 65, date: "2026-08-01" }],
    });
    // 계정을 만든 지 이틀(KST 10-03 → 10-05) — 아직 «시작 전»이 서지 않는다. 만든 날을 UTC 로 세면 사흘이라 선다
    expect(newAccount.summary).toMatchObject({
      started: false,
      learningFlags: [],
      operationFlags: [],
    });
    // 반 응답에는 카드 목록이 없다 · 문항 글도 없다(D-141 ⑵)
    expect(body.data.students[0].summary.cards).toBeUndefined();
    const text = JSON.stringify(body);
    expect(text).not.toContain(definitionCard("prime").definition);
    expect(text).not.toContain(definitionCard("prime").trap);
    expect(world.writes).toBe(0);
  });

  it("은행 날에 얻은 칸은 «끝낸 날»이다 — 은행 문제를 매일 푸는 학생에게 «오래 쉼»이 서지 않는다", async () => {
    const explorers = explorerAfterUnit(ids.studied, "2026-09-20");
    save(ids.studied, { explorers });
    const idle = explorerTeacherClassResponseSchema.parse(
      await (await readClass()).json(),
    ).data.students[0].summary;
    expect(idle.lastCompletedDate).toBe("2026-09-20");
    expect(flagCodes(idle.learningFlags)).toContain("idle");

    save(ids.studied, {
      explorers,
      expedition: {
        version: 1,
        initializedAt: "2026-09-20T00:00:00.000Z",
        mission: null,
        legacyDays: [],
        awards: [bankAward("2026-10-03"), bankAward("2026-10-04")],
        receipts: [],
      },
    });
    const active = explorerTeacherClassResponseSchema.parse(
      await (await readClass()).json(),
    ).data.students[0].summary;
    expect(active.lastCompletedDate).toBe("2026-10-04");
    expect(flagCodes(active.learningFlags)).not.toContain("idle");
  });

  it("저장소가 없거나 기록이 깨졌으면 503 — 빈 기록으로 꾸미지 않는다", async () => {
    world.missingTable = true;
    expect((await readClass()).status).toBe(503);
    world.missingTable = false;
    save(ids.studied, { explorers: "damaged" });
    expect((await readClass()).status).toBe(503);
    // 다른 학생의 탐험 기록이 이 학생 줄에 앉아 있으면 읽지 않는다
    save(ids.studied, {
      explorers: explorerAfterUnit(ids.fresh, "2026-10-04"),
    });
    expect((await readClass()).status).toBe(503);
    expect(world.writes).toBe(0);
  });
});

describe("GET /api/students/{id}/math-srs/explorers — 학생 한 명의 상세", () => {
  it("로그인 없음 · 학생 세션은 401", async () => {
    for (const session of [null, studentSession()]) {
      world.session = session;
      expect((await readStudent()).status).toBe(401);
    }
  });

  it("승인 · SRS 메뉴 · 역할 · 다른 소유자 · 🔴 다른 지점 관리자는 403 — 학습 설정 끝점과 같은 문지기", async () => {
    const table: [string, unknown, number][] = [
      ["승인 대기", teacherSession({ approvalStatus: "pending" }), 403],
      ["메뉴 없음", teacherSession({ menus: [] }), 403],
      ["수업 메뉴만", teacherSession({ menus: ["teaching"] }), 403],
      ["검수 계정", teacherSession({ role: "reviewer" }), 403],
      ["다른 소유자", teacherSession({ id: ids.colleague }), 403],
      ["다른 지점 관리자", otherBranchAdmin(), 403],
      ["지점 없는 관리자", sameBranchAdmin({ branchId: null }), 403],
      ["제 학생", teacherSession(), 200],
      ["SRS 메뉴만", teacherSession({ menus: ["srs"] }), 200],
      ["같은 지점 관리자", sameBranchAdmin(), 200],
      ["메뉴 없는 같은 지점 관리자", sameBranchAdmin({ menus: [] }), 200],
      ["최고관리자", otherBranchAdmin({ isSuperAdmin: true }), 200],
    ];
    for (const [label, session, status] of table) {
      world.session = session;
      expect((await readStudent()).status, label).toBe(status);
      expect(
        (
          await courseDetail(
            req(`/api/students/${ids.studied}/math-srs/course`),
            params(ids.studied),
          )
        ).status,
        `${label} — 옛 끝점`,
      ).toBe(status);
    }
  });

  it("관리자 표시를 내리면 다음 요청부터 막힌다(권한 회수 뒤 다시 읽기)", async () => {
    world.session = sameBranchAdmin();
    expect((await readStudent()).status).toBe(200);
    world.session = sameBranchAdmin({ isAdmin: false });
    expect((await readStudent()).status).toBe(403);
  });

  it("없는 학생 · 탈퇴 학생은 404 · 식별자 꼴이 아니면 400", async () => {
    expect((await readStudent(randomUUID())).status).toBe(404);
    expect((await readStudent(ids.withdrawn)).status).toBe(404);
    expect((await readStudent("not-a-uuid")).status).toBe(400);
  });

  it("제 학생 — 카드 목록까지, 문항 글 없이", async () => {
    save(ids.studied, {
      explorers: explorerAfterUnit(ids.studied, "2026-10-03", "prime"),
    });
    const response = await readStudent();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    const { data } = explorerTeacherStudentResponseSchema.parse(body);
    expect(data.student).toEqual({
      id: ids.studied,
      name: "서연",
      classId: ids.classId,
      className: "중1 A",
      hasAccount: true,
    });
    expect(data.today).toBe("2026-10-05");
    expect(data.policy).toBe(TEACHER_FLAG_POLICY);
    expect(data.detail.cards).toHaveLength(5);
    expect(data.detail.cards[0]).toMatchObject({
      id: "prime",
      name: definitionCard("prime").name,
      unitTitle: "소인수분해",
      level: 0,
      missed: 3,
      lastRecall: "retry",
      due: "2026-10-04",
      overdueDays: 1,
    });
    expect(flagCodes(data.detail.learningFlags)).toEqual([
      "unresolved",
      "carried-over",
    ]);
    const text = JSON.stringify(body);
    for (const id of data.detail.cards.map((c) => c.id)) {
      const card = definitionCard(id);
      for (const sentence of [card.definition, card.trap, card.explanation])
        expect(text).not.toContain(sentence);
    }
    expect(world.writes).toBe(0);
  });

  it("계정 없는 학생 · 기록 없는 학생", async () => {
    const noAccount = explorerTeacherStudentResponseSchema.parse(
      await (await readStudent(ids.noAccount)).json(),
    ).data;
    expect(noAccount.student.hasAccount).toBe(false);
    expect(noAccount.detail).toMatchObject({ started: false, cards: [] });
    expect(noAccount.detail.learningFlags).toEqual([]);
    expect(flagCodes(noAccount.detail.operationFlags)).toEqual(["no-account"]);
    const fresh = explorerTeacherStudentResponseSchema.parse(
      await (await readStudent(ids.fresh)).json(),
    ).data;
    expect(fresh.detail.operationFlags).toEqual([
      { code: "not-started", value: 65, date: "2026-08-01" },
    ]);
    // 반 목록과 같은 답 — 막 만든 계정은 아직 «시작 전»이 아니다
    const newAccount = explorerTeacherStudentResponseSchema.parse(
      await (await readStudent(ids.newAccount)).json(),
    ).data;
    expect(newAccount.detail).toMatchObject({
      started: false,
      learningFlags: [],
      operationFlags: [],
    });
    expect(world.rows.size).toBe(0);
  });

  it("저장소가 없거나 기록이 깨졌으면 503", async () => {
    world.missingTable = true;
    expect((await readStudent()).status).toBe(503);
    world.missingTable = false;
    save(ids.studied, { explorers: "damaged" });
    expect((await readStudent()).status).toBe(503);
    save(ids.studied, {
      explorers: explorerAfterUnit(ids.fresh, "2026-10-04"),
    });
    expect((await readStudent()).status).toBe(503);
  });
});
