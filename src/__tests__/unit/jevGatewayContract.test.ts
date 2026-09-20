// @vitest-environment node
/**
 * 게이트웨이 계약 연기 점검 — **실제 `ai` SDK 와 `@ai-sdk/gateway` 를 통과시킨다.** 유료 호출은 없다:
 * 게이트웨이의 baseURL 을 이 프로세스가 띄운 로컬 http 서버로 돌린다.
 *
 * 모킹만으로는 구조적으로 안 보이는 자리를 덮는다 — 실제로 여기서 하나 걸렸다:
 * SDK 는 `probabilities` 가 그 물음의 **모든 선택지를 덮는 완전한 분포**일 것을 검증한다(부분 분포면 던진다).
 * 우리 한 겹은 그 오류를 삼켜 null 을 돌려주므로(= 지금 경로로 떨어진다) 제품은 안전하지만,
 * SDK 가 요구하는 응답 모양이 바뀌면 이 시험이 알려 준다.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createGateway } from "@ai-sdk/gateway";
import { http, passthrough } from "msw";
import { server as mswServer } from "@/mocks/server";
import { askJev } from "@/lib/jev/client";
import {
  assembleFigureEditCommand,
  buildFigureEditQuestions,
  buildFigureEditState,
} from "@/lib/dev-ai/figure-edit-jev";
import type { FigureEditFigure } from "@/lib/dev-ai/figure-edit-contract";

vi.mock("server-only", () => ({}));

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
/** 게이트웨이가 확신을 어디에 싣는가 — 둘 중 어느 모양이 오든 우리 한 겹이 읽어야 한다. */
let shape: "probabilities" | "providerMetadata" = "probabilities";
let server: Server;
let port = 0;
let seen: { url?: string; headers?: Record<string, unknown>; body?: unknown } =
  {};

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        questions: Record<string, { criteria: Record<string, unknown> }>;
      };
      seen = { url: request.url, headers: request.headers, body };
      // 각 물음에 첫 선택지를 고른 것처럼 답한다.
      const answers = Object.fromEntries(
        Object.entries(body.questions).map(([id, question]) => {
          const first = Object.keys(question.criteria)[0];
          const choice =
            id === "op"
              ? "addAngle"
              : id === "pointA"
                ? "B"
                : id === "pointB"
                  ? "A"
                  : id === "pointC"
                    ? "C"
                    : id === "dashed"
                      ? "no"
                      : "none";
          const picked = Object.prototype.hasOwnProperty.call(
            question.criteria,
            choice,
          )
            ? choice
            : first;
          // 실제 게이트웨이는 **모든 선택지**에 대한 완전한 분포를 준다(합 1) — SDK 가 그것을 검증한다.
          const others = Object.keys(question.criteria).filter(
            (key) => key !== picked,
          );
          const rest = others.length ? 0.03 / others.length : 0;
          return [
            id,
            {
              type: "choice",
              choice: picked,
              probabilities: {
                [picked]: others.length ? 0.97 : 1,
                ...Object.fromEntries(others.map((key) => [key, rest])),
              },
            },
          ];
        }),
      );
      const body_ =
        shape === "probabilities"
          ? { answers, warnings: [] }
          : {
              // 리드의 실측 스크립트가 읽은 자리 — 답에는 고른 값만 있고 확신은 여기에 온다.
              answers: Object.fromEntries(
                Object.entries(answers).map(([id, answer]) => [
                  id,
                  {
                    type: "choice",
                    choice: (answer as { choice: string }).choice,
                  },
                ]),
              ),
              providerMetadata: {
                typesafe: {
                  confidence: Object.fromEntries(
                    Object.keys(answers).map((id) => [id, 0.97]),
                  ),
                },
              },
              warnings: [],
            };
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(body_));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
  (
    globalThis as unknown as { AI_SDK_DEFAULT_PROVIDER?: unknown }
  ).AI_SDK_DEFAULT_PROVIDER = createGateway({
    baseURL: `http://127.0.0.1:${port}`,
    apiKey: "local-fake",
  });
});
// vitest.setup.ts 가 시험마다 MSW 핸들러를 되돌린다 — 그래서 매번 다시 건다(안 걸면 로컬 요청이 막힌다).
beforeEach(() => {
  mswServer.use(http.all(`http://127.0.0.1:${port}/*`, () => passthrough()));
});
afterAll(async () => {
  delete (globalThis as unknown as { AI_SDK_DEFAULT_PROVIDER?: unknown })
    .AI_SDK_DEFAULT_PROVIDER;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

it.each(["probabilities", "providerMetadata"] as const)(
  "실제 ai SDK 를 통과해 명령이 조립된다 — 확신이 %s 에 실려도",
  async (responseShape) => {
    shape = responseShape;
    const content = "각 ABC에 각 표시를 해 주세요.";
    const questions = buildFigureEditQuestions(figure, content);
    expect(questions).not.toBeNull();
    const answers = await askJev({
      state: buildFigureEditState(figure, content),
      questions: questions!,
      env: { NODE_ENV: "test", AI_GATEWAY_API_KEY: "local-fake" },
    });
    expect(answers).not.toBeNull();
    expect(seen.url).toBe("/evaluation-model");
    expect(seen.headers?.["ai-model-id"]).toBe("typesafe-ai/jev");
    expect(
      (seen.body as { providerOptions?: unknown }).providerOptions,
    ).toEqual({
      gateway: { zeroDataRetention: true },
    });
    expect(assembleFigureEditCommand(answers!, figure)).toEqual({
      op: "addAngle",
      at: "B",
      from: "A",
      to: "C",
    });
  },
);
