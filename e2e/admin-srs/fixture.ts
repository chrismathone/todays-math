import { COURSE_SECTIONS } from "../../src/lib/math-srs/elementary/catalog";
import { DEFAULT_DIFFICULTY_RATIO } from "../../src/contracts/common.contract";
import type {
  CoursePlanInput,
  CourseRosterStudent,
} from "../../src/contracts/mathSrsCourse.contract";
export const CLASS_A = "30000000-0000-4000-8000-000000000001";
export const CLASS_B = "30000000-0000-4000-8000-000000000002";
export const STUDENT_A = "40000000-0000-4000-8000-000000000001";
export const STUDENT_B = "40000000-0000-4000-8000-000000000002";
const timestamp = "2026-10-04T00:00:00.000Z";
const classes = [
  { id: CLASS_A, name: "초3 등록 반", grade: "초3" },
  { id: CLASS_B, name: "중2 등록 반", grade: "중2" },
].map((row) => ({
  ...row,
  userId: "50000000-0000-4000-8000-000000000001",
  defaultProblemCount: 8,
  difficultyRatio: DEFAULT_DIFFICULTY_RATIO,
  createdAt: timestamp,
  updatedAt: timestamp,
}));
const learner: CourseRosterStudent = {
  id: STUDENT_A,
  name: "김하늘",
  classId: CLASS_A,
  className: classes[0].name,
  classGrade: classes[0].grade,
  hasAccount: false,
  revision: 1,
  plan: {
    startSectionId: COURSE_SECTIONS[0].id,
    dailyQuestionCount: 10,
    enabled: true,
    configuredAt: timestamp,
  },
  summary: {
    status: "learning",
    currentSectionId: COURSE_SECTIONS[0].id,
    dueCount: 0,
    todayAnswered: 5,
    todayCorrect: 4,
    todayGoal: 10,
    completedSections: 0,
    lastPracticedAt: timestamp,
    nextReviewAt: null,
    recommendation: null,
  },
};
const initial: CourseRosterStudent[] = [
  learner,
  {
    ...learner,
    classId: CLASS_B,
    className: classes[1].name,
    classGrade: classes[1].grade,
  },
  {
    ...learner,
    id: STUDENT_B,
    name: "이바다",
    classId: CLASS_B,
    className: classes[1].name,
    classGrade: classes[1].grade,
    plan: null,
    revision: 0,
    summary: {
      ...learner.summary,
      status: "setup",
      currentSectionId: null,
      todayAnswered: 0,
      todayCorrect: 0,
      lastPracticedAt: null,
    },
  },
];
const storageKey = "admin-srs-browser-fixture";
export interface SrsFixtureProbe {
  explorerSaves: {
    studentId: string;
    classId: string | null;
    branchId: string | null;
    input: unknown;
  }[];
  saves: { studentId: string; classId: string; input: CoursePlanInput }[];
  slowSave: boolean;
  failDetail: boolean;
  rows: () => CourseRosterStudent[];
}
declare global {
  interface Window {
    srsFixture: SrsFixtureProbe;
  }
}
export function installFixtureApi() {
  let rows: CourseRosterStudent[] =
    JSON.parse(localStorage.getItem(storageKey) ?? "null") ??
    structuredClone(initial);
  const saves: {
    studentId: string;
    classId: string;
    input: CoursePlanInput;
  }[] = [];
  const probe = window as unknown as {
    srsFixture: {
      saves: typeof saves;
      slowSave: boolean;
      failDetail: boolean;
      rows: () => CourseRosterStudent[];
    };
  };
  probe.srsFixture = {
    explorerSaves: [],
    saves,
    slowSave: false,
    failDetail: false,
    rows: () => rows,
  };
  const response = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  const originalFetch = window.fetch.bind(window);
  const explorerStorage = "admin-srs-explorer-fixture";
  let explorerSettings = JSON.parse(
    localStorage.getItem(explorerStorage) ?? "null",
  ) ?? { revision: 1, courseGrade: 3, goalUnitId: "fixture-grade3" };
  window.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      location.href,
    );
    if (!url.pathname.startsWith("/api/")) return originalFetch(input, init);
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");
    const explorer = url.pathname.match(
      /^\/api\/admin\/students\/([^/]+)\/explorer-settings$/,
    );
    if (explorer) {
      if (method === "POST") {
        const value = JSON.parse(String(init?.body));
        if (value.expectedRevision !== explorerSettings.revision)
          return response(
            { error: { code: "CONFLICT", message: "설정 revision 충돌" } },
            409,
          );
        probe.srsFixture.explorerSaves.push({
          studentId: explorer[1],
          classId: url.searchParams.get("classId"),
          branchId: url.searchParams.get("branchId"),
          input: value,
        });
        explorerSettings = {
          revision: explorerSettings.revision + 1,
          courseGrade: value.courseGrade,
          goalUnitId: value.goalUnitId,
        };
        rows = rows.map((row) =>
          row.id === explorer[1]
            ? { ...row, revision: explorerSettings.revision }
            : row,
        );
        localStorage.setItem(explorerStorage, JSON.stringify(explorerSettings));
      }
      return response({
        data: {
          studentId: explorer[1],
          ...explorerSettings,
          locked: false,
          units: [
            { id: "fixture-grade3", grade: 3, title: "덧셈과 뺄셈" },
            { id: "fixture-grade4", grade: 4, title: "큰 수" },
          ],
        },
      });
    }
    if (url.pathname === "/api/math-srs/course") {
      const actor = new URLSearchParams(location.search).get("actor");
      return response({
        data: {
          management: {
            canOpen: actor !== "srs-only",
            isSuperAdmin: actor === "super",
            branchId:
              actor === "manager" || actor === "super"
                ? "60000000-0000-4000-8000-000000000001"
                : null,
            branchRole:
              actor === "manager" || actor === "super" ? "manager" : "teacher",
          },
          classes: classes.map(({ id, name }) => ({ id, name })),
          students: rows,
        },
      });
    }
    const match = url.pathname.match(
      /^\/api\/students\/([^/]+)\/math-srs\/course$/,
    );
    if (match) {
      const studentId = match[1];
      const classId = url.searchParams.get("classId") ?? "";
      const row = rows.find(
        (item) => item.id === studentId && item.classId === classId,
      );
      if (!row)
        return response(
          { error: { code: "FORBIDDEN", message: "등록 확인 실패" } },
          403,
        );
      if (method === "POST") {
        const planInput = JSON.parse(String(init?.body)) as CoursePlanInput;
        saves.push({ studentId, classId, input: planInput });
        if (probe.srsFixture.slowSave)
          await new Promise((resolve) => window.setTimeout(resolve, 700));
        if (planInput.expectedRevision !== row.revision)
          return response(
            { error: { code: "CONFLICT", message: "계획 revision 충돌" } },
            409,
          );
        rows = rows.map((item) =>
          item.id === studentId
            ? {
                ...item,
                revision: item.revision + 1,
                plan: {
                  startSectionId: planInput.startSectionId,
                  dailyQuestionCount: planInput.dailyQuestionCount,
                  enabled: planInput.enabled,
                  configuredAt: timestamp,
                },
                summary: {
                  ...item.summary,
                  status: planInput.enabled ? "learning" : "paused",
                  currentSectionId: planInput.startSectionId,
                  todayGoal: planInput.dailyQuestionCount,
                },
              }
            : item,
        );
        localStorage.setItem(storageKey, JSON.stringify(rows));
        return response({
          data: rows.find(
            (item) => item.id === studentId && item.classId === classId,
          ),
        });
      }
      if (probe.srsFixture.failDetail)
        return response(
          { error: { code: "UNAVAILABLE", message: "후속 상세 조회 실패" } },
          503,
        );
      return response({
        data: {
          student: row,
          sections: [],
          activity: [],
          recentSessions: [],
          recentAttempts: [],
        },
      });
    }
    if (url.pathname === "/api/classes")
      return response({
        data: classes,
        meta: { page: 1, pageSize: 100, total: classes.length },
      });
    if (url.pathname === "/api/students") {
      const data = rows
        .filter((item) => item.classId === url.searchParams.get("classId"))
        .map((item) => ({
          id: item.id,
          classId: item.classId,
          name: item.name,
          useIndividualProgress: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        }));
      return response({
        data,
        meta: { page: 1, pageSize: 100, total: data.length },
      });
    }
    if (url.pathname === "/api/progress")
      return new Response(null, { status: 204 });
    if (url.pathname.endsWith("/teaching"))
      return response({
        data: {
          user: {
            id: "50000000-0000-4000-8000-000000000001",
            name: "검증 선생님",
            email: "fixture@example.test",
            isAdmin: false,
            menus: ["home", "teaching", "srs"],
            branchRole: "teacher",
          },
          units: [],
        },
      });
    if (url.pathname === "/api/account/access")
      return response({
        data: {
          id: "50000000-0000-4000-8000-000000000001",
          name: "검증 선생님",
          email: "fixture@example.test",
          approvalStatus: "approved",
          role: "teacher",
          menus: ["home", "teaching", "srs"],
        },
      });
    return response(
      {
        error: {
          code: "FIXTURE_ONLY",
          message: "합성 fixture에서 제공하지 않는 요청",
        },
      },
      503,
    );
  };
}
