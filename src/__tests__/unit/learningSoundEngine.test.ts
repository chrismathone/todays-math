// @vitest-environment node
/**
 * 학생 수학 효과음 엔진 (3자 합의 사운드 v3 2 · 5 · 8 · 9항, 2026-10-04).
 *
 * 엔진은 브라우저를 `LearningSoundHost` 한 겹으로만 만진다 — 여기서는 그 겹을 통째로 가짜
 * (`helpers/learningSoundWorld.ts`)로 바꿔 «언제 context 를 만들고 · 무엇을 요청하고 · 무엇이 실제로
 * 울렸는가»를 센다. DOM 없이(node) 돈다.
 */
import { describe, expect, it } from "vitest";
import {
  LEARNING_SOUND_KEY,
  createLearningSoundEngine,
} from "@/lib/math-srs/learningSoundEngine";
import {
  LEARNING_SOUND_FILES,
  LEARNING_SOUND_GAIN,
} from "@/lib/math-srs/learningSoundManifest";
import {
  SOUND_URLS as URLS,
  releaseDecodes,
  serveSounds,
  settle,
  soundHost,
  soundWorld,
  type SoundReply as Reply,
  type SoundWorld,
} from "../helpers/learningSoundWorld";

function setup(initial: Partial<SoundWorld> = {}) {
  const world = soundWorld(initial);
  const engine = createLearningSoundEngine({
    files: LEARNING_SOUND_FILES,
    gain: LEARNING_SOUND_GAIN,
    host: soundHost(world),
  });
  const serve = () => serveSounds(world);
  /** 켜고 세 파일이 다 준비된 상태 */
  const ready = async () => {
    engine.setEnabled(true);
    await serve();
    expect(engine.getSnapshot().status).toBe("ready");
  };
  const status = () => engine.getSnapshot().status;
  const context = () => world.contexts.at(-1)!;
  return { world, engine, serve, ready, status, context };
}

describe("기본은 끔 — 요청 0 · AudioContext 0", () => {
  it("저장된 값이 없으면 꺼져 있고, 어떤 메서드를 불러도 만들거나 요청하지 않는다", () => {
    const { world, engine } = setup();
    expect(engine.getSnapshot()).toEqual({ enabled: false, status: "off" });
    engine.gesture();
    engine.preview();
    engine.play("correct", "a");
    engine.play("complete", "b");
    engine.resetStudent("student-1");
    engine.pageHidden();
    expect(world.contexts).toHaveLength(0);
    expect(world.requests).toHaveLength(0);
    expect(world.played).toEqual([]);
    expect(world.stored).toBeNull();
  });

  it("켜진 채 저장돼 있어도 읽기만 한다 — 만들고 요청하는 것은 사용자 조작에서다", () => {
    const { world, engine } = setup({ stored: "on" });
    const seen: string[] = [];
    engine.subscribe(() => seen.push(engine.getSnapshot().status));
    expect(engine.getSnapshot()).toEqual({ enabled: true, status: "idle" });
    engine.resetStudent("student-1");
    engine.play("correct", "a");
    expect(world.contexts).toHaveLength(0);
    expect(world.requests).toHaveLength(0);
    expect(world.played).toEqual([]);
    expect(seen).toEqual([]);
  });

  it("값이 on 이 아니면(옛 값 · 깨진 값) 꺼진 것으로 읽는다", () => {
    for (const stored of ["off", "true", "1", ""])
      expect(setup({ stored }).engine.getSnapshot().enabled).toBe(false);
  });
});

describe("켜기 — 준비만 하고 소리는 내지 않는다", () => {
  it("켜는 조작 안에서 context 하나 · gain 0.2 · 파일 셋을 요청하고, 다 되면 준비됨이다", async () => {
    const { world, engine, serve, status, context } = setup();
    engine.setEnabled(true);
    // 같은 호출 안(동기)에서 만들고 resume 했다
    expect(world.contexts).toHaveLength(1);
    expect(context().resumed).toBe(1);
    expect(context().gains).toHaveLength(1);
    expect(context().gains[0]!.gain.value).toBe(0.2);
    expect(context().gains[0]!.target).toBe(context().destination);
    expect(world.requests.map((request) => request.url).sort()).toEqual(
      Object.values(URLS).sort(),
    );
    expect(world.stored).toBe("on");
    expect(engine.getSnapshot()).toEqual({ enabled: true, status: "loading" });

    await serve();
    expect(status()).toBe("ready");
    expect(world.decodes).toBe(3);
    // 켜는 것만으로는 아무것도 울리지 않는다
    expect(world.played).toEqual([]);
    expect(context().sources).toHaveLength(0);
  });

  it("준비되기 전의 미리 듣기는 버린다 — 준비된 뒤 저절로 나지 않고, 다시 누르면 난다", async () => {
    const { world, engine, serve, status } = setup();
    engine.setEnabled(true);
    engine.preview();
    expect(status()).toBe("loading");
    await serve();
    expect(status()).toBe("ready");
    expect(world.played).toEqual([]);

    engine.preview();
    expect(world.played).toEqual([URLS.correct]);
    // 같은 파일을 다시 받지 않는다
    expect(world.requests).toHaveLength(0);
    expect(world.contexts).toHaveLength(1);
  });

  it("이미 준비된 뒤 켜기를 다시 불러도 소리는 없다", async () => {
    const { world, engine, ready } = setup();
    await ready();
    engine.setEnabled(true);
    engine.gesture();
    expect(world.played).toEqual([]);
    expect(world.contexts).toHaveLength(1);
  });

  it("조작을 여러 번 해도 context 는 하나, 파일은 셋뿐이다", async () => {
    const { world, engine, serve } = setup();
    engine.setEnabled(true);
    engine.gesture();
    engine.preview();
    engine.setEnabled(true);
    expect(world.contexts).toHaveLength(1);
    expect(world.requests).toHaveLength(3);
    await serve();
    engine.gesture();
    engine.preview();
    engine.gesture();
    expect(world.contexts).toHaveLength(1);
    expect(world.requests).toHaveLength(0);
    expect(world.decodes).toBe(3);
  });

  it("브라우저가 «지금은 사용자 조작이 아니다»라고 하면 만들지 않는다", async () => {
    const { world, engine, serve, status } = setup({ active: false });
    engine.setEnabled(true);
    engine.gesture();
    engine.preview();
    expect(world.contexts).toHaveLength(0);
    expect(world.requests).toHaveLength(0);
    // 설정은 켜진 채 남고, 진짜 조작이 오면 그때 준비한다
    expect(engine.getSnapshot()).toEqual({ enabled: true, status: "idle" });
    expect(world.stored).toBe("on");
    world.active = true;
    engine.gesture();
    expect(world.contexts).toHaveLength(1);
    await serve();
    expect(status()).toBe("ready");
  });

  it("브라우저가 말해 주지 않으면(옛 브라우저) 조작으로 본다", async () => {
    const { world, engine, serve, status } = setup({ active: null });
    engine.setEnabled(true);
    expect(world.contexts).toHaveLength(1);
    await serve();
    expect(status()).toBe("ready");
  });

  it("켜진 채 저장된 기기에서는 풀이의 첫 조작이 준비를 시작한다", async () => {
    const { world, engine, serve, status } = setup({ stored: "on" });
    engine.gesture();
    expect(world.contexts).toHaveLength(1);
    expect(world.requests).toHaveLength(3);
    expect(status()).toBe("loading");
    await serve();
    expect(status()).toBe("ready");
    expect(world.played).toEqual([]);
  });
});

describe("확정된 답의 소리", () => {
  it("소리 종류마다 제 파일을 gain 노드로 한 번 울린다", async () => {
    const { world, engine, ready, context } = setup();
    await ready();
    engine.play("correct", "k1");
    engine.play("soft", "k2");
    engine.play("complete", "k3");
    expect(world.played).toEqual([URLS.correct, URLS.soft, URLS.complete]);
    for (const source of context().sources)
      expect(source.target).toBe(context().gains[0]);
  });

  it("같은 키는 다시 울리지 않는다", async () => {
    const { world, engine, ready } = setup();
    await ready();
    engine.play("correct", "student:request-1");
    engine.play("correct", "student:request-1");
    engine.play("soft", "student:request-1");
    expect(world.played).toEqual([URLS.correct]);
    engine.play("soft", "student:request-2");
    expect(world.played).toEqual([URLS.correct, URLS.soft]);
  });

  it("source 는 하나 — 새 소리는 앞 소리를 멈춘다", async () => {
    const { engine, ready, context } = setup();
    await ready();
    engine.play("complete", "k1");
    const first = context().sources[0]!;
    expect(first.stopped).toBe(0);
    engine.play("correct", "k2");
    expect(first.stopped).toBe(1);
    expect(context().sources).toHaveLength(2);
    expect(context().sources[1]!.stopped).toBe(0);
  });

  it("다 울린 소리는 멈출 것이 없다", async () => {
    const { engine, ready, context } = setup();
    await ready();
    engine.play("correct", "k1");
    const first = context().sources[0]!;
    first.onended?.();
    engine.play("soft", "k2");
    expect(first.stopped).toBe(0);
  });

  it("준비되기 전의 소리는 버리고 키만 기억한다 — 나중에 내지 않는다", async () => {
    const { world, engine, serve, status } = setup();
    engine.setEnabled(true);
    engine.play("correct", "k1");
    await serve();
    expect(status()).toBe("ready");
    expect(world.played).toEqual([]);
    // 같은 확정이 다시 와도(늦은 응답 · 재마운트) 울리지 않는다
    engine.play("correct", "k1");
    expect(world.played).toEqual([]);
    engine.play("correct", "k2");
    expect(world.played).toEqual([URLS.correct]);
  });

  it("꺼져 있던 때의 확정은 켠 뒤에도 울리지 않는다", async () => {
    const { world, engine, ready } = setup();
    engine.play("correct", "k1");
    await ready();
    engine.play("correct", "k1");
    expect(world.played).toEqual([]);
  });

  it("미리 듣기는 키 기억과 무관하다", async () => {
    const { world, engine, ready } = setup();
    await ready();
    engine.play("soft", "k1");
    engine.preview();
    engine.play("soft", "k1");
    expect(world.played).toEqual([URLS.soft, URLS.correct]);
    engine.preview();
    engine.play("soft", "k2");
    expect(world.played).toEqual([
      URLS.soft,
      URLS.correct,
      URLS.correct,
      URLS.soft,
    ]);
  });

  it("화면이 가려져 있거나 context 가 돌고 있지 않으면 버린다", async () => {
    const { world, engine, ready, context } = setup();
    await ready();
    world.hidden = true;
    engine.play("correct", "k1");
    world.hidden = false;
    context().state = "suspended";
    engine.play("correct", "k2");
    expect(world.played).toEqual([]);
    context().state = "running";
    engine.play("correct", "k3");
    expect(world.played).toEqual([URLS.correct]);
  });
});

describe("음원을 받지 못하면 — 풀이에 영향 없이 재생 불가", () => {
  const cases: [string, Reply][] = [
    ["404", { ok: false, redirected: false, type: "audio/wav" }],
    ["200 HTML", { ok: true, redirected: false, type: "text/html" }],
    ["Content-Type 없음", { ok: true, redirected: false, type: null }],
    [
      "다른 곳으로 넘겨진 응답",
      { ok: true, redirected: true, type: "audio/wav" },
    ],
  ];
  it.each(cases)("%s 는 음원으로 받지 않는다", async (_name, reply) => {
    const { world, engine, status } = setup();
    engine.setEnabled(true);
    const [first, ...rest] = world.requests.splice(0);
    first!.reply(reply);
    await settle();
    expect(status()).toBe("unavailable");
    expect(world.decodes).toBe(0);
    // 남은 요청은 끊는다
    for (const request of rest) expect(request.signal?.aborted).toBe(true);
    // 늦게 온 나머지가 상태를 되살리지 않는다
    for (const request of rest) request.reply();
    await settle();
    expect(status()).toBe("unavailable");
    expect(() => engine.play("correct", "k1")).not.toThrow();
    expect(() => engine.preview()).not.toThrow();
    expect(world.played).toEqual([]);
  });

  it("네트워크 오류 · decode 실패도 같다", async () => {
    const offline = setup();
    offline.engine.setEnabled(true);
    offline.world.requests[0]!.fail();
    await settle();
    expect(offline.status()).toBe("unavailable");

    const broken = setup({ decodeRejects: true });
    broken.engine.setEnabled(true);
    await broken.serve();
    expect(broken.status()).toBe("unavailable");
    broken.engine.play("correct", "k1");
    expect(broken.world.played).toEqual([]);
  });

  it("콜백으로만 답하는 decode(옛 Safari)도 받고, 그 실패도 재생 불가다", async () => {
    const old = setup({ decodeByCallback: true });
    await old.ready();
    old.engine.play("soft", "k1");
    expect(old.world.played).toEqual([URLS.soft]);

    const broken = setup({ decodeByCallback: true, decodeRejects: true });
    broken.engine.setEnabled(true);
    await broken.serve();
    expect(broken.status()).toBe("unavailable");
  });

  it("풀이 중 조작은 실패한 파일을 다시 요청하지 않고, 설정 조작(켜기 · 미리 듣기)만 다시 받는다", async () => {
    const { world, engine, serve, status } = setup();
    engine.setEnabled(true);
    world.requests.splice(0)[0]!.reply({
      ok: false,
      redirected: false,
      type: null,
    });
    await settle();
    expect(status()).toBe("unavailable");

    engine.gesture();
    engine.gesture();
    expect(world.requests).toHaveLength(0);
    expect(status()).toBe("unavailable");

    engine.preview();
    expect(world.requests).toHaveLength(3);
    expect(status()).toBe("loading");
    expect(world.played).toEqual([]);
    await serve();
    expect(status()).toBe("ready");
    engine.preview();
    expect(world.played).toEqual([URLS.correct]);
  });
});

describe("기기가 소리를 못 낼 때 — 던지지 않는다", () => {
  it("AudioContext 를 만들 수 없으면 재생 불가이고, 다음 조작에서 다시 해 본다", async () => {
    const { world, engine, serve, status } = setup({ constructThrows: true });
    expect(() => engine.setEnabled(true)).not.toThrow();
    expect(engine.getSnapshot()).toEqual({
      enabled: true,
      status: "unavailable",
    });
    expect(world.requests).toHaveLength(0);
    expect(() => engine.play("correct", "k1")).not.toThrow();

    world.constructThrows = false;
    engine.gesture();
    expect(world.contexts).toHaveLength(1);
    await serve();
    expect(status()).toBe("ready");
  });

  it("resume 이 거절되면 재생 불가이고, 다음 조작이 다시 resume 한다", async () => {
    const { world, engine, serve, status, context } = setup({
      resumeRejects: true,
    });
    engine.setEnabled(true);
    await serve();
    expect(status()).toBe("unavailable");
    engine.play("correct", "k1");
    expect(world.played).toEqual([]);

    world.resumeRejects = false;
    engine.gesture();
    await settle();
    expect(context().resumed).toBe(2);
    expect(world.contexts).toHaveLength(1);
    expect(status()).toBe("ready");
  });

  it("source 를 만들거나 시작하다 던져도 밖으로 나오지 않고 재생 불가로 보인다", async () => {
    for (const fault of ["sourceThrows", "startThrows"] as const) {
      const { world, engine, ready, status } = setup();
      await ready();
      world[fault] = true;
      expect(() => engine.play("correct", "k1")).not.toThrow();
      expect(() => engine.preview()).not.toThrow();
      expect(world.played).toEqual([]);
      expect(status()).toBe("unavailable");
      // 기기가 돌아오면 다음 조작부터 다시 난다
      world[fault] = false;
      engine.gesture();
      expect(status()).toBe("ready");
      engine.play("correct", "k2");
      expect(world.played).toEqual([URLS.correct]);
    }
  });

  it("저장소가 막혀 있어도 이번 화면에서는 켜지고 꺼진다", async () => {
    const { world, engine, serve, status } = setup({ storageThrows: true });
    expect(engine.getSnapshot()).toEqual({ enabled: false, status: "off" });
    expect(() => engine.setEnabled(true)).not.toThrow();
    await serve();
    expect(engine.getSnapshot()).toEqual({ enabled: true, status: "ready" });
    engine.play("correct", "k1");
    expect(world.played).toEqual([URLS.correct]);
    expect(() => engine.setEnabled(false)).not.toThrow();
    expect(status()).toBe("off");
    expect(world.stored).toBeNull();
  });

  it("브라우저 겹이 통째로 던져도 공개 메서드는 던지지 않는다", () => {
    const broken = (): never => {
      throw new Error("broken");
    };
    const engine = createLearningSoundEngine({
      files: LEARNING_SOUND_FILES,
      gain: LEARNING_SOUND_GAIN,
      host: {
        readStored: broken,
        writeStored: broken,
        createContext: broken,
        fetch: broken,
        hidden: broken,
        userActive: broken,
      },
    });
    expect(() => {
      engine.getSnapshot();
      engine.setEnabled(true);
      engine.gesture();
      engine.preview();
      engine.play("correct", "k1");
      engine.resetStudent("student-1");
      engine.pageHidden();
      engine.storageChanged(LEARNING_SOUND_KEY, "off");
      engine.setEnabled(false);
      engine.dispose();
    }).not.toThrow();
  });
});

describe("끄기 · 다른 탭 · 화면 가림 · 언마운트", () => {
  it("끄면 울리던 소리를 멈추고 context 를 닫는다", async () => {
    const { world, engine, ready, context } = setup();
    await ready();
    engine.play("complete", "k1");
    const source = context().sources[0]!;
    engine.setEnabled(false);
    expect(source.stopped).toBe(1);
    expect(context().closed).toBe(1);
    expect(world.stored).toBe("off");
    expect(engine.getSnapshot()).toEqual({ enabled: false, status: "off" });
    engine.play("correct", "k2");
    engine.gesture();
    engine.preview();
    expect(world.played).toEqual([URLS.complete]);
    expect(world.contexts).toHaveLength(1);
  });

  it("받는 중에 끄면 요청을 끊고, 늦은 응답이 아무것도 되살리지 않는다", async () => {
    const { world, engine, status } = setup();
    engine.setEnabled(true);
    const pending = world.requests.splice(0);
    engine.setEnabled(false);
    for (const request of pending) expect(request.signal?.aborted).toBe(true);
    for (const request of pending) request.reply();
    await settle();
    expect(status()).toBe("off");
    expect(world.decodes).toBe(0);
    // 다시 켜면 새로 받는다
    engine.setEnabled(true);
    expect(world.contexts).toHaveLength(2);
    expect(world.requests).toHaveLength(3);
  });

  it("다른 탭에서 끄면 즉시 멈추고, 다른 탭에서 켜면 설정만 켜진다", async () => {
    const { world, engine, ready, context } = setup();
    await ready();
    engine.play("complete", "k1");
    const source = context().sources[0]!;

    engine.storageChanged("another-key", "off");
    expect(source.stopped).toBe(0);
    expect(engine.getSnapshot().enabled).toBe(true);

    engine.storageChanged(LEARNING_SOUND_KEY, "off");
    expect(source.stopped).toBe(1);
    expect(context().closed).toBe(1);
    expect(engine.getSnapshot()).toEqual({ enabled: false, status: "off" });

    engine.storageChanged(LEARNING_SOUND_KEY, "on");
    expect(engine.getSnapshot()).toEqual({ enabled: true, status: "idle" });
    expect(world.contexts).toHaveLength(1);
    expect(world.requests).toHaveLength(0);

    // 저장소 비우기(key 없음)는 기본값 — 끔
    engine.storageChanged(null, null);
    expect(engine.getSnapshot()).toEqual({ enabled: false, status: "off" });
  });

  it("화면이 가려지면 멈추고 요청을 끊는다 — 돌아와도 저절로 잇지 않고 다음 조작을 기다린다", async () => {
    const { world, engine, ready, serve, status, context } = setup();
    await ready();
    engine.play("complete", "k1");
    const source = context().sources[0]!;

    world.hidden = true;
    engine.pageHidden();
    expect(source.stopped).toBe(1);
    expect(context().suspended).toBe(1);
    expect(context().closed).toBe(0);
    expect(engine.getSnapshot()).toEqual({ enabled: true, status: "idle" });

    world.hidden = false;
    await settle();
    expect(context().resumed).toBe(1);
    engine.play("correct", "k2");
    expect(world.played).toEqual([URLS.complete]);

    engine.gesture();
    await serve();
    expect(context().resumed).toBe(2);
    expect(world.contexts).toHaveLength(1);
    expect(status()).toBe("ready");
    engine.play("correct", "k3");
    expect(world.played).toEqual([URLS.complete, URLS.correct]);
  });

  it("받는 중에 가려지면 끊고, 늦은 응답으로 준비됨이 되지 않는다", async () => {
    const { world, engine, serve, status } = setup();
    engine.setEnabled(true);
    const pending = world.requests.splice(0);
    world.hidden = true;
    engine.pageHidden();
    for (const request of pending) expect(request.signal?.aborted).toBe(true);
    for (const request of pending) request.reply();
    await settle();
    expect(status()).toBe("idle");
    expect(world.decodes).toBe(0);

    // 가려진 동안의 조작(있을 수 없지만)은 아무것도 하지 않는다
    engine.gesture();
    expect(world.requests).toHaveLength(0);

    world.hidden = false;
    engine.gesture();
    expect(world.requests).toHaveLength(3);
    await serve();
    expect(status()).toBe("ready");
  });

  it("decode 가 도는 중에 가려지면 그 결과를 버린다 — 늦게 끝난 decode 가 준비됨을 만들지 않는다", async () => {
    const { world, engine, serve, status } = setup({ decodeHolds: true });
    engine.setEnabled(true);
    await serve();
    expect(world.heldDecodes).toHaveLength(3);
    expect(status()).toBe("loading");

    world.hidden = true;
    engine.pageHidden();
    await releaseDecodes(world);
    expect(status()).toBe("idle");

    // 버려진 결과를 쓰지 않는다 — 돌아온 뒤의 조작이 새로 받는다
    world.hidden = false;
    world.decodeHolds = false;
    engine.gesture();
    expect(world.requests).toHaveLength(3);
    engine.play("correct", "k1");
    expect(world.played).toEqual([]);
    await serve();
    expect(status()).toBe("ready");
  });

  it("decode 가 도는 중에 끄고 다시 켜면, 앞 decode 가 늦게 끝나도 새로 받는 것을 가로채지 않는다", async () => {
    const { world, engine, serve, status } = setup({ decodeHolds: true });
    engine.setEnabled(true);
    await serve();
    const late = world.heldDecodes.splice(0);
    engine.setEnabled(false);
    engine.setEnabled(true);
    expect(world.requests).toHaveLength(3);
    expect(status()).toBe("loading");

    // 앞 context 의 decode 가 이제 끝난다
    for (const release of late) release();
    await settle();
    expect(status()).toBe("loading");
    engine.preview();
    expect(world.played).toEqual([]);

    world.decodeHolds = false;
    await serve();
    expect(status()).toBe("ready");
  });

  it("언마운트는 context 를 닫는다 — 다시 마운트되면(StrictMode) 다음 조작에서 새로 만든다", async () => {
    const { world, engine, ready, serve, status, context } = setup();
    await ready();
    engine.play("complete", "k1");
    const first = context();
    engine.dispose();
    expect(first.sources[0]!.stopped).toBe(1);
    expect(first.closed).toBe(1);
    expect(engine.getSnapshot()).toEqual({ enabled: true, status: "idle" });
    engine.play("correct", "k2");
    expect(world.played).toEqual([URLS.complete]);

    engine.gesture();
    expect(world.contexts).toHaveLength(2);
    await serve();
    expect(status()).toBe("ready");
  });
});

describe("학생이 바뀌면", () => {
  it("같은 학생이면 아무것도 건드리지 않는다", async () => {
    const { world, engine, ready, context } = setup();
    engine.resetStudent("student-1");
    await ready();
    engine.play("complete", "k1");
    engine.resetStudent("student-1");
    expect(context().sources[0]!.stopped).toBe(0);
    engine.play("complete", "k1");
    expect(world.played).toEqual([URLS.complete]);
  });

  it("울리던 소리를 멈추고 직전 키를 잊되, 기기 설정은 그대로다", async () => {
    const { world, engine, ready, status, context } = setup();
    engine.resetStudent("student-1");
    await ready();
    engine.play("complete", "day");
    engine.resetStudent("student-2");
    expect(context().sources[0]!.stopped).toBe(1);
    expect(engine.getSnapshot().enabled).toBe(true);
    expect(world.stored).toBe("on");
    expect(context().closed).toBe(0);
    expect(status()).toBe("ready");
    // 다른 학생의 같은 키는 새 사건이다
    engine.play("complete", "day");
    expect(world.played).toEqual([URLS.complete, URLS.complete]);
    // 로그아웃(null)도 바뀐 것이다
    engine.resetStudent(null);
    expect(context().sources[1]!.stopped).toBe(1);
  });

  it("받는 중이면 끊고 decode 결과를 버린다 — 다음 조작에서 다시 받는다", async () => {
    const { world, engine, serve, status } = setup();
    engine.resetStudent("student-1");
    engine.setEnabled(true);
    const pending = world.requests.splice(0);
    engine.resetStudent("student-2");
    for (const request of pending) expect(request.signal?.aborted).toBe(true);
    for (const request of pending) request.reply();
    await settle();
    expect(status()).toBe("idle");
    engine.play("correct", "k1");
    expect(world.played).toEqual([]);

    engine.gesture();
    expect(world.contexts).toHaveLength(1);
    await serve();
    expect(status()).toBe("ready");
  });
});

describe("구독", () => {
  it("상태가 바뀔 때만 알리고, 바뀌지 않으면 같은 스냅숏을 돌려준다", async () => {
    const { engine, serve } = setup();
    const seen: string[] = [];
    const unsubscribe = engine.subscribe(() =>
      seen.push(engine.getSnapshot().status),
    );
    const off = engine.getSnapshot();
    expect(engine.getSnapshot()).toBe(off);
    engine.gesture();
    engine.play("correct", "k1");
    expect(seen).toEqual([]);

    engine.setEnabled(true);
    await serve();
    expect(seen).toEqual(["loading", "ready"]);
    const ready = engine.getSnapshot();
    engine.play("correct", "k2");
    engine.gesture();
    expect(engine.getSnapshot()).toBe(ready);

    unsubscribe();
    engine.setEnabled(false);
    expect(seen).toEqual(["loading", "ready"]);
  });
});
