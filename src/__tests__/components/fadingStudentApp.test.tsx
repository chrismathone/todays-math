import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FadingApp } from "@/components/fading/FadingApp";
import { StudentFadingApp } from "@/components/fading/StudentFadingApp";
import { useFadingRelearn } from "@/components/fading/useFadingRelearn";
import type { FadingAction } from "@/contracts/fadingApi.contract";
import type { FadingRelearnAction } from "@/contracts/fadingRelearn.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import type { FadingConcept } from "@/lib/fading/concepts";
import { erasedTargets } from "@/lib/fading/erasure";
import {
  createLocalFadingSource,
  type LocalFadingSource,
} from "@/lib/fading/local";
import {
  createLocalFadingRelearnSource,
  type LocalFadingRelearnSource,
} from "@/lib/fading/relearnLocal";
import { FadingSourceError, type FadingSource } from "@/lib/fading/source";
import { STUDENT_CHANGED_MESSAGE } from "@/lib/studentRouteAccess";

/**
 * 독립 `/learn/fading` 앱 — 화면을 연 학생에게 고정(D1)되고, 단기 재학습(1분 · 5분)이 탐험 안과 같이 돈다(D5).
 * 서버는 메모리의 대역이다: 학생 API 의 네 길과 재학습 길을 로컬 원천으로 답하고, 로그인한 학생(`current`)이 바뀌면
 * 머리가 다른 요청을 `STUDENT_CHANGED` 로 돌려보낸다(라우트와 같은 규칙 — `fadingRoutes.test.ts`).
 */
vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
vi.stubGlobal("scrollTo", vi.fn());

const today = "2026-10-07";
const T0 = Date.UTC(2026, 9, 7, 3, 0, 0);
const MIN = 60_000;
const FIVE = 300_000;
const concept: FadingConcept = {
  id: "student-app-test",
  section: "중2::도형::삼각형",
  level: "하",
  ordinal: 1,
  siblings: 1,
  propositions: ["수직이등분선", "외심", "반지름"].map((text, index) => ({
    id: `sa-p${index}`,
    term: `성질 ${index + 1}`,
    kind: "정의",
    pieces: [
      { kind: "text", text: `성질 ${index + 1}의 핵심은 ` },
      { kind: "target", target: { id: `sa-p${index}#1`, text, tier: "text" } },
      { kind: "text", text: "입니다." },
    ],
  })),
};

/** 카드 풀이를 4단계 직전까지 — 2 · 3단계는 맞게 채운다(등록되는 것이 없다). */
async function toFour(main: LocalFadingSource) {
  await main.act({ action: "pick", conceptId: concept.id });
  const opened = await main.act({ action: "open", conceptId: concept.id });
  const ref = { conceptId: concept.id, sessionId: opened.session!.id };
  await main.act({ action: "read", ...ref, seen: "123" });
  for (const step of [2, 3] as const) {
    const tray = chipTray(concept, step, { seed: opened.session!.seed });
    const used = new Set<string>();
    const placements = erasedTargets(concept, step).map((target) => {
      const chip = tray.find(
        (item) => !used.has(item.id) && chipFits(concept, target.id, item),
      )!;
      used.add(chip.id);
      return { targetId: target.id, chipId: chip.id };
    });
    await main.act({ action: "step", ...ref, step, placements });
  }
  return ref;
}

type Call = { url: string; method: string; headers: Record<string, string> };

/** 학생 API 의 대역 — 로컬 원천으로 답하고, 머리의 학생이 `current` 와 다르면 라우트처럼 `STUDENT_CHANGED` 다. */
function server(
  main: LocalFadingSource,
  relearn: LocalFadingRelearnSource,
  options: { current: string; delay?: (url: string) => Promise<void> | null },
) {
  const calls: Call[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });
  const failure = (error: unknown) => {
    if (error instanceof FadingSourceError)
      return json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    throw error;
  };
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const method = init?.method ?? "GET";
    calls.push({ url, method, headers });
    const wait = options.delay?.(url);
    if (wait) await wait;
    const expected = headers["x-student-id"];
    if (expected !== undefined && expected !== options.current)
      return json(
        {
          error: { code: "STUDENT_CHANGED", message: STUDENT_CHANGED_MESSAGE },
        },
        409,
      );
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    try {
      if (url === "/api/learn/fading")
        return json({
          data: body
            ? await main.act(body as FadingAction)
            : await main.state(),
        });
      if (url === "/api/learn/fading/relearn") {
        if (!body) return json({ data: await relearn.queue() });
        const action = body as FadingRelearnAction;
        if (action.action === "record") {
          const done = await relearn.record(action.observation);
          return json({ data: { ...done, result: null } });
        }
        const done =
          action.action === "grade"
            ? await relearn.grade(action.attempt)
            : await relearn.judge(action.judgement);
        return json({ data: { ...done, applied: null } });
      }
      if (url.startsWith("/api/learn/fading/catalog"))
        return json({
          data: await main.catalog(
            new URL(url, "http://x").searchParams.get("grade") ?? undefined,
          ),
        });
      if (url.startsWith("/api/learn/fading/concepts/"))
        return json({
          data: await main.concept(
            decodeURIComponent(url.slice("/api/learn/fading/concepts/".length)),
          ),
        });
      throw new Error(`unexpected ${url}`);
    } catch (error) {
      return failure(error);
    }
  });
  return { fetcher, calls };
}

function world(now: () => number = () => T0) {
  const main = createLocalFadingSource({
    concepts: [concept],
    today,
    cards: true,
    now,
  });
  const relearn = createLocalFadingRelearnSource({ main, concepts: [concept] });
  return { main, relearn };
}

function answer(text: string) {
  const input = screen.getByRole("textbox", { name: /빈칸 답 입력/ });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(input.closest("form")!);
}
const changedNotice = () =>
  screen.findByRole("heading", { name: "다른 학생으로 로그인되어 있습니다" });

beforeEach(() => {
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
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("독립 앱은 화면을 연 학생에게 고정된다(D1)", () => {
  it("상태 · 대기열 · 목록 · 개념 · 행동 — 모든 요청이 그 학생의 머리를 싣는다", async () => {
    const { main, relearn } = world();
    await toFour(main);
    const { fetcher, calls } = server(main, relearn, { current: "student-a" });
    vi.stubGlobal("fetch", fetcher);
    render(<StudentFadingApp studentId="student-a" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "풀이 이어 하기" }),
    );
    await screen.findByRole("textbox", { name: /빈칸 답 입력/ });
    answer("외심"); // 틀린 답 → `miss` 가 나간다
    await waitFor(() =>
      expect(
        calls.filter((call) => call.method === "POST").length,
      ).toBeGreaterThanOrEqual(2),
    );
    await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "풀이 나가기" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "나가기",
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "개념 목록" }));
    await screen.findByRole("heading", { name: "개념 목록" });
    const urls = new Set(calls.map((call) => call.url.split("?")[0]));
    expect([...urls]).toEqual(
      expect.arrayContaining([
        "/api/learn/fading",
        "/api/learn/fading/relearn",
        "/api/learn/fading/catalog",
      ]),
    );
    for (const call of calls)
      expect(call.headers["x-student-id"]).toBe("student-a");
  });

  it("최초 읽기가 «학생이 바뀜»이면 홈 대신 그 안내와 새로고침뿐이다 — 다시 읽기도 재학습 모달도 없다", async () => {
    const { main, relearn } = world();
    const { fetcher } = server(main, relearn, { current: "student-b" });
    vi.stubGlobal("fetch", fetcher);
    render(<StudentFadingApp studentId="student-a" />);
    await changedNotice();
    expect(
      screen.getByRole("button", { name: "새로고침" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "다시 읽기" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "오늘의 복습" }),
    ).not.toBeInTheDocument();
  });

  it("목록 읽기가 «학생이 바뀜»이면 앱을 내린다", async () => {
    const { main, relearn } = world();
    const login = { current: "student-a" };
    const { fetcher } = server(main, relearn, login);
    vi.stubGlobal("fetch", fetcher);
    render(<StudentFadingApp studentId="student-a" />);
    await screen.findByRole("heading", { name: "오늘의 복습" });
    login.current = "student-b";
    fireEvent.click(screen.getByRole("button", { name: "개념 목록" }));
    await changedNotice();
  });

  it("풀이 중의 행동이 «학생이 바뀜»이면 대기 행동을 버리고 다시 보내지 않으며 풀이 화면을 내린다", async () => {
    const { main, relearn } = world();
    await toFour(main);
    const login = { current: "student-a" };
    const { fetcher, calls } = server(main, relearn, login);
    vi.stubGlobal("fetch", fetcher);
    render(<StudentFadingApp studentId="student-a" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "풀이 이어 하기" }),
    );
    await screen.findByRole("textbox", { name: /빈칸 답 입력/ });
    const before = calls.length;
    login.current = "student-b";
    answer("외심"); // 틀린 답 → `miss` 가 나간다 → 409
    await changedNotice();
    const posts = () =>
      calls
        .slice(before)
        .filter(
          (call) => call.method === "POST" && call.url === "/api/learn/fading",
        );
    expect(posts()).toHaveLength(1);
    expect(
      screen.queryByRole("textbox", { name: /빈칸 답 입력/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "저장 다시 시도" }),
    ).not.toBeInTheDocument();
    await act(async () => {});
    expect(posts()).toHaveLength(1);
    // 다른 학생의 기록은 그대로다 — 서버 대역이 받지 않았다.
    expect(main.snapshot().session!.missedAtFour).toEqual([]);
  });

  it("대기열 읽기가 «학생이 바뀜»이면 앱을 내리고, 그 뒤에 도착한 상태 읽기의 성공은 무시한다", async () => {
    const { main, relearn } = world();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { fetcher } = server(main, relearn, {
      current: "student-a",
      delay: (url) => (url === "/api/learn/fading" ? held : null),
    });
    // 상태 읽기는 늦고, 대기열 읽기는 바로 «학생이 바뀜»이다.
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (url, init) => {
      if (url === "/api/learn/fading/relearn")
        return new Response(
          JSON.stringify({
            error: {
              code: "STUDENT_CHANGED",
              message: STUDENT_CHANGED_MESSAGE,
            },
          }),
          { status: 409 },
        );
      return original(url, init);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<StudentFadingApp studentId="student-a" />);
    await changedNotice();
    await act(async () => {
      release();
      await held;
    });
    await act(async () => {});
    expect(
      screen.getByRole("heading", {
        name: "다른 학생으로 로그인되어 있습니다",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "오늘의 복습" }),
    ).not.toBeInTheDocument();
  });

  it("내용이 바뀐 409(CONFLICT)는 지금처럼 상태를 다시 읽어 맞춘다 — 앱을 내리지 않는다", async () => {
    const { main, relearn } = world();
    await toFour(main);
    const { fetcher } = server(main, relearn, { current: "student-a" });
    const original = fetcher.getMockImplementation()!;
    let once = true;
    fetcher.mockImplementation(async (url, init) => {
      if (
        url === "/api/learn/fading" &&
        init?.method === "POST" &&
        once &&
        JSON.parse(init.body as string).action === "miss"
      ) {
        once = false;
        return new Response(
          JSON.stringify({
            error: {
              code: "CONFLICT",
              message: "풀이 내용이 바뀌어 화면을 다시 불러왔습니다.",
            },
          }),
          { status: 409 },
        );
      }
      return original(url, init);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<StudentFadingApp studentId="student-a" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "풀이 이어 하기" }),
    );
    await screen.findByRole("textbox", { name: /빈칸 답 입력/ });
    answer("외심");
    await screen.findByText("풀이 내용이 바뀌어 화면을 다시 불러왔습니다.");
    expect(
      screen.getByRole("textbox", { name: /빈칸 답 입력/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "다른 학생으로 로그인되어 있습니다",
      }),
    ).not.toBeInTheDocument();
  });
});

/** 독립 앱의 껍데기 그대로(`StudentFadingApp`)를 서버 없이 — 원천만 로컬이다. */
function Host({
  main,
  relearnSource,
}: {
  main: FadingSource;
  relearnSource: LocalFadingRelearnSource;
}) {
  const [changed, setChanged] = useState(false);
  const access = useCallback((failure: FadingSourceError) => {
    if (failure.code === "STUDENT_CHANGED") setChanged(true);
  }, []);
  const relearn = useFadingRelearn(relearnSource, access);
  return (
    <FadingApp
      source={main}
      relearn={relearn}
      onAccessFailure={access}
      studentChanged={changed}
    />
  );
}

describe("독립 앱의 단기 재학습(D5) — 탐험 안과 같은 1분 · 5분", () => {
  it("첫 평가 → 등록 → 1분 뒤에는 아직 · 5분 뒤 «추가 확인 시작» → 성공이면 종료(확인 한 번 · 결정 2) · 복귀해도 대기열이 남는다", async () => {
    const clock = { now: T0 };
    const { main, relearn } = world(() => clock.now);
    await toFour(main);
    const record = vi.spyOn(relearn, "record");
    render(<Host main={main} relearnSource={relearn} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "풀이 이어 하기" }),
    );
    await screen.findByRole("textbox", { name: /빈칸 답 입력/ });
    answer("수직이등분선");
    answer("외심");
    answer("반지름");
    await screen.findByText("4단계를 마쳤어요");
    for (let index = 0; index < concept.propositions.length; index += 1)
      fireEvent.click(
        screen.queryByRole("button", { name: "다음 문장 대조" }) ??
          screen.getByRole("button", { name: "대조 마치기" }),
      );
    fireEvent.click(screen.getByRole("button", { name: /^알맞음/ }));
    await screen.findByRole("heading", { name: "풀이를 마쳤어요" });
    // 평가와 함께 등록됐다 — 따로 보낸 증거는 없다.
    expect(record).not.toHaveBeenCalled();
    expect(main.snapshot().relearn?.items).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "오늘의 복습으로" }));
    await screen.findByRole("heading", { name: "오늘의 복습" });
    expect(screen.getByLabelText("추가 재학습 현황")).toHaveTextContent(
      "기다리는 문장 3",
    );
    expect(
      screen.queryByRole("button", { name: "추가 확인 시작" }),
    ).not.toBeInTheDocument();
    // 처음 배운 풀이의 틀리지 않은 명제는 5분 뒤 확인 한 번이다 — 1분 뒤에는 아직이다(결정 2).
    clock.now = T0 + MIN;
    fireEvent(window, new Event("focus"));
    await act(async () => {});
    expect(
      screen.queryByRole("button", { name: "추가 확인 시작" }),
    ).not.toBeInTheDocument();
    clock.now = T0 + FIVE;
    fireEvent(window, new Event("focus"));
    fireEvent.click(
      await screen.findByRole("button", { name: "추가 확인 시작" }),
    );
    const check = await screen.findByRole("dialog", {
      name: "조금 뒤, 다시 떠올려 볼까요?",
    });
    fireEvent.change(within(check).getByLabelText("빈칸 1"), {
      target: { value: "수직이등분선" },
    });
    fireEvent.click(within(check).getByRole("button", { name: "답 제출" }));
    await within(check).findByText(/이 문장의 추가 확인을 마쳤어요/);
    fireEvent.click(
      within(check).getByRole("button", { name: "원래 학습으로" }),
    );
    // 새로고침 — 저장 칸으로 다시 열어도 대기열이 그대로다.
    cleanup();
    const reopened = createLocalFadingSource({
      concepts: [concept],
      today,
      cards: true,
      fading: main.snapshot(),
      now: () => clock.now,
    });
    const reopenedRelearn = createLocalFadingRelearnSource({
      main: reopened,
      concepts: [concept],
    });
    expect(reopened.snapshot().relearn!.items).toHaveLength(2);
    clock.now = T0 + FIVE + MIN;
    render(<Host main={reopened} relearnSource={reopenedRelearn} />);
    // 남은 둘 — 보이는 문장에 맞는 답을 쓴다. 5분 확인 한 번이라 맞히면 나간다.
    const outcomes: string[] = [];
    for (let round = 0; round < concept.propositions.length - 1; round += 1) {
      fireEvent.click(
        await screen.findByRole("button", { name: "추가 확인 시작" }),
      );
      const again = await screen.findByRole("dialog", {
        name: "조금 뒤, 다시 떠올려 볼까요?",
      });
      const index = concept.propositions.findIndex((p) =>
        again.textContent!.includes(
          `성질 ${p.id.slice(-1) === "0" ? 1 : p.id.slice(-1) === "1" ? 2 : 3}의 핵심은`,
        ),
      );
      fireEvent.change(within(again).getByLabelText("빈칸 1"), {
        target: { value: ["수직이등분선", "외심", "반지름"][index]! },
      });
      fireEvent.click(within(again).getByRole("button", { name: "답 제출" }));
      const status = await within(again).findByRole("status");
      outcomes.push(`${concept.propositions[index]!.id}:${status.textContent}`);
      fireEvent.click(
        within(again).getByRole("button", { name: "원래 학습으로" }),
      );
    }
    expect(outcomes).toHaveLength(2);
    expect(
      outcomes.every((o) => /이 문장의 추가 확인을 마쳤어요/.test(o)),
    ).toBe(true);
    expect(reopened.snapshot().relearn!.items).toEqual([]);
    // 장기 일정은 그대로다 — 분 단위 확인이 복습 횟수를 더하지 않는다.
    expect(reopened.snapshot().concepts[concept.id]).toMatchObject({
      reviews: 1,
    });
  });

  it("준비된 확인은 타이핑 중에 끼어들지 않고 문장을 마친 경계에서만 열리며, 그동안 본 풀이는 멈춘다", async () => {
    const clock = { now: T0 };
    const { main, relearn } = world(() => clock.now);
    const ref = await toFour(main);
    await relearn.record({
      kind: "step",
      ...ref,
      step: 4,
      placements: [],
      gaveUpCards: ["sa-p2"],
    });
    clock.now = T0 + MIN;
    render(<Host main={main} relearnSource={relearn} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "풀이 이어 하기" }),
    );
    const input = await screen.findByRole("textbox", { name: /빈칸 답 입력/ });
    await waitFor(() =>
      expect(screen.getByLabelText("추가 재학습 현황")).toHaveTextContent(
        "지금 1",
      ),
    );
    fireEvent.change(input, { target: { value: "쓰는 중" } });
    fireEvent(window, new Event("focus"));
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(input).toHaveValue("쓰는 중");
    fireEvent.change(input, { target: { value: "수직이등분선" } });
    fireEvent.submit(input.closest("form")!);
    const check = await screen.findByRole("dialog", {
      name: "조금 뒤, 다시 떠올려 볼까요?",
    });
    expect(
      document.querySelector('[data-fading-session="true"]'),
    ).toHaveAttribute("inert");
    fireEvent.click(
      within(check).getByRole("button", { name: "추가 확인 닫기" }),
    );
    await waitFor(() =>
      expect(
        document.querySelector('[data-fading-session="true"]'),
      ).not.toHaveAttribute("inert"),
    );
  });

  it("연습(복습일 전)은 아무것도 보내지 않고 대기열에도 들지 않는다", async () => {
    const clock = { now: T0 };
    const { main, relearn } = world(() => clock.now);
    await toFour(main);
    const ref = {
      conceptId: concept.id,
      sessionId: (await main.state()).session!.id,
    };
    await main.act({
      action: "step",
      ...ref,
      step: 4,
      placements: concept.propositions.map((p, i) => ({
        targetId: `${p.id}#1`,
        text: ["수직이등분선", "외심", "반지름"][i]!,
      })),
    });
    await main.act({
      action: "rate",
      ...ref,
      rating: "easy",
      requestId: "33333333-3333-4333-8333-333333333333",
    });
    const before = JSON.stringify(main.snapshot());
    const acted = vi.spyOn(main, "act");
    const record = vi.spyOn(relearn, "record");
    render(<Host main={main} relearnSource={relearn} />);
    await screen.findByRole("heading", { name: "오늘의 복습" });
    fireEvent.click(screen.getByRole("button", { name: "개념 목록" }));
    fireEvent.click(
      (await screen.findAllByRole("button", { name: /개념 읽기$/ }))[0]!,
    );
    fireEvent.click(await screen.findByRole("button", { name: "연습하기" }));
    await screen.findByText("연습 · 기록되지 않음");
    fireEvent.click(screen.getByRole("button", { name: "모르겠어요" }));
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    expect(acted).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
    expect(JSON.stringify(main.snapshot())).toBe(before);
  });
});
