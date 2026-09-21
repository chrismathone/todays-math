/**
 * 🔴 RED → 🟢 — 편집기에서 직접 누른 AI 요청은 대기열 **맨 앞**에 선다 (원장님 운영 콘솔 2026-09-21 — 429).
 *
 * `POST /api/studio/ai 429 (Too Many Requests)` — 도형 편집기의 «요청대로 고치기»였다. 서버는 계정당 동시 2건만 받고
 * (`studio-ai/handler.ts`), 도형 일괄 생성은 작업실 대기열(동시 2)로 그 두 자리를 다 쓴다. 그런데 편집기의 «다시 그리기»·
 * «요청대로 고치기»는 대기열을 **안 거치고 바로** 나가서, 일괄 생성이 도는 동안에는 세 번째 요청이 되어 거절됐다.
 * 도형 생성을 ③ 에서 한꺼번에 시작하게 되면(D-135 ⑾) 두 자리가 더 오래 차 있으므로 이 거절은 더 잦아진다.
 *
 * 대기열에 세우되 **맨 앞**에 — 원장님이 기다리는 요청이 남은 스무 개 뒤에 서면 안 된다. 동시 요청은 여전히 둘을 안 넘는다.
 */
import { describe, expect, it } from "vitest";

import { StudioAiQueue } from "@/components/unified/studioAiQueue";

function gate() {
  let open!: () => void;
  const wait = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { wait, open };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("StudioAiQueue — 먼저 세우기", () => {
  it("🔴 맨 앞에 세운 일은 먼저 기다리던 일들보다 먼저 돈다 — 동시에 둘을 넘지 않는다", async () => {
    const queue = new StudioAiQueue(2);
    const signal = new AbortController().signal;
    const started: string[] = [];
    let running = 0;
    let peak = 0;
    const gates = new Map<string, ReturnType<typeof gate>>();
    const job = (name: string) => async () => {
      started.push(name);
      running += 1;
      peak = Math.max(peak, running);
      const g = gate();
      gates.set(name, g);
      await g.wait;
      running -= 1;
    };
    // 일괄 생성 넷 — 둘이 돌고 둘이 기다린다
    const batch = ["도형1", "도형2", "도형3", "도형4"].map((name) =>
      queue.enqueue(signal, job(name)),
    );
    await tick();
    expect(started).toEqual(["도형1", "도형2"]);
    // 원장님이 편집기에서 누른 요청
    const interactive = queue.enqueue(signal, job("요청대로 고치기"), true);
    await tick();
    // 자리가 날 때까지는 안 나간다(세 번째 동시 요청 = 429)
    expect(started).toEqual(["도형1", "도형2"]);
    gates.get("도형1")!.open();
    await tick();
    // 자리가 나면 기다리던 도형3 보다 먼저
    expect(started).toEqual(["도형1", "도형2", "요청대로 고치기"]);
    for (const name of ["도형2", "요청대로 고치기"]) gates.get(name)!.open();
    await tick();
    for (const name of ["도형3", "도형4"]) gates.get(name)!.open();
    await Promise.all([...batch, interactive]);
    expect(started).toEqual([
      "도형1",
      "도형2",
      "요청대로 고치기",
      "도형3",
      "도형4",
    ]);
    expect(peak).toBe(2);
  });

  it("전제 — 그냥 세우면 차례대로다", async () => {
    const queue = new StudioAiQueue(1);
    const signal = new AbortController().signal;
    const started: string[] = [];
    await Promise.all(
      ["가", "나", "다"].map((name) =>
        queue.enqueue(signal, async () => {
          started.push(name);
        }),
      ),
    );
    expect(started).toEqual(["가", "나", "다"]);
  });
});
