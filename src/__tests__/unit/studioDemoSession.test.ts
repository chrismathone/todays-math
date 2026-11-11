import { describe, expect, it, vi } from "vitest";
import {
  createStudioDemoSession,
  STUDIO_DEMO_MATCH_LIMIT,
  type StudioDemoKeys,
  type StudioDemoPayload,
} from "@/components/unified/studioDemo";
import type { StudioDemoEntry } from "@/contracts/studioDemo.contract";

/**
 * 문제 추출 시연(원장님 2026-11-11) — 시연 PDF 에 대한 AI 요청은 녹화본의 응답을 **실제 걸린 시간의 절반** 뒤에
 * 돌려주고, 녹화본에 없는 요청은 실제로 보내 그 응답을 녹화본에 덧붙인다. 화면은 진짜와 같은 길을 걷는다.
 */
const flat = (value: number) => Array<number>(256).fill(value);
const hex = (char: string) => char.repeat(64);
const entry = (over: Partial<StudioDemoEntry> = {}): StudioDemoEntry => ({
  action: "ocr",
  image: hex("a"),
  fingerprint: flat(100),
  aspect: 2,
  ms: 8000,
  body: { action: "ocr", result: { content: "녹화된 문제" } },
  ...over,
});
const payload = (over: Partial<StudioDemoPayload> = {}): StudioDemoPayload => ({
  action: "ocr",
  grade: "고1",
  imageDataUrl: "data:image/png;base64,QQ==",
  ...over,
});

function setup(
  entries: StudioDemoEntry[],
  keys: StudioDemoKeys | ((p: StudioDemoPayload) => StudioDemoKeys),
) {
  const waits: number[] = [];
  const onRecord = vi.fn();
  let clock = 0;
  const session = createStudioDemoSession({
    entries,
    speed: 0.5,
    keysOf: async (p) => (typeof keys === "function" ? keys(p) : keys),
    onRecord,
    sleep: async (ms, signal) => {
      waits.push(ms);
      if (signal.aborted) throw new DOMException("작업 취소", "AbortError");
    },
    now: () => clock,
  });
  const forward = vi.fn(async () => {
    clock += 6000;
    return Response.json({ action: "ocr", result: { content: "실제 분석" } });
  });
  return { session, waits, onRecord, forward };
}
const read = async (response: Response) => response.json();

describe("시연 녹화본 재생", () => {
  it("같은 그림의 요청은 녹화된 응답을 실제 시간의 절반 뒤에 돌려주고 서버로 보내지 않는다", async () => {
    const { session, waits, forward } = setup([entry()], {
      image: hex("a"),
      fingerprint: flat(30),
      aspect: 1,
    });
    const response = await session.intercept(
      payload(),
      forward,
      new AbortController().signal,
    );
    expect(await read(response)).toEqual({
      action: "ocr",
      result: { content: "녹화된 문제" },
    });
    expect(waits).toEqual([4000]);
    expect(forward).not.toHaveBeenCalled();
  });

  it("그림 글자가 달라도 지문이 가까우면 재생하고, 멀면 실제로 분석한다", async () => {
    const near = setup([entry()], {
      image: hex("b"),
      fingerprint: flat(100 + STUDIO_DEMO_MATCH_LIMIT - 1),
      aspect: 2,
    });
    await near.session.intercept(
      payload(),
      near.forward,
      new AbortController().signal,
    );
    expect(near.forward).not.toHaveBeenCalled();

    const far = setup([entry()], {
      image: hex("b"),
      fingerprint: flat(100 + STUDIO_DEMO_MATCH_LIMIT + 5),
      aspect: 2,
    });
    const response = await far.session.intercept(
      payload(),
      far.forward,
      new AbortController().signal,
    );
    expect(far.forward).toHaveBeenCalledTimes(1);
    expect(await read(response)).toMatchObject({
      result: { content: "실제 분석" },
    });
  });

  it("가로세로 비가 크게 다르면 지문이 같아도 다른 그림이다", async () => {
    const { session, forward } = setup([entry()], {
      image: hex("b"),
      fingerprint: flat(100),
      aspect: 0.5,
    });
    await session.intercept(payload(), forward, new AbortController().signal);
    expect(forward).toHaveBeenCalledTimes(1);
  });

  it("작업 종류가 다르거나 보낸 글이 다르면 맞추지 않는다", async () => {
    const solution = entry({
      action: "solution",
      image: undefined,
      fingerprint: undefined,
      aspect: undefined,
      content: hex("c"),
    });
    const other = setup([solution], { content: hex("d") });
    await other.session.intercept(
      payload({ action: "solution", imageDataUrl: undefined, content: "x" }),
      other.forward,
      new AbortController().signal,
    );
    expect(other.forward).toHaveBeenCalledTimes(1);

    const kind = setup([entry()], { image: hex("a"), fingerprint: flat(100) });
    await kind.session.intercept(
      payload({ action: "figures" }),
      kind.forward,
      new AbortController().signal,
    );
    expect(kind.forward).toHaveBeenCalledTimes(1);

    const same = setup([solution], { content: hex("c") });
    await same.session.intercept(
      payload({ action: "solution", imageDataUrl: undefined, content: "x" }),
      same.forward,
      new AbortController().signal,
    );
    expect(same.forward).not.toHaveBeenCalled();
  });

  it("비슷한 두 문제는 녹화본의 서로 다른 칸을 쓴다 — 한 칸을 두 문제에 나눠 주지 않는다", async () => {
    const first = entry({
      image: hex("1"),
      fingerprint: flat(100),
      body: { result: { content: "1번" } },
    });
    const second = entry({
      image: hex("2"),
      fingerprint: flat(103),
      body: { result: { content: "2번" } },
    });
    const { session, forward } = setup([first, second], (p) => ({
      image: hex(p.imageDataUrl === "one" ? "8" : "9"),
      fingerprint: flat(101),
      aspect: 2,
    }));
    const signal = new AbortController().signal;
    const a = await read(
      await session.intercept(
        payload({ imageDataUrl: "one" }),
        forward,
        signal,
      ),
    );
    const b = await read(
      await session.intercept(
        payload({ imageDataUrl: "two" }),
        forward,
        signal,
      ),
    );
    expect([a.result.content, b.result.content].sort()).toEqual(["1번", "2번"]);
    expect(forward).not.toHaveBeenCalled();
  });

  it("같은 그림을 다시 보내면(다시 디지털화) 이미 쓴 칸이라도 그대로 다시 쓴다", async () => {
    const { session, forward } = setup([entry()], {
      image: hex("a"),
      fingerprint: flat(100),
      aspect: 2,
    });
    const signal = new AbortController().signal;
    await session.intercept(payload(), forward, signal);
    await session.intercept(payload(), forward, signal);
    expect(forward).not.toHaveBeenCalled();
  });

  it("녹화본에 없는 요청은 실제로 보내고, 성공한 응답만 걸린 시간과 함께 녹화본에 덧붙인다", async () => {
    const { session, forward, onRecord } = setup([], {
      image: hex("e"),
      fingerprint: flat(50),
      aspect: 1.5,
    });
    const signal = new AbortController().signal;
    await session.intercept(payload(), forward, signal);
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(session.entries()).toEqual([
      {
        action: "ocr",
        image: hex("e"),
        fingerprint: flat(50),
        aspect: 1.5,
        ms: 6000,
        body: { action: "ocr", result: { content: "실제 분석" } },
      },
    ]);
    // 방금 녹화한 칸은 같은 요청이 다시 와도 재생된다.
    await session.intercept(payload(), forward, signal);
    expect(forward).toHaveBeenCalledTimes(1);

    const failed = vi.fn(async () =>
      Response.json({ error: "AI 처리에 실패했습니다." }, { status: 502 }),
    );
    await session.intercept(payload({ action: "figures" }), failed, signal);
    expect(session.entries()).toHaveLength(1);
  });

  it("지문을 만들지 못하면 녹화도 재생도 하지 않고 실제로 보낸다", async () => {
    const forward = vi.fn(async () => Response.json({ result: {} }));
    const onRecord = vi.fn();
    const session = createStudioDemoSession({
      entries: [entry()],
      speed: 0.5,
      keysOf: async () => {
        throw new Error("decode");
      },
      onRecord,
    });
    await session.intercept(payload(), forward, new AbortController().signal);
    expect(forward).toHaveBeenCalledTimes(1);
    expect(onRecord).not.toHaveBeenCalled();
  });

  it("기다리는 동안 취소하면 실제 요청처럼 AbortError 로 끝난다", async () => {
    const { session, forward } = setup([entry()], {
      image: hex("a"),
      fingerprint: flat(100),
      aspect: 2,
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      session.intercept(payload(), forward, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
