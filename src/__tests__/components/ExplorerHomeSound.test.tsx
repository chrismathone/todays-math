/**
 * 학생 수학 홈 «학습 설정»의 기기 설정 — 효과음 (3자 합의 사운드 v3 2항 · 조정 ⑶, 2026-10-04).
 *
 * - «이 기기 설정»에 «움직임 줄이기»와 같은 문법으로 효과음 스위치와 «미리 듣기»가 선다.
 * - 학년 · 단원 잠금, 상자 저장, 다른 요청과 무관하게 눌리고 서버에 아무것도 보내지 않는다.
 * - 켜기는 준비만 한다. 미리 듣기는 켜진 때만 눌리고, 준비된 뒤 직접 누를 때 한 번 난다.
 * - 준비 중 · 준비됨 · 재생 불가는 설명 줄이 말한다(`data-learning-sound-status` 는 브라우저 검증 표지).
 * - 효과음 공급자 밖(교사 · 개발 화면)에서는 줄 자체가 없다 — 눌러도 소리가 없는 스위치를 보이지 않는다.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExplorerHome from "@/components/math-explorers/ExplorerHome";
import {
  LEARNING_MOTION_KEY,
  LearningMotionScope,
} from "@/components/math-srs/LearningMotion";
import { LearningSoundsProvider } from "@/components/math-srs/LearningSounds";
import { LEARNING_SOUND_KEY } from "@/lib/math-srs/learningSoundEngine";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import type { ExpeditionMission } from "@/contracts/mathExpedition.contract";
import {
  SOUND_URLS,
  installSoundWorld,
  serveSounds,
  settle,
  soundWorld,
  type SoundWorld,
} from "../helpers/learningSoundWorld";

const now = "2026-09-26";
const student = { id: "student-ui", name: "학생", className: "테스트반" };

let osReduced = false;
const media = {
  get matches() {
    return osReduced;
  },
  media: "(prefers-reduced-motion: reduce)",
  addEventListener: () => {},
  removeEventListener: () => {},
};

const activeMission: ExpeditionMission = {
  kind: "elementary",
  route: "bank",
  unitId: "e3-multiply",
  title: "곱셈",
  subtitle: "초등 3학년",
  goal: 10,
  id: "00000000-0000-4000-8000-000000000001",
  date: now,
  answered: 4,
  retryRemaining: 0,
  status: "active",
  sourceSessionId: "source",
  sourceSessionIds: ["source"],
  startedAt: `${now}T00:00:00.000Z`,
  completedAt: null,
};

function view(
  expedition: Partial<NonNullable<ExplorerState["expedition"]>> = {},
): ExplorerState {
  const base = explorerView(createExplorerState(student.id, 3), now);
  return {
    ...base,
    student,
    revision: 0,
    feedback: null,
    expedition: {
      mission: null,
      next: {
        kind: "elementary",
        route: "bank",
        unitId: "e3-multiply",
        title: "곱셈",
        subtitle: "초등 3학년",
        goal: 10,
      },
      completedToday: false,
      canStart: true,
      ...expedition,
    },
  };
}

let world: SoundWorld;
let browser: ReturnType<typeof installSoundWorld>;

/** 학생 수학 경계 그대로 — 움직임 뿌리 안에 효과음 공급자, 그 안에 홈 */
function home(
  state: ExplorerState = view(),
  props: Partial<Parameters<typeof ExplorerHome>[0]> = {},
  { sounds = true }: { sounds?: boolean } = {},
) {
  const onAction = vi.fn();
  const screenHome = (
    <ExplorerHome
      state={state}
      busy={false}
      onAction={onAction}
      onStart={vi.fn()}
      onResume={vi.fn()}
      onRetry={vi.fn()}
      onInspect={vi.fn()}
      onReviewDay={vi.fn()}
      {...props}
    />
  );
  const result = render(
    <LearningMotionScope>
      {sounds ? (
        <LearningSoundsProvider>{screenHome}</LearningSoundsProvider>
      ) : (
        screenHome
      )}
    </LearningMotionScope>,
  );
  return { ...result, onAction };
}

const openSettings = () =>
  fireEvent.click(screen.getByText("학습 설정", { selector: "button" }));
const sheet = () => screen.getByRole("dialog", { name: "학습 설정" });
const soundSwitch = () => screen.getByRole("switch", { name: "효과음" });
const motionSwitch = () =>
  screen.getByRole("switch", { name: "움직임 줄이기" });
const preview = () => screen.getByRole("button", { name: "미리 듣기" });
/** 효과음 덩이(검증 표지가 붙은 자리)와 그 설명 줄 */
const block = () =>
  sheet().querySelector<HTMLElement>("[data-learning-sound-status]")!;
const marker = () => block().getAttribute("data-learning-sound-status");
const note = () => block().querySelector("p")!.textContent!;
const serve = () => act(() => serveSounds(world));

beforeEach(() => {
  osReduced = false;
  localStorage.clear();
  world = soundWorld({ active: null });
  browser = installSoundWorld(world);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => {
  browser.restore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("기기 설정 «효과음»", () => {
  it("«이 기기 설정» 안, 움직임 줄이기 다음에 스위치와 미리 듣기가 선다", () => {
    home();
    expect(screen.queryByRole("switch")).toBeNull();
    openSettings();
    const device = within(sheet()).getByRole("region", {
      name: "이 기기 설정",
    });
    expect(
      within(device)
        .getAllByRole("switch")
        .map((control) => control.firstElementChild!.textContent),
    ).toEqual(["움직임 줄이기", "효과음"]);
    expect(within(device).getByRole("button", { name: "미리 듣기" })).toBe(
      preview(),
    );
    expect(block()).toContainElement(soundSwitch());
    expect(block()).toContainElement(preview());
    // 서버 · 프로필 · 음량 조절은 없다
    expect(within(device).queryByRole("slider")).toBeNull();
  });

  it("기본은 꺼짐 — 미리 듣기는 잠기고, 이 기기의 설정임을 말한다", () => {
    home();
    openSettings();
    expect(soundSwitch()).toHaveAttribute("aria-checked", "false");
    expect(soundSwitch()).toHaveTextContent("꺼짐");
    expect(soundSwitch()).toBeEnabled();
    expect(preview()).toBeDisabled();
    expect(marker()).toBe("off");
    expect(soundSwitch()).toHaveAccessibleDescription(
      "켜면 답을 확인할 때 짧은 소리가 나요. 이 기기에만 저장돼요.",
    );
    expect(world.contexts).toHaveLength(0);
    expect(world.requests).toHaveLength(0);
  });

  it("켜기는 준비만 한다 — 준비 중의 미리 듣기는 버리고, 준비된 뒤 누르면 정답 소리가 한 번 난다", async () => {
    home();
    openSettings();
    fireEvent.click(soundSwitch());
    expect(soundSwitch()).toHaveAttribute("aria-checked", "true");
    expect(soundSwitch()).toHaveTextContent("켜짐");
    expect(localStorage.getItem(LEARNING_SOUND_KEY)).toBe("on");
    expect(preview()).toBeEnabled();
    expect(marker()).toBe("loading");
    expect(note()).toBe("소리를 준비하는 중이에요. 이 기기에만 저장돼요.");

    // 준비 중에도 눌리지만 소리는 없고, 설명은 그대로다
    fireEvent.click(preview());
    expect(world.played).toEqual([]);
    expect(marker()).toBe("loading");
    expect(note()).toBe("소리를 준비하는 중이에요. 이 기기에만 저장돼요.");

    await serve();
    expect(marker()).toBe("ready");
    expect(note()).toBe("소리가 준비됐어요. 이 기기에만 저장돼요.");
    expect(preview()).toHaveAccessibleDescription(
      "소리가 준비됐어요. 이 기기에만 저장돼요.",
    );
    // 준비된 뒤 저절로 나지 않는다
    expect(world.played).toEqual([]);

    fireEvent.click(preview());
    expect(world.played).toEqual([SOUND_URLS.correct]);
    fireEvent.click(preview());
    expect(world.played).toEqual([SOUND_URLS.correct, SOUND_URLS.correct]);
    expect(world.contexts).toHaveLength(1);
  });

  it("끄면 울리던 소리가 멈추고 미리 듣기가 다시 잠긴다", async () => {
    home();
    openSettings();
    fireEvent.click(soundSwitch());
    await serve();
    fireEvent.click(preview());
    const context = world.contexts[0]!;
    fireEvent.click(soundSwitch());
    expect(context.sources[0]!.stopped).toBe(1);
    expect(context.closed).toBe(1);
    expect(soundSwitch()).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem(LEARNING_SOUND_KEY)).toBe("off");
    expect(preview()).toBeDisabled();
    expect(marker()).toBe("off");
  });

  it("켜진 채 저장된 기기는 켜짐으로 열리고, 미리 듣기가 준비를 시작한다", async () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    home();
    openSettings();
    expect(soundSwitch()).toHaveAttribute("aria-checked", "true");
    expect(marker()).toBe("idle");
    expect(note()).toBe(
      "미리 듣기를 누르면 소리를 준비해요. 이 기기에만 저장돼요.",
    );
    expect(world.contexts).toHaveLength(0);

    fireEvent.click(preview());
    expect(marker()).toBe("loading");
    expect(world.played).toEqual([]);
    await serve();
    expect(marker()).toBe("ready");
    expect(world.played).toEqual([]);
  });

  it("음원을 받지 못하면 재생 불가를 말하고, 미리 듣기가 다시 받는다", async () => {
    home();
    openSettings();
    fireEvent.click(soundSwitch());
    await act(async () => {
      world.requests
        .splice(0)[0]!
        .reply({ ok: false, redirected: false, type: "text/html" });
      await settle();
    });
    expect(marker()).toBe("unavailable");
    expect(note()).toBe(
      "지금은 소리를 낼 수 없어요. 풀이는 그대로 할 수 있어요.",
    );
    // 설정은 켜진 채다 — 보이는 값이 실제 설정이다
    expect(soundSwitch()).toHaveAttribute("aria-checked", "true");
    expect(preview()).toBeEnabled();

    fireEvent.click(preview());
    expect(marker()).toBe("loading");
    await serve();
    expect(marker()).toBe("ready");
  });

  it("미션 진행 · 저장 · 요청 중에도 기기 설정은 눌리고 학년 · 목표는 바꾸지 않는다", async () => {
    const { onAction } = home(view({ mission: activeMission, next: null }), {
      busy: true,
      claims: ["chest-waiting"],
    });
    openSettings();
    expect(
      within(sheet()).queryByLabelText("학년 선택"),
    ).not.toBeInTheDocument();

    expect(soundSwitch()).toBeEnabled();
    fireEvent.click(soundSwitch());
    expect(soundSwitch()).toHaveAttribute("aria-checked", "true");
    expect(preview()).toBeEnabled();
    await serve();
    fireEvent.click(preview());
    expect(world.played).toEqual([SOUND_URLS.correct]);
    // 기기 설정은 학습 기록 요청을 보내지 않는다
    expect(onAction).not.toHaveBeenCalled();
  });

  it("움직임 줄이기와 서로 건드리지 않는다 — 기기(OS)가 움직임을 줄여도 효과음은 눌린다", () => {
    osReduced = true;
    home();
    openSettings();
    expect(motionSwitch()).toBeDisabled();
    expect(soundSwitch()).toBeEnabled();
    fireEvent.click(soundSwitch());
    expect(soundSwitch()).toHaveAttribute("aria-checked", "true");
    expect(motionSwitch()).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(LEARNING_MOTION_KEY)).toBeNull();

    fireEvent.click(soundSwitch());
    expect(soundSwitch()).toHaveAttribute("aria-checked", "false");
    expect(motionSwitch()).toHaveAttribute("aria-checked", "true");
  });

  it("움직임 줄이기를 눌러도 효과음은 그대로다", () => {
    home();
    openSettings();
    fireEvent.click(motionSwitch());
    expect(motionSwitch()).toHaveAttribute("aria-checked", "true");
    expect(soundSwitch()).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem(LEARNING_SOUND_KEY)).toBeNull();
    expect(world.contexts).toHaveLength(0);
  });

  it("설명 문구는 상태마다 다르고 느낌표가 없다", async () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    home();
    openSettings();
    const lines = new Map<string, string>();
    const record = () => lines.set(marker()!, note());
    record(); // idle
    fireEvent.click(preview());
    record(); // loading
    await serve();
    record(); // ready
    world.startThrows = true;
    fireEvent.click(preview());
    record(); // unavailable
    fireEvent.click(soundSwitch());
    record(); // off
    expect([...lines.keys()].sort()).toEqual(
      ["idle", "loading", "off", "ready", "unavailable"].sort(),
    );
    expect(new Set(lines.values()).size).toBe(5);
    for (const line of lines.values()) expect(line).not.toMatch(/[!！]/);
    expect(sheet().textContent).not.toMatch(/[!！]/);
  });

  it("다른 시트(도감 · 우리 기지)에는 효과음이 없다", () => {
    home();
    fireEvent.click(screen.getByText("도감", { selector: "button" }));
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "미리 듣기" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "나의 개념 도감 닫기" }),
    );
    fireEvent.click(screen.getByText("우리 기지", { selector: "button" }));
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: "미리 듣기" })).toBeNull();
  });
});

describe("효과음 공급자 밖의 홈", () => {
  it("효과음 줄을 그리지 않는다 — 움직임 줄이기만 남는다", () => {
    localStorage.setItem(LEARNING_SOUND_KEY, "on");
    home(view(), {}, { sounds: false });
    openSettings();
    expect(within(sheet()).getByRole("switch")).toBe(motionSwitch());
    expect(screen.queryByRole("switch", { name: "효과음" })).toBeNull();
    expect(screen.queryByRole("button", { name: "미리 듣기" })).toBeNull();
    expect(sheet().querySelector("[data-learning-sound-status]")).toBeNull();
    expect(world.contexts).toHaveLength(0);
  });
});
