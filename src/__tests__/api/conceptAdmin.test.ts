/**
 * **오늘의 개념 — 원장님 메뉴 API** (`/api/concept/**`, D-124 · D-125 · 브리프 §1.4 · §3).
 *
 * 구현: `src/app/api/concept/**` → `src/lib/concept/adminService.ts`(DB) → `adminBoard.ts`(순수)
 * 대응 계약: `src/contracts/conceptAdmin.contract.ts`
 *
 * 브리프 §3 이 못 박으라는 셋:
 *   ① 관리자가 아니면 **쓰기 API 가 막힌다**(403, 그리고 아무것도 안 쓴다)
 *   ② **남의 반은 안 보인다** — 반도, 그 학생 이름도, 그 학생의 시청 기록도
 *   ③ **n/m 과 안 본 이름 수가 같다** — 퇴원 학생은 둘 다에서 빠진다
 *
 * ## 🔴 이 시험이 못 보는 것 — 정직하게
 *
 * ⑴ **실제 Postgres 의 동작** — 인메모리 가짜(`prismaTestDouble`)로 돈다. `sourceJobId` unique 의
 *    동시 등록 충돌(P2002), DB CHECK(«게시면 주소 있음»), `updateMany` 의 행 잠금은 가짜가 흉내만
 *    낸다. 로컬 DB 가 없어 E2E 도 못 돌렸다(보고서 §4).
 * ⑵ **메뉴 권한(`disabledMenus`)** 은 라우트가 아니라 관문(`proxy.ts` → `accountRouteAllowed`)이
 *    막는다 — 그 규칙은 `accountRouteAccess.test.ts` 가 본다. 여기서 부르는 라우트 함수는 관문을
 *    지나지 않는다.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

import { GET as getBoard } from "@/app/api/concept/route";
import { GET as getUnits } from "@/app/api/concept/units/route";
import {
  GET as getLectures,
  POST as registerLecture,
} from "@/app/api/concept/lectures/route";
import { PATCH as changeLecture } from "@/app/api/concept/lectures/[id]/route";
import {
  ALL_WORKSPACE_MENUS,
  type AccountAccess,
} from "@/contracts/accountAccess.contract";
import { errorResponseSchema } from "@/contracts/common.contract";
import {
  conceptBoardResponseSchema,
  conceptLectureResponseSchema,
  conceptUnitLecturesResponseSchema,
  conceptUnitsResponseSchema,
} from "@/contracts/conceptAdmin.contract";
import { db } from "@/lib/db";
import {
  CLASS_A_ID,
  CLASS_B_ID,
  CLASS_OTHER_ID,
  CLASS_STARVED_ID,
  MOCK_UNITS,
  STUDENT_IDS,
  USER_OTHER_ID,
  USER_TEACHER_ID,
} from "@/mocks/data";
import {
  conceptLectureRowsForTest,
  seedConceptLectureViews,
  seedConceptLectures,
} from "@/mocks/prismaTestDouble";

const LECTURE = (n: number) =>
  `5f000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const URL_A = "https://www.youtube.com/watch?v=aQkPcPqTq4M";
const URL_B = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const DISCLOSURE = "선생님이 검수한 AI 보충 강의입니다.";

/** 반 A 의 최근 진도 차시(416 순환소수를 포함한 식의 계산) — 시드 `MOCK_PROGRESS_CLASS_A` 끝 행 */
const UNIT_A = MOCK_UNITS[3]!;
const UNIT_A_NEXT = MOCK_UNITS[4]!;
const [S1, S2, S3, S4, S5] = STUDENT_IDS as [
  string,
  string,
  string,
  string,
  string,
];

const account = (patch: Partial<AccountAccess> = {}): AccountAccess => ({
  id: USER_TEACHER_ID,
  name: "선생님",
  email: "teacher@todaysmath.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: [...ALL_WORKSPACE_MENUS],
  ...patch,
});
function login(patch: Partial<AccountAccess> = {}) {
  mocks.auth.mockResolvedValue({ user: account(patch) });
}
const asAdmin = () => login({ isAdmin: true, isSuperAdmin: true });

function get(path: string) {
  return new NextRequest(`http://localhost${path}`, { method: "GET" });
}
function send(method: "POST" | "PATCH", path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function board() {
  const res = await getBoard(get("/api/concept"));
  expect(res.status).toBe(200);
  return conceptBoardResponseSchema.parse(await res.json()).data;
}

function meta(patch: Record<string, unknown> = {}) {
  return JSON.stringify({
    lessonTitle: "순환소수를 포함한 식의 계산",
    fps: 30,
    totalFrames: 30 * 139,
    jobId: "job-416-a",
    disclosure: DISCLOSURE,
    video_url: "https://youtu.be/aQkPcPqTq4M",
    unitCode: UNIT_A.problemCodePrefix,
    ...patch,
  });
}

/** 반 A 최근 진도 차시에 게시 강의 하나 — 끝까지 본 학생을 겨누는 시험들이 쓴다 */
function seedPublishedOnUnitA() {
  seedConceptLectures([
    {
      id: LECTURE(1),
      unitId: UNIT_A.id,
      title: "순환소수를 포함한 식의 계산",
      videoUrl: URL_A,
      seconds: 139,
      disclosure: DISCLOSURE,
      sourceJobId: "job-1",
      status: "published",
      publishedAt: new Date("2026-09-12T01:00:00.000Z"),
      reviewedAt: new Date("2026-09-12T00:30:00.000Z"),
    },
  ]);
}

beforeEach(() => {
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  login();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/concept — 로그인·승인", () => {
  it("로그인하지 않으면 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await getBoard(get("/api/concept"));
    expect(res.status).toBe(401);
    errorResponseSchema.parse(await res.json());
  });

  it("승인 전 계정은 403", async () => {
    login({ approvalStatus: "pending" });
    expect((await getBoard(get("/api/concept"))).status).toBe(403);
  });
});

describe("② 남의 반은 안 보인다", () => {
  it("🔴 반 목록은 내 반만 — 남의 반·그 학생 이름·그 시청 기록이 응답 어디에도 없다", async () => {
    seedPublishedOnUnitA();
    // 남의 반에 같은 차시 진도와, 끝까지 본 학생 하나를 둔다 — 새면 반 A 의 n 이 오르거나 이름이 샌다
    const stranger = await db.student.create({
      data: {
        classId: CLASS_OTHER_ID,
        name: "남의반학생",
        schoolLevel: null,
        schoolGrade: null,
        eywaStudentId: null,
        eywaWithdrawnAt: null,
        eywaLastReportDate: null,
        eywaLastReportText: null,
      },
    });
    await db.progress.create({
      data: {
        classId: CLASS_OTHER_ID,
        unitId: UNIT_A.id,
        recordedAt: new Date("2026-09-15"),
      },
    });
    seedConceptLectureViews([
      {
        studentId: stranger.id,
        lectureId: LECTURE(1),
        completedAt: new Date(),
      },
    ]);

    const res = await getBoard(get("/api/concept"));
    const text = await res.clone().text();
    const data = conceptBoardResponseSchema.parse(await res.json()).data;

    expect(new Set(data.rows.map((r) => r.classId))).toEqual(
      new Set([CLASS_A_ID, CLASS_B_ID, CLASS_STARVED_ID]),
    );
    expect(text).not.toContain(CLASS_OTHER_ID);
    expect(text).not.toContain("남의반학생");
    const a = data.rows.find((r) => r.classId === CLASS_A_ID)!;
    expect(a.watch[0]).toMatchObject({ watched: 0, total: 3 });
    expect(data.watchRecords).toBe(0);
  });

  it("다른 원장으로 들어오면 그 원장의 반만 보인다", async () => {
    login({ id: USER_OTHER_ID });
    const data = await board();
    expect(data.rows.map((r) => r.classId)).toEqual([CLASS_OTHER_ID]);
  });

  /**
   * D-130 — 관리자는 학원 운영 데이터(반·학생·진도)의 소유 울타리를 넘는다. 반이 0개인 계정으로
   * 같은 요청을 **관리자 표시 하나만** 바꿔 나란히 보낸다.
   */
  it("D-130: 반이 없는 계정 — 관리자 아님이면 빈 판, 관리자면 모든 반", async () => {
    const NO_CLASS = "10000000-0000-4000-8000-0000000000ad";
    login({ id: NO_CLASS, isAdmin: false });
    expect((await board()).rows).toEqual([]);

    login({ id: NO_CLASS, isAdmin: true, isSuperAdmin: true });
    expect(new Set((await board()).rows.map((r) => r.classId))).toEqual(
      new Set([CLASS_A_ID, CLASS_B_ID, CLASS_STARVED_ID, CLASS_OTHER_ID]),
    );
  });
});

describe("③ n/m 과 안 본 학생 이름 — 같은 모집단", () => {
  it("🔴 퇴원 학생은 m 에도 이름에도 없고, n + 이름 수 = m 이다", async () => {
    seedPublishedOnUnitA();
    await db.student.update({
      where: { id: S3 },
      data: { eywaWithdrawnAt: new Date("2026-09-01T00:00:00.000Z") },
    });
    seedConceptLectureViews([
      { studentId: S1, lectureId: LECTURE(1), completedAt: new Date() },
      { studentId: S2, lectureId: LECTURE(1), completedAt: null, percent: 40 },
      // 퇴원한 학생이 끝까지 봤어도 n 에 안 든다
      { studentId: S3, lectureId: LECTURE(1), completedAt: new Date() },
    ]);

    const a = (await board()).rows.find((r) => r.classId === CLASS_A_ID)!;
    expect(a.enrolled).toBe(2);
    expect(a.watch).toEqual([
      {
        lectureId: LECTURE(1),
        watched: 1,
        total: 2,
        pending: [{ id: S2, name: "김하윤" }],
      },
    ]);
  });

  it("모든 반 × 강의에서 n + 이름 수 = m = 반 인원", async () => {
    seedPublishedOnUnitA();
    seedConceptLectureViews([
      { studentId: S1, lectureId: LECTURE(1), completedAt: new Date() },
    ]);
    const data = await board();
    const lines = data.rows.flatMap((r) => r.watch.map((w) => ({ r, w })));
    expect(lines.length).toBeGreaterThan(0); // 분모를 못 박는다
    for (const { r, w } of lines) {
      expect(w.watched + w.pending.length, r.className).toBe(w.total);
      expect(w.total, r.className).toBe(r.enrolled);
    }
    expect(data.watchRecords).toBe(1);
  });

  it("시청 기록이 없으면 0/m 이 정상이다 — 모든 학생이 «안 본 학생»", async () => {
    seedPublishedOnUnitA();
    const a = (await board()).rows.find((r) => r.classId === CLASS_A_ID)!;
    expect(a.watch[0]).toMatchObject({ watched: 0, total: 3 });
    expect(a.watch[0]!.pending.map((p) => p.id)).toEqual([S1, S2, S3]);
  });
});

describe("GET /api/concept — 이번 주 닿는 차시", () => {
  it("반마다 최근 진도(반 진도)와 다음 차시 — 마지막 차시 뒤는 비운다", async () => {
    const data = await board();
    const row = (id: string) => data.rows.find((r) => r.classId === id)!;
    expect(row(CLASS_A_ID)).toMatchObject({
      progress: { unitId: UNIT_A.id, recordedAt: "2026-08-01" },
      nextUnitId: UNIT_A_NEXT.id,
    });
    expect(row(CLASS_B_ID)).toMatchObject({
      progress: { unitId: MOCK_UNITS[1]!.id },
      nextUnitId: MOCK_UNITS[2]!.id,
    });
    // 427 이 가짜 교육과정의 마지막 차시다 — 다음을 지어내지 않는다
    expect(row(CLASS_STARVED_ID)).toMatchObject({
      progress: { unitId: MOCK_UNITS[14]!.id },
      nextUnitId: null,
    });
    // 학생 3 의 개별 진도(418)는 반 진도가 아니다 — /api/progress 반 진도와 같은 판정
    expect(row(CLASS_A_ID).progress!.unitId).not.toBe(MOCK_UNITS[5]!.id);
  });

  it("요약 · 차시 · 강의 — 계약대로, 표에 나오는 차시만 싣는다", async () => {
    seedPublishedOnUnitA();
    seedConceptLectures([
      { id: LECTURE(2), unitId: UNIT_A_NEXT.id, title: "다음 차시 초안" },
      { id: LECTURE(3), unitId: MOCK_UNITS[9]!.id, title: "표 밖 차시" },
    ]);
    const data = await board();
    const touched = [
      UNIT_A,
      UNIT_A_NEXT,
      MOCK_UNITS[1]!,
      MOCK_UNITS[2]!,
      MOCK_UNITS[14]!,
    ];
    expect(new Set(data.units.map((u) => u.id))).toEqual(
      new Set(touched.map((u) => u.id)),
    );
    expect(data.summary).toEqual({
      units: 5,
      classes: 3,
      published: 1,
      draftOnly: 1,
      none: 3,
    });
    expect(data.lectures.map((l) => l.id).sort()).toEqual([
      LECTURE(1),
      LECTURE(2),
    ]);
    expect(data.unitTotal).toBe(MOCK_UNITS.length);
  });

  it("원장님 화면에는 AI 고지와 게시 관문의 판정이 실린다(D-124 ⑹ · ⑻)", async () => {
    seedConceptLectures([
      {
        id: LECTURE(2),
        unitId: UNIT_A.id,
        title: "초안",
        sourceJobId: "job-2",
        seconds: 90,
      },
    ]);
    const lecture = (await board()).lectures.find((l) => l.id === LECTURE(2))!;
    expect(lecture.gate.canPublish).toBe(false);
    expect(lecture.gate.blockers.map((b) => b.code)).toEqual([
      "video_missing",
      "disclosure",
    ]);
    expect(lecture.gate.warnings.map((w) => w.code)).toEqual(["review"]);
  });

  it("오늘은 학원 날짜(KST)다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-14T20:00:00.000Z"));
    expect((await board()).today).toBe("2026-09-15");
  });

  it("관리자만 쓸 수 있다는 표시 — canEdit", async () => {
    expect((await board()).canEdit).toBe(false);
    asAdmin();
    expect((await board()).canEdit).toBe(true);
  });
});

describe("① 관리자가 아니면 쓰기 API 가 막힌다", () => {
  it("🔴 등록(POST)은 403 이고 아무것도 안 만든다", async () => {
    const res = await registerLecture(
      send("POST", "/api/concept/lectures", { raw: meta(), unitId: null }),
    );
    expect(res.status).toBe(403);
    expect(conceptLectureRowsForTest()).toHaveLength(0);
  });

  it("🔴 게시·내리기·끝까지 봤다·주소 넣기(PATCH)는 403 이고 행이 안 바뀐다", async () => {
    seedConceptLectures([
      {
        id: LECTURE(2),
        unitId: UNIT_A.id,
        title: "초안",
        videoUrl: URL_A,
        seconds: 90,
      },
    ]);
    for (const body of [
      { action: "publish" },
      { action: "archive" },
      { action: "review" },
      { action: "video", videoUrl: URL_B },
    ]) {
      const res = await changeLecture(
        send("PATCH", `/api/concept/lectures/${LECTURE(2)}`, body),
        params(LECTURE(2)),
      );
      expect(res.status, body.action).toBe(403);
    }
    expect(conceptLectureRowsForTest()[0]).toMatchObject({
      status: "draft",
      videoUrl: URL_A,
      reviewedAt: null,
      publishedAt: null,
    });
  });

  it("관리자라도 다른 사이트에서 온 쓰기는 막는다", async () => {
    asAdmin();
    const res = await registerLecture(
      new NextRequest("http://localhost/api/concept/lectures", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.test",
        },
        body: JSON.stringify({ raw: meta(), unitId: null }),
      }),
    );
    expect(res.status).toBe(403);
    expect(conceptLectureRowsForTest()).toHaveLength(0);
  });
});

describe("POST /api/concept/lectures — meta.json 으로 초안 (관리자)", () => {
  beforeEach(asAdmin);

  async function register(body: unknown) {
    return registerLecture(send("POST", "/api/concept/lectures", body));
  }

  it("meta 의 unitCode 차시에 **초안**을 만든다 — 만든 사람을 남긴다", async () => {
    const res = await register({ raw: meta(), unitId: null });
    expect(res.status).toBe(201);
    const lecture = conceptLectureResponseSchema.parse(await res.json()).data;
    expect(lecture).toMatchObject({
      unitId: UNIT_A.id,
      title: "순환소수를 포함한 식의 계산",
      seconds: 139,
      videoUrl: URL_A, // youtu.be 를 정규 watch 주소로
      disclosure: DISCLOSURE,
      status: "draft",
      reviewedAt: null,
      publishedAt: null,
    });
    expect(conceptLectureRowsForTest()[0]).toMatchObject({
      createdById: USER_TEACHER_ID,
      sourceJobId: "job-416-a",
    });
  });

  it("meta 에 unitCode 가 없으면 지금 고른 차시에 붙인다", async () => {
    const res = await register({
      raw: meta({ unitCode: undefined }),
      unitId: UNIT_A_NEXT.id,
    });
    expect(res.status).toBe(201);
    expect(conceptLectureRowsForTest()[0]!.unitId).toBe(UNIT_A_NEXT.id);
  });

  it("meta 의 unitCode 가 고른 차시보다 앞선다", async () => {
    await register({ raw: meta(), unitId: UNIT_A_NEXT.id });
    expect(conceptLectureRowsForTest()[0]!.unitId).toBe(UNIT_A.id);
  });

  it("둘 다 없으면 만들지 않고 차시를 고르라고 말한다", async () => {
    const res = await register({
      raw: meta({ unitCode: undefined }),
      unitId: null,
    });
    expect(res.status).toBe(422);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.message).toContain("차시를 알 수 없습니다");
    expect(body.error.message).not.toContain("--unit"); // CLI 문구가 화면에 새지 않는다
    expect(conceptLectureRowsForTest()).toHaveLength(0);
  });

  it("🔴 해석 실패는 해석기가 낸 «왜»를 그대로 돌려준다", async () => {
    const res = await register({
      raw: meta({ lessonTitle: undefined }),
      unitId: UNIT_A.id,
    });
    expect(res.status).toBe(422);
    expect(errorResponseSchema.parse(await res.json()).error.message).toBe(
      "lessonTitle이 없습니다. 강의 meta.json이 맞는지 확인하세요.",
    );
    const broken = await register({
      raw: "{ 이건 json 이 아니다",
      unitId: UNIT_A.id,
    });
    expect(errorResponseSchema.parse(await broken.json()).error.message).toBe(
      "JSON으로 읽을 수 없습니다. meta.json 파일 내용을 통째로 붙여넣으세요.",
    );
  });

  it("없는 차시 코드는 거절한다", async () => {
    const res = await register({
      raw: meta({ unitCode: "J39999" }),
      unitId: null,
    });
    expect(res.status).toBe(422);
    expect(errorResponseSchema.parse(await res.json()).error.message).toContain(
      "차시 코드를 찾을 수 없습니다: J39999",
    );
  });

  it("같은 잡은 두 번 만들지 않는다(등록 계획기의 멱등 그대로)", async () => {
    expect((await register({ raw: meta(), unitId: null })).status).toBe(201);
    const again = await register({
      raw: meta({ video_url: "https://youtu.be/dQw4w9WgXcQ" }),
      unitId: null,
    });
    expect(again.status).toBe(409);
    expect(
      errorResponseSchema.parse(await again.json()).error.message,
    ).toContain("이미 등록됨 (같은 잡 ID)");
    expect(conceptLectureRowsForTest()).toHaveLength(1);
  });

  it("요청 모양이 틀리면 400", async () => {
    expect((await register({ unitId: null })).status).toBe(400);
    expect((await register({ raw: meta(), unitId: "not-a-uuid" })).status).toBe(
      400,
    );
  });
});

describe("PATCH /api/concept/lectures/{id} — 상태 전이 (관리자)", () => {
  beforeEach(asAdmin);

  async function act(id: string, body: unknown) {
    return changeLecture(
      send("PATCH", `/api/concept/lectures/${id}`, body),
      params(id),
    );
  }
  const row = () => conceptLectureRowsForTest()[0]!;

  beforeEach(() => {
    seedConceptLectures([
      {
        id: LECTURE(2),
        unitId: UNIT_A.id,
        title: "초안",
        seconds: 90,
        disclosure: DISCLOSURE,
        sourceJobId: "job-2",
      },
    ]);
  });

  it("주소 없는 초안의 게시는 관문의 이유와 함께 거절한다", async () => {
    const res = await act(LECTURE(2), { action: "publish" });
    expect(res.status).toBe(422);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.message).toContain("영상 주소가 없습니다");
    expect(row().status).toBe("draft");
  });

  it("주소 넣기 → 끝까지 봤다 → 게시 → 내리기 → 다시 게시", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-15T01:00:00.000Z"));

    let res = await act(LECTURE(2), {
      action: "video",
      videoUrl: "https://youtu.be/aQkPcPqTq4M",
    });
    expect(res.status).toBe(200);
    expect(
      conceptLectureResponseSchema.parse(await res.json()).data.videoUrl,
    ).toBe(URL_A);

    res = await act(LECTURE(2), { action: "review" });
    expect(
      conceptLectureResponseSchema.parse(await res.json()).data.reviewedAt,
    ).toBe("2026-09-15T01:00:00.000Z");

    res = await act(LECTURE(2), { action: "publish" });
    expect(
      conceptLectureResponseSchema.parse(await res.json()).data,
    ).toMatchObject({
      status: "published",
      publishedAt: "2026-09-15T01:00:00.000Z",
    });

    res = await act(LECTURE(2), { action: "archive" });
    expect(
      conceptLectureResponseSchema.parse(await res.json()).data,
    ).toMatchObject({
      status: "archived",
      publishedAt: "2026-09-15T01:00:00.000Z", // 마지막으로 게시한 시각 — 지우지 않는다
    });

    vi.setSystemTime(new Date("2026-09-16T02:00:00.000Z"));
    res = await act(LECTURE(2), { action: "publish" });
    expect(
      conceptLectureResponseSchema.parse(await res.json()).data,
    ).toMatchObject({
      status: "published",
      publishedAt: "2026-09-16T02:00:00.000Z",
    });
  });

  it("🔴 다른 영상으로 바꾸면 시청 확인을 비운다", async () => {
    await act(LECTURE(2), { action: "video", videoUrl: URL_A });
    await act(LECTURE(2), { action: "review" });
    expect(row().reviewedAt).not.toBeNull();
    const res = await act(LECTURE(2), { action: "video", videoUrl: URL_B });
    expect(res.status).toBe(200);
    expect(row()).toMatchObject({ videoUrl: URL_B, reviewedAt: null });
  });

  it("게시 중인 강의의 주소는 못 바꾸고, 게시 → 초안 길은 없다", async () => {
    await act(LECTURE(2), { action: "video", videoUrl: URL_A });
    await act(LECTURE(2), { action: "publish" });
    const res = await act(LECTURE(2), { action: "video", videoUrl: URL_B });
    expect(res.status).toBe(409);
    expect(row()).toMatchObject({ status: "published", videoUrl: URL_A });
    expect((await act(LECTURE(2), { action: "draft" })).status).toBe(400);
  });

  it("없는 강의는 404, 틀린 id·모양은 400", async () => {
    expect((await act(LECTURE(99), { action: "archive" })).status).toBe(404);
    expect((await act("nope", { action: "archive" })).status).toBe(400);
    expect((await act(LECTURE(2), { action: "video" })).status).toBe(400);
  });
});

describe("GET /api/concept/units · /api/concept/lectures — 전체 차시와 한 차시", () => {
  it("전체 차시 — 교육과정 차례로 전부, 차시마다 강의 수", async () => {
    seedPublishedOnUnitA();
    seedConceptLectures([
      { id: LECTURE(2), unitId: UNIT_A.id, title: "초안", status: "draft" },
    ]);
    const res = await getUnits(get("/api/concept/units"));
    expect(res.status).toBe(200);
    const data = conceptUnitsResponseSchema.parse(await res.json()).data;
    expect(data.units.map((u) => u.id)).toEqual(MOCK_UNITS.map((u) => u.id));
    expect(data.units.find((u) => u.id === UNIT_A.id)!.lectures).toEqual({
      published: 1,
      draft: 1,
      archived: 0,
    });
    expect(data.units[0]!.code).toBe(MOCK_UNITS[0]!.problemCodePrefix);
  });

  it("한 차시 — 차시와 그 강의(순서대로)", async () => {
    seedConceptLectures([
      { id: LECTURE(3), unitId: UNIT_A.id, title: "둘째", sortOrder: 1 },
      { id: LECTURE(2), unitId: UNIT_A.id, title: "첫째", sortOrder: 0 },
      { id: LECTURE(4), unitId: UNIT_A_NEXT.id, title: "다른 차시" },
    ]);
    const res = await getLectures(
      get(`/api/concept/lectures?unitId=${UNIT_A.id}`),
    );
    expect(res.status).toBe(200);
    const data = conceptUnitLecturesResponseSchema.parse(await res.json()).data;
    expect(data.unit.id).toBe(UNIT_A.id);
    expect(data.lectures.map((l) => l.title)).toEqual(["첫째", "둘째"]);
  });

  it("틀린 차시 id 는 400, 없는 차시는 404", async () => {
    expect(
      (await getLectures(get("/api/concept/lectures?unitId=x"))).status,
    ).toBe(400);
    expect(
      (await getLectures(get(`/api/concept/lectures?unitId=${LECTURE(9)}`)))
        .status,
    ).toBe(404);
  });

  it("로그인하지 않으면 둘 다 401", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await getUnits(get("/api/concept/units"))).status).toBe(401);
    expect(
      (await getLectures(get(`/api/concept/lectures?unitId=${UNIT_A.id}`)))
        .status,
    ).toBe(401);
  });
});

// 쓰이지 않는 가져오기를 막는다 — 반 B 학생 이름은 ② 시험의 대조군이다
void S4;
void S5;
