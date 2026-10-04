/**
 * 학생 수학 효과음의 공급자 · 훅 · 기기 설정 (3자 합의 사운드 v3 1 · 2 · 8 · 9항, 2026-10-04).
 *
 * 엔진의 규칙은 `unit/learningSoundEngine.test.ts` 가 잰다. 여기서는 그 엔진이 **제품의 기본 브라우저 겹**
 * (`localStorage` · `window.AudioContext` · `fetch` · 화면 가림 · 다른 탭 · 언마운트)에 제대로 물렸는지와,
 * 공급자 밖이 아무것도 하지 않는지를 잰다.
 */
import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LearningSoundsProvider,
  useHasLearningSounds,
  useLearningSounds,
  type LearningSounds,
} from "@/components/math-srs/LearningSounds";
import { LEARNING_SOUND_KEY } from "@/lib/math-srs/learningSoundEngine";
import { LEARNING_MOTION_KEY } from "@/components/math-srs/LearningMotion";
import {
  SOUND_URLS,
  installSoundWorld,
  serveSounds,
  settle,
  soundWorld,
  type SoundWorld,
} from "../helpers/learningSoundWorld";

let world: SoundWorld;
let browser: ReturnType<typeof installSoundWorld>;
/** 훅이 렌더마다 돌려준 값 — 이름별 */
let seen: Record<string, LearningSounds[]>;

function Probe({ name = "첫" }: { name?: string }) {
  const sounds = useLearningSounds();
  const inside = useHasLearningSounds();
  (seen[name] ??= []).push(sounds);
  return (
    <div>
      <output aria-label={`${name} 상태`}>
        {`${inside ? "안" : "밖"}:${sounds.enabled ? "켬" : "끔"}:${sounds.status}`}
      </output>
      <button type="button" onClick={() => sounds.setEnabled(!sounds.enabled)}>
        {name} 효과음
      </button>
      <button type="button" onClick={sounds.preview}>
        {name} 미리 듣기
      </button>
      <button type="button" onClick={sounds.gesture}>
        {name} 조작
      </button>
    </div>
  );
}

const state = (name = "첫") => screen.getByLabelText(`${name} 상태`);
const press = (label: string) =>
  fireEvent.click(screen.getByRole("button", { name: label }));
const latest = (name = "첫") => seen[name]!.at(-1)!;
const serve = () => act(() => serveSounds(world));
const flush = () => act(() => settle());
const fetchMock = () => vi.mocked(fetch);

function mount(children = <Probe />) {
  return render(<LearningSoundsProvider>{children}</LearningSoundsProvider>);
}

/** 켜고 세 파일이 준비된 화면 */
async function ready() {
  const view = mount();
  press("첫 효과음");
  await serve();
  expect(state()).toHaveTextContent("안:켬:ready");
  return view;
}

beforeEach(() => {
  localStorage.clear();
  seen = {};
  // jsdom 에는 `navigator.userActivation` 이 없다 — 기본은 그대로(null) 둔다.
  world = soundWorld({ active: null });
  browser = installSoundWorld(world);
});
afterEach(() => {
  browser.restore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("공급자 밖", () => {
  it("아무것도 하지 않는다 — 꺼진 값 · 같은 함수 · 요청 0 · context 0", () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    const { rerender } = render(<Probe />);
    expect(state()).toHaveTextContent("밖:끔:off");
    press("첫 효과음");
    press("첫 미리 듣기");
    press("첫 조작");
    const sounds = latest();
    expect(() => {
      sounds.play("correct", "k1");
      sounds.play("complete", "k2");
      sounds.resetStudent("student-1");
      sounds.resetStudent(null);
    }).not.toThrow();
    rerender(<Probe />);
    expect(state()).toHaveTextContent("밖:끔:off");
    expect(latest()).toBe(sounds);
    expect(world.contexts).toHaveLength(0);
    expect(fetchMock()).not.toHaveBeenCalled();
    // 밖에서는 기기 설정도 건드리지 않는다
    expect(localStorage.getItem(LEARNING_SOUND_KEY)).toBe("on");
  });
});

describe("공급자", () => {
  it("DOM 을 더하지 않는다", () => {
    const { container } = mount(<p>본문</p>);
    expect(container.innerHTML).toBe("<p>본문</p>");
  });

  it("기본은 끔이고, 마운트는 요청도 context 도 만들지 않는다", async () => {
    mount();
    await flush();
    expect(state()).toHaveTextContent("안:끔:off");
    expect(world.contexts).toHaveLength(0);
    expect(fetchMock()).not.toHaveBeenCalled();
    expect(localStorage.getItem(LEARNING_SOUND_KEY)).toBeNull();
  });

  it("켜진 채 저장된 기기에서도 마운트는 설정만 읽는다", async () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    mount();
    await flush();
    expect(state()).toHaveTextContent("안:켬:idle");
    expect(world.contexts).toHaveLength(0);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("서버 렌더는 브라우저 저장소 값에 기대지 않는다", () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    expect(
      renderToString(
        <LearningSoundsProvider>
          <Probe />
        </LearningSoundsProvider>,
      ),
    ).toContain("안:끔:off");
    expect(world.contexts).toHaveLength(0);
  });

  it("켜는 조작에서 context 를 만들고 정본 파일 셋을 받는다 — 넘겨진 응답은 따라가지 않는다", async () => {
    mount();
    press("첫 효과음");
    expect(localStorage.getItem(LEARNING_SOUND_KEY)).toBe("on");
    expect(world.contexts).toHaveLength(1);
    expect(world.contexts[0]!.gains[0]!.gain.value).toBe(0.2);
    expect(world.requests.map((request) => request.url).sort()).toEqual(
      Object.values(SOUND_URLS).sort(),
    );
    for (const request of world.requests) {
      expect(request.init?.redirect).toBe("error");
      expect(request.signal).toBeInstanceOf(AbortSignal);
    }
    expect(state()).toHaveTextContent("안:켬:loading");

    await serve();
    expect(state()).toHaveTextContent("안:켬:ready");
    expect(world.played).toEqual([]);

    press("첫 미리 듣기");
    expect(world.played).toEqual([SOUND_URLS.correct]);
    expect(fetchMock()).toHaveBeenCalledTimes(3);
  });

  it("켜진 채 저장된 기기에서는 풀이의 조작이 준비를 시작하고, 확정된 답이 울린다", async () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    mount();
    press("첫 조작");
    expect(world.contexts).toHaveLength(1);
    await serve();
    expect(state()).toHaveTextContent("안:켬:ready");
    act(() => latest().play("soft", "student-1:request-1"));
    act(() => latest().play("soft", "student-1:request-1"));
    expect(world.played).toEqual([SOUND_URLS.soft]);
  });

  it("브라우저가 «사용자 조작이 아니다»라고 하면 만들지 않는다", async () => {
    world.active = false;
    mount();
    press("첫 효과음");
    press("첫 조작");
    expect(world.contexts).toHaveLength(0);
    expect(fetchMock()).not.toHaveBeenCalled();
    expect(state()).toHaveTextContent("안:켬:idle");
    world.active = true;
    press("첫 조작");
    expect(world.contexts).toHaveLength(1);
  });

  it("가려진 화면에서는 조작이 와도 만들지 않고, 준비돼 있어도 울리지 않는다", async () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    mount();
    // 사건 없이 가려진 상태만 — 엔진이 그때의 화면을 직접 본다
    world.hidden = true;
    press("첫 조작");
    press("첫 미리 듣기");
    expect(world.contexts).toHaveLength(0);
    expect(fetchMock()).not.toHaveBeenCalled();

    world.hidden = false;
    press("첫 조작");
    await serve();
    expect(state()).toHaveTextContent("안:켬:ready");
    world.hidden = true;
    act(() => latest().play("correct", "k1"));
    press("첫 미리 듣기");
    expect(world.played).toEqual([]);
  });

  it("함수는 상태가 바뀌어도 같은 것이다", async () => {
    mount();
    const first = latest();
    press("첫 효과음");
    await serve();
    const last = latest();
    expect(last.status).toBe("ready");
    expect(last).not.toBe(first);
    for (const name of [
      "setEnabled",
      "gesture",
      "preview",
      "play",
      "resetStudent",
    ] as const)
      expect(last[name]).toBe(first[name]);
  });

  it("두 소비자가 같은 설정을 본다", async () => {
    mount(
      <>
        <Probe />
        <Probe name="둘째" />
      </>,
    );
    press("둘째 효과음");
    expect(state()).toHaveTextContent("안:켬:loading");
    await serve();
    expect(state("둘째")).toHaveTextContent("안:켬:ready");
    expect(world.contexts).toHaveLength(1);
    expect(fetchMock()).toHaveBeenCalledTimes(3);
  });

  it("움직임 줄이기와 다른 칸에 저장된다", () => {
    localStorage.setItem(LEARNING_MOTION_KEY, "reduce");
    mount();
    expect(state()).toHaveTextContent("안:끔:off");
    press("첫 효과음");
    expect(localStorage.getItem(LEARNING_SOUND_KEY)).toBe("on");
    expect(localStorage.getItem(LEARNING_MOTION_KEY)).toBe("reduce");
    expect(LEARNING_SOUND_KEY).toBe("todays-math:learning-sound:v1");
  });

  it("저장소를 쓸 수 없어도 이번 화면에서는 켜지고 꺼진다", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mount();
    expect(state()).toHaveTextContent("안:끔:off");
    press("첫 효과음");
    await serve();
    expect(state()).toHaveTextContent("안:켬:ready");
    press("첫 효과음");
    expect(state()).toHaveTextContent("안:끔:off");
  });
});

describe("음원 · 기기의 실패는 화면 밖으로 던져지지 않는다", () => {
  it("404 와 200 HTML 은 재생 불가다", async () => {
    mount();
    press("첫 효과음");
    await act(async () => {
      world.requests[0]!.reply({
        ok: true,
        redirected: false,
        type: "text/html",
      });
      await settle();
    });
    expect(state()).toHaveTextContent("안:켬:unavailable");
    expect(world.decodes).toBe(0);
    expect(() => act(() => latest().play("correct", "k1"))).not.toThrow();
    expect(world.played).toEqual([]);
  });

  it("AudioContext 가 없는 기기는 재생 불가다", () => {
    vi.stubGlobal("AudioContext", undefined);
    mount();
    expect(() => press("첫 효과음")).not.toThrow();
    expect(state()).toHaveTextContent("안:켬:unavailable");
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("옛 Safari 의 webkitAudioContext 로도 선다", async () => {
    const Context = AudioContext;
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", Context);
    mount();
    press("첫 효과음");
    await serve();
    expect(state()).toHaveTextContent("안:켬:ready");
  });

  it("source 가 던져도 부른 쪽은 던지지 않고, 재생 불가로 보인다", async () => {
    await ready();
    world.startThrows = true;
    expect(() => act(() => latest().play("correct", "k1"))).not.toThrow();
    expect(state()).toHaveTextContent("안:켬:unavailable");
  });
});

describe("멈춤", () => {
  it("다른 탭에서 끄면 즉시 멈추고 꺼진다", async () => {
    await ready();
    act(() => latest().play("complete", "k1"));
    const context = world.contexts[0]!;
    act(() => browser.otherTab("off"));
    expect(context.sources[0]!.stopped).toBe(1);
    expect(context.closed).toBe(1);
    expect(state()).toHaveTextContent("안:끔:off");

    // 다른 탭에서 켜면 설정만 켜진다 — 만들지 않는다
    act(() => browser.otherTab("on"));
    expect(state()).toHaveTextContent("안:켬:idle");
    expect(world.contexts).toHaveLength(1);
  });

  it("화면이 가려지면 멈추고, 돌아와도 다음 조작까지 잇지 않는다", async () => {
    await ready();
    act(() => latest().play("complete", "k1"));
    const context = world.contexts[0]!;
    act(() => browser.setHidden(true));
    expect(context.sources[0]!.stopped).toBe(1);
    expect(context.suspended).toBe(1);
    expect(state()).toHaveTextContent("안:켬:idle");

    act(() => browser.setHidden(false));
    await flush();
    expect(context.resumed).toBe(1);
    expect(context.suspended).toBe(1);
    act(() => latest().play("correct", "k2"));
    expect(world.played).toEqual([SOUND_URLS.complete]);

    press("첫 조작");
    await flush();
    expect(context.resumed).toBe(2);
    expect(state()).toHaveTextContent("안:켬:ready");
  });

  it("언마운트는 context 를 닫고 더는 사건을 듣지 않는다", async () => {
    const { unmount } = await ready();
    act(() => latest().play("complete", "k1"));
    const context = world.contexts[0]!;
    unmount();
    expect(context.sources[0]!.stopped).toBe(1);
    expect(context.closed).toBe(1);
    browser.setHidden(true);
    browser.otherTab("off");
    expect(context.suspended).toBe(0);
    expect(context.closed).toBe(1);
  });

  it("StrictMode 의 다시 마운트에서도 만들지 않고, 조작하면 한 번만 만든다", async () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    render(
      <StrictMode>
        <LearningSoundsProvider>
          <Probe />
        </LearningSoundsProvider>
      </StrictMode>,
    );
    await flush();
    expect(world.contexts).toHaveLength(0);
    expect(fetchMock()).not.toHaveBeenCalled();
    press("첫 조작");
    expect(world.contexts).toHaveLength(1);
    await serve();
    expect(state()).toHaveTextContent("안:켬:ready");
    press("첫 미리 듣기");
    expect(world.played).toEqual([SOUND_URLS.correct]);
  });
});
