// @vitest-environment node
/**
 * 학생 API `/api/learn/**` — 로그인 · 나가기 · 비밀번호 바꾸기 · 강의 목록 · 강의 하나 · 시청 기록
 * (D-124 ⑶ · D-125 ⑶⑷⑸ · 브리프 §2.3 · §2.4 · §6 · §7).
 *
 * 진짜 Auth.js 를 태운다(helpers/authRequestContext.ts) — 로그인 라우트는 진짜 `signIn("student")` 을
 * 부르고, 나머지 라우트는 그 쿠키로 진짜 `auth()` 를 거친다. DB 는 반·학생·차시·진도가 원래 대역,
 * 학생 계정·강의·시청 기록이 `learnTestDouble` 이다.
 *
 * 🔴 목록과 시청 기록은 **같은 판정 하나**를 쓴다(브리프 §6) — 씨앗으로 넣은 강의 전부를 두 쪽에
 * 대 보고 «목록에 있다 ⇔ 기록이 받는다»가 늘 같은지 센다.
 */
import { compare } from "bcryptjs";
import { NextRequest } from "next/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const savedEnv = vi.hoisted(() => {
  const before = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
  };
  process.env.AUTH_SECRET = "student-auth-test-secret-0123456789abcdef";
  process.env.AUTH_URL = "http://localhost:3000";
  return before;
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/learn/studentLearningMenusStore", () => ({
  getStudentLearningMenus: vi.fn(async () => ({
    enabled: ["lectures"],
    updatedAt: null,
  })),
}));
vi.mock(
  "next/headers",
  async () => (await import("../helpers/authRequestContext")).nextHeadersModule,
);
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<object>()),
  redirect: (await import("../helpers/authRequestContext")).redirectMock,
}));
vi.mock("@/lib/db", async () => {
  const { prismaTestDouble } = await import("@/mocks/prismaTestDouble");
  const { composeLearnDb } = await import("@/mocks/learnTestDouble");
  return { db: composeLearnDb(prismaTestDouble) };
});

import { GET as detailRoute } from "@/app/api/learn/lectures/[id]/route";
import { GET as listRoute } from "@/app/api/learn/lectures/route";
import { POST as loginRoute } from "@/app/api/learn/login/route";
import { POST as logoutRoute } from "@/app/api/learn/logout/route";
import { POST as passwordRoute } from "@/app/api/learn/password/route";
import { POST as watchRoute } from "@/app/api/learn/watch/route";
import {
  learnLectureListResponseSchema,
  learnLectureResponseSchema,
  learnWatchResponseSchema,
  STUDENT_LOGIN_MESSAGES,
} from "@/contracts/studentAccount.contract";
import { auth } from "@/lib/auth";
import { hashStudentPin } from "@/lib/learn/pinHash";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";
import {
  MOCK_CLASS_A,
  MOCK_PROGRESS,
  MOCK_STUDENT_1,
  MOCK_STUDENT_2,
  MOCK_STUDENT_3,
  MOCK_UNITS,
} from "@/mocks/data";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";
import {
  learnRows,
  patchStudentAccount,
  resetLearnTestDouble,
  seedConceptLecture,
  seedStudentAccount,
} from "@/mocks/learnTestDouble";

import {
  assertTestAuthEnv,
  resetRequest,
  sessionCookieCleared,
  sessionCookieFromJar,
  TEST_ORIGIN,
} from "../helpers/authRequestContext";

const PIN = "5809";
const NEW_PIN = "7314";
let pinHash = "";

/** 반 A 의 반 진도 차시 — 픽스처에서 **읽어 온다**(손으로 적지 않는다) */
const CLASS_A_UNITS = new Set(
  MOCK_PROGRESS.filter(
    (p) => p.classId === MOCK_STUDENT_1.classId && p.studentId === null,
  ).map((p) => p.unitId),
);
const STUDENT_3_UNIT = MOCK_PROGRESS.find(
  (p) => p.studentId === MOCK_STUDENT_3.id,
)!.unitId;
const [U_A, U_B] = [...CLASS_A_UNITS];
const U_AHEAD = MOCK_UNITS.find(
  (u) => !CLASS_A_UNITS.has(u.id) && u.id !== STUDENT_3_UNIT,
)!.id;

let seo01 = "";
let park03 = "";
const L: Record<string, string> = {};

beforeAll(async () => {
  assertTestAuthEnv();
  pinHash = await hashStudentPin(PIN);
});
beforeEach(() => {
  resetLearnTestDouble();
  resetRequest();
  seo01 = seedStudentAccount({
    studentId: MOCK_STUDENT_1.id,
    loginId: "seo01",
    passwordHash: pinHash,
    mustChangePassword: false,
  }).id;
  park03 = seedStudentAccount({
    studentId: MOCK_STUDENT_3.id,
    loginId: "park03",
    passwordHash: pinHash,
    mustChangePassword: false,
  }).id;
  L.a0 = seedConceptLecture({
    unitId: U_A!,
    title: "가 — 첫째",
    sortOrder: 0,
  }).id;
  L.a1 = seedConceptLecture({
    unitId: U_A!,
    title: "가 — 둘째",
    sortOrder: 1,
  }).id;
  L.bDraft = seedConceptLecture({
    unitId: U_B!,
    title: "초안",
    status: "draft",
    videoUrl: null,
  }).id;
  L.bArchived = seedConceptLecture({
    unitId: U_B!,
    title: "보관",
    status: "archived",
  }).id;
  L.b = seedConceptLecture({
    unitId: U_B!,
    title: "나",
    disclosure: "선생님이 검수한 AI 보충 강의입니다.",
    sourceJobId: "job-1",
    reviewedAt: new Date(),
  }).id;
  L.own3 = seedConceptLecture({
    unitId: STUDENT_3_UNIT,
    title: "학생3 개인 진도",
  }).id;
  L.ahead = seedConceptLecture({ unitId: U_AHEAD, title: "진도보다 앞섬" }).id;
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function req(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string | null,
  origin = TEST_ORIGIN,
) {
  resetRequest(cookie ? { cookie } : {});
  return new NextRequest(`${TEST_ORIGIN}${path}`, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** 목록 라우트는 요청을 받지 않는다(`GET()`) — 쿠키만 세우고 부른다 */
function listAs(cookie: string | null) {
  resetRequest(cookie ? { cookie } : {});
  return listRoute();
}

async function login(loginId: string, password = PIN) {
  const res = await loginRoute(
    req("POST", "/api/learn/login", { loginId, password }),
  );
  const value = sessionCookieFromJar();
  return { res, cookie: value ? `authjs.session-token=${value}` : null };
}

const errorOf = async (res: Response) =>
  ((await res.json()) as { error: { code: string; message: string } }).error;

describe("로그인 — POST /api/learn/login", () => {
  it("맞으면 200 · 세션 쿠키 · 첫 로그인 여부를 알려 준다", async () => {
    patchStudentAccount(seo01, { mustChangePassword: true });
    const { res, cookie } = await login(" SEO01 ");
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      data: { mustChangePassword: true },
    });
    expect(cookie).not.toBeNull();
    resetRequest({ cookie: cookie! });
    expect((await auth())?.student?.accountId).toBe(seo01);
  });

  it("🔴 틀린 번호 · 없는 아이디 · 꺼진 계정 — 응답이 글자까지 같다", async () => {
    const wrong = await login("seo01", "0001");
    const ghost = await login("ghost-id", PIN);
    patchStudentAccount(park03, { disabledAt: new Date() });
    const off = await login("park03", PIN);
    const bodies = await Promise.all(
      [wrong, ghost, off].map((r) => r.res.json()),
    );
    for (const r of [wrong, ghost, off]) {
      expect(r.res.status).toBe(401);
      expect(r.cookie).toBeNull();
    }
    expect(bodies[0]).toStrictEqual({
      error: { code: "UNAUTHORIZED", message: STUDENT_LOGIN_MESSAGES.invalid },
    });
    expect(bodies[1]).toStrictEqual(bodies[0]);
    expect(bodies[2]).toStrictEqual(bodies[0]);
  });

  it("🔴 다섯 번 틀리면 429 «잠시 뒤 다시 시도하세요.» — 없는 아이디도 똑같이", async () => {
    for (let i = 0; i < 4; i += 1)
      expect((await login("seo01", "0001")).res.status).toBe(401);
    const fifth = await login("seo01", "0001");
    expect(fifth.res.status).toBe(429);
    const lockedBody = await fifth.res.json();
    expect(lockedBody).toStrictEqual({
      error: {
        code: "TOO_MANY_ATTEMPTS",
        message: STUDENT_LOGIN_MESSAGES.locked,
      },
    });
    expect((await login("seo01", PIN)).res.status).toBe(429);
    for (let i = 0; i < 4; i += 1) await login("ghost-id", "0001");
    const ghost = await login("ghost-id", "0001");
    expect(ghost.res.status).toBe(429);
    expect(await ghost.res.json()).toStrictEqual(lockedBody);
  });

  it("형식이 틀린 본문은 400 · 다른 사이트는 403 — 둘 다 잠금 수에 안 든다", async () => {
    const bad = await loginRoute(
      req("POST", "/api/learn/login", { loginId: "ab", password: PIN }),
    );
    expect(bad.status).toBe(400);
    const cross = await loginRoute(
      req(
        "POST",
        "/api/learn/login",
        { loginId: "seo01", password: "0001" },
        null,
        "https://evil.example",
      ),
    );
    expect(cross.status).toBe(403);
    expect(
      learnRows.studentAccounts().find((a) => a.id === seo01)!.failedCount,
    ).toBe(0);
  });
});

describe("🔴 ⑥ 퇴원한 학생(eywaWithdrawnAt) — 꺼진 계정과 똑같이 (D-126 ⑺)", () => {
  const withdraw = (studentId: string) =>
    prismaTestDouble.student.update({
      where: { id: studentId },
      data: { eywaWithdrawnAt: new Date() },
    });

  it("🔴 맞는 번호도 401 — 문구가 틀린 번호와 글자까지 같고, 실패 수에 든다", async () => {
    const wrong = await login("seo01", "0001");
    await withdraw(MOCK_STUDENT_3.id);
    const gone = await login("park03", PIN);
    expect(gone.res.status).toBe(401);
    expect(gone.cookie).toBeNull();
    expect(await gone.res.json()).toStrictEqual(await wrong.res.json());
    expect(
      learnRows.studentAccounts().find((a) => a.id === park03)!.failedCount,
    ).toBe(1);
  });

  it("🔴 이미 들어와 있던 학생 — 퇴원 뒤 다음 요청의 목록·비밀번호 바꾸기는 401, 번호가 안 바뀐다", async () => {
    const { cookie } = await login("seo01");
    expect((await listAs(cookie)).status).toBe(200);
    await withdraw(MOCK_STUDENT_1.id);
    expect((await listAs(cookie)).status).toBe(401);
    const before = learnRows
      .studentAccounts()
      .find((a) => a.id === seo01)!.passwordHash;
    const res = await passwordRoute(
      req(
        "POST",
        "/api/learn/password",
        { currentPassword: PIN, newPassword: NEW_PIN },
        cookie,
      ),
    );
    expect(res.status).toBe(401);
    expect(
      learnRows.studentAccounts().find((a) => a.id === seo01)!.passwordHash,
    ).toBe(before);
  });
});

describe("나가기 — POST /api/learn/logout", () => {
  it("학생 세션을 지우고 학생 로그인으로 가라고 한다", async () => {
    const { cookie } = await login("seo01");
    const res = await logoutRoute(
      req("POST", "/api/learn/logout", undefined, cookie),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      data: { redirectTo: "/learn/login" },
    });
    expect(sessionCookieCleared()).toBe(true);
    expect(
      learnRows.audits().some((a) => a.action === "student_auth.logout"),
    ).toBe(true);
  });

  it("학생 세션이 없으면 401", async () => {
    expect((await logoutRoute(req("POST", "/api/learn/logout"))).status).toBe(
      401,
    );
  });
});

describe("비밀번호 바꾸기 — POST /api/learn/password (첫 로그인 · D-125 ⑶)", () => {
  const change = (cookie: string | null, body: unknown) =>
    passwordRoute(req("POST", "/api/learn/password", body, cookie));

  it("🔴 첫 로그인 학생이 바꾸면 표시가 풀리고, 해시만 새로 남는다", async () => {
    patchStudentAccount(seo01, { mustChangePassword: true });
    const { cookie } = await login("seo01");
    const res = await change(cookie, {
      currentPassword: PIN,
      newPassword: NEW_PIN,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      data: { mustChangePassword: false },
    });
    const row = learnRows.studentAccounts().find((a) => a.id === seo01)!;
    expect(row.mustChangePassword).toBe(false);
    expect(row.passwordChangedAt).toBeInstanceOf(Date);
    expect(await compare(NEW_PIN, row.passwordHash)).toBe(true);
    resetRequest({ cookie: cookie! });
    expect((await auth())?.student?.mustChangePassword).toBe(false);
  });

  it("🔴 쉬운 번호 · 지금과 같은 번호는 400 (발급과 같은 제외 규칙)", async () => {
    const { cookie } = await login("seo01");
    const easy = await change(cookie, {
      currentPassword: PIN,
      newPassword: "1234",
    });
    expect(easy.status).toBe(400);
    expect(JSON.stringify(await easy.json())).toContain(
      STUDENT_LOGIN_MESSAGES.easyPin,
    );
    const same = await change(cookie, {
      currentPassword: PIN,
      newPassword: PIN,
    });
    expect(same.status).toBe(400);
    expect(JSON.stringify(await same.json())).toContain(
      STUDENT_LOGIN_MESSAGES.samePin,
    );
  });

  it("지금 번호가 틀리면 401 이고 잠금 수에 든다 — 다섯 번이면 로그인도 잠긴다", async () => {
    const { cookie } = await login("seo01");
    for (let i = 0; i < 4; i += 1) {
      const r = await change(cookie, {
        currentPassword: "0001",
        newPassword: NEW_PIN,
      });
      expect(r.status).toBe(401);
      expect((await errorOf(r)).message).toBe(
        STUDENT_LOGIN_MESSAGES.wrongCurrentPin,
      );
    }
    const fifth = await change(cookie, {
      currentPassword: "0001",
      newPassword: NEW_PIN,
    });
    expect(fifth.status).toBe(429);
    expect((await login("seo01")).res.status).toBe(429);
  });

  it("학생 세션이 없으면 401", async () => {
    expect(
      (await change(null, { currentPassword: PIN, newPassword: NEW_PIN }))
        .status,
    ).toBe(401);
  });
});

describe("🔴 강의 목록 — 반 진도 + 개인 진도에 있던 차시의 게시 강의만 (D-125 ⑸)", () => {
  it("반 진도 차시의 게시 강의만 — 초안·보관·남의 개인 진도·앞선 차시는 없다", async () => {
    const { cookie } = await login("seo01");
    const res = await listAs(cookie);
    expect(res.status).toBe(200);
    const body = learnLectureListResponseSchema.parse(await res.json());
    expect(body.data.lectures.map((l) => l.id)).toStrictEqual([
      L.a0,
      L.a1,
      L.b,
    ]);
    expect(body.data.units.map((u) => u.id).sort()).toStrictEqual(
      [U_A, U_B].sort(),
    );
  });

  it("개인 진도가 있는 학생은 그 차시도 본다", async () => {
    const { cookie } = await login("park03");
    const res = await listAs(cookie);
    const ids = learnLectureListResponseSchema
      .parse(await res.json())
      .data.lectures.map((l) => l.id);
    expect(ids).toContain(L.own3);
    expect(ids).not.toContain(L.ahead);
  });

  it("🔴 ③ 차시마다 수업한 날(taughtOn) — 반 진도 기록에서 **읽어 온** 가장 최근 날", async () => {
    const { cookie } = await login("seo01");
    const body = learnLectureListResponseSchema.parse(
      await (await listAs(cookie)).json(),
    );
    // 기대값을 손으로 적지 않는다 — 픽스처의 반 A 반 진도에서 차시마다 가장 늦은 날
    const latest = (unitId: string) =>
      MOCK_PROGRESS.filter(
        (p) =>
          p.classId === MOCK_STUDENT_1.classId &&
          p.studentId === null &&
          p.unitId === unitId,
      )
        .map((p) => p.recordedAt)
        .sort()
        .at(-1);
    expect(
      Object.fromEntries(body.data.units.map((u) => [u.id, u.taughtOn])),
    ).toStrictEqual({ [U_A!]: latest(U_A!), [U_B!]: latest(U_B!) });
  });

  it("🔴 ③ 내 개인 진도가 더 늦으면 그 날 · 같은 반 남의 개인 진도는 안 센다", async () => {
    await prismaTestDouble.progress.create({
      data: {
        classId: MOCK_STUDENT_1.classId,
        studentId: MOCK_STUDENT_1.id,
        unitId: U_A!,
        recordedAt: new Date("2026-09-15T00:00:00.000Z"),
      },
    });
    await prismaTestDouble.progress.create({
      data: {
        classId: MOCK_STUDENT_2.classId,
        studentId: MOCK_STUDENT_2.id,
        unitId: U_B!,
        recordedAt: new Date("2026-09-30T00:00:00.000Z"),
      },
    });
    const { cookie } = await login("seo01");
    const units = learnLectureListResponseSchema.parse(
      await (await listAs(cookie)).json(),
    ).data.units;
    expect(units.find((u) => u.id === U_A)?.taughtOn).toBe("2026-09-15");
    expect(units.find((u) => u.id === U_B)?.taughtOn).not.toBe("2026-09-30");
  });

  it("윗줄에 싣는 학생 — 이름 · 반 (목록 · 재생 둘 다)", async () => {
    const { cookie } = await login("seo01");
    const list = learnLectureListResponseSchema.parse(
      await (await listAs(cookie)).json(),
    );
    expect(list.data.student).toStrictEqual({
      name: MOCK_STUDENT_1.name,
      className: MOCK_CLASS_A.name,
    });
    const detail = learnLectureResponseSchema.parse(
      await (
        await detailRoute(
          req("GET", `/api/learn/lectures/${L.a0}`, undefined, cookie),
          { params: Promise.resolve({ id: L.a0! }) },
        )
      ).json(),
    );
    expect(detail.data.student).toStrictEqual(list.data.student);
    expect(detail.data.unit.taughtOn).toBe(
      list.data.units.find((u) => u.id === U_A)!.taughtOn,
    );
  });

  it("🔴 AI 고지·잡 ID·시청 확인은 학생에게 안 간다 (D-124 ⑹)", async () => {
    const { cookie } = await login("seo01");
    const res = await listAs(cookie);
    const text = await res.text();
    expect(text).not.toContain("AI 보충 강의");
    expect(text).not.toContain("job-1");
    expect(text).not.toContain("reviewedAt");
  });

  it("첫 로그인 학생은 403(바꾼 뒤) · 세션 없음은 401", async () => {
    patchStudentAccount(seo01, { mustChangePassword: true });
    const { cookie } = await login("seo01");
    const res = await listAs(cookie);
    expect(res.status).toBe(403);
    expect((await errorOf(res)).message).toBe(STUDENT_MUST_CHANGE_MESSAGE);
    expect((await listAs(null)).status).toBe(401);
  });
});

describe("강의 하나 — GET /api/learn/lectures/{id}", () => {
  const detail = (id: string, cookie: string | null) =>
    detailRoute(req("GET", `/api/learn/lectures/${id}`, undefined, cookie), {
      params: Promise.resolve({ id }),
    });

  it("열린 강의는 차시 머리와 함께 · 안 열린 강의는 있든 없든 404", async () => {
    const { cookie } = await login("seo01");
    const ok = await detail(L.a0!, cookie);
    expect(ok.status).toBe(200);
    expect(
      learnLectureResponseSchema.parse(await ok.json()).data.lecture.id,
    ).toBe(L.a0);
    for (const id of [
      L.own3!,
      L.bDraft!,
      L.ahead!,
      "30000000-0000-4000-8000-00000000abcd",
    ])
      expect((await detail(id, cookie)).status, id).toBe(404);
    expect((await detail("abc", cookie)).status).toBe(400);
  });
});

describe("🔴 시청 기록 — POST /api/learn/watch (서버가 %를 다시 센다 — 브리프 §7)", () => {
  const watch = (
    cookie: string | null,
    lectureId: string,
    seconds: number,
    percent = 0,
  ) =>
    watchRoute(
      req("POST", "/api/learn/watch", { lectureId, seconds, percent }, cookie),
    );
  const watchOf = async (res: Response) =>
    learnWatchResponseSchema.parse(await res.json()).data.watch;

  it("🔴 재생기가 보낸 %는 버리고 본 지점 ÷ 길이로 센다 · 뒤로 안 간다 · 한 번 완료면 완료", async () => {
    const { cookie } = await login("seo01");
    expect(await watchOf(await watch(cookie, L.a0!, 100, 3))).toStrictEqual({
      maxSeconds: 100,
      percent: 72,
      completed: false,
    });
    // 되감아 50초 · 부풀린 99% — 기록은 그대로다
    expect(await watchOf(await watch(cookie, L.a0!, 50, 99))).toStrictEqual({
      maxSeconds: 100,
      percent: 72,
      completed: false,
    });
    expect(await watchOf(await watch(cookie, L.a0!, 135))).toStrictEqual({
      maxSeconds: 135,
      percent: 97,
      completed: true,
    });
    const [row] = learnRows.conceptLectureViews();
    const firstDone = row!.completedAt;
    expect(await watchOf(await watch(cookie, L.a0!, 10))).toMatchObject({
      completed: true,
    });
    expect(learnRows.conceptLectureViews()[0]!.completedAt).toStrictEqual(
      firstDone,
    );
  });

  it("영상 길이를 넘는 지점은 길이로 접는다", async () => {
    const { cookie } = await login("seo01");
    expect(await watchOf(await watch(cookie, L.a0!, 9999))).toStrictEqual({
      maxSeconds: 139,
      percent: 100,
      completed: true,
    });
  });

  it("🔴 남의 진도·앞선 차시·초안 강의는 404 이고 기록이 한 줄도 안 생긴다", async () => {
    const { cookie } = await login("seo01");
    for (const id of [L.own3!, L.ahead!, L.bDraft!, L.bArchived!])
      expect((await watch(cookie, id, 10)).status, id).toBe(404);
    expect(learnRows.conceptLectureViews()).toEqual([]);
  });

  it("🔴 목록에 있는 강의 ⇔ 기록이 받는 강의 — 씨앗 전부에서 같다 (판정 하나)", async () => {
    for (const who of ["seo01", "park03"]) {
      const { cookie } = await login(who);
      const listed = new Set(
        learnLectureListResponseSchema
          .parse(await (await listAs(cookie)).json())
          .data.lectures.map((l) => l.id),
      );
      for (const id of Object.values(L)) {
        const accepted = (await watch(cookie, id, 1)).status === 200;
        expect(accepted, `${who} ${id}`).toBe(listed.has(id));
      }
    }
  });

  it("첫 로그인 학생은 403 · 세션 없음은 401", async () => {
    patchStudentAccount(seo01, { mustChangePassword: true });
    const { cookie } = await login("seo01");
    expect((await watch(cookie, L.a0!, 10)).status).toBe(403);
    expect((await watch(null, L.a0!, 10)).status).toBe(401);
  });
});
