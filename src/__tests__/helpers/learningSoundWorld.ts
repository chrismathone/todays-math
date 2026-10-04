/**
 * 학생 수학 효과음 시험의 가짜 브라우저 — Web Audio · 음원 요청을 세고 조종한다.
 *
 * 엔진 단위 시험은 `soundHost` 로 엔진에 직접 꽂고, 화면 시험은 `installSoundWorld` 로
 * 전역(`AudioContext` · `fetch`)에 꽂아 제품의 기본 브라우저 겹을 그대로 태운다.
 *
 * 🔴 소리가 «났다»는 것은 가짜 source 의 `start()` 가 불린 것이다(`played`). 음량 · 음색은 재지 않는다.
 */
import { vi } from "vitest";
import {
  LEARNING_SOUND_KEY,
  type LearningSoundHost,
} from "@/lib/math-srs/learningSoundEngine";

export const SOUND_URLS = {
  correct: "/audio/math-learning/correct.wav",
  soft: "/audio/math-learning/neutral.wav",
  complete: "/audio/math-learning/complete.wav",
} as const;

export type SoundReply = {
  ok: boolean;
  redirected: boolean;
  type: string | null;
};
export const AUDIO_REPLY: SoundReply = {
  ok: true,
  redirected: false,
  type: "audio/wav",
};

export type SoundRequest = {
  url: string;
  signal: AbortSignal | undefined;
  /** 화면 시험에서 제품이 `fetch` 에 넘긴 둘째 인자 */
  init: RequestInit | undefined;
  reply: (reply?: SoundReply) => void;
  fail: () => void;
};

export type SoundWorld = {
  /** 엔진 단위 시험의 저장소 한 칸(화면 시험은 진짜 localStorage 를 쓴다) */
  stored: string | null;
  storageThrows: boolean;
  hidden: boolean;
  /** `navigator.userActivation.isActive` — null 은 «브라우저가 말해 주지 않는다» */
  active: boolean | null;
  constructThrows: boolean;
  resumeRejects: boolean;
  decodeRejects: boolean;
  /** 옛 Safari — decodeAudioData 가 약속을 돌려주지 않고 콜백으로만 답한다 */
  decodeByCallback: boolean;
  /** decode 를 붙잡아 둔다 — `releaseDecodes` 로 풀 때까지 끝나지 않는다 */
  decodeHolds: boolean;
  heldDecodes: (() => void)[];
  sourceThrows: boolean;
  startThrows: boolean;
  contexts: FakeContext[];
  requests: SoundRequest[];
  decodes: number;
  /** 실제로 울린 것(가짜 source 의 start) — 파일 주소 차례 */
  played: string[];
  origin: WeakMap<ArrayBuffer, string>;
};

export class FakeSource {
  buffer: { url: string } | null = null;
  onended: (() => void) | null = null;
  target: unknown = null;
  started = 0;
  stopped = 0;
  constructor(private readonly world: SoundWorld) {}
  connect(node: unknown) {
    this.target = node;
  }
  start() {
    if (this.world.startThrows) throw new Error("start");
    this.started++;
    this.world.played.push(this.buffer?.url ?? "?");
  }
  stop() {
    this.stopped++;
  }
  disconnect() {}
}

export class FakeGain {
  gain = { value: 1 };
  target: unknown = null;
  connect(node: unknown) {
    this.target = node;
  }
}

export class FakeContext {
  state: "suspended" | "running" | "closed" = "suspended";
  destination = { kind: "destination" };
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  resumed = 0;
  suspended = 0;
  closed = 0;
  private readonly watchers = new Set<() => void>();
  constructor(private readonly world: SoundWorld) {}
  private change(state: FakeContext["state"]) {
    this.state = state;
    this.watchers.forEach((watcher) => watcher());
  }
  addEventListener(_type: string, watcher: () => void) {
    this.watchers.add(watcher);
  }
  removeEventListener(_type: string, watcher: () => void) {
    this.watchers.delete(watcher);
  }
  resume() {
    this.resumed++;
    if (this.world.resumeRejects) return Promise.reject(new Error("resume"));
    this.change("running");
    return Promise.resolve();
  }
  suspend() {
    this.suspended++;
    this.change("suspended");
    return Promise.resolve();
  }
  close() {
    this.closed++;
    this.change("closed");
    return Promise.resolve();
  }
  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBufferSource() {
    if (this.world.sourceThrows) throw new Error("source");
    const source = new FakeSource(this.world);
    this.sources.push(source);
    return source;
  }
  decodeAudioData(
    data: ArrayBuffer,
    done?: (buffer: { url: string }) => void,
    fail?: (error: Error) => void,
  ) {
    this.world.decodes++;
    const buffer = { url: this.world.origin.get(data)! };
    if (this.world.decodeByCallback) {
      if (this.world.decodeRejects) fail?.(new Error("decode"));
      else done?.(buffer);
      return undefined;
    }
    if (this.world.decodeRejects) return Promise.reject(new Error("decode"));
    if (this.world.decodeHolds)
      return new Promise<{ url: string }>((resolve) => {
        this.world.heldDecodes.push(() => resolve(buffer));
      });
    return Promise.resolve(buffer);
  }
}

export function soundWorld(initial: Partial<SoundWorld> = {}): SoundWorld {
  return {
    stored: null,
    storageThrows: false,
    hidden: false,
    active: true,
    constructThrows: false,
    resumeRejects: false,
    decodeRejects: false,
    decodeByCallback: false,
    decodeHolds: false,
    heldDecodes: [],
    sourceThrows: false,
    startThrows: false,
    contexts: [],
    requests: [],
    decodes: 0,
    played: [],
    origin: new WeakMap(),
    ...initial,
  };
}

function construct(world: SoundWorld) {
  if (world.constructThrows) throw new Error("no audio");
  const context = new FakeContext(world);
  world.contexts.push(context);
  return context;
}

/** 요청을 적어 두고, 시험이 답할 때까지 기다리는 응답 */
function request(
  world: SoundWorld,
  url: string,
  signal: AbortSignal | undefined,
  init?: RequestInit,
) {
  return new Promise<Response>((resolve, reject) => {
    world.requests.push({
      url,
      signal,
      init,
      reply(reply = AUDIO_REPLY) {
        const data = new ArrayBuffer(8);
        world.origin.set(data, url);
        resolve({
          ok: reply.ok,
          redirected: reply.redirected,
          headers: { get: () => reply.type },
          arrayBuffer: () => Promise.resolve(data),
        } as unknown as Response);
      },
      fail: () => reject(new TypeError("network")),
    });
  });
}

/** 엔진에 직접 꽂는 브라우저 겹 */
export function soundHost(world: SoundWorld): LearningSoundHost {
  return {
    readStored() {
      if (world.storageThrows) throw new Error("blocked");
      return world.stored;
    },
    writeStored(value) {
      if (world.storageThrows) throw new Error("blocked");
      world.stored = value;
    },
    createContext: () => construct(world) as unknown as AudioContext,
    fetch: (url, signal) => request(world, url, signal),
    hidden: () => world.hidden,
    userActive: () => world.active,
  };
}

/**
 * 전역에 꽂는다 — 제품의 기본 브라우저 겹(`window.AudioContext` · `fetch`)이 이 가짜를 만난다.
 * 화면 가림은 `setHidden`, 사용자 조작 여부는 `world.active`(null 이면 jsdom 처럼 API 가 없다)로 바꾼다.
 * 시험 끝에 `vi.unstubAllGlobals()` 와 돌려받은 `restore()` 를 부른다.
 */
export function installSoundWorld(world: SoundWorld) {
  vi.stubGlobal("AudioContext", function AudioContext() {
    return construct(world);
  });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) =>
      request(world, String(url), init?.signal ?? undefined, init),
    ),
  );
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (world.hidden ? "hidden" : "visible"),
  });
  Object.defineProperty(navigator, "userActivation", {
    configurable: true,
    get: () => (world.active === null ? undefined : { isActive: world.active }),
  });
  return {
    setHidden(hidden: boolean) {
      world.hidden = hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    /** 다른 탭이 이 기기의 효과음 설정을 바꿨다 */
    otherTab(value: string | null) {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LEARNING_SOUND_KEY,
          newValue: value,
        }),
      );
    },
    restore() {
      delete (document as { visibilityState?: string }).visibilityState;
      delete (navigator as { userActivation?: unknown }).userActivation;
    },
  };
}

/** 대기 중인 약속을 다 흘려보낸다 */
export const settle = () => new Promise<void>((done) => setTimeout(done, 0));

/** 붙잡아 둔 decode 를 모두 끝낸다 */
export async function releaseDecodes(world: SoundWorld) {
  for (const release of world.heldDecodes.splice(0)) release();
  await settle();
}

/** 아직 답하지 않은 요청에 모두 음원으로 답한다 */
export async function serveSounds(world: SoundWorld) {
  for (const pending of world.requests.splice(0)) pending.reply();
  await settle();
}
