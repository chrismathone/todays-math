// @vitest-environment node
/**
 * 작업실 AI 실패 → 오류 기록 한 줄 — «수집된 로그로 업그레이드 패치 가능하게»(원장님 2026-09-22).
 *
 * 2026-09-22 운영: 도형 재작도가 422(`labels.val30.point conflicts with its key`), «요청대로 고치기»가 400 으로
 * 떨어졌는데 사유가 우리 쪽 어디에도 안 남았다. 여기서 지키는 것:
 *  ⑴ 도형 재작도 — 시도마다 모델이 낸 사양(앞부분) · 엔진 거절 원문 · 적용한 교정 · 원본 대조 지적이 **시도 기록**으로,
 *     크롭 이미지는 별도 표로.
 *  ⑵ 400 계약 실패 — **어느 칸이 왜** 틀렸는지(zod 경로·문구)와 본문의 모양(값 없이 열쇠·크기)만. 본문 자체는 안 싣는다.
 *  ⑶ 모델 응답을 못 읽었을 때(고치기·OCR) — 응답 앞부분.
 *  ⑷ 🔴 화면 문구는 **한 글자도 안 바뀐다**(D-08 · D-135 ⑻) — 로그에만 더 싣는다.
 *
 * 진짜 파이썬 도형 엔진을 탄다(studioAiRoute.test.ts 와 같은 결). 기록은 대역 표(`prismaTestDouble` → errorLog)에서 읽는다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/studio-ai/api", async (original) => ({
  ...(await original<typeof import("@/lib/studio-ai/api")>()),
  runModelApi: vi.fn(),
}));
vi.mock("@/lib/dev-ai/cli", () => ({
  runSubscriptionCli: vi.fn(),
  getDevAiProviderStatuses: vi.fn(),
}));
import { POST } from "@/app/api/studio/ai/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { settleErrorLogWrites } from "@/lib/errorLog/withErrorLog";
import { getSessionUser } from "@/lib/session";
import { runModelApi } from "@/lib/studio-ai/api";

const origin = "https://math.example";
const post = (body: unknown) =>
  POST(
    new Request(`${origin}/api/studio/ai`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { origin, "content-type": "application/json" },
    }),
  );
const figure = {
  provider: "auto",
  action: "figure-redraw",
  grade: "중1",
  content: "원본 도형 재작도",
  imageDataUrl: "data:image/png;base64,YWJj", // "abc" — 3바이트
};
const missingRef = {
  spec: {
    version: 2,
    points: { A: [0, 0] },
    segments: { AB: ["A", "missing"] },
  },
};
const engineWords =
  "도형을 그리지 못했습니다: segment 'AB' has unknown point ref 'missing'";
type Row = {
  source: string;
  kind: string;
  route: string | null;
  method: string | null;
  status: number | null;
  action: string | null;
  message: string | null;
  detail: string | null;
  userId: string | null;
  context: Record<string, unknown>;
  image: { mimeType: string; byteSize: number } | null;
};
async function logged(): Promise<Row[]> {
  await settleErrorLogWrites();
  return (await db.errorLog.findMany({
    include: { image: true },
  })) as unknown as Row[];
}
type Attempt = {
  attempt: number;
  modelOutput?: string;
  note?: string;
  refusal?: string;
  repairPrompt?: string;
  engineErrors: string[];
  repairs: { note: string; warning?: string; error: string }[];
  review?: { passed: boolean; issues: string[] };
  outcome: string;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_URL", origin);
  for (const name of ["GEMINI", "DEEPSEEK", "ANTHROPIC", "OPENAI"])
    vi.stubEnv(`${name}_API_KEY`, "unit-test-key");
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "teacher",
    name: "teacher",
    email: "teacher@example.test",
    isAdmin: false,
  });
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
    user: { id: "teacher", role: "director" },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("⑴ 도형 재작도 — 시도 기록 · 크롭 이미지", () => {
  it("엔진이 세 번 거절 — 시도마다 모델 출력·엔진 원문·되물은 사유, 크롭 이미지, 요청 요약 · 화면 문구 그대로", async () => {
    vi.mocked(runModelApi).mockResolvedValue(JSON.stringify(missingRef));
    const response = await post(figure);
    // ⑷ 화면 문구는 그대로(studioAiRoute.test.ts 가 잠근 모양과 같다)
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
      detail: engineWords,
    });

    const rows = await logged();
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row).toMatchObject({
      source: "server",
      kind: "ai-rejected",
      route: "/api/studio/ai",
      method: "POST",
      status: 422,
      action: "figure-redraw",
      message: "도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
      userId: null, // "teacher" 는 uuid 가 아니다 → 요약의 actor 로
    });
    expect(row.context.actor).toBe("teacher");
    expect(row.detail).toContain(engineWords);
    expect(row.context.aiRequest).toMatchObject({
      action: "figure-redraw",
      provider: "auto",
      grade: "중1",
      imageBytes: 3,
    });

    const trail = row.context.figureTrail as Attempt[];
    expect(trail.map((a) => a.attempt)).toEqual([0, 1, 2]);
    for (const attempt of trail) {
      expect(attempt.modelOutput).toContain('"missing"');
      expect(attempt.engineErrors.join("\n")).toContain(
        "unknown point ref 'missing'",
      );
      expect(attempt.outcome).toBe("engine-rejected");
    }
    // 두 번째부터는 무엇을 되물었는지(앞 시도의 엔진 사유)가 남는다
    expect(trail[0].repairPrompt).toBeUndefined();
    expect(trail[1].repairPrompt).toContain("unknown point ref 'missing'");

    expect(row.image).toMatchObject({ mimeType: "image/png", byteSize: 3 });
  });

  it("모델이 그리지 않겠다고 한 때 — 모델의 사유와 크롭 이미지", async () => {
    const note = "사진이라 기하 요소로 옮길 수 없습니다.";
    vi.mocked(runModelApi).mockResolvedValueOnce(
      JSON.stringify({ spec: null, note }),
    );
    const response = await post(figure);
    expect(await response.json()).toEqual({
      error: `${note} 원본은 유지됩니다.`,
    });
    const [row] = await logged();
    const trail = row.context.figureTrail as Attempt[];
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({ attempt: 0, note, outcome: "declined" });
    expect(row.image).toMatchObject({ byteSize: 3 });
  });

  it("교정·원본 대조가 시도 기록에 — 이름표 키 교정(운영 2026-09-22 의 그 거절) → 원본 대조 불합격 → 엔진 거절 두 번", async () => {
    // 이름표 키가 점과 다르다(labels.lA.point conflicts with its key) — 서버가 키를 점 이름으로 고쳐 다시 그린다
    const conflict = {
      spec: {
        version: 2,
        points: { A: [120, 30], B: [30, 200], C: [220, 200] },
        segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
        labels: {
          lA: { point: "A", text: "A" },
          lB: { point: "B", text: "B" },
          lC: { point: "C", text: "C" },
        },
      },
    };
    let generated = 0;
    vi.mocked(runModelApi).mockImplementation(async ({ prompt }) => {
      if (prompt.includes("<rendered-spec-data>"))
        return JSON.stringify({ passed: false, issues: ["점 D 가 없다"] });
      generated++;
      return JSON.stringify(generated === 1 ? conflict : missingRef);
    });
    const response = await post(figure);
    expect(response.status).toBe(422);
    const [row] = await logged();
    const trail = row.context.figureTrail as Attempt[];
    expect(trail).toHaveLength(3);
    expect(trail[0].engineErrors.join()).toMatch(
      /labels\.lA\.point conflicts with its key/,
    );
    expect(trail[0].repairs.length).toBeGreaterThan(0);
    expect(trail[0].repairs[0].error).toMatch(/conflicts with its key/);
    expect(trail[0].repairs[0].note.length).toBeGreaterThan(0);
    expect(trail[0]).toMatchObject({
      review: { passed: false, issues: ["점 D 가 없다"] },
      outcome: "review-failed",
    });
    expect(trail[1].repairPrompt).toContain("원본 대조: 점 D 가 없다");
    expect(trail[2].outcome).toBe("engine-rejected");
  });
});

describe("⑵ 400 계약 실패 — 어느 칸이 왜", () => {
  it("zod 의 경로·문구가 원문에, 본문의 모양(열쇠·형·크기)만 요약에 — 본문 값은 안 싣는다 · 화면 문구 그대로", async () => {
    const instruction = "각 ACB에 각 표시해 주세요";
    const response = await post({
      provider: "auto",
      action: "figure-edit",
      grade: "중2",
      imageDataUrl: "data:image/png;base64,YWJj",
      content: instruction,
      figure: { viewBox: [0, 0, 300, 240], elements: "잘못된 모양" },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "문항 입력과 이미지 크기를 확인해 주세요.",
    });
    const [row] = await logged();
    expect(row).toMatchObject({
      kind: "api-rejected",
      status: 400,
      action: "figure-edit",
      message: "문항 입력과 이미지 크기를 확인해 주세요.",
    });
    expect(row.detail).toMatch(/figure\.elements/);
    expect(row.context.requestShape).toMatchObject({
      action: "figure-edit",
      keys: expect.arrayContaining(["content", "figure", "imageDataUrl"]),
      sizes: expect.objectContaining({ content: instruction.length }),
    });
    // 요청 본문 값은 기록에 없다
    expect(JSON.stringify(row)).not.toContain(instruction);
  });

  it("JSON 이 아닌 본문 — 그 사실이 원문에", async () => {
    const response = await POST(
      new Request(`${origin}/api/studio/ai`, {
        method: "POST",
        body: "{not json",
        headers: { origin, "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(400);
    const [row] = await logged();
    expect(row.detail).toMatch(/JSON/);
  });
});

describe("⑶ 모델 응답을 못 읽었을 때 — 응답 앞부분", () => {
  it("OCR — 모델이 두 번 다 JSON 대신 글을 냈다 · 한 번 다시 보내고 «다시 시도» 문구", async () => {
    const said = "죄송합니다. 이 이미지는 읽을 수 없습니다.";
    vi.mocked(runModelApi).mockResolvedValue(said);
    const response = await post({
      provider: "auto",
      action: "ocr",
      grade: "중1",
      imageDataUrl: "data:image/png;base64,YWJj",
    });
    expect(response.status).toBe(502);
    expect(vi.mocked(runModelApi)).toHaveBeenCalledTimes(2);
    expect(await response.json()).toEqual({
      error:
        "AI 응답을 읽지 못했습니다. 원본은 유지됩니다. 다시 시도해 주세요.",
    });
    const [row] = await logged();
    expect(row).toMatchObject({
      kind: "ai-rejected",
      action: "ocr",
      status: 502,
    });
    expect(row.context.modelResponse).toMatchObject({ head: said });
    expect(row.detail).toMatch(/DevAiParseError/);
  });

  it("«요청대로 고치기» — 수정 명령을 못 읽었다 · 화면 문구 그대로", async () => {
    vi.mocked(runModelApi).mockResolvedValue("명령을 만들 수 없습니다");
    const response = await post({
      provider: "auto",
      action: "figure-edit",
      grade: "중2",
      imageDataUrl: "data:image/png;base64,YWJj",
      content: "2번 선분을 점선으로 바꿔 주세요.",
      figure: {
        viewBox: [0, 0, 300, 240],
        elements: [
          {
            n: 1,
            kind: "선분",
            points: [
              [37, 26],
              [37, 206],
            ],
          },
        ],
      },
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error:
        "AI 수정 명령을 읽지 못했습니다. 지금 그림은 그대로입니다. 다시 시도해 주세요.",
    });
    const [row] = await logged();
    expect(row).toMatchObject({ kind: "ai-rejected", action: "figure-edit" });
    const trail = row.context.figureEditTrail as {
      attempt: number;
      modelOutput: string;
    }[];
    expect(trail[0]).toMatchObject({
      attempt: 0,
      modelOutput: "명령을 만들 수 없습니다",
    });
    // 고치기 실패에도 크롭 이미지를 남긴다(원장님 2026-09-22) — 재작도와 같은 표·같은 2MB 상한
    expect(row.image).toMatchObject({ mimeType: "image/png", byteSize: 3 });
    expect(row.context.imageSkipped).toBeUndefined();
  });

  it("«요청대로 고치기» — 크롭 이미지가 2MB 를 넘으면 싣지 않고 넘었다고만 적는다(재작도와 같은 상한)", async () => {
    vi.mocked(runModelApi).mockResolvedValue("명령을 만들 수 없습니다");
    // 2MB + 1바이트 — 3바이트마다 base64 4글자
    const big = Buffer.alloc(2 * 1024 * 1024 + 1, 1).toString("base64");
    const response = await post({
      provider: "auto",
      action: "figure-edit",
      grade: "중2",
      imageDataUrl: `data:image/png;base64,${big}`,
      content: "2번 선분을 점선으로 바꿔 주세요.",
      figure: {
        viewBox: [0, 0, 300, 240],
        elements: [
          {
            n: 1,
            kind: "선분",
            points: [
              [37, 26],
              [37, 206],
            ],
          },
        ],
      },
    });
    expect(response.status).toBe(422);
    const [row] = await logged();
    expect(row).toMatchObject({ kind: "ai-rejected", action: "figure-edit" });
    expect(row.image).toBeNull();
    expect(row.context.imageSkipped).toMatchObject({ reason: "too-large" });
  });
});

describe("성공은 기록하지 않는다", () => {
  it("해설 성공 — 기록 0", async () => {
    vi.mocked(runModelApi).mockResolvedValue(
      JSON.stringify({ answer: "2", solution: "1+1=2", warnings: [] }),
    );
    const response = await post({
      provider: "auto",
      action: "solution",
      grade: "중1",
      content: "1+1을 계산하시오.",
    });
    expect(response.status).toBe(200);
    expect(await logged()).toEqual([]);
  });
});
