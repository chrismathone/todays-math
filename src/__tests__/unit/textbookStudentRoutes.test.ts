// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  auth: vi.fn(),
  student: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
  readQr: vi.fn(),
  requireConcept: vi.fn(),
  conceptDto: vi.fn(),
  frozenConcept: vi.fn(),
  requireQr: vi.fn(),
  qrSnapshot: vi.fn(),
  listAttempts: vi.fn(),
  submitAttempt: vi.fn(),
  startReview: vi.fn(),
  referencesAsset: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/learn/studentLearningMenusStore", () => ({
  getStudentLearningMenus: vi.fn(async () => ({
    enabled: ["textbook"],
    updatedAt: null,
  })),
}));
vi.mock("@/lib/auth", () => ({ auth: f.auth }));
vi.mock("@/lib/db", () => ({ db: { student: { findUnique: f.student } } }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, run: unknown) => run,
}));
vi.mock("@/lib/textbook/server/prismaSql", () => ({
  textbookDb: { query: f.query, execute: f.execute },
}));
vi.mock("@/lib/textbook/studentRead", () => ({
  readStudentQr: f.readQr,
  requireStudentConcept: f.requireConcept,
  studentConceptDto: f.conceptDto,
  readFrozenConcept: f.frozenConcept,
  requireStudentQr: f.requireQr,
  readQrSnapshot: f.qrSnapshot,
}));
vi.mock("@/lib/textbook/studentAttempts", () => ({
  listStudentConceptAttempts: f.listAttempts,
  submitStudentConceptAttempt: f.submitAttempt,
}));
vi.mock("@/lib/textbook/studentReview", () => ({
  startTextbookReview: f.startReview,
}));
vi.mock("@/lib/textbook/studentAccess", () => ({
  qrTargetReferencesAsset: f.referencesAsset,
}));

import { GET as QR_GET } from "@/app/api/learn/textbook/q/[slug]/route";
import { HEAD as ASSET_HEAD } from "@/app/api/learn/textbook/q/[slug]/assets/[assetId]/route";
import { GET as CONCEPT_GET } from "@/app/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/route";
import {
  GET as ATTEMPTS_GET,
  POST as ATTEMPTS_POST,
} from "@/app/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/attempts/route";
import { POST as REVIEW_POST } from "@/app/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/review/route";
import { dataResponseSchema } from "@/contracts/common.contract";
import {
  textbookStudentQrSchema,
  textbookStudentAttemptSchema,
} from "@/contracts/textbookStudent.contract";
import { TextbookError } from "@/lib/textbook/server/errors";
import { getStudentLearningMenus } from "@/lib/learn/studentLearningMenusStore";
import { studentAttemptOf } from "@/lib/textbook/studentProjection";
import {
  ExplorerActionConflict,
  ExplorerActionInvalid,
} from "@/lib/math-explorers/errors";

const ORIGIN = "https://textbook.example.test";
const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "33333333-3333-4333-8333-333333333333";
const EDITION_ID = "44444444-4444-4444-8444-444444444444";
const REQUEST_ID = "55555555-5555-4555-8555-555555555555";
const SLUG = "printed-qr-token-12345";
const KEY = "common-denominator";
const conceptPath = `/api/learn/textbook/editions/${EDITION_ID}/concepts/${KEY}`;
const context = () => ({
  params: Promise.resolve({ editionId: EDITION_ID, conceptKey: KEY }),
});
const target = {
  kind: "concept",
  editionId: EDITION_ID,
  conceptKey: KEY,
  ownerId: OTHER_ID,
};
const body = {
  requestId: REQUEST_ID,
  form: "cloze",
  response: "학생이 직접 쓴 문장\r\n",
};
const activeAccount = () => ({
  id: STUDENT_ID,
  eywaWithdrawnAt: null,
  studentAccount: { id: ACCOUNT_ID, disabledAt: null },
});
const session = (mustChangePassword = false) => ({
  student: {
    studentId: STUDENT_ID,
    accountId: ACCOUNT_ID,
    name: "학생",
    mustChangePassword,
  },
});
const qrDto = {
  kind: "problem",
  editionId: EDITION_ID,
  itemId: OTHER_ID,
  title: "교재",
  displayNumber: "1",
  content: "배정된 문제",
  answer: null,
  solution: null,
  textSolutionAvailable: false,
  figures: [],
  concepts: [],
  video: {
    state: "preparing",
    providerVideoId: null,
    startSeconds: 0,
    endSeconds: null,
  },
};
const attempt = () =>
  studentAttemptOf({
    attemptId: OTHER_ID,
    requestId: REQUEST_ID,
    bodyHash: "b".repeat(64),
    studentId: STUDENT_ID,
    editionId: EDITION_ID,
    conceptKey: KEY,
    frozenHash: "a".repeat(64),
    form: "cloze",
    channel: "student-text",
    response: body.response,
    submittedAt: "2026-10-03T00:00:00.000Z",
    revision: 1,
    reviewStatus: "pending",
    reviewedBy: null,
    reviewedAt: null,
    note: "TEACHER_PRIVATE_NOTE_CANARY",
  });
const getQr = () =>
  QR_GET(new Request(`${ORIGIN}/api/learn/textbook/q/${SLUG}`), {
    params: Promise.resolve({ slug: SLUG }),
  });
const post = (
  raw = JSON.stringify(body),
  headers: Record<string, string> = { origin: ORIGIN },
) =>
  new Request(`${ORIGIN}${conceptPath}/attempts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw,
  });
const noCallsPastGate = () => {
  for (const service of [
    f.readQr,
    f.requireConcept,
    f.conceptDto,
    f.frozenConcept,
    f.requireQr,
    f.qrSnapshot,
    f.listAttempts,
    f.submitAttempt,
    f.startReview,
    f.referencesAsset,
    f.query,
    f.execute,
  ])
    expect(service).not.toHaveBeenCalled();
};
async function expectStatus(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  return response.json();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getStudentLearningMenus).mockResolvedValue({
    enabled: ["textbook"],
    updatedAt: null,
  });
  vi.stubEnv("AUTH_URL", ORIGIN);
  vi.stubEnv("NEXTAUTH_URL", "");
  f.auth.mockResolvedValue(session());
  f.student.mockResolvedValue(activeAccount());
  f.readQr.mockResolvedValue(qrDto);
  f.requireConcept.mockResolvedValue(target);
  f.requireQr.mockResolvedValue(target);
  f.conceptDto.mockResolvedValue({
    editionId: EDITION_ID,
    conceptKey: KEY,
    title: "통분",
    frozenHash: "a".repeat(64),
    blanks: [],
    paperForms: [],
    reviewAccess: { available: false, reasonCode: "no-record" },
  });
  f.listAttempts.mockResolvedValue([attempt()]);
  f.submitAttempt.mockResolvedValue({ attempt: attempt(), replayed: false });
  f.startReview.mockResolvedValue({
    status: "unavailable",
    reasonCode: "no-record",
    replayed: false,
    href: null,
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("교재 학생 라우트의 실제 인증 관문", () => {
  it.each(["GET", "POST"])(
    "%s는 다른 학생으로 로그인한 오래된 화면의 요청을 DB 전에 거절한다",
    async (method) => {
      const response =
        method === "GET"
          ? await QR_GET(
              new Request(`${ORIGIN}/api/learn/textbook/q/${SLUG}`, {
                headers: { "x-student-id": OTHER_ID },
              }),
              { params: Promise.resolve({ slug: SLUG }) },
            )
          : await ATTEMPTS_POST(
              post(JSON.stringify(body), {
                origin: ORIGIN,
                "x-student-id": OTHER_ID,
              }),
              context(),
            );
      await expectStatus(response, 409);
      expect(f.student).not.toHaveBeenCalled();
      noCallsPastGate();
    },
  );

  it("화면 학생 ID가 현재 세션과 같은 GET은 Origin 없이 세션 학생으로 조회한다", async () => {
    const response = await QR_GET(
      new Request(`${ORIGIN}/api/learn/textbook/q/${SLUG}`, {
        headers: { "x-student-id": STUDENT_ID },
      }),
      { params: Promise.resolve({ slug: SLUG }) },
    );
    dataResponseSchema(textbookStudentQrSchema).parse(
      await expectStatus(response, 200),
    );
    expect(f.student).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: STUDENT_ID } }),
    );
    expect(f.readQr).toHaveBeenCalledWith(
      expect.anything(),
      STUDENT_ID,
      SLUG,
      expect.any(Date),
    );
  });

  it.each([
    { label: "문제 QR", call: getQr },
    {
      label: "개념",
      call: () =>
        CONCEPT_GET(new Request(`${ORIGIN}${conceptPath}`), context()),
    },
    {
      label: "시도 목록",
      call: () =>
        ATTEMPTS_GET(
          new Request(`${ORIGIN}${conceptPath}/attempts`),
          context(),
        ),
    },
    { label: "학생 제출", call: () => ATTEMPTS_POST(post(), context()) },
    {
      label: "복습 시작",
      call: () =>
        REVIEW_POST(post(JSON.stringify({ requestId: REQUEST_ID })), context()),
    },
  ])("$label 진입점도 인증 없이 서비스에 도달하지 않는다", async ({ call }) => {
    f.auth.mockResolvedValue(null);
    await expectStatus(await call(), 401);
    noCallsPastGate();
  });

  it.each([
    { label: "익명", value: null, status: 401 },
    {
      label: "교사",
      value: {
        user: {
          id: STUDENT_ID,
          approvalStatus: "approved",
          menus: ["textbook"],
        },
      },
      status: 401,
    },
    { label: "초기 비밀번호", value: session(true), status: 403 },
  ])("$label 세션은 후속 조회를 하지 않는다", async ({ value, status }) => {
    f.auth.mockResolvedValue(value);
    await expectStatus(await getQr(), status);
    expect(f.student).not.toHaveBeenCalled();
    noCallsPastGate();
  });

  it.each([
    { label: "학생 삭제", student: null },
    {
      label: "계정 삭제",
      student: { ...activeAccount(), studentAccount: null },
    },
    {
      label: "계정 정지",
      student: {
        ...activeAccount(),
        studentAccount: { id: ACCOUNT_ID, disabledAt: new Date() },
      },
    },
    {
      label: "계정 재발급",
      student: {
        ...activeAccount(),
        studentAccount: { id: OTHER_ID, disabledAt: null },
      },
    },
    {
      label: "퇴원",
      student: { ...activeAccount(), eywaWithdrawnAt: new Date() },
    },
  ])("현재 DB의 $label 상태를 낡은 세션보다 우선한다", async ({ student }) => {
    f.student.mockResolvedValue(student);
    await expectStatus(await getQr(), 401);
    expect(f.student).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: STUDENT_ID } }),
    );
    noCallsPastGate();
  });

  it("Origin 없는 GET을 허용하되 다음 요청의 계정 정지는 즉시 반영한다", async () => {
    const first = await getQr();
    dataResponseSchema(textbookStudentQrSchema).parse(
      await expectStatus(first, 200),
    );
    expect(f.readQr).toHaveBeenCalledWith(
      expect.anything(),
      STUDENT_ID,
      SLUG,
      expect.any(Date),
    );
    f.student.mockResolvedValue({
      ...activeAccount(),
      studentAccount: { id: ACCOUNT_ID, disabledAt: new Date() },
    });
    await expectStatus(await getQr(), 401);
    expect(f.student).toHaveBeenCalledTimes(2);
    expect(f.readQr).toHaveBeenCalledTimes(1);
  });
});

describe("학생 제출 요청의 원본 JSON과 출처 경계", () => {
  it.each<{ label: string; headers: Record<string, string> }>([
    { label: "다른 Origin", headers: { origin: "https://other.example.test" } },
    { label: "Origin 누락", headers: {} },
    {
      label: "cross-site",
      headers: { origin: ORIGIN, "sec-fetch-site": "cross-site" },
    },
  ])(
    "POST의 $label 요청은 저장 함수에 도달하지 않는다",
    async ({ headers }) => {
      await expectStatus(
        await ATTEMPTS_POST(post(undefined, headers), context()),
        403,
      );
      noCallsPastGate();
    },
  );

  it.each([
    {
      label: "학생 ID 주입",
      raw: JSON.stringify({ ...body, studentId: OTHER_ID }),
    },
    {
      label: "중복 requestId",
      raw: `{"requestId":"${REQUEST_ID}","requestId":"${OTHER_ID}","form":"cloze","response":"문장"}`,
    },
    {
      label: "본문 바이트 상한",
      raw: " ".repeat(97 * 1024) + JSON.stringify(body),
    },
    {
      label: "응답 글자 상한",
      raw: JSON.stringify({ ...body, response: "가".repeat(20_001) }),
    },
    {
      label: "교사 채널 주입",
      raw: JSON.stringify({ ...body, channel: "teacher-observed" }),
    },
  ])("$label을 거절하고 부수 효과를 만들지 않는다", async ({ raw }) => {
    await expectStatus(await ATTEMPTS_POST(post(raw), context()), 400);
    noCallsPastGate();
  });

  it("유효한 응답은 인증된 학생 ID로만 전달하고 학생 원문은 보존한다", async () => {
    const result = await expectStatus(
      await ATTEMPTS_POST(post(), context()),
      200,
    );
    expect(f.submitAttempt).toHaveBeenCalledWith(
      expect.anything(),
      STUDENT_ID,
      EDITION_ID,
      KEY,
      body,
    );
    const saved = textbookStudentAttemptSchema.parse(result.data.attempt);
    expect(saved.response).toBe(body.response);
    expect(JSON.stringify(result)).not.toContain("TEACHER_PRIVATE_NOTE_CANARY");
    expect(result.data.attempt).not.toHaveProperty("bodyHash");
    expect(result.data.attempt).not.toHaveProperty("studentId");
    expect(f.startReview).not.toHaveBeenCalled();
  });

  it("복습 요청의 임의 카드 ID는 읽은 개념이나 탐험 엔진에 전달하지 않는다", async () => {
    await expectStatus(
      await REVIEW_POST(
        post(JSON.stringify({ requestId: REQUEST_ID, cardId: "other-card" })),
        context(),
      ),
      400,
    );
    expect(f.frozenConcept).not.toHaveBeenCalled();
    expect(f.startReview).not.toHaveBeenCalled();
    expect(f.execute).not.toHaveBeenCalled();
  });

  it.each([
    {
      error: new ExplorerActionConflict(
        "같은 요청 번호로 다른 답을 보낼 수 없어요.",
      ),
      status: 409,
      code: "CONFLICT",
    },
    {
      error: new ExplorerActionInvalid("현재 개념 활동을 다시 확인해 주세요."),
      status: 400,
      code: "VALIDATION_ERROR",
    },
  ])(
    "기존 탐험 엔진의 $code 오류를 HTTP $status로 반환한다",
    async ({ error, status, code }) => {
      const frozen = { frozen: { contentHash: "a".repeat(64) } };
      f.frozenConcept.mockResolvedValue(frozen);
      f.startReview.mockRejectedValue(error);
      const result = await expectStatus(
        await REVIEW_POST(
          new Request(`${ORIGIN}${conceptPath}/review`, {
            method: "POST",
            headers: { origin: ORIGIN, "content-type": "application/json" },
            body: JSON.stringify({ requestId: REQUEST_ID }),
          }),
          context(),
        ),
        status,
      );
      expect(result).toEqual({ error: { code, message: error.message } });
      expect(f.requireConcept).toHaveBeenCalledWith(
        expect.anything(),
        STUDENT_ID,
        EDITION_ID,
        KEY,
      );
      expect(f.frozenConcept).toHaveBeenCalledWith(expect.anything(), target);
      expect(f.startReview).toHaveBeenCalledWith({
        studentId: STUDENT_ID,
        concept: frozen,
        requestId: REQUEST_ID,
        now: expect.any(Date),
      });
      expect(f.submitAttempt).not.toHaveBeenCalled();
      expect(f.execute).not.toHaveBeenCalled();
    },
  );

  it("복습 시작도 현재 배정을 먼저 확인하고 회수되면 엔진에 접근하지 않는다", async () => {
    f.requireConcept.mockRejectedValue(
      new TextbookError(403, "FORBIDDEN", "배정이 회수되었습니다."),
    );
    const result = await expectStatus(
      await REVIEW_POST(
        new Request(`${ORIGIN}${conceptPath}/review`, {
          method: "POST",
          headers: { origin: ORIGIN, "content-type": "application/json" },
          body: JSON.stringify({ requestId: REQUEST_ID }),
        }),
        context(),
      ),
      403,
    );
    expect(result.error.code).toBe("FORBIDDEN");
    expect(f.frozenConcept).not.toHaveBeenCalled();
    expect(f.startReview).not.toHaveBeenCalled();
    expect(f.execute).not.toHaveBeenCalled();
  });
});

describe("학생 공개 응답과 매 요청 배정 검사", () => {
  it.each([
    {
      label: "시도 목록",
      service: f.listAttempts,
      call: () =>
        ATTEMPTS_GET(
          new Request(`${ORIGIN}${conceptPath}/attempts`),
          context(),
        ),
    },
    {
      label: "학생 제출",
      service: f.submitAttempt,
      call: () => ATTEMPTS_POST(post(), context()),
    },
  ])(
    "$label 서비스의 현재 배정 거절을 no-store로 반환한다",
    async ({ service, call }) => {
      service.mockRejectedValue(
        new TextbookError(403, "FORBIDDEN", "배정이 회수되었습니다."),
      );
      const result = await expectStatus(await call(), 403);
      expect(result).not.toHaveProperty("data");
      expect(f.startReview).not.toHaveBeenCalled();
      expect(f.execute).not.toHaveBeenCalled();
    },
  );

  it("시도 목록은 교사 메모·정답·원문 hash를 포함하지 않는다", async () => {
    const result = await expectStatus(
      await ATTEMPTS_GET(
        new Request(`${ORIGIN}${conceptPath}/attempts`),
        context(),
      ),
      200,
    );
    expect(result.data).toEqual([attempt()]);
    for (const field of [
      "note",
      "answer",
      "answers",
      "why",
      "bodyHash",
      "frozenHash",
      "reviewedBy",
    ])
      expect(result.data[0]).not.toHaveProperty(field);
    expect(f.listAttempts).toHaveBeenCalledWith(
      expect.anything(),
      STUDENT_ID,
      EDITION_ID,
      KEY,
    );
  });

  it("하위 서비스가 숨긴 정답 필드를 잘못 반환해도 공개 schema에서 닫는다", async () => {
    f.listAttempts.mockResolvedValue([
      { ...attempt(), answer: "HIDDEN_ANSWER_CANARY" },
    ]);
    const result = await expectStatus(
      await ATTEMPTS_GET(
        new Request(`${ORIGIN}${conceptPath}/attempts`),
        context(),
      ),
      400,
    );
    expect(JSON.stringify(result)).not.toContain("HIDDEN_ANSWER_CANARY");
  });

  it.each([
    { status: 403, code: "FORBIDDEN" as const },
    { status: 410, code: "NOT_FOUND" as const },
  ])(
    "개념 배정 거절 $status도 no-store이며 원문·복습을 읽지 않는다",
    async ({ status, code }) => {
      f.requireConcept.mockRejectedValue(
        new TextbookError(status, code, "현재 배정에서 열 수 없습니다."),
      );
      await expectStatus(
        await CONCEPT_GET(new Request(`${ORIGIN}${conceptPath}`), context()),
        status,
      );
      expect(f.conceptDto).not.toHaveBeenCalled();
      expect(f.frozenConcept).not.toHaveBeenCalled();
      expect(f.startReview).not.toHaveBeenCalled();
      expect(f.query).not.toHaveBeenCalled();
    },
  );

  it("그림 HEAD도 현재 배정을 재검사하고 거절 뒤에는 자산 바이트를 읽지 않는다", async () => {
    f.requireQr.mockRejectedValue(
      new TextbookError(403, "FORBIDDEN", "배정이 회수되었습니다."),
    );
    const assetId = "a".repeat(64);
    await expectStatus(
      await ASSET_HEAD(
        new Request(
          `${ORIGIN}/api/learn/textbook/q/${SLUG}/assets/${assetId}`,
          { method: "HEAD" },
        ),
        { params: Promise.resolve({ slug: SLUG, assetId }) },
      ),
      403,
    );
    expect(f.requireQr).toHaveBeenCalledWith(
      expect.anything(),
      STUDENT_ID,
      SLUG,
    );
    expect(f.qrSnapshot).not.toHaveBeenCalled();
    expect(f.frozenConcept).not.toHaveBeenCalled();
    expect(f.referencesAsset).not.toHaveBeenCalled();
    expect(f.query).not.toHaveBeenCalled();
  });

  it("허용된 QR이라도 다른 문제의 자산이면 blob 조회 전에 거절한다", async () => {
    f.referencesAsset.mockResolvedValue(false);
    const assetId = "a".repeat(64);
    await expectStatus(
      await ASSET_HEAD(
        new Request(
          `${ORIGIN}/api/learn/textbook/q/${SLUG}/assets/${assetId}`,
          { method: "HEAD" },
        ),
        { params: Promise.resolve({ slug: SLUG, assetId }) },
      ),
      404,
    );
    expect(f.query).not.toHaveBeenCalled();
  });
});
