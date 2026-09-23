/**
 * 🔴 RED → 🟢 — **성취 팩터 API** `GET /api/students/{id}/achievement` (D-134 트랙 2).
 *
 * 구현: src/app/api/students/[id]/achievement/route.ts · 계약: src/contracts/achievement.contract.ts
 * 브리프: docs/planning/tracks/briefs/achievement-factors.md §1.2
 *
 * 무엇을 잠그나
 * 1. **계약 strict** — 응답이 계약 그대로 통과하고, 모르는 질의 칸은 400 이다.
 * 2. **기간 뒤집힘 400.**
 * 3. **소유 범위**(D-130 짝 시험) — 남의 반 학생은 403, 없는 학생은 404, 관리자는 넘는다.
 * 4. 🔴 **지금 실데이터로 답이 정직한가** — 진도만 숫자가 나오고 채점·강의·숙제·의견은
 *    전부 `null` 이다. 하나라도 0 으로 오면 그 화면은 거짓말을 하게 된다(23 §4 ③).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// 관리자 여부(D-130) — 판정은 `src/lib/ownerScope.ts` 한 곳. 기본은 관리자 아님.
const sessionState = vi.hoisted(() => ({ isAdmin: false, signedIn: true }));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () =>
    sessionState.signedIn
      ? {
          id: "10000000-0000-4000-8000-000000000001",
          email: "teacher@todaysmath.test",
          name: "테스트 강사",
          isAdmin: sessionState.isAdmin,
          isSuperAdmin: sessionState.isAdmin,
        }
      : null,
  ),
}));

import { GET as getAchievement } from "@/app/api/students/[id]/achievement/route";
import { achievementResponseSchema } from "@/contracts/achievement.contract";
import { errorResponseSchema } from "@/contracts/common.contract";
import { db } from "@/lib/db";
import {
  CLASS_OTHER_ID,
  MOCK_UNITS,
  NOT_FOUND_ID,
  STUDENT_IDS,
} from "@/mocks/data";
import {
  resetPrismaTestDouble,
  seedConceptLectures,
  seedConceptLectureViews,
} from "@/mocks/prismaTestDouble";

/** 반 A 학생(반 진도를 쓴다) · 반 A 개별 진도 학생. */
const STUDENT_A = STUDENT_IDS[0]!;
const STUDENT_INDIVIDUAL = STUDENT_IDS[2]!;

/** 반 A 의 진도 이력은 2026-06-05 ~ 2026-08-01 에 네 줄 있다(`src/mocks/data/progress.ts`). */
const PERIOD = "from=2026-06-01&to=2026-08-31";

const call = (id: string, query: string) =>
  getAchievement(
    new NextRequest(
      `http://localhost/api/students/${id}/achievement?${query}`,
      { method: "GET" },
    ),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  resetPrismaTestDouble();
  sessionState.isAdmin = false;
  sessionState.signedIn = true;
});

describe("관문 — 세션 · 경로 · 질의", () => {
  it("로그인하지 않으면 401", async () => {
    sessionState.signedIn = false;
    expect((await call(STUDENT_A, PERIOD)).status).toBe(401);
  });

  it("경로 id 가 uuid 가 아니면 400", async () => {
    expect((await call("not-a-uuid", PERIOD)).status).toBe(400);
  });

  it("기간이 없으면 400", async () => {
    expect((await call(STUDENT_A, "")).status).toBe(400);
    expect((await call(STUDENT_A, "from=2026-06-01")).status).toBe(400);
  });

  it("🔴 기간이 뒤집히면 400 이고 어느 칸인지 말한다", async () => {
    const res = await call(STUDENT_A, "from=2026-08-31&to=2026-06-01");
    expect(res.status).toBe(400);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(body.error.details)).toContain("from");
  });

  it("계약이 strict 다 — 모르는 질의 칸은 400", async () => {
    expect((await call(STUDENT_A, `${PERIOD}&weight=0.3`)).status).toBe(400);
  });

  it("모르는 비교군 이름은 400", async () => {
    expect((await call(STUDENT_A, `${PERIOD}&compare=nationwide`)).status).toBe(
      400,
    );
  });
});

describe("소유 범위 — D-130 짝 시험", () => {
  it("없는 학생은 404", async () => {
    expect((await call(NOT_FOUND_ID, PERIOD)).status).toBe(404);
  });

  it("🔴 관리자가 아니면 남의 반 학생은 403 · 관리자는 넘는다", async () => {
    const other = await db.student.create({
      data: { classId: CLASS_OTHER_ID, name: "남의 반 학생" },
    });

    expect((await call(other.id, PERIOD)).status).toBe(403);

    sessionState.isAdmin = true;
    expect((await call(other.id, PERIOD)).status).toBe(200);
  });
});

describe("🔴 지금 실데이터 — 진도만 숫자다", () => {
  it("응답이 계약 그대로 통과한다", async () => {
    const res = await call(STUDENT_A, PERIOD);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(() => achievementResponseSchema.parse(body)).not.toThrow();
  });

  it("① 진도는 숫자가 나온다 (반 진도 네 줄)", async () => {
    const res = await call(STUDENT_A, PERIOD);
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.learned.lessons).toBe(4);
    expect(data.learned.units).toHaveLength(4);
  });

  it("🔴 계획이 없으므로 밀림은 null 이다 — «0일 밀림»이 아니다", async () => {
    const res = await call(STUDENT_A, PERIOD);
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.learned.planDriftDays).toBeNull();
    expect(data.learned.planDriftGap).toBe("계획없음");
  });

  it("🔴 ②③④ 는 전부 null 이다 — 0 이 아니다", async () => {
    const res = await call(STUDENT_A, PERIOD);
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.scored.rounds).toBeNull();
    expect(data.scored.averagePercent).toBeNull();
    expect(data.scored.unitAccuracy).toBeNull();
    expect(data.scored.bandAccuracy).toBeNull();
    expect(data.scored.reviewUnits).toBeNull();
    expect(data.selfStudy.lectures).toBeNull();
    expect(data.selfStudy.homework).toBeNull();
    expect(data.teacherNote).toBeNull();
  });

  it("개별 진도 학생은 반 진도가 아니라 자기 진도를 센다", async () => {
    const res = await call(STUDENT_INDIVIDUAL, PERIOD);
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.learned.lessons).toBe(1);
  });

  it("진도가 없는 기간이면 null 이다 — 0 이 아니다", async () => {
    const res = await call(STUDENT_A, "from=2026-01-01&to=2026-01-31");
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.learned.lessons).toBeNull();
    expect(data.learned.units).toBeNull();
  });
});

describe("비교군 — 기본값은 «미사용»", () => {
  it("안 주면 null 이다", async () => {
    const res = await call(STUDENT_A, PERIOD);
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.comparison).toBeNull();
  });

  it("compare=class 는 반 학생 수를 표본으로 같이 낸다", async () => {
    const res = await call(STUDENT_A, `${PERIOD}&compare=class`);
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.comparison?.kind).toBe("반평균");
    // 반 A 는 학생 셋(`MOCK_STUDENTS_BY_CLASS`)
    expect(data.comparison?.sampleSize).toBe(3);
    expect(data.comparison?.averagePercent).toEqual({
      value: null,
      sample: 0,
    });
  });

  it("🔴 compare=previous 는 **지난달(달력)**이다 · 표본은 본인 하나", async () => {
    // 7월의 지난달은 6월 한 달 — 반 A 진도는 6/5 · 6/20 두 줄이다.
    // 같은 일수(31일)로 거슬러 가면 5/31~6/30 이 되어 값은 같지만, 9월로 물으면 갈린다(아래).
    const res = await call(
      STUDENT_A,
      "from=2026-07-01&to=2026-07-31&compare=previous",
    );
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.comparison?.kind).toBe("지난달");
    expect(data.comparison?.sampleSize).toBe(1);
    expect(data.comparison?.lessons).toEqual({ value: 2, sample: 1 });
  });

  it("🔴 9월(30일)의 지난달은 8/1 부터다 — 8/1 진도가 지난달에 들어간다", async () => {
    // 반 A 는 8/1 에 한 줄. 같은 일수로 거슬러 가면 8/2~8/31 이라 0 → null 이 된다.
    const res = await call(
      STUDENT_A,
      "from=2026-09-01&to=2026-09-30&compare=previous",
    );
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.comparison?.lessons).toEqual({ value: 1, sample: 1 });
  });
});

/**
 * 🔴 **예습 영상의 대상과 셈은 기간 끝에서 자른다** (Hi-fi 브리프 §1 #6 · #8 · §2 규칙 8).
 * 대상 = 기간에 배운 차시의 강의 중 **기간 끝 다음날 00:00 KST 전에 게시된 것** ·
 * 셈 = **완료 시각 < 기간 끝 다음날 00:00 KST**. 지금 게시 상태로 고르거나 시청에 끝을 안 두면
 * 과거 달의 리포트가 **뒤에 한 일로 바뀐다.**
 */
describe("🔴 ③ 예습 영상 — 과거 리포트가 뒤의 일로 바뀌지 않는다", () => {
  // 반 A 가 6~8월에 나간 차시 넷(`src/mocks/data/progress.ts`)
  const unit = (i: number) => MOCK_UNITS[i]!.id;
  const END = new Date("2026-08-31T15:00:00.000Z"); // 9월 1일 00:00 KST

  beforeEach(() => {
    seedConceptLectures([
      {
        id: "a0000000-0000-4000-8000-000000000001",
        unitId: unit(0),
        title: "기간 안에 게시",
        videoUrl: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
        seconds: 300,
        status: "published",
        publishedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      {
        id: "a0000000-0000-4000-8000-000000000002",
        unitId: unit(1),
        title: "기간이 끝난 순간 게시",
        videoUrl: "https://www.youtube.com/watch?v=bbbbbbbbbbb",
        seconds: 300,
        status: "published",
        publishedAt: END,
      },
      {
        id: "a0000000-0000-4000-8000-000000000003",
        unitId: unit(3),
        title: "기간 끝 1초 전 게시",
        videoUrl: "https://www.youtube.com/watch?v=ccccccccccc",
        seconds: 300,
        status: "published",
        publishedAt: new Date(END.getTime() - 1000),
      },
    ]);
    seedConceptLectureViews([
      // 기간 끝 1초 전에 완료 — 센다
      {
        studentId: STUDENT_A,
        lectureId: "a0000000-0000-4000-8000-000000000001",
        completedAt: new Date(END.getTime() - 1000),
      },
      // 기간이 끝난 순간 완료 — 안 센다
      {
        studentId: STUDENT_A,
        lectureId: "a0000000-0000-4000-8000-000000000003",
        completedAt: END,
      },
    ]);
  });

  it("🔴 대상은 기간 끝 전에 게시된 강의뿐이다 — 지금 게시 상태로 고르지 않는다", async () => {
    const res = await call(STUDENT_A, PERIOD);
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.selfStudy.lectures?.assigned).toBe(2);
  });

  it("🔴 완료는 기간 끝 전에 끝낸 것만 — 뒤에 본 것은 안 올라간다", async () => {
    const res = await call(STUDENT_A, PERIOD);
    const { data } = achievementResponseSchema.parse(await res.json());
    expect(data.selfStudy.lectures?.completed).toBe(1);
  });
});
