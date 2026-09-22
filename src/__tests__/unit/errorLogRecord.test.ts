/**
 * 오류 기록 한 줄을 **어떻게 남기나** — `src/lib/errorLog/record.ts` · `sanitize.ts` · `scope.ts`.
 *
 * 원장님 2026-09-22 «최대한 자세하게 수집해서 수집된 로그로 업그레이드 패치 가능하게».
 * 그래서 여기서 지키는 것은 셋이다:
 *  ⑴ **자세하게** — 화면 문구·개발자 원문·요청 요약·AI 시도 기록·크롭 이미지가 한 줄에 실린다.
 *  ⑵ **새지 않게** — 비밀번호·토큰·쿠키·키 값은 걸러 싣는다(`audit.ts` 의 SECRET_KEY 결).
 *  ⑶ 🔴 **요청을 깨지 않게** — 표가 없거나(마이그레이션 전) DB 가 느려도 기록은 조용히 포기한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";
import {
  ERROR_LOG_IMAGE_MAX_BYTES,
  ERROR_LOG_RETENTION_DAYS,
} from "@/contracts/errorLogValues";
import {
  recordErrorLog,
  recordErrorLogs,
  ERROR_LOG_DETAIL_MAX,
  ERROR_LOG_MESSAGE_MAX,
  ERROR_LOG_CONTEXT_MAX_BYTES,
} from "@/lib/errorLog/record";
import { redactSecrets, scrubText } from "@/lib/errorLog/sanitize";
import {
  createErrorLogNotes,
  noteErrorLog,
  runWithErrorLogNotes,
} from "@/lib/errorLog/scope";
import { purgeExpiredErrorLogs } from "@/lib/errorLog/purge";

const USER = "11111111-1111-4111-8111-111111111111";
const png = (bytes: number) =>
  `data:image/png;base64,${Buffer.alloc(bytes, 7).toString("base64")}`;

async function rows() {
  return db.errorLog.findMany({ include: { image: true } });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("한 줄에 싣는 것", () => {
  it("화면 문구·원문·요청 요약·작업 이름·사용자·배포·요청 번호·걸린 시간이 그대로 남는다", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123");
    const ok = await recordErrorLog({
      source: "server",
      kind: "ai-rejected",
      route: "/api/studio/ai",
      method: "POST",
      status: 422,
      action: "figure-redraw",
      message:
        "점 이름표가 가리키는 점이 맞지 않아 도형을 다시 그리지 못했습니다.",
      detail:
        "도형을 그리지 못했습니다: labels.val30.point conflicts with its key",
      context: { request: { path: "/api/studio/ai" }, trail: [{ attempt: 0 }] },
      userId: USER,
      requestId: "icn1::abc",
      durationMs: 1234,
    });
    expect(ok).toBe(true);
    const [row] = await rows();
    expect(row).toMatchObject({
      source: "server",
      kind: "ai-rejected",
      route: "/api/studio/ai",
      method: "POST",
      status: 422,
      action: "figure-redraw",
      userId: USER,
      release: "abc123",
      requestId: "icn1::abc",
      durationMs: 1234,
    });
    expect(row.detail).toContain("labels.val30.point conflicts with its key");
    expect(row.context).toMatchObject({ trail: [{ attempt: 0 }] });
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("줄 id 를 미리 주면 그 id 로 남는다(응답 머리의 기록 번호와 맞춰 볼 수 있게)", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    await recordErrorLog({ id, source: "server", kind: "api-rejected" });
    expect((await rows())[0].id).toBe(id);
  });

  it("길이는 자른다 — 화면 문구·원문·요청 요약 모두 상한이 있다", async () => {
    await recordErrorLog({
      source: "server",
      kind: "api-error",
      message: "가".repeat(ERROR_LOG_MESSAGE_MAX + 50),
      detail: "x".repeat(ERROR_LOG_DETAIL_MAX + 50),
      context: { big: "y".repeat(ERROR_LOG_CONTEXT_MAX_BYTES * 2) },
    });
    const [row] = await rows();
    expect(row.message!.length).toBeLessThanOrEqual(ERROR_LOG_MESSAGE_MAX);
    expect(row.detail!.length).toBeLessThanOrEqual(ERROR_LOG_DETAIL_MAX);
    expect(Buffer.byteLength(JSON.stringify(row.context))).toBeLessThanOrEqual(
      ERROR_LOG_CONTEXT_MAX_BYTES,
    );
    // 잘랐다는 표시가 남아야 «원래 이만큼이었다»를 안다
    expect(row.detail).toMatch(/자름/);
  });

  it("uuid 가 아닌 사용자(개발 다리의 'local-development')는 칸을 비우고 요약에 적는다 — FK 가 기록을 막지 않게", async () => {
    await recordErrorLog({
      source: "server",
      kind: "api-rejected",
      userId: "local-development",
    });
    const [row] = await rows();
    expect(row.userId).toBeNull();
    expect(row.context).toMatchObject({ actor: "local-development" });
  });
});

describe("크롭 이미지 (AI 도형 재작도 실패 — 상한 2MB)", () => {
  it("data URL 을 풀어 별도 표에 바이트로 남긴다", async () => {
    await recordErrorLog({
      source: "server",
      kind: "ai-rejected",
      image: png(1000),
    });
    const [row] = await rows();
    expect(row.image).toMatchObject({ mimeType: "image/png", byteSize: 1000 });
    expect(Buffer.from(row.image!.data).length).toBe(1000);
  });

  it("2MB 를 넘으면 이미지는 버리고, 버렸다는 것과 크기를 요약에 남긴다", async () => {
    await recordErrorLog({
      source: "server",
      kind: "ai-rejected",
      image: png(ERROR_LOG_IMAGE_MAX_BYTES + 1),
    });
    const [row] = await rows();
    expect(row.image).toBeNull();
    expect(row.context).toMatchObject({
      imageSkipped: {
        reason: "too-large",
        bytes: ERROR_LOG_IMAGE_MAX_BYTES + 1,
      },
    });
  });

  it("이미지가 아닌 data URL 은 싣지 않는다", async () => {
    await recordErrorLog({
      source: "server",
      kind: "ai-rejected",
      image: "data:text/html;base64,PHNjcmlwdD4=",
    });
    const [row] = await rows();
    expect(row.image).toBeNull();
    expect(row.context).toMatchObject({
      imageSkipped: { reason: "not-image" },
    });
  });
});

describe("🔴 비밀 값은 걸러 싣는다", () => {
  it("열쇠 이름으로 — 비밀번호·토큰·쿠키·Authorization·세션·키", () => {
    const out = redactSecrets({
      password: "pw1234",
      newPassword: "pw5678",
      csrfToken: "t",
      accessToken: "t",
      cookie: "a=b",
      Authorization: "Bearer zzz",
      sessionToken: "s",
      apiKey: "k",
      "x-goog-api-key": "k",
      nested: { secret: "s", keep: "보인다" },
      maxOutputTokens: 3000,
      list: [{ refresh_token: "r", page: 2 }],
    }) as Record<string, unknown>;
    for (const key of [
      "password",
      "newPassword",
      "csrfToken",
      "accessToken",
      "cookie",
      "Authorization",
      "sessionToken",
      "apiKey",
      "x-goog-api-key",
    ])
      expect(out[key]).toBe("[걸러냄]");
    expect(out.nested).toEqual({ secret: "[걸러냄]", keep: "보인다" });
    // 토큰 «수»는 비밀이 아니다 — 이름에 token 이 들어갔다고 숫자를 지우면 패치 재료를 잃는다
    expect(out.maxOutputTokens).toBe(3000);
    expect(out.list).toEqual([{ refresh_token: "[걸러냄]", page: 2 }]);
  });

  it("값의 모양으로 — Bearer · sk- · AIza · DB 접속 문자열의 비밀번호 · 서버 환경변수의 키 값", () => {
    vi.stubEnv("GEMINI_API_KEY", "gm-very-secret-value-123456");
    const text = scrubText(
      [
        "Authorization: Bearer abc.def.ghi-jkl",
        "key sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUV",
        "google AIzaSyA1234567890abcdefghijklmnop",
        "postgresql://postgres:hunter2pass@db.example.com:5432/postgres",
        "echo gm-very-secret-value-123456 back",
      ].join("\n"),
    );
    expect(text).not.toMatch(/abc\.def\.ghi/);
    expect(text).not.toMatch(/ABCDEFGHIJKLMNOPQRSTUV/);
    expect(text).not.toMatch(/AIzaSyA123/);
    expect(text).not.toMatch(/hunter2pass/);
    expect(text).not.toMatch(/gm-very-secret-value/);
    expect(text).toContain("db.example.com");
  });

  it("기록에 실리는 모든 칸이 거른 값이다 — 원문(detail)·화면 문구·요약 모두", async () => {
    await recordErrorLog({
      source: "server",
      kind: "api-error",
      message: "Bearer abcdefgh12345678",
      detail: "upstream said sk-proj-ABCDEFGHIJKLMNOPQRST",
      context: { request: { query: { token: "t", page: "2" } } },
    });
    const [row] = await rows();
    expect(row.message).not.toMatch(/abcdefgh12345678/);
    expect(row.detail).not.toMatch(/ABCDEFGHIJKLMNOPQRST/);
    expect(row.context).toMatchObject({
      request: { query: { token: "[걸러냄]", page: "2" } },
    });
  });
});

describe("🔴 요청을 깨지 않는다 — 기록은 best effort", () => {
  it("표가 없어도(마이그레이션 전 — P2021) 던지지 않고 false", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(prismaTestDouble.errorLog, "create").mockRejectedValueOnce(
      Object.assign(new Error("The table `public.error_log` does not exist"), {
        code: "P2021",
      }),
    );
    await expect(
      recordErrorLog({ source: "server", kind: "api-error" }),
    ).resolves.toBe(false);
    // 조용히 삼키되 서버 기록에는 한 줄 — 「왜 안 쌓이지」의 답
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0])).toContain("P2021");
  });

  it("계정이 지워져 FK 가 막으면(P2003) 사용자 칸을 비우고 한 번 더 쓴다", async () => {
    const create = vi.spyOn(prismaTestDouble.errorLog, "create");
    create.mockRejectedValueOnce(
      Object.assign(new Error("Foreign key constraint violated"), {
        code: "P2003",
      }),
    );
    await expect(
      recordErrorLog({ source: "server", kind: "api-rejected", userId: USER }),
    ).resolves.toBe(true);
    expect(create).toHaveBeenCalledTimes(2);
    const [row] = await rows();
    expect(row.userId).toBeNull();
    expect(row.context).toMatchObject({ actor: USER });
  });

  it("DB 가 멈추면 상한 시간 뒤 포기한다 — 함수 수명을 붙잡지 않는다", async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(prismaTestDouble.errorLog, "create").mockReturnValueOnce(
        new Promise(() => {}) as never,
      );
      const pending = recordErrorLog({ source: "server", kind: "api-error" });
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(pending).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("브라우저 묶음은 한 번에 넣는다", () => {
  it("createMany 한 번 — 이미지 없이", async () => {
    const spy = vi.spyOn(prismaTestDouble.errorLog, "createMany");
    const count = await recordErrorLogs([
      { source: "client", kind: "client-exception", message: "a" },
      { source: "client", kind: "client-request-failed", message: "b" },
    ]);
    expect(count).toBe(2);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((await rows()).map((r) => r.message).sort()).toEqual(["a", "b"]);
  });
});

describe("요청 범위의 메모 — 깊은 곳이 남기고 틀이 모은다", () => {
  it("범위 밖에서 부르면 아무 일도 안 한다(시험·스크립트에서 엔진을 불러도 안전)", () => {
    expect(() => noteErrorLog({ detail: "x" })).not.toThrow();
  });

  it("범위 안에서는 모인다 — 원문은 이어 붙이고, 요약은 합치고, 작업·종류·이미지는 마지막 것", async () => {
    const notes = createErrorLogNotes();
    await runWithErrorLogNotes(notes, async () => {
      noteErrorLog({ action: "ocr", detail: "첫째" });
      await Promise.resolve();
      noteErrorLog({
        action: "figure-redraw",
        kind: "ai-rejected",
        detail: "둘째",
        context: { a: 1 },
        image: "data:image/png;base64,AA==",
      });
      noteErrorLog({ context: { b: 2 }, userId: USER });
    });
    expect(notes).toMatchObject({
      action: "figure-redraw",
      kind: "ai-rejected",
      details: ["첫째", "둘째"],
      context: { a: 1, b: 2 },
      image: "data:image/png;base64,AA==",
      userId: USER,
    });
  });

  it("요청 둘이 동시에 돌아도 메모가 섞이지 않는다", async () => {
    const a = createErrorLogNotes();
    const b = createErrorLogNotes();
    await Promise.all([
      runWithErrorLogNotes(a, async () => {
        await new Promise((r) => setTimeout(r, 5));
        noteErrorLog({ detail: "A" });
      }),
      runWithErrorLogNotes(b, async () => {
        noteErrorLog({ detail: "B" });
        await new Promise((r) => setTimeout(r, 1));
      }),
    ]);
    expect(a.details).toEqual(["A"]);
    expect(b.details).toEqual(["B"]);
  });
});

describe(`보관 ${ERROR_LOG_RETENTION_DAYS}일`, () => {
  beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));

  it("90일 지난 줄만 지운다 — 딸린 이미지도 같이", async () => {
    const now = new Date("2026-12-31T00:00:00.000Z");
    const day = 24 * 60 * 60 * 1000;
    await recordErrorLog({
      source: "server",
      kind: "api-error",
      image: png(10),
    });
    await recordErrorLog({ source: "server", kind: "api-error" });
    const [older, newer] = await rows();
    // 한 줄은 91일 전, 한 줄은 89일 전으로 옮겨 둔다
    prismaTestDouble
      .__errorLogRows()
      .find((r) => r.id === older.id)!.createdAt = new Date(
      now.getTime() - 91 * day,
    );
    prismaTestDouble
      .__errorLogRows()
      .find((r) => r.id === newer.id)!.createdAt = new Date(
      now.getTime() - 89 * day,
    );

    const result = await purgeExpiredErrorLogs(now);
    expect(result.deleted).toBe(1);
    expect(result.cutoff).toBe(
      new Date(now.getTime() - 90 * day).toISOString(),
    );
    const left = await rows();
    expect(left.map((r) => r.id)).toEqual([newer.id]);
    expect(prismaTestDouble.__errorLogImageRows()).toHaveLength(0);
  });
});
