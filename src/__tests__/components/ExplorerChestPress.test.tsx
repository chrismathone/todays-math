/**
 * «우리 기지» 상자 누름 (2026-09-28, reward-speed).
 *
 * ⑥ 누르는 동안 **누른 상자만** 막고, 시트 뒤 진도판과 다른 단원 상자 줄은 다시 그리지 않는다
 *    (전에는 전체 busy 로 한 누름에 컴포넌트 86개를 두 번 그렸다 — 보고 reward-latency §2).
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { forgetChestSaves } from "@/components/math-explorers/chestSaveLine";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import {
  definitionCards,
  definitionUnits,
} from "@/lib/math-explorers/definition-cards";
import type {
  ExplorerRequest,
  StoredExplorer,
} from "@/contracts/mathExplorers.contract";

const counts = vi.hoisted(() => ({ board: 0, chestRows: 0 }));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/math-srs/DailyJourneyBoard", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/components/math-srs/DailyJourneyBoard")
    >();
  const Board = original.default;
  return {
    ...original,
    default: (props: ComponentProps<typeof Board>) => {
      counts.board += 1;
      return <Board {...props} />;
    },
  };
});
vi.mock(
  "@/components/math-explorers/ExplorerPieces",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/components/math-explorers/ExplorerPieces")
      >();
    const Chests = original.ExplorerChests;
    return {
      ...original,
      ExplorerChests: (props: ComponentProps<typeof Chests>) => {
        counts.chestRows += 1;
        return <Chests {...props} />;
      },
    };
  },
);

const today = "2026-09-26";
const student = { id: "student-chest", name: "학생", className: "테스트반" };
const [readyUnit, claimedUnit] = definitionUnits.filter(
  (unit) => unit.grade === 3,
);

/** 초3 첫 단원 상자 둘이 준비됨 · 둘째 단원 상자 둘은 이미 받음 · 별 5. */
function storedWithReadyChests({
  bothRows = false,
  doneDay = false,
  stars = 5,
}: {
  bothRows?: boolean;
  doneDay?: boolean;
  stars?: number;
} = {}): StoredExplorer {
  const stored = createExplorerState(student.id, 3);
  const progress = {
    level: 1,
    due: "2026-09-27",
    lastDate: today,
    attemptedAt: today,
    missed: 0,
  };
  const cards = [readyUnit, claimedUnit].flatMap((unit) =>
    definitionCards.filter((card) => card.unit === unit.id).slice(0, 4),
  );
  stored.profile.stars = stars;
  stored.profile.definitions = {
    courseGrade: 3,
    runs: 2,
    cards: Object.fromEntries(cards.map((card) => [card.id, progress])),
    claimedChests: bothRows
      ? []
      : [`${claimedUnit.id}:2`, `${claimedUnit.id}:4`],
    history: [],
  };
  if (doneDay)
    stored.completedDays = [
      {
        date: "2026-09-25",
        unitId: claimedUnit.id,
        sessionId: "5a2e5c0e-4f0b-4b8e-9d3c-0d9f5c1f3a11",
      },
    ];
  return stored;
}

type Reply = (input: ExplorerRequest) => Promise<Response>;
function server(initial: StoredExplorer) {
  let stored = initial;
  let revision = 3;
  const posts: ExplorerRequest[] = [];
  let expedition: unknown = undefined;
  const data = (feedback: unknown = null) => ({
    ...explorerView(stored, today),
    today,
    student,
    revision,
    feedback,
    ...(expedition ? { expedition } : {}),
  });
  const apply = (input: ExplorerRequest) => {
    const result = applyExplorerAction(
      stored,
      input.action,
      today,
      input.requestId,
    );
    if (!result.duplicate) {
      stored = result.state;
      revision += 1;
    }
    return result;
  };
  const ok: Reply = async (input) => {
    // The route's revision check: a stale revision only passes with its exact receipt.
    if (
      input.expectedRevision !== undefined &&
      input.expectedRevision !== revision &&
      !stored.receipts.some((receipt) => receipt.requestId === input.requestId)
    )
      return failure(409, "학습 기록이 변경되었습니다.");
    return new Response(JSON.stringify({ data: data(apply(input).feedback) }));
  };
  const failure = (status: number, message: string) =>
    new Response(JSON.stringify({ error: { code: "X", message } }), {
      status,
    });
  const replies: Reply[] = [];
  const stuckReads: ((signal?: AbortSignal) => Promise<void>)[] = [];
  let failReads = 0;
  let reads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (!options?.body) {
        reads += 1;
        const stuck = stuckReads.shift();
        if (failReads > 0) {
          failReads -= 1;
          throw new TypeError("Failed to fetch");
        }
        if (stuck) await stuck(options?.signal ?? undefined);
        return new Response(JSON.stringify({ data: data() }));
      }
      const input = JSON.parse(options.body as string) as ExplorerRequest;
      posts.push(input);
      return (replies.shift() ?? ok)(input);
    }),
  );
  return {
    posts,
    stars: () => stored.profile.stars,
    reads: () => reads,
    /** 다른 탭이 이 상자를 받는다(이 화면은 모른다). */
    claimElsewhere(chestId: string) {
      apply({
        requestId: crypto.randomUUID(),
        expectedRevision: revision,
        action: { type: "chest", chestId },
        studentId: student.id,
      });
    },
    /** 이후 응답에 실을 오늘의 탐험(D-144 칸 효과를 켜는 값). */
    setExpedition(value: unknown) {
      expedition = value;
    },
    /** 다음 POST 하나를 이렇게 답한다. */
    next(reply: "offline" | "lost" | "conflict" | 500 | 503 | 400) {
      replies.push(async (input) => {
        if (reply === "offline") throw new TypeError("Failed to fetch");
        if (reply === "lost") {
          await ok(input);
          throw new TypeError("Failed to fetch");
        }
        if (reply === "conflict") {
          // 다른 탭이 먼저 같은 상자를 받았다.
          if (input.action.type === "chest")
            apply({ ...input, requestId: crypto.randomUUID() });
          return failure(409, "학습 기록이 변경되었습니다.");
        }
        return failure(
          reply,
          reply === 400
            ? "앞의 개념 2개를 먼저 해결해봐."
            : "학습 기록을 저장하지 못했어요.",
        );
      });
    },
    /** 다음 GET 하나가 연결 끊김으로 실패한다. */
    failNextRead() {
      failReads += 1;
    },
    /** 다음 GET 하나가 끊길 때까지(abort) 멈춘다. */
    stickNextRead() {
      stuckReads.push(
        (signal) =>
          new Promise<void>((_, reject) =>
            signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      );
    },
    /** 다음 POST 들을 손으로 풀 때까지 붙잡는다. */
    hold() {
      const waiting: (() => void)[] = [];
      const held: Reply = (input) =>
        new Promise<Response>((resolve) =>
          waiting.push(() => void ok(input).then(resolve)),
        );
      replies.push(held, held, held);
      return () => {
        replies.splice(0);
        for (const release of waiting.splice(0)) release();
      };
    },
  };
}

async function openBase() {
  const { unmount } = render(<StudentMathExplorers />);
  fireEvent.click(await screen.findByRole("button", { name: /우리 기지/ }));
  const sheet = await screen.findByRole("dialog", { name: "우리 기지" });
  const rows = within(sheet).getAllByLabelText("단원 보상상자");
  const readyRow = rows.find((row) =>
    row.querySelector('[data-state="ready"]'),
  )!;
  const ready = within(readyRow).getAllByRole("button");
  return { sheet, rows, ready, unmount };
}

beforeEach(() => {
  counts.board = 0;
  counts.chestRows = 0;
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
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("chest press — re-render only what the press changes", () => {
  it("keeps the journey board and the other unit's chest row as they were while the press is in flight", async () => {
    const api = server(storedWithReadyChests());
    const { rows, ready } = await openBase();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(ready.map((button) => button.getAttribute("data-state"))).toEqual([
      "ready",
      "ready",
    ]);
    const release = api.hold();
    const board = counts.board;
    const chestRows = counts.chestRows;

    fireEvent.click(ready[0]);
    await waitFor(() => expect(api.posts).toHaveLength(1));
    expect(counts.board).toBe(board);
    expect(counts.chestRows - chestRows).toBeLessThanOrEqual(1);
    expect(ready[0]).toBeDisabled();
    expect(ready[1]).toBeEnabled();

    await act(async () => release());
    await waitFor(() =>
      expect(ready[0].getAttribute("data-state")).toBe("opened"),
    );
    expect(ready[1]).toBeEnabled();
  });
});

/**
 * ⑦ 즉시 반영 — 누르자마자 «보상 획득» · 별 +1 · 효과(시트 **위**), 서버가 실패하면 되돌린다.
 * 실패 표시는 원장님 위임 3자 합의(Claude · codex · grok, 2026-09-28): 상자 아래 한 줄 ·
 * «별을 받지 못했어요. 상자를 다시 눌러 주세요.» · 409 는 시트를 닫지 않고 새로 읽은 뒤 한 줄.
 */
describe("chest press — shown at once, taken back on failure", () => {
  const FAILED = "별을 받지 못했어요. 상자를 다시 눌러 주세요.";
  const RELOADED = "다른 화면에서 기록이 바뀌어 최신 기록을 불러왔어요.";

  it("shows the opened chest, the star and the effect on the sheet before the server answers", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    const grow = within(sheet).getByRole("button", { name: /기지 키우기/ });
    expect(grow).toBeEnabled();
    const release = api.hold();

    fireEvent.click(ready[0]);
    expect(ready[0].getAttribute("data-state")).toBe("opened");
    expect(within(sheet).getByText("✦ 6")).toBeTruthy();
    expect(within(sheet).getByText("보물 발견!")).toBeTruthy();
    // 효과는 시트 안 하나뿐 — 페이지 끝의 옛 자리에 한 벌 더 뜨지 않는다.
    expect(screen.getAllByText("보물 발견!")).toHaveLength(1);
    expect(grow).toBeDisabled();
    await waitFor(() => expect(api.posts).toHaveLength(1));

    await act(async () => release());
    await waitFor(() => expect(grow).toBeEnabled());
    expect(ready[0].getAttribute("data-state")).toBe("opened");
    expect(within(sheet).getByText("✦ 6")).toBeTruthy();
    expect(api.stars()).toBe(6);
  });

  it.each(["offline", 500] as const)(
    "takes the star back and says so under the chest (%s), then retries with the same request",
    async (reply) => {
      const api = server(storedWithReadyChests());
      const { sheet, ready } = await openBase();
      api.next(reply);

      fireEvent.click(ready[0]);
      expect(await within(sheet).findByRole("alert")).toHaveTextContent(FAILED);
      expect(ready[0].getAttribute("data-state")).toBe("ready");
      expect(ready[0]).toBeEnabled();
      expect(within(sheet).getByText("✦ 5")).toBeTruthy();
      expect(within(sheet).queryByText("보물 발견!")).toBeNull();

      fireEvent.click(ready[0]);
      await waitFor(() => expect(api.posts).toHaveLength(2));
      await waitFor(() => expect(api.stars()).toBe(6));
      expect(api.posts[1].requestId).toBe(api.posts[0].requestId);
      expect(ready[0].getAttribute("data-state")).toBe("opened");
      expect(within(sheet).getByText("✦ 6")).toBeTruthy();
      expect(within(sheet).queryByRole("alert")).toBeNull();
    },
  );

  it("confirms a chest whose response was lost after the save, without a notice", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    api.next("lost");

    fireEvent.click(ready[0]);
    await waitFor(() => expect(api.stars()).toBe(6));
    await waitFor(() => expect(within(sheet).getByText("✦ 6")).toBeTruthy());
    expect(ready[0].getAttribute("data-state")).toBe("opened");
    expect(within(sheet).queryByRole("alert")).toBeNull();
    expect(api.posts).toHaveLength(1);
  });

  it("gives the star once when the lost save cannot be checked and the chest is pressed again", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    api.next("lost");
    api.failNextRead();

    fireEvent.click(ready[0]);
    expect(await within(sheet).findByRole("alert")).toHaveTextContent(FAILED);
    expect(api.stars()).toBe(6);
    expect(within(sheet).getByText("✦ 5")).toBeTruthy();

    fireEvent.click(ready[0]);
    await waitFor(() => expect(api.posts).toHaveLength(2));
    expect(api.posts[1].requestId).toBe(api.posts[0].requestId);
    await waitFor(() => expect(within(sheet).queryByRole("alert")).toBeNull());
    expect(ready[0].getAttribute("data-state")).toBe("opened");
    expect(within(sheet).getByText("✦ 6")).toBeTruthy();
    expect(api.stars()).toBe(6);
  });

  it("reloads without closing the sheet when another tab already opened the chest (409)", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    api.next("conflict");

    fireEvent.click(ready[0]);
    await waitFor(() => expect(within(sheet).getByText(RELOADED)).toBeTruthy());
    expect(sheet.isConnected).toBe(true);
    expect(screen.getByRole("dialog", { name: "우리 기지" })).toBe(sheet);
    expect(ready[0].getAttribute("data-state")).toBe("opened");
    expect(within(sheet).getByText("✦ 6")).toBeTruthy();
    expect(api.stars()).toBe(6);
  });

  it("uses the server's sentence when it refuses the chest (400)", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    api.next(400);

    fireEvent.click(ready[0]);
    expect(await within(sheet).findByRole("alert")).toHaveTextContent(
      "앞의 개념 2개를 먼저 해결해봐.",
    );
    expect(within(sheet).getByText("✦ 5")).toBeTruthy();
  });

  it("sends one request for two quick presses on the same chest", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    const release = api.hold();

    // Both land before React re-renders the pressed chest as opened (disabled).
    act(() => {
      fireEvent.click(ready[0]);
      fireEvent.click(ready[0]);
    });
    await act(async () => release());
    await waitFor(() => expect(api.stars()).toBe(6));
    expect(api.posts).toHaveLength(1);
    expect(within(sheet).getByText("✦ 6")).toBeTruthy();
  });

  it("shows two chests pressed back to back at once and saves them one after the other", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    const release = api.hold();

    fireEvent.click(ready[0]);
    fireEvent.click(ready[1]);
    expect(ready.map((button) => button.getAttribute("data-state"))).toEqual([
      "opened",
      "opened",
    ]);
    expect(within(sheet).getByText("✦ 7")).toBeTruthy();
    await waitFor(() => expect(api.posts).toHaveLength(1));

    await act(async () => release());
    await waitFor(() => expect(api.posts).toHaveLength(2));
    expect(api.posts[1].expectedRevision).toBe(4);
    await waitFor(() => expect(api.stars()).toBe(7));
    expect(within(sheet).getByText("✦ 7")).toBeTruthy();
  });

  it("clears the notice when the sheet closes", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    api.next("offline");
    fireEvent.click(ready[0]);
    await within(sheet).findByRole("alert");

    fireEvent.click(
      within(sheet).getByRole("button", { name: "우리 기지 닫기" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /우리 기지/ }));
    const again = await screen.findByRole("dialog", { name: "우리 기지" });
    expect(within(again).queryByRole("alert")).toBeNull();
  });
});

/**
 * 리드 적대적 검토(2026-09-28)가 찾은 자리 — 대기열 · 새로 읽기 · 떠나기 · 저장 중 다른 단추.
 */
describe("chest press — queue, reload, leaving and other buttons", () => {
  const FAILED = "별을 받지 못했어요. 상자를 다시 눌러 주세요.";
  const RELOADED = "다른 화면에서 기록이 바뀌어 최신 기록을 불러왔어요.";

  it("confirms a chest whose response was lost after the save, then sends the next with the fresh revision", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    api.next("lost");

    act(() => {
      fireEvent.click(ready[0]);
      fireEvent.click(ready[1]);
    });
    await waitFor(() => expect(api.stars()).toBe(7));
    expect(api.posts).toHaveLength(2);
    expect(api.posts[1].expectedRevision).toBe(4);
    await waitFor(() => expect(within(sheet).getByText("✦ 7")).toBeTruthy());
    expect(ready.map((button) => button.getAttribute("data-state"))).toEqual([
      "opened",
      "opened",
    ]);
    expect(within(sheet).queryByRole("alert")).toBeNull();
    expect(within(sheet).queryByText(RELOADED)).toBeNull();
  });

  it("keeps one notice per failed chest", async () => {
    const api = server(storedWithReadyChests({ bothRows: true }));
    const { sheet, rows } = await openBase();
    const readyRows = rows.filter((row) =>
      row.querySelector('[data-state="ready"]'),
    );
    expect(readyRows).toHaveLength(2);
    api.next("offline");
    api.next(400);

    act(() => {
      fireEvent.click(within(readyRows[0]).getAllByRole("button")[0]);
      fireEvent.click(within(readyRows[1]).getAllByRole("button")[0]);
    });
    await waitFor(() =>
      expect(within(sheet).getAllByRole("alert")).toHaveLength(2),
    );
    expect(within(sheet).getByText(FAILED)).toBeTruthy();
    expect(
      within(sheet).getByText("앞의 개념 2개를 먼저 해결해봐."),
    ).toBeTruthy();
  });

  it("gives up a stuck reload after 15 seconds and frees the buttons", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const api = server(storedWithReadyChests());
      const { sheet, ready } = await openBase();
      const grow = within(sheet).getByRole("button", { name: /기지 키우기/ });
      api.next("conflict");
      api.stickNextRead();

      fireEvent.click(ready[0]);
      await waitFor(() => expect(api.posts).toHaveLength(1));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_500);
      });
      await waitFor(() => expect(grow).toBeEnabled());
      expect(within(sheet).getByRole("alert")).toHaveTextContent(FAILED);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the study buttons and, once the sheet closes, the board off while a chest is saving", async () => {
    const api = server(storedWithReadyChests({ doneDay: true }));
    const { sheet, ready } = await openBase();
    const release = api.hold();
    const start = document.querySelector<HTMLButtonElement>(
      "[data-expedition-start]",
    )!;
    expect(start).toBeEnabled();

    fireEvent.click(ready[0]);
    expect(start).toBeDisabled();
    fireEvent.click(
      within(sheet).getByRole("button", { name: "우리 기지 닫기" }),
    );
    const tile = document.querySelector<HTMLButtonElement>(
      '[data-day-step="1"] button',
    )!;
    expect(tile).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /학습 설정/ }));
    const settings = await screen.findByRole("dialog", { name: "학습 설정" });
    expect(
      within(settings).queryByLabelText("학년 선택"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(settings).getByRole("button", { name: "학습 설정 닫기" }),
    );

    fireEvent.click(screen.getByRole("button", { name: /도감/ }));
    const collection = await screen.findByRole("dialog", {
      name: "나의 개념 도감",
    });
    fireEvent.click(
      within(collection)
        .getAllByRole("button")
        .find((button) => button.getAttribute("data-level") === "1")!,
    );
    const solution = await screen.findByRole("button", {
      name: "불러오는 중…",
    });
    expect(solution).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /탐험 목표|목표 단원/ }),
    ).not.toBeInTheDocument();

    await act(async () => release());
    await waitFor(() => expect(start).toBeEnabled());
    expect(
      screen.getByRole("button", { name: "뜻과 해설 보기" }),
    ).toBeEnabled();
    expect(api.posts).toHaveLength(1);
  });

  it("does not send another study action while a chest is saving", async () => {
    const api = server(storedWithReadyChests({ doneDay: true }));
    const { ready } = await openBase();
    const release = api.hold();

    fireEvent.click(ready[0]);
    // 시트 뒤 판 칸은 브라우저에서는 모달이 막는다 — 막히지 않은 길로 눌러 대기열 가드를 문다.
    fireEvent.click(
      document.querySelector<HTMLButtonElement>('[data-day-step="1"] button')!,
    );
    await act(async () => release());
    await waitFor(() => expect(api.stars()).toBe(6));
    expect(api.posts.map((post) => post.action.type)).toEqual(["chest"]);
  });

  it("does not open a chest while another study action is being sent", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    const release = api.hold();

    act(() => {
      fireEvent.click(
        within(sheet).getByRole("button", { name: /기지 키우기/ }),
      );
      fireEvent.click(ready[0]);
    });
    expect(ready[0].getAttribute("data-state")).toBe("ready");
    await act(async () => release());
    await waitFor(() => expect(api.posts).toHaveLength(1));
    expect(api.posts[0].action.type).toBe("upgrade");
  });

  it("still saves the pressed chests after the screen is left", async () => {
    const api = server(storedWithReadyChests());
    const { ready, unmount } = await openBase();
    const release = api.hold();

    act(() => {
      fireEvent.click(ready[0]);
      fireEvent.click(ready[1]);
    });
    unmount();
    await act(async () => release());
    await waitFor(() => expect(api.stars()).toBe(7));
    expect(api.posts).toHaveLength(2);
  });
});

describe("chest press — with the day's tile effect (D-144)", () => {
  it("waits with the tile effect until the sheet closes when a reload brings today's tile in", async () => {
    const api = server(storedWithReadyChests());
    api.setExpedition({
      mission: null,
      next: null,
      completedToday: false,
      canStart: true,
    });
    const { sheet, ready } = await openBase();
    api.next("conflict");
    api.setExpedition({
      mission: null,
      next: null,
      completedToday: true,
      canStart: false,
      todayStars: { cards: 2, bonus: 1 },
    });

    fireEvent.click(ready[0]);
    await waitFor(() =>
      expect(
        within(sheet).getByText(
          "다른 화면에서 기록이 바뀌어 최신 기록을 불러왔어요.",
        ),
      ).toBeTruthy(),
    );
    // 모달 시트 밖에 그리면 가려져 소모된다 — 시트가 열린 동안은 기다린다.
    expect(screen.queryByText("별 +3")).toBeNull();

    fireEvent.click(
      within(sheet).getByRole("button", { name: "우리 기지 닫기" }),
    );
    expect(await screen.findByText("별 +3")).toBeTruthy();
  });
});

/**
 * 리드 2차 검토(2026-09-28) — 안내가 새 기록과 맞나 · 다시 연 화면 · 한 시트 안 별 수 · 기지 키우기 실패.
 */
describe("chest press — second review", () => {
  const FAILED = "별을 받지 못했어요. 상자를 다시 눌러 주세요.";

  it("takes a chest's notice away once a newer record shows that chest received", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    api.next("offline");
    fireEvent.click(ready[0]);
    expect(await within(sheet).findByRole("alert")).toHaveTextContent(FAILED);

    // 다른 탭이 그 상자를 받았다 — 다음 상자의 저장이 409 로 새 기록을 읽어 온다.
    api.claimElsewhere(chestIdOf(ready[0]));
    fireEvent.click(ready[1]);
    await waitFor(() =>
      expect(
        within(sheet).getByText(
          "다른 화면에서 기록이 바뀌어 최신 기록을 불러왔어요.",
        ),
      ).toBeTruthy(),
    );
    expect(ready[0].getAttribute("data-state")).toBe("opened");
    // «보상 획득» 아래에 «별을 받지 못했어요»가 남지 않는다.
    expect(within(sheet).queryByText(FAILED)).toBeNull();
  });

  it("opens a screen again only after the chests still being saved are saved", async () => {
    const api = server(storedWithReadyChests());
    const first = await openBase();
    const release = api.hold();
    act(() => {
      fireEvent.click(first.ready[0]);
      fireEvent.click(first.ready[1]);
    });
    first.unmount();

    render(<StudentMathExplorers />);
    await act(async () => release());
    await waitFor(() => expect(api.stars()).toBe(7));
    fireEvent.click(await screen.findByRole("button", { name: /우리 기지/ }));
    const sheet = await screen.findByRole("dialog", { name: "우리 기지" });
    expect(within(sheet).getByText("✦ 7")).toBeTruthy();
    expect(
      within(sheet)
        .getAllByRole("button")
        .filter((button) => button.getAttribute("data-state") === "ready"),
    ).toHaveLength(0);
    expect(api.posts).toHaveLength(2);
  });

  it("shows the read error, not the record from before the save, when the second read of a reopened screen fails", async () => {
    const api = server(storedWithReadyChests());
    const first = await openBase();
    const release = api.hold();
    fireEvent.click(first.ready[0]);
    await waitFor(() => expect(api.posts).toHaveLength(1));
    first.unmount();

    const readsBefore = api.reads();
    render(<StudentMathExplorers />);
    // 첫 읽기(저장 전 기록)는 되고, 남은 저장을 기다린 뒤의 둘째 읽기가 끊긴다.
    await waitFor(() => expect(api.reads()).toBe(readsBefore + 1));
    api.failNextRead();
    await act(async () => release());
    expect(
      await screen.findByText(/학습 기록을 확인하지 못했어요/),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /우리 기지/ })).toBeNull();
  });

  it("keeps a failed chest's request id for the screen opened again", async () => {
    const api = server(storedWithReadyChests());
    const first = await openBase();
    api.next("offline");
    fireEvent.click(first.ready[0]);
    await within(first.sheet).findByRole("alert");
    first.unmount();

    const again = await openBase();
    fireEvent.click(again.ready[0]);
    await waitFor(() => expect(api.posts).toHaveLength(2));
    expect(api.posts[1].requestId).toBe(api.posts[0].requestId);
    await waitFor(() => expect(api.stars()).toBe(6));
  });

  it("shows one star count everywhere in and around the sheet while chests save", async () => {
    const api = server(storedWithReadyChests({ stars: 1 }));
    const { sheet, ready } = await openBase();
    const grow = within(sheet).getByRole("button", { name: /기지 키우기/ });
    expect(
      within(sheet).getByText("별 2개를 더 모으면 1단계예요."),
    ).toBeTruthy();
    const release = api.hold();

    fireEvent.click(ready[0]);
    const badge = screen.getByRole("button", { name: "우리 기지, 모은 별 2" });
    expect(badge.querySelector("em")?.textContent).toBe("✦ 2");
    expect(within(sheet).getByText("✦ 2")).toBeTruthy();
    expect(
      within(sheet).getByText("별 1개를 더 모으면 1단계예요."),
    ).toBeTruthy();
    expect(grow).toBeDisabled();

    fireEvent.click(ready[1]);
    expect(
      screen
        .getByRole("button", { name: "우리 기지, 모은 별 3" })
        .querySelector("em")?.textContent,
    ).toBe("✦ 3");
    expect(within(sheet).getByText("✦ 3")).toBeTruthy();
    expect(within(sheet).queryByText(/개를 더 모으면/)).toBeNull();
    expect(grow).toBeDisabled();

    await act(async () => release());
    await waitFor(() => expect(grow).toBeEnabled());
    expect(api.stars()).toBe(3);
  });

  it.each([
    [
      "conflict" as const,
      "다른 화면에서 학습 기록이 바뀌었어요. 최신 기록을 불러온 뒤 이어 가 주세요.",
    ],
    [
      503 as const,
      "학습 저장소가 아직 준비되지 않았어요. 잠시 후 다시 시도하고, 계속되면 선생님께 알려 주세요.",
    ],
  ])(
    "says a failed base upgrade (%s) in the sheet with the page status's sentence",
    async (reply, text) => {
      const api = server(storedWithReadyChests());
      const { sheet } = await openBase();
      api.next(reply);
      fireEvent.click(
        within(sheet).getByRole("button", { name: /기지 키우기/ }),
      );
      expect(await within(sheet).findByRole("alert")).toHaveTextContent(text);
    },
  );

  it("says a failed base upgrade inside the sheet and retries it with the same request", async () => {
    const api = server(storedWithReadyChests());
    const { sheet } = await openBase();
    api.next(500);
    const grow = within(sheet).getByRole("button", { name: /기지 키우기/ });

    fireEvent.click(grow);
    expect(await within(sheet).findByRole("alert")).toHaveTextContent(
      "학습 기록을 저장하지 못했어요.",
    );
    expect(grow).toBeEnabled();
    fireEvent.click(grow);
    await waitFor(() => expect(api.posts).toHaveLength(2));
    expect(api.posts[1].requestId).toBe(api.posts[0].requestId);
    expect(await within(sheet).findByText("1단계")).toBeTruthy();
    expect(within(sheet).queryByRole("alert")).toBeNull();
  });
});

function chestIdOf(button: HTMLElement) {
  const label = button.getAttribute("aria-label") ?? "";
  const after = Number(/^(\d+)개 개념/.exec(label)?.[1]);
  return `${readyUnit.id}:${after}`;
}

/**
 * 리드 3차 검토(2026-09-28) — 학생 사이 누수. 저장 줄은 화면보다 오래 살고 로그아웃 · 로그인은
 * 소프트 이동이라 모듈이 산다. 앞 학생 A 의 남은 상자가 B 로그인 뒤 B 의 쿠키 · B 의 revision 으로
 * 나가 **B 의 상자를 열면** 안 된다.
 */
describe("chest press — another student signs in while a line is saving", () => {
  const studentA = { id: "student-a", name: "학생 A", className: "테스트반" };
  const studentB = { id: "student-b", name: "학생 B", className: "테스트반" };

  /** 쿠키가 정하는 «지금 학생» 과 학생마다 기록 — 라우트처럼 본문의 학생이 다르면 409. */
  function twoStudents() {
    type Record_ = {
      who: typeof studentA;
      stored: StoredExplorer;
      revision: number;
    };
    const records = new Map<string, Record_>(
      [studentA, studentB].map((who) => {
        const stored = storedWithReadyChests();
        stored.profile.id = who.id;
        return [who.id, { who, stored, revision: 3 }];
      }),
    );
    let signedIn = studentA.id;
    const posts: ExplorerRequest[] = [];
    const held: (() => void)[] = [];
    let holding = false;
    const view = (id: string, feedback: unknown = null) => {
      const record = records.get(id)!;
      return {
        ...explorerView(record.stored, today),
        today,
        student: record.who,
        revision: record.revision,
        feedback,
      };
    };
    const save = (id: string, input: ExplorerRequest) => {
      const record = records.get(id)!;
      if (input.expectedRevision !== record.revision)
        return new Response(
          JSON.stringify({ error: { code: "CONFLICT", message: "x" } }),
          { status: 409 },
        );
      const result = applyExplorerAction(
        record.stored,
        input.action,
        today,
        input.requestId,
      );
      if (!result.duplicate) {
        record.stored = result.state;
        record.revision += 1;
      }
      return new Response(JSON.stringify({ data: view(id, result.feedback) }));
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: RequestInit) => {
        const cookie = signedIn;
        if (!options?.body)
          return new Response(JSON.stringify({ data: view(cookie) }));
        const input = JSON.parse(options.body as string) as ExplorerRequest;
        posts.push(input);
        if (input.studentId !== cookie)
          return new Response(
            JSON.stringify({
              error: {
                code: "CONFLICT",
                message: "로그인한 학생이 바뀌었어요.",
              },
            }),
            { status: 409 },
          );
        if (!holding) return save(cookie, input);
        // 요청이 닿은 때의 쿠키로 저장한다 — 응답만 늦게 온다.
        return new Promise<Response>((resolve) =>
          held.push(() => resolve(save(cookie, input))),
        );
      }),
    );
    return {
      posts,
      stars: (id: string) => records.get(id)!.stored.profile.stars,
      level: (id: string) => records.get(id)!.stored.profile.level,
      signIn(id: string) {
        signedIn = id;
      },
      hold() {
        holding = true;
        return () => {
          holding = false;
          for (const release of held.splice(0)) release();
        };
      },
    };
  }

  it("stops A's line when A leaves and B signs in — B's record is untouched and B's screen does not wait", async () => {
    const api = twoStudents();
    const first = await openBase();
    const release = api.hold();
    act(() => {
      fireEvent.click(first.ready[0]);
      fireEvent.click(first.ready[1]);
    });
    await waitFor(() => expect(api.posts).toHaveLength(1));
    first.unmount();
    forgetChestSaves(); // 로그아웃(postLogout) 이 하는 일
    api.signIn(studentB.id);

    render(<StudentMathExplorers />);
    // A 의 첫 상자가 아직 매달려 있어도 B 의 화면은 뜬다.
    expect(
      await screen.findByRole("button", { name: /우리 기지/ }),
    ).toBeTruthy();
    await act(async () => release());
    await waitFor(() => expect(api.stars(studentA.id)).toBe(6));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(api.posts).toHaveLength(1);
    expect(api.stars(studentB.id)).toBe(5);
  });

  it("does not make B's screen wait for A's line even when this tab never signed A out", async () => {
    const api = twoStudents();
    const first = await openBase();
    const release = api.hold();
    fireEvent.click(first.ready[0]);
    await waitFor(() => expect(api.posts).toHaveLength(1));
    first.unmount();
    api.signIn(studentB.id); // 다른 탭의 로그인 — 이 탭은 로그아웃하지 않았다

    render(<StudentMathExplorers />);
    expect(
      await screen.findByRole("button", { name: /우리 기지/ }),
    ).toBeTruthy();
    await act(async () => release());
    await waitFor(() => expect(api.stars(studentA.id)).toBe(6));
    expect(api.stars(studentB.id)).toBe(5);
  });

  it("sends the screen's student with a base upgrade — refused when the cookie is B's, B's record untouched", async () => {
    const api = twoStudents();
    const { sheet } = await openBase();
    api.signIn(studentB.id);

    fireEvent.click(within(sheet).getByRole("button", { name: /기지 키우기/ }));
    expect(await within(sheet).findByRole("alert")).toBeTruthy();
    expect(api.posts).toHaveLength(1);
    expect(api.posts[0].action.type).toBe("upgrade");
    expect(api.posts[0].studentId).toBe(studentA.id);
    expect(api.level(studentB.id)).toBe(0);
    expect(api.stars(studentB.id)).toBe(5);
    expect(api.level(studentA.id)).toBe(0);
  });

  it("never opens B's chest when B signs in without A leaving — the server refuses and A's line stops", async () => {
    const api = twoStudents();
    const { sheet, ready } = await openBase();
    api.signIn(studentB.id); // 다른 탭에서 B 로그인 — 쿠키가 바뀌었다

    act(() => {
      fireEvent.click(ready[0]);
      fireEvent.click(ready[1]);
    });
    await waitFor(() => expect(api.posts).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(api.posts).toHaveLength(1);
    expect(api.posts[0].studentId).toBe(studentA.id);
    expect(api.stars(studentB.id)).toBe(5);
    expect(api.stars(studentA.id)).toBe(5);
    // A 의 화면에 B 의 기록이 들어오지 않는다.
    expect(screen.queryByText(/학생 B/)).toBeNull();
    // 멈춘 줄의 상자는 되돌아가고, 효과는 꺼지고, 까닭을 한 줄로 말한다(05 §8.21).
    await waitFor(() =>
      expect(ready.map((button) => button.getAttribute("data-state"))).toEqual([
        "ready",
        "ready",
      ]),
    );
    expect(screen.queryByText("보물 발견!")).toBeNull();
    expect(within(sheet).getByRole("alert")).toHaveTextContent(
      "로그인한 학생이 바뀌었어요. 다시 불러와 주세요.",
    );
  });
});
