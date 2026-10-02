// @vitest-environment node
/**
 * 오늘의 영어 — 세트 저장 API 의 형식 판 관문 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * `PUT /api/english/sets/[id]` · `POST /api/english/exams/[id]/sets` 는 1판 경로다. 2판이나 모르는 판의 요청을
 * 1판으로 줄여 저장하지 않고 **사유를 밝혀 거절**한다. 형식 판(`schemaVersion`)과 동시 수정 CAS(`revision`)는 다른 칸이고,
 * 저장은 둘 다 맞아야 된다. 🔴 정상 1판 요청은 전과 똑같이 저장된다 — 1판 저장을 멈추는 장치가 아니다.
 *
 * 저장된 행이 1판이 아니면(문항에 2판 칸이 든 행) 1판 PUT 으로 덮어쓰지 않는다. 지금 운영에 그런 행은 없다
 * (2판 저장이 꺼져 있다) — 2판을 켜기 전에 이 문이 먼저 서 있어야 한다는 시험이다.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Viewer = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  menus?: import("@/contracts/accountAccess.contract").WorkspaceMenu[];
};
const sessionState = vi.hoisted(() => ({ user: null as Viewer | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.user),
}));
vi.mock("@/lib/db", async () => {
  const { prismaTestDouble } = await import("@/mocks/prismaTestDouble");
  const { composeEnglishDb } = await import("@/mocks/englishTestDouble");
  return { db: composeEnglishDb(prismaTestDouble) };
});

import { POST as createSet } from "@/app/api/english/exams/[id]/sets/route";
import { PUT as putSet } from "@/app/api/english/sets/[id]/route";

import { errorResponseSchema } from "@/contracts/common.contract";
import {
  englishSetResponseSchema,
  type EnglishQuestion,
} from "@/contracts/english.contract";
import { ENGLISH_VERSION_MESSAGES } from "@/lib/english/v2/versionGate";
import { USER_OTHER_ID, USER_TEACHER_ID } from "@/mocks/data";
import {
  englishRows,
  seedEnglishExam,
  seedEnglishQuestionSet,
} from "@/mocks/englishTestDouble";
import {
  englishV1LegacySet,
  englishV2TwoTargetDocument,
} from "@/mocks/englishV2Fixtures";

const ORIGIN = "http://localhost";
const TEACHER: Viewer = {
  id: USER_TEACHER_ID,
  email: "teacher@example.com",
  name: "김원장",
  isAdmin: false,
  menus: ["english"],
};

const LEGACY = englishV1LegacySet();
const PASSAGE = LEGACY.passage;
const QUESTIONS: EnglishQuestion[] = LEGACY.questions;
const v2Targets = () => englishV2TwoTargetDocument().items[0]!.targets;

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const withId = (id: string) => ({ params: Promise.resolve({ id }) });
const put = (id: string, body: unknown) =>
  putSet(
    jsonRequest(`${ORIGIN}/api/english/sets/${id}`, "PUT", body),
    withId(id),
  );
const post = (examId: string, body: unknown) =>
  createSet(
    jsonRequest(`${ORIGIN}/api/english/exams/${examId}/sets`, "POST", body),
    withId(examId),
  );

async function errorOf(response: Response) {
  return errorResponseSchema.parse(await response.json()).error;
}

let examId: string;
let othersExamId: string;

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  sessionState.user = TEACHER;
  examId = seedEnglishExam({
    userId: USER_TEACHER_ID,
    school: "한빛중학교",
    grade: "중2",
    title: "2학기 중간",
  }).id;
  othersExamId = seedEnglishExam({
    userId: USER_OTHER_ID,
    school: "남의학교",
    grade: "고1",
    title: "남의 시험",
  }).id;
});

/** 옛 세트 — meta null · 검토 완료 · revision 3 */
function seedLegacySet(target = examId) {
  return seedEnglishQuestionSet({
    examId: target,
    title: LEGACY.title,
    passage: PASSAGE,
    questions: QUESTIONS,
    status: "검토 완료",
    source: "chatgpt",
    meta: null,
    revision: 3,
  });
}
const v1Put = (revision: number) => ({
  title: "고친 이름",
  status: "검토 중",
  passage: PASSAGE,
  questions: QUESTIONS,
  revision,
});
const rowOf = (id: string) => englishRows.sets().find((row) => row.id === id)!;

describe("PUT /api/english/sets/[id] — 정상 1판 요청은 그대로 저장된다", () => {
  it("판 표지 없는 1판 PUT — 저장 · revision +1 · meta 는 null 그대로", async () => {
    const seeded = seedLegacySet();
    const response = await put(seeded.id, v1Put(3));
    expect(response.status).toBe(200);
    const { data } = englishSetResponseSchema.parse(await response.json());
    expect(data).toMatchObject({
      title: "고친 이름",
      status: "검토 중",
      revision: 4,
      meta: null,
    });
    expect(rowOf(seeded.id)).toMatchObject({ revision: 4, meta: null });
  });

  it("schemaVersion: 1 을 밝힌 PUT 도 저장된다 — 판 표지는 행에 남지 않는다", async () => {
    const seeded = seedLegacySet();
    const response = await put(seeded.id, { ...v1Put(3), schemaVersion: 1 });
    expect(response.status).toBe(200);
    const row = rowOf(seeded.id);
    expect(row.revision).toBe(4);
    expect(JSON.stringify(row)).not.toContain("schemaVersion");
  });
});

describe("PUT /api/english/sets/[id] — 2판 · 모르는 판 요청", () => {
  it("🔴 schemaVersion: 2 는 400 — 사유를 밝히고 행은 그대로", async () => {
    const seeded = seedLegacySet();
    const before = rowOf(seeded.id);
    const response = await put(seeded.id, { ...v1Put(3), schemaVersion: 2 });
    expect(response.status).toBe(400);
    const error = await errorOf(response);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe(ENGLISH_VERSION_MESSAGES.v2Payload);
    expect(error.details).toEqual([
      { field: "schemaVersion", message: ENGLISH_VERSION_MESSAGES.v2Payload },
    ]);
    expect(rowOf(seeded.id)).toEqual(before);
  });

  it("🔴 2판 문서를 통째로 보내도 400 — 1판 칸만 골라 저장하지 않는다", async () => {
    const seeded = seedLegacySet();
    const before = rowOf(seeded.id);
    const response = await put(seeded.id, {
      ...englishV2TwoTargetDocument(),
      revision: 3,
    });
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe(
      ENGLISH_VERSION_MESSAGES.v2Payload,
    );
    expect(rowOf(seeded.id)).toEqual(before);
  });

  it.each([3, "2", null])(
    "🔴 모르는 판 %j 는 400 — 행은 그대로",
    async (schemaVersion) => {
      const seeded = seedLegacySet();
      const before = rowOf(seeded.id);
      const response = await put(seeded.id, { ...v1Put(3), schemaVersion });
      expect(response.status).toBe(400);
      expect((await errorOf(response)).message).toBe(
        ENGLISH_VERSION_MESSAGES.unsupportedVersion,
      );
      expect(rowOf(seeded.id)).toEqual(before);
    },
  );

  it("🔴 판 표지 없이 문항에 표적(targets)을 실은 PUT 은 400 — 표적을 버리고 저장하지 않는다", async () => {
    const seeded = seedLegacySet();
    const before = rowOf(seeded.id);
    const body = v1Put(3) as unknown as {
      questions: Record<string, unknown>[];
    };
    body.questions = structuredClone(QUESTIONS) as unknown as Record<
      string,
      unknown
    >[];
    body.questions[0]!.targets = v2Targets();
    const response = await put(seeded.id, body);
    expect(response.status).toBe(400);
    const error = await errorOf(response);
    expect(error.message).toBe(ENGLISH_VERSION_MESSAGES.v2Fields);
    expect(error.details).toEqual([
      {
        field: "questions[0].targets",
        message: ENGLISH_VERSION_MESSAGES.v2Fields,
      },
    ]);
    expect(rowOf(seeded.id)).toEqual(before);
  });

  it("판과 revision 은 따로 본다 — 판이 틀리면 revision 이 맞아도 400, 판이 맞고 revision 이 낡으면 409", async () => {
    const seeded = seedLegacySet();
    const wrongVersion = await put(seeded.id, {
      ...v1Put(3),
      schemaVersion: 2,
    });
    expect(wrongVersion.status).toBe(400);
    const staleRevision = await put(seeded.id, {
      ...v1Put(2),
      schemaVersion: 1,
    });
    expect(staleRevision.status).toBe(409);
    expect((await errorOf(staleRevision)).code).toBe("REVISION_MISMATCH");
    expect(rowOf(seeded.id).revision).toBe(3);
  });

  it("소유 검사가 먼저다 — 남의 세트에 2판 요청을 보내면 403 (판 사유를 알려 주지 않는다)", async () => {
    const others = seedLegacySet(othersExamId);
    const response = await put(others.id, { ...v1Put(3), schemaVersion: 2 });
    expect(response.status).toBe(403);
  });
});

describe("PUT /api/english/sets/[id] — 저장된 행이 1판이 아니면", () => {
  it("🔴 문항에 2판 칸이 든 행은 1판 PUT 으로 덮어쓰지 않는다 — 409 · 행은 그대로", async () => {
    const stored = [
      { ...QUESTIONS[0]!, targets: v2Targets() },
    ] as unknown as EnglishQuestion[];
    const seeded = seedEnglishQuestionSet({
      examId,
      title: "새 형식 세트",
      passage: PASSAGE,
      questions: stored,
      revision: 1,
    });
    const before = rowOf(seeded.id);
    const response = await put(seeded.id, v1Put(1));
    expect(response.status).toBe(409);
    const error = await errorOf(response);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe(ENGLISH_VERSION_MESSAGES.storedNotV1);
    expect(rowOf(seeded.id)).toEqual(before);
  });
});

describe("POST /api/english/exams/[id]/sets — 2판 · 모르는 판 요청", () => {
  const v1Create = () => ({
    title: "새 세트",
    source: "chatgpt",
    passage: PASSAGE,
    questions: QUESTIONS,
  });

  it("정상 1판 POST 는 201 — 전과 같다", async () => {
    const response = await post(examId, v1Create());
    expect(response.status).toBe(201);
    expect(englishRows.sets()).toHaveLength(1);
  });

  it("schemaVersion: 1 을 밝힌 POST 도 201", async () => {
    const response = await post(examId, { ...v1Create(), schemaVersion: 1 });
    expect(response.status).toBe(201);
    expect(JSON.stringify(englishRows.sets())).not.toContain("schemaVersion");
  });

  it("🔴 2판 문서 · 판 2 · 모르는 판 · 표적이 든 문항은 400 — 행이 생기지 않는다", async () => {
    const withTargets = v1Create() as unknown as {
      questions: Record<string, unknown>[];
    };
    withTargets.questions = [{ ...QUESTIONS[0]!, targets: v2Targets() }];
    for (const [body, message] of [
      [englishV2TwoTargetDocument(), ENGLISH_VERSION_MESSAGES.v2Payload],
      [{ ...v1Create(), schemaVersion: 2 }, ENGLISH_VERSION_MESSAGES.v2Payload],
      [
        { ...v1Create(), schemaVersion: 3 },
        ENGLISH_VERSION_MESSAGES.unsupportedVersion,
      ],
      [withTargets, ENGLISH_VERSION_MESSAGES.v2Fields],
    ] as const) {
      const response = await post(examId, body);
      expect(response.status).toBe(400);
      expect((await errorOf(response)).message).toBe(message);
    }
    expect(englishRows.sets()).toHaveLength(0);
  });

  it("소유 검사가 먼저다 — 남의 시험에 2판 요청을 보내면 403", async () => {
    const response = await post(othersExamId, {
      ...v1Create(),
      schemaVersion: 2,
    });
    expect(response.status).toBe(403);
  });
});
