// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/studio-demo/store", () => ({
  readStudioDemo: vi.fn(),
  writeStudioDemo: vi.fn(),
  readStudioDemoPdf: vi.fn(),
}));
import { GET, POST } from "@/app/api/studio/demo/route";
import { getSessionUser } from "@/lib/session";
import { auth } from "@/lib/auth";
import {
  readStudioDemo,
  readStudioDemoPdf,
  writeStudioDemo,
} from "@/lib/studio-demo/store";
import { STUDIO_DEMO_SOURCE } from "@/lib/studio-demo/source";

/**
 * 문제 추출 시연의 녹화본 — 원장님 2026-11-11 «chrismathone@gmail.com 이 로그인해서 문제 추출 탭에 들어가면
 * 자동으로 이어지게» · «시연 PDF 일 때만». 서버가 **계정과 PDF 지문 둘 다** 맞을 때만 녹화본을 내주고 받는다.
 */
const origin = "https://math.example";
const sha = STUDIO_DEMO_SOURCE.sha256;
const entry = {
  action: "ocr",
  image: "a".repeat(64),
  ms: 5000,
  body: { result: { content: "문제" } },
};
const get = (hash: string = sha) =>
  GET(new Request(`${origin}/api/studio/demo?sha256=${hash}`));
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request(`${origin}/api/studio/demo`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { origin, "content-type": "application/json", ...headers },
    }),
  );
const signIn = (email: string) => {
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "user-1",
    name: "원장",
    email,
    isAdmin: false,
  });
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
    user: { id: "user-1", role: "director" },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", origin);
  signIn("chrismathone@gmail.com");
  vi.mocked(readStudioDemo).mockResolvedValue([entry] as never);
  vi.mocked(writeStudioDemo).mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("시연 녹화본 읽기", () => {
  it("시연 계정이 시연 PDF 지문으로 물으면 녹화본을 준다", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ entries: [entry] });
    expect(readStudioDemo).toHaveBeenCalledWith(sha);
  });

  it("이메일은 대소문자 · 앞뒤 공백을 가리지 않는다", async () => {
    signIn("  ChrisMathOne@Gmail.com ");
    expect((await get()).status).toBe(200);
  });

  it("다른 계정 · 다른 PDF 는 없는 것처럼 404 이고 녹화본을 읽지도 않는다", async () => {
    signIn("teacher@example.test");
    expect((await get()).status).toBe(404);
    signIn("chrismathone@gmail.com");
    expect((await get("b".repeat(64))).status).toBe(404);
    expect((await get("not-a-hash")).status).toBe(404);
    expect(readStudioDemo).not.toHaveBeenCalled();
  });

  it("로그인하지 않으면 401", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });
});

describe("시연 시험지 파일 — 어디서든 아이디로(원장님 2026-11-11)", () => {
  const file = (kind: string) =>
    GET(new Request(`${origin}/api/studio/demo?file=${kind}`));
  const pdf = Buffer.from("%PDF-1.7 시연");
  beforeEach(() => {
    vi.mocked(readStudioDemoPdf).mockResolvedValue({
      name: "[경명여고] 시험지.pdf",
      bytes: new Uint8Array(pdf),
    });
  });

  it("시연 계정에게 이름을 알려 주고, 파일을 PDF 로 내려준다", async () => {
    const info = await file("info");
    expect(info.status).toBe(200);
    expect(await info.json()).toEqual({
      name: "[경명여고] 시험지.pdf",
      bytes: pdf.length,
    });
    const body = await file("pdf");
    expect(body.status).toBe(200);
    expect(body.headers.get("content-type")).toBe("application/pdf");
    expect(body.headers.get("cache-control")).toContain("no-store");
    expect(Buffer.from(await body.arrayBuffer()).equals(pdf)).toBe(true);
    expect(readStudioDemoPdf).toHaveBeenCalledWith(sha);
  });

  it("다른 계정은 없는 것처럼 404 이고 파일을 읽지도 않는다 · 올려 둔 파일이 없어도 404", async () => {
    signIn("teacher@example.test");
    expect((await file("info")).status).toBe(404);
    expect((await file("pdf")).status).toBe(404);
    expect(readStudioDemoPdf).not.toHaveBeenCalled();
    signIn("chrismathone@gmail.com");
    vi.mocked(readStudioDemoPdf).mockResolvedValue(null);
    expect((await file("info")).status).toBe(404);
    expect((await file("pdf")).status).toBe(404);
  });
});

describe("시연 녹화본 저장", () => {
  it("시연 계정의 녹화본을 지문 칸에 통째로 저장한다", async () => {
    const response = await post({ sha256: sha, entries: [entry] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: 1 });
    expect(writeStudioDemo).toHaveBeenCalledWith(sha, [entry], "user-1");
  });

  it("다른 계정 · 다른 지문 · 다른 사이트 · 모양이 틀린 녹화본은 저장하지 않는다", async () => {
    signIn("teacher@example.test");
    expect((await post({ sha256: sha, entries: [entry] })).status).toBe(404);
    signIn("chrismathone@gmail.com");
    expect(
      (await post({ sha256: "b".repeat(64), entries: [entry] })).status,
    ).toBe(404);
    expect(
      (
        await post(
          { sha256: sha, entries: [entry] },
          { origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (await post({ sha256: sha, entries: [{ ...entry, action: "hack" }] }))
        .status,
    ).toBe(400);
    expect(writeStudioDemo).not.toHaveBeenCalled();
  });
});
