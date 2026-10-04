/**
 * 학생 수학 효과음 엔진 (3자 합의 사운드 v3 2 · 5 · 8 · 9항, 2026-10-04).
 *
 * React 도 DOM 도 모른다 — 브라우저는 `LearningSoundHost` 한 겹으로만 만지고, 공급자
 * (`components/math-srs/LearningSounds.tsx`)가 저장소 · 화면 가림 사건을 넘겨준다.
 *
 * - 기본은 끔. 꺼져 있으면 음원 요청 0 · AudioContext 0.
 * - 켜져 있어도 마운트에서는 설정만 읽는다. context 를 만들고 resume 하고 음원을 받는 것은
 *   사용자 조작(`setEnabled(true)` · `preview()` · `gesture()`)의 같은 호출 안에서뿐이다.
 * - 준비(running + 세 파일)가 안 됐거나 화면이 가려져 있으면 소리를 버린다. 쌓아 두었다가 나중에 내지 않는다.
 * - source 는 하나 — 새 소리는 앞 소리를 멈춘다. 캐시는 파일 셋뿐이다.
 * - 공개 메서드는 모두 동기 void 이고 던지지 않는다. 소리의 실패가 풀이 · 저장의 실패가 되지 않는다.
 */

/** 이 기기의 설정이다 — 학생 id 가 들어가지 않고, 학습 기록 · 움직임 설정과 따로 저장된다. */
export const LEARNING_SOUND_KEY = "todays-math:learning-sound:v1";

export type LearningSoundCue = "correct" | "soft" | "complete";
/**
 * - `off` 꺼짐
 * - `idle` 켜져 있고 다음 사용자 조작을 기다린다(마운트 직후 · 가려졌다 돌아온 뒤)
 * - `loading` 준비 중(resume · 음원 받기)
 * - `ready` 준비됨
 * - `unavailable` 재생 불가(이 기기가 못 내거나 음원을 못 받았다)
 */
export type LearningSoundStatus =
  "off" | "idle" | "loading" | "ready" | "unavailable";
export type LearningSoundSnapshot = {
  readonly enabled: boolean;
  readonly status: LearningSoundStatus;
};

/** 엔진이 만지는 브라우저의 전부. 어느 것이 던져도 엔진 밖으로 나가지 않는다. */
export type LearningSoundHost = {
  readStored(): string | null;
  writeStored(value: string): void;
  /** Web Audio 가 없으면 던진다. */
  createContext(): AudioContext;
  fetch(url: string, signal: AbortSignal | undefined): Promise<Response>;
  hidden(): boolean;
  /** 브라우저가 «지금은 사용자 조작이 아니다»라고 말할 때만 false. 말해 주지 않으면 null. */
  userActive(): boolean | null;
};

export type LearningSoundEngine = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): LearningSoundSnapshot;
  /** 사용자 조작. 켜기는 준비만 하고 소리를 내지 않는다. */
  setEnabled(value: boolean): void;
  /** 풀이의 사용자 조작(시작 · 답 제출)의 같은 호출 안에서 부른다. */
  gesture(): void;
  /** 사용자 조작. 준비돼 있으면 `correct` 를 한 번 낸다 — 아니면 버린다. */
  preview(): void;
  /** 확정된 전이에서 부른다. 같은 `eventKey` 는 다시 내지 않는다(직전 하나만 기억). */
  play(cue: LearningSoundCue, eventKey: string): void;
  /** 학생이 바뀌면 울리던 소리 · 받던 음원 · 직전 키를 버린다. 기기 설정은 그대로다. */
  resetStudent(studentId: string | null): void;
  /** 다른 탭의 `storage` 사건 */
  storageChanged(key: string | null, value: string | null): void;
  /** 화면이 가려졌다. 돌아와도 저절로 잇지 않는다. */
  pageHidden(): void;
  /** 언마운트 — context 를 닫는다. 다시 마운트되면 다음 조작에서 새로 만든다. */
  dispose(): void;
};

const browserHost: LearningSoundHost = {
  readStored: () => window.localStorage.getItem(LEARNING_SOUND_KEY),
  writeStored: (value) =>
    window.localStorage.setItem(LEARNING_SOUND_KEY, value),
  createContext() {
    const scope = window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const Context = scope.AudioContext ?? scope.webkitAudioContext;
    if (typeof Context !== "function") throw new Error("Web Audio 없음");
    return new Context();
  },
  // 다른 곳으로 넘기는 응답(로그인 화면 등)은 따라가지 않는다.
  fetch: (url, signal) => fetch(url, { signal, redirect: "error" }),
  hidden: () => document.visibilityState === "hidden",
  userActive: () => navigator.userActivation?.isActive ?? null,
};

const OFF: LearningSoundSnapshot = { enabled: false, status: "off" };
const ignore = () => {};

/** 약속을 돌려주는 decode 와 콜백으로만 답하는 decode(옛 Safari)를 함께 받는다. */
function decode(context: AudioContext, data: ArrayBuffer) {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const pending = context.decodeAudioData(data, resolve, reject) as
      Promise<AudioBuffer> | undefined;
    pending?.then(resolve, reject);
  });
}

export function createLearningSoundEngine({
  files,
  gain,
  host = browserHost,
}: {
  files: Readonly<Record<LearningSoundCue, { readonly url: string }>>;
  gain: number;
  host?: LearningSoundHost;
}): LearningSoundEngine {
  const cues = Object.keys(files) as LearningSoundCue[];
  const listeners = new Set<() => void>();
  let snapshot = OFF;
  /** 저장된 설정은 브라우저에서 처음 물을 때 한 번 읽는다(서버 렌더는 묻지 않는다). */
  let restored = false;
  let enabled = false;
  let context: AudioContext | null = null;
  let output: GainNode | null = null;
  let source: AudioBufferSourceNode | null = null;
  /** 세 파일이 다 됐을 때만 채운다 — 일부만 된 상태는 없다. */
  let buffers: ReadonlyMap<LearningSoundCue, AudioBuffer> | null = null;
  let loading: { controller: AbortController | null; live: boolean } | null =
    null;
  let resuming: { live: boolean } | null = null;
  /** `device` 는 다음 조작에서 다시 해 본다. `files` 는 설정 조작(켜기 · 미리 듣기)에서만 다시 받는다. */
  let failure: "device" | "files" | null = null;
  let lastKey: string | null = null;
  let student: string | null | undefined;
  /** 공개 메서드가 도는 동안에는 알리지 않는다 — 끝에서 한 번 알린다. */
  let depth = 0;

  function restore() {
    if (restored) return;
    restored = true;
    try {
      enabled = host.readStored() === "on";
    } catch {
      // 저장소를 못 읽으면 기본값(끔)으로 이번 화면을 연다.
    }
    snapshot = enabled ? { enabled, status: "idle" } : OFF;
  }

  function status(): LearningSoundStatus {
    if (!enabled) return "off";
    if (failure) return "unavailable";
    const running = context?.state === "running";
    if (running && buffers) return "ready";
    if (loading || (resuming && !running)) return "loading";
    return "idle";
  }

  function publish() {
    if (depth > 0) return;
    const next = status();
    if (next === snapshot.status && enabled === snapshot.enabled) return;
    snapshot = { enabled, status: next };
    listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // 구독자의 실패도 풀이로 올라가지 않는다.
      }
    });
  }

  function stop() {
    const node = source;
    source = null;
    if (!node) return;
    try {
      node.onended = null;
      node.stop();
    } catch {
      // 이미 끝난 소리다.
    }
    try {
      node.disconnect();
    } catch {
      // 이미 끊긴 노드다.
    }
  }

  /** 울리던 소리를 멈추고, 오는 중이던 것(음원 · decode · resume)의 결과를 버린다. */
  function cancel() {
    stop();
    if (loading) {
      loading.live = false;
      try {
        loading.controller?.abort();
      } catch {
        // 끊지 못해도 결과는 이미 버려졌다.
      }
      loading = null;
    }
    if (resuming) {
      resuming.live = false;
      resuming = null;
    }
  }

  function close() {
    cancel();
    const closing = context;
    context = null;
    output = null;
    if (!closing) return;
    try {
      closing.removeEventListener("statechange", publish);
    } catch {
      // 듣고 있지 않았다.
    }
    try {
      void Promise.resolve(closing.close()).catch(ignore);
    } catch {
      // 이미 닫힌 context 다.
    }
  }

  function open() {
    let created: AudioContext | null = null;
    try {
      created = host.createContext();
      const node = created.createGain();
      node.gain.value = gain;
      node.connect(created.destination);
      context = created;
      output = node;
    } catch {
      failure = "device";
      try {
        void Promise.resolve(created?.close()).catch(ignore);
      } catch {
        // 만들다 만 context 다.
      }
      return;
    }
    try {
      // 브라우저가 스스로 멈추거나(전화 · 다른 앱) 되살릴 때 설정 줄이 따라간다.
      created.addEventListener("statechange", publish);
    } catch {
      // 사건을 못 들어도 재생은 그때의 state 를 직접 본다.
    }
  }

  function resume(target: AudioContext) {
    if (resuming) resuming.live = false;
    const attempt = { live: true };
    resuming = attempt;
    const settle = (failed: boolean) => {
      if (!attempt.live) return;
      attempt.live = false;
      resuming = null;
      if (failed) failure = "device";
      publish();
    };
    try {
      Promise.resolve(target.resume()).then(
        () => settle(false),
        () => settle(true),
      );
    } catch {
      settle(true);
    }
  }

  function load(target: AudioContext) {
    const job = {
      controller:
        typeof AbortController === "function" ? new AbortController() : null,
      live: true,
    };
    loading = job;
    const signal = job.controller?.signal;
    Promise.all(
      cues.map(async (cue) => {
        const response = await host.fetch(files[cue].url, signal);
        // 관문이 돌려준 200 HTML 을 음원으로 읽지 않는다.
        if (
          !response.ok ||
          response.redirected ||
          !/^audio\//i.test(response.headers.get("content-type") ?? "")
        )
          throw new Error("음원이 아닌 응답");
        const data = await response.arrayBuffer();
        if (!job.live) throw new Error("취소됨");
        const buffer = await decode(target, data);
        if (!buffer) throw new Error("decode 실패");
        return [cue, buffer] as const;
      }),
    ).then(
      (entries) => {
        if (!job.live) return;
        loading = null;
        buffers = new Map(entries);
        publish();
      },
      () => {
        if (!job.live) return;
        job.live = false;
        loading = null;
        failure = "files";
        try {
          job.controller?.abort();
        } catch {
          // 나머지 응답은 어차피 버린다.
        }
        publish();
      },
    );
  }

  /** 사용자 조작의 같은 호출 안 — 여기서만 context 를 만들고 resume 하고 음원을 받는다. */
  function arm(reloadFiles: boolean) {
    restore();
    if (!enabled || host.hidden() || host.userActive() === false) return;
    if (failure === "device" || reloadFiles) failure = null;
    if (!context) open();
    if (!context) return;
    if (context.state !== "running") resume(context);
    if (!buffers && !loading && !failure) load(context);
  }

  function emit(cue: LearningSoundCue) {
    restore();
    if (!enabled || host.hidden()) return;
    const buffer = buffers?.get(cue);
    if (!context || !output || context.state !== "running" || !buffer) return;
    stop();
    try {
      const node = context.createBufferSource();
      source = node;
      node.buffer = buffer;
      node.connect(output);
      node.onended = () => {
        // 다 울렸다 — 멈출 것은 없고 자리만 비운다.
        if (source === node) source = null;
        try {
          node.disconnect();
        } catch {
          // 이미 끊긴 노드다.
        }
      };
      node.start();
    } catch {
      stop();
      failure = "device";
    }
  }

  function mute() {
    close();
    failure = null;
  }

  /** 공개 메서드의 겉 — 던지지 않고, 끝에서 한 번 알린다. */
  function method<Args extends unknown[]>(body: (...args: Args) => void) {
    return (...args: Args): void => {
      depth++;
      try {
        body(...args);
      } catch {
        // 소리의 실패는 여기서 끝난다.
      } finally {
        depth--;
      }
      publish();
    };
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      restore();
      return snapshot;
    },
    setEnabled: method((value: boolean) => {
      restore();
      enabled = value === true;
      try {
        host.writeStored(enabled ? "on" : "off");
      } catch {
        // 저장하지 못해도 이번 화면에서는 바뀐다.
      }
      if (enabled) arm(true);
      else mute();
    }),
    gesture: method(() => arm(false)),
    preview: method(() => {
      arm(true);
      emit("correct");
    }),
    play: method((cue: LearningSoundCue, eventKey: string) => {
      if (eventKey === lastKey) return;
      lastKey = eventKey;
      emit(cue);
    }),
    resetStudent: method((studentId: string | null) => {
      const next = studentId ?? null;
      if (next === student) return;
      student = next;
      cancel();
      lastKey = null;
    }),
    storageChanged: method((key: string | null, value: string | null) => {
      if (key !== null && key !== LEARNING_SOUND_KEY) return;
      restored = true;
      const next = key !== null && value === "on";
      if (next === enabled) return;
      enabled = next;
      if (!enabled) mute();
    }),
    pageHidden: method(() => {
      cancel();
      if (!context) return;
      try {
        void Promise.resolve(context.suspend()).catch(ignore);
      } catch {
        // 멈추지 못해도 가려진 동안에는 내지 않는다.
      }
    }),
    dispose: method(() => {
      close();
      failure = null;
    }),
  };
}
