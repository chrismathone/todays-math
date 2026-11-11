// @vitest-environment node
/**
 * 오늘의 영어 — 사진 자료에서 글 읽기 `POST /api/english/materials/[id]/read` (D-158 · 25 §13.8).
 *
 * 순서: 세션 401 → 메뉴 403 → 같은 출처 403 → 없는 자료 404 → 남의 시험 403 → 사진이 아닌 자료 400
 *       → 한 사람의 동시 읽기 상한 429 → 모델.
 * 읽은 글은 **저장하지 않는다** — 선생님이 고친 뒤 글 자료로 저장한다(자료 POST).
 * 실패의 까닭은 갈라 알린다(검토 2026-10-06) — 설정 503 · 상류가 바쁨 503 · 한도 429 · 시간 초과 504 · 끊긴 요청 499 ·
 * 읽지 못함 502. 우리 쪽 결함(모르는 예외)은 삼키지 않고 던진다.
 * 🔴 실호출 금지 — 모델 호출 배관(`runModelApi`)을 대역으로 바꾼다.
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
const model = vi.hoisted(() => ({ run: vi.fn() }));

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
vi.mock("@/lib/studio-ai/api", () => ({ runModelApi: model.run }));
vi.mock("@/lib/errorLog/scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/errorLog/scope")>();
  return { ...actual, noteErrorLog: vi.fn(actual.noteErrorLog) };
});

import { POST as readMaterial } from "@/app/api/english/materials/[id]/read/route";

import { errorResponseSchema } from "@/contracts/common.contract";
import { englishMaterialReadResponseSchema } from "@/contracts/english.contract";
import { noteErrorLog } from "@/lib/errorLog/scope";
import { StudioApiError } from "@/lib/studio-ai/errors";
import { USER_OTHER_ID, USER_TEACHER_ID } from "@/mocks/data";
import {
  englishRows,
  seedEnglishExam,
  seedEnglishMaterial,
} from "@/mocks/englishTestDouble";

const ORIGIN = "http://localhost";
const TEACHER: Viewer = {
  id: USER_TEACHER_ID,
  email: "teacher@example.com",
  name: "김원장",
  isAdmin: false,
  menus: ["english"],
};
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9]);
const PDF = new Uint8Array([37, 80, 68, 70]);
const READ_EMPTY =
  "글을 읽지 못했습니다. 사진이 흐리거나 글자가 작을 수 있습니다. 다시 찍어 올리거나 지문을 직접 입력해 주세요.";
const READ_FAILED =
  "글을 읽지 못했습니다. 다시 시도하거나 지문을 직접 입력해 주세요.";

const withId = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (
  id: string,
  headers: Record<string, string> = { origin: ORIGIN },
  signal?: AbortSignal,
) =>
  new NextRequest(`${ORIGIN}/api/english/materials/${id}/read`, {
    method: "POST",
    headers,
    ...(signal ? { signal } : {}),
  });
const messageOf = async (res: Response) =>
  errorResponseSchema.parse(await res.json()).error.message;

let photoId: string;
let textId: string;
let pdfId: string;
let pngId: string;
let fakePhotoId: string;
let othersPhotoId: string;
let othersTextId: string;

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  for (const key of [
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "DEEPSEEK_API_KEY",
    "ENGLISH_READ_VENDOR",
  ])
    vi.stubEnv(key, "");
  // 기본 읽는 모델은 Claude Sonnet 5.5(원장님 2026-11-11 «전부 sonnet 으로»)
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  // 한 번만 읽는다 — 대조 · 따로 읽기는 아래에서 따로 켜고 본다(뒷단의 갈래는 englishReadPhoto.test.ts)
  vi.stubEnv("ENGLISH_READ_VERIFY", "off");
  vi.stubEnv("ENGLISH_READ_TWICE", "off");
  model.run.mockReset();
  model.run.mockResolvedValue("Upcycling is a fun way to reuse old things.");
  vi.mocked(noteErrorLog).mockClear();
  sessionState.user = TEACHER;
  const exam = seedEnglishExam({
    userId: USER_TEACHER_ID,
    school: "한빛고등학교",
    grade: "고1",
    title: "2학기 총괄 평가",
  });
  const others = seedEnglishExam({
    userId: USER_OTHER_ID,
    school: "남의학교",
    grade: "고1",
    title: "남의 시험",
  });
  photoId = seedEnglishMaterial({
    examId: exam.id,
    name: "총괄평가 1쪽.jpg",
    mimeType: "image/jpeg",
    size: JPEG.byteLength,
    bytes: JPEG,
  }).id;
  textId = seedEnglishMaterial({
    examId: exam.id,
    name: "Lesson 2 본문",
    content: "Plain passage text.",
  }).id;
  pdfId = seedEnglishMaterial({
    examId: exam.id,
    name: "범위.pdf",
    mimeType: "application/pdf",
    size: PDF.byteLength,
    bytes: PDF,
  }).id;
  pngId = seedEnglishMaterial({
    examId: exam.id,
    name: "총괄평가 2쪽.png",
    mimeType: "image/png",
    size: PNG.byteLength,
    bytes: PNG,
  }).id;
  // 이름만 사진인 파일 — 올릴 때는 확장자로 형을 정한다
  fakePhotoId = seedEnglishMaterial({
    examId: exam.id,
    name: "사진인 척.png",
    mimeType: "image/png",
    size: PDF.byteLength,
    bytes: PDF,
  }).id;
  othersTextId = seedEnglishMaterial({
    examId: others.id,
    name: "남의 글",
    content: "Passage of another teacher.",
  }).id;
  othersPhotoId = seedEnglishMaterial({
    examId: others.id,
    name: "남의 사진.png",
    mimeType: "image/png",
    size: JPEG.byteLength,
    bytes: JPEG,
  }).id;
});

describe("POST /api/english/materials/[id]/read — 관문", () => {
  it("401 — 로그인하지 않았다", async () => {
    sessionState.user = null;
    const res = await readMaterial(request(photoId), withId(photoId));
    expect(res.status).toBe(401);
    expect(model.run).not.toHaveBeenCalled();
  });

  it("403 — 자료를 다루는 메뉴(학교별 내신 대비)가 없다", async () => {
    // 문제 만들기 · 보관함만 가진 계정은 자료를 볼 수는 있어도 사진을 모델로 보내지 못한다
    for (const menus of [
      ["english-library"],
      ["english-maker"],
      ["english-maker", "english-library"],
    ] as const) {
      sessionState.user = { ...TEACHER, menus: [...menus] };
      const res = await readMaterial(request(photoId), withId(photoId));
      expect(res.status).toBe(403);
    }
    expect(model.run).not.toHaveBeenCalled();
  });

  it("403 — 다른 사이트에서 온 요청", async () => {
    const res = await readMaterial(
      request(photoId, { origin: "https://evil.example" }),
      withId(photoId),
    );
    expect(res.status).toBe(403);
    expect(model.run).not.toHaveBeenCalled();
  });

  it("404 — 없는 자료 · 403 — 남의 시험의 자료", async () => {
    const missing = "00000000-0000-4000-8000-00000000dead";
    expect((await readMaterial(request(missing), withId(missing))).status).toBe(
      404,
    );
    expect(
      (await readMaterial(request(othersPhotoId), withId(othersPhotoId)))
        .status,
    ).toBe(403);
    // 남의 자료는 «사진이 아니다»(400)보다 먼저 막힌다 — 종류를 알려 주지 않는다
    expect(
      (await readMaterial(request(othersTextId), withId(othersTextId))).status,
    ).toBe(403);
    expect(model.run).not.toHaveBeenCalled();
  });

  it("400 — 사진이 아닌 자료(글 자료 · PDF)는 읽지 않는다", async () => {
    // 이름만 사진인 파일(PDF 바이트 · png 이름)도 모델로 보내지 않는다
    for (const id of [textId, pdfId, fakePhotoId]) {
      const res = await readMaterial(request(id), withId(id));
      expect(res.status).toBe(400);
      expect(await messageOf(res)).toBe("사진 자료만 글을 읽을 수 있습니다.");
    }
    expect(model.run).not.toHaveBeenCalled();
  });
});

describe("POST /api/english/materials/[id]/read — 읽기", () => {
  it("200 — 읽은 글을 돌려주고 아무것도 저장하지 않는다", async () => {
    const before = englishRows.materials().length;
    const res = await readMaterial(request(photoId), withId(photoId));
    expect(res.status).toBe(200);
    const body = englishMaterialReadResponseSchema.parse(await res.json());
    expect(body.data.text).toBe("Upcycling is a fun way to reuse old things.");
    expect(englishRows.materials()).toHaveLength(before);
    expect(model.run).toHaveBeenCalledTimes(1);
    const input = model.run.mock.calls[0]![0] as {
      vendor: string;
      model: string;
      effort?: string;
      imageDataUrl: string;
    };
    expect(input.vendor).toBe("anthropic");
    expect(input.model).toBe("claude-sonnet-5-5");
    expect(input.effort).toBe("low");
    // 올린 바이트 그대로 — 빈 사진이나 다른 사진을 보내지 않는다
    expect(input.imageDataUrl).toBe(
      `data:image/jpeg;base64,${Buffer.from(JPEG).toString("base64")}`,
    );
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("200 — 기본 설정(Sonnet 5.5)이면 읽기 둘 · 대조 하나를 부르고, 빈칸을 맞추고 다듬은 글을 돌려준다", async () => {
    vi.stubEnv("ENGLISH_READ_VERIFY", "");
    vi.stubEnv("ENGLISH_READ_TWICE", "");
    const first =
      "1학년 1반 15번 이름:\nThe Earth gets hot________. When the ________ goes up.";
    const other =
      "1학년 반 번 이름:\nThe Earth gets h________. When the t________ goes up.";
    let reads = 0;
    model.run
      .mockReset()
      .mockImplementation(async (input: { prompt: string }) => {
        // 대조는 받은 글을 그대로 돌려준다 · 읽기는 차례로 두 글
        if (input.prompt.includes("[옮긴 글]"))
          return input.prompt.split("[옮긴 글]\n")[1]!;
        return reads++ === 0 ? first : other;
      });
    const res = await readMaterial(request(photoId), withId(photoId));
    expect(res.status).toBe(200);
    const body = englishMaterialReadResponseSchema.parse(await res.json());
    // 빈칸 앞 글자는 따로 읽은 글로 맞추고(hot → h · 빠진 t), 이름 줄의 손으로 쓴 숫자는 걷는다
    expect(body.data.text).toBe(
      "1학년 반 번 이름:\nThe Earth gets h________. When the t________ goes up.",
    );
    expect(model.run).toHaveBeenCalledTimes(3);
    // 덧붙인 호출이 실패해도 읽기는 성공이다 — 처음 읽은 글
    reads = 0;
    model.run.mockReset().mockImplementation(async () => {
      if (reads++ === 0) return "First read of the page.";
      throw new StudioApiError("모델 실패", 503, true);
    });
    const kept = await readMaterial(request(photoId), withId(photoId));
    expect(kept.status).toBe(200);
    expect(
      englishMaterialReadResponseSchema.parse(await kept.json()).data.text,
    ).toBe("First read of the page.");
  });

  it("200 — png 사진도 읽는다", async () => {
    const res = await readMaterial(request(pngId), withId(pngId));
    expect(res.status).toBe(200);
    const input = model.run.mock.calls[0]![0] as { imageDataUrl: string };
    expect(input.imageDataUrl).toBe(
      `data:image/png;base64,${Buffer.from(PNG).toString("base64")}`,
    );
  });

  it("499 — 화면이 요청을 끊으면 모델 호출도 끊긴다(받을 쪽이 없다)", async () => {
    const controller = new AbortController();
    model.run.mockImplementation(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const pending = readMaterial(
      request(photoId, { origin: ORIGIN }, controller.signal),
      withId(photoId),
    );
    await vi.waitFor(() => expect(model.run).toHaveBeenCalledTimes(1));
    controller.abort();
    expect((await pending).status).toBe(499);
  });

  it("429 — 한 사람이 동시에 띄우는 읽기는 둘까지, 끝나면 다시 받는다", async () => {
    const release: (() => void)[] = [];
    model.run.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          release.push(() => resolve("Read text."));
        }),
    );
    const first = readMaterial(request(photoId), withId(photoId));
    const second = readMaterial(request(pngId), withId(pngId));
    await vi.waitFor(() => expect(model.run).toHaveBeenCalledTimes(2));
    const third = await readMaterial(request(photoId), withId(photoId));
    expect(third.status).toBe(429);
    expect(await messageOf(third)).toBe(
      "진행 중인 AI 작업이 끝나면 다시 시도해 주세요.",
    );
    expect(model.run).toHaveBeenCalledTimes(2);
    for (const done of release) done();
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    // 자리가 비면 다시 읽는다 — 실패한 읽기도 자리를 돌려준다
    model.run.mockReset();
    model.run.mockRejectedValueOnce(new StudioApiError("모델 실패", 500));
    expect((await readMaterial(request(photoId), withId(photoId))).status).toBe(
      503,
    );
    model.run.mockRejectedValueOnce(new StudioApiError("모델 실패"));
    expect((await readMaterial(request(photoId), withId(photoId))).status).toBe(
      502,
    );
    model.run.mockResolvedValue("Again.");
    expect((await readMaterial(request(photoId), withId(photoId))).status).toBe(
      200,
    );
  });

  it("503 — 사진을 보는 모델의 키가 없다 · 다른 제공자 키가 있어도 조용히 넘어가지 않는다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "other-vendor");
    vi.stubEnv("DEEPSEEK_API_KEY", "only-text");
    const res = await readMaterial(request(photoId), withId(photoId));
    expect(res.status).toBe(503);
    expect(await messageOf(res)).toBe("AI 연결이 설정되지 않았습니다.");
    expect(model.run).not.toHaveBeenCalled();
  });

  it("429 — 사용량 한도는 한 문구로 알리고, 기다릴 시간을 머리에 싣는다", async () => {
    // OpenAI 길은 한도에도 «연결 설정을 확인» 문구를 싣는다 — 화면에는 우리 문구 하나만
    model.run.mockRejectedValue(
      new StudioApiError(
        "모델 API 요청에 실패했습니다. 서버의 연결 설정을 확인해 주세요.",
        429,
        true,
        7000,
      ),
    );
    const res = await readMaterial(request(photoId), withId(photoId));
    expect(res.status).toBe(429);
    expect(await messageOf(res)).toBe(
      "AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(res.headers.get("Retry-After")).toBe("7");
  });

  it("503 — 상류가 바쁘면 «설정되지 않았습니다»가 아니라 «응답하지 않습니다»", async () => {
    for (const status of [500, 503, 529]) {
      model.run.mockRejectedValue(
        new StudioApiError(
          "모델 API 요청에 실패했습니다. 서버의 연결 설정을 확인해 주세요.",
          status,
          true,
        ),
      );
      const res = await readMaterial(request(photoId), withId(photoId));
      expect(res.status).toBe(503);
      expect(await messageOf(res)).toBe(
        "AI 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  });

  it("503 — 상류가 키 · 모델을 거절하면(401 · 403 · 404) 설정 문제다", async () => {
    for (const status of [401, 403, 404]) {
      model.run.mockRejectedValue(new StudioApiError("거절", status));
      const res = await readMaterial(request(photoId), withId(photoId));
      expect(res.status).toBe(503);
      expect(await messageOf(res)).toBe("AI 연결이 설정되지 않았습니다.");
    }
  });

  it("504 — 시간 초과는 «사진이 흐리다»가 아니라 시간 초과로 알린다", async () => {
    model.run.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );
    const res = await readMaterial(request(photoId), withId(photoId));
    expect(res.status).toBe(504);
    expect(await messageOf(res)).toBe(
      "AI 작업 시간이 초과되었습니다. 다시 시도해 주세요.",
    );
  });

  it("우리 쪽 결함(모르는 예외)은 «읽지 못했습니다»로 덮지 않고 던진다", async () => {
    model.run.mockRejectedValue(new TypeError("boom"));
    await expect(
      readMaterial(request(photoId), withId(photoId)),
    ).rejects.toThrow("boom");
  });

  it("502 — 모델이 거절했거나 끝까지 쓰지 않았으면 «읽지 못했습니다»(사진 탓이라 하지 않는다) · 글이 비었으면 사진을 다시 찍어 보라고 한다", async () => {
    const failed = READ_FAILED;
    // Gemini 가 끝까지 쓰지 않았다(finishReason ≠ STOP) — 배관의 기본 상태 502. 상류가 사진을 거절한 400 도 같다
    for (const error of [
      new StudioApiError(
        "Gemini 응답이 완료되지 않았습니다. 문항을 나누어 다시 시도해 주세요.",
      ),
      new StudioApiError("모델 API 요청에 실패했습니다.", 400),
    ]) {
      model.run.mockRejectedValue(error);
      const broken = await readMaterial(request(photoId), withId(photoId));
      expect(broken.status).toBe(502);
      expect(await messageOf(broken)).toBe(failed);
    }
    // 까닭은 화면이 아니라 오류 기록에 — 모델이 왜 멈췄는지를 기록에서 볼 수 있어야 한다
    expect(noteErrorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "ai-rejected",
        detail: expect.stringContaining("Gemini 응답이 완료되지 않았습니다"),
      }),
    );

    model.run.mockReset();
    model.run.mockResolvedValue("   \n  ");
    const empty = await readMaterial(request(photoId), withId(photoId));
    expect(empty.status).toBe(502);
    expect(await messageOf(empty)).toBe(READ_EMPTY);
  });
});
