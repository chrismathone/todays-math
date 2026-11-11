/**
 * 문항 생성 · 변형 AI(`src/lib/ai/client.ts` → `runModelApi` → Anthropic Messages API)를 시험에서 흉내 낸다.
 *
 * ⚠️ 실제 AI API 를 부르지 않는다(CLAUDE.md 절대 규칙 7) — `fetch` 를 갈아 끼운다. 진짜 `runModelApi` 를
 * 그대로 태우므로 **보낸 요청의 모양**(모델 · effort · temperature 없음)과 응답 검사(stop_reason · 생각 블록)를
 * 같이 잰다. `runModelApi` 의 모듈은 `server-only` 를 import 하므로 쓰는 시험 파일은
 * `vi.mock("server-only", () => ({}))` 를 둔다.
 */
import { vi, type Mock } from "vitest";

/** `client.ts` 가 지시(system)와 요청을 한 메시지로 이을 때 쓰는 구분자. */
const SEPARATOR = "\n\n---\n\n";

/** Anthropic Messages 응답 꼴 — 생각 블록(빈 글) 뒤에 답 글 하나. */
export function claudeText(text: string, stopReason = "end_turn") {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    content: [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "text", text },
    ],
    stop_reason: stopReason,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

export interface SentClaudeRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  output_config?: { effort?: string };
  messages: { role: string; content: { type: string; text?: string }[] }[];
}

/**
 * `fetch` 를 갈아 끼운다 — 요청 본문(JSON)을 `create` 에 넘기고, 그 결과를 응답 본문으로 돌려준다.
 * 시험은 `create.mockResolvedValueOnce(claudeText(...))` 로 답을 정하고 `create.mock.calls` 로 요청을 본다.
 */
export function stubClaudeFetch(create: Mock) {
  const fetcher = vi.fn(
    async (_url: string | URL | Request, init?: RequestInit) => {
      const out: unknown = await create(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(out), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

/** `call` 번째로 보낸 요청 본문. */
export function sentRequest(create: Mock, call = 0): SentClaudeRequest {
  return create.mock.calls[call]![0] as SentClaudeRequest;
}

/** `call` 번째로 보낸 글 전체(지시 + 구분자 + 요청). */
export function sentText(create: Mock, call = 0): string {
  return sentRequest(create, call)
    .messages[0]!.content.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

/** `call` 번째로 보낸 **요청**(사용자 프롬프트) — 지시(system) 뒤의 몫. */
export function sentPrompt(create: Mock, call = 0): string {
  const text = sentText(create, call);
  const at = text.indexOf(SEPARATOR);
  if (at < 0) throw new Error("지시와 요청을 가르는 구분자가 없다");
  return text.slice(at + SEPARATOR.length);
}
