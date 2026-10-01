// @vitest-environment node
/** 실제 Jev 클라이언트·도형 조립기를 거친다. MSW가 HTTP만 가로채므로 외부 호출은 없다. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { askJev, type JevChoiceQuestion } from "@/lib/jev/client";
import {
  buildFigureEditQuestions,
  buildFigureEditState,
} from "@/lib/dev-ai/figure-edit-jev";
import {
  editDevAiFigure,
  type FigureEditInference,
} from "@/lib/dev-ai/figure-edit";
import { buildFigureEditPrompt } from "@/lib/dev-ai/figure-edit-prompt";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import type { FigureEditFigure } from "@/lib/dev-ai/figure-edit-contract";

vi.mock("server-only", () => ({}));

const endpoint = "https://api.typesafe.ai/v1/systemone";
const figure: FigureEditFigure = {
  viewBox: [0, 0, 300, 240],
  elements: [
    {
      n: 1,
      kind: "선분",
      points: [
        [40, 200],
        [260, 200],
      ],
    },
    { n: 2, kind: "글자", text: "A", points: [[36, 34]] },
  ],
  names: [
    { name: "A", x: 150, y: 40 },
    { name: "B", x: 40, y: 200 },
    { name: "C", x: 260, y: 200 },
  ],
};
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중2",
  content: "각 ABC에 각 표시를 해 주세요.",
  imageDataUrl: "data:image/png;base64,YWJj",
  figure,
};
type Body = {
  model: string;
  state: string;
  questions: Record<string, JevChoiceQuestion>;
};
const makeResponse = (body: Body, confidence: Record<string, number> = {}) => ({
  model: "jev-1.13.0",
  answers: Object.fromEntries(
    Object.entries(body.questions).map(([id, question]) => {
      const picked: Record<string, string> = {
        op: "addAngle",
        scope: "one",
        pointA: "B",
        pointB: "A",
        pointC: "C",
        dashed: "no",
      };
      const candidate = picked[id] ?? "none";
      const keys = Object.keys(question.criteria);
      const choice = keys.includes(candidate) ? candidate : keys[0];
      const others = keys.filter((key) => key !== choice);
      return [
        id,
        {
          type: "choice",
          choice,
          confidence: confidence[id] ?? 0.96,
          probabilities: {
            [choice]: others.length ? 0.97 : 1,
            ...Object.fromEntries(
              others.map((key) => [key, 0.03 / others.length]),
            ),
          },
        },
      ];
    }),
  ),
  usage: { input_tokens: 100, output_tokens: 50 },
});
let seen: { request: Request; body: Body }[] = [];
const reply = (response: (body: Body) => Response) =>
  server.use(
    http.post(endpoint, async ({ request }) => {
      const body = (await request.json()) as Body;
      seen.push({ request, body });
      return response(body);
    }),
  );

beforeEach(() => {
  seen = [];
  vi.stubEnv("TYPESAFE_API_KEY", "synthetic-typesafe-key");
  vi.stubEnv("STUDIO_AI_JEV", "on");
});
afterEach(() => vi.unstubAllEnvs());

it("직접 HTTP 계약으로 도형 명령을 조립하고 기존 모델 호출을 건너뛴다", async () => {
  reply((body) => HttpResponse.json(makeResponse(body)));
  const inference = vi.fn<FigureEditInference>();
  const result = await editDevAiFigure(request, undefined, inference);
  expect(result.edits).toEqual([
    { op: "addAngle", at: "B", from: "A", to: "C" },
  ]);
  expect(inference).not.toHaveBeenCalled();
  expect(seen).toHaveLength(1);
  expect(seen[0].request.url).toBe(endpoint);
  expect(seen[0].request.method).toBe("POST");
  expect(seen[0].request.headers.get("authorization")).toBe(
    "Bearer synthetic-typesafe-key",
  );
  expect(seen[0].request.headers.get("content-type")).toBe("application/json");
  expect(seen[0].body).toEqual({
    model: "jev-latest",
    state: buildFigureEditState(figure, request.content!),
    questions: buildFigureEditQuestions(figure, request.content!),
  });
  expect(JSON.stringify(seen[0].body)).not.toContain("data:image");
  expect(JSON.stringify(seen[0].body)).not.toContain("synthetic-typesafe-key");
});

it.each(["op", "scope"])(
  "직접 답의 %s confidence가 낮으면 기존 모델로 떨어진다",
  async (id) => {
    reply((body) => HttpResponse.json(makeResponse(body, { [id]: 0.62 })));
    const inference = vi.fn<FigureEditInference>(async () =>
      JSON.stringify({ commands: [{ op: "delete", target: 2 }] }),
    );
    const result = await editDevAiFigure(request, undefined, inference);
    expect(result.edits).toEqual([{ op: "delete", target: 2 }]);
    expect(seen).toHaveLength(1);
    expect(inference).toHaveBeenCalledTimes(1);
    expect(inference.mock.calls[0][0]).toMatchObject({
      prompt: buildFigureEditPrompt(request),
      imageDataUrl: request.imageDataUrl,
    });
  },
);

it.each([401, 429])(
  "직접 API의 HTTP %i 실패는 기존 모델로 한 번만 떨어진다",
  async (status) => {
    reply(() => new HttpResponse(null, { status }));
    const inference = vi.fn<FigureEditInference>(async () =>
      JSON.stringify({ commands: [{ op: "delete", target: 2 }] }),
    );
    expect(
      (await editDevAiFigure(request, undefined, inference)).edits,
    ).toEqual([{ op: "delete", target: 2 }]);
    expect(seen).toHaveLength(1);
    expect(inference).toHaveBeenCalledTimes(1);
  },
);

it("불완전한 Choice 분포를 가진 직접 응답은 버린다", async () => {
  reply((body) => {
    const response = makeResponse(body);
    response.answers.op.probabilities = { addAngle: 0.97 };
    return HttpResponse.json(response);
  });
  expect(
    await askJev({
      state: buildFigureEditState(figure, request.content!),
      questions: buildFigureEditQuestions(figure, request.content!)!,
    }),
  ).toBeNull();
  expect(seen).toHaveLength(1);
});

it("Gateway 인증만 남으면 HTTP를 부르지 않고 기존 경로를 쓴다", async () => {
  vi.stubEnv("TYPESAFE_API_KEY", undefined);
  vi.stubEnv("AI_GATEWAY_API_KEY", "synthetic-gateway-key");
  vi.stubEnv("VERCEL_OIDC_TOKEN", "synthetic-oidc-token");
  reply((body) => HttpResponse.json(makeResponse(body)));
  const inference = vi.fn<FigureEditInference>(async () =>
    JSON.stringify({ commands: [{ op: "delete", target: 2 }] }),
  );
  expect((await editDevAiFigure(request, undefined, inference)).edits).toEqual([
    { op: "delete", target: 2 },
  ]);
  expect(seen).toHaveLength(0);
  expect(inference).toHaveBeenCalledTimes(1);
});
