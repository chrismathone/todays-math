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
vi.mock("next/navigation", () => ({ useRouter: () => router }));
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
function storedWithReadyChests(): StoredExplorer {
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
  stored.profile.stars = 5;
  stored.profile.definitions = {
    runs: 2,
    cards: Object.fromEntries(cards.map((card) => [card.id, progress])),
    claimedChests: [`${claimedUnit.id}:2`, `${claimedUnit.id}:4`],
    history: [],
  };
  return stored;
}

type Reply = (input: ExplorerRequest) => Promise<Response>;
function server(initial: StoredExplorer) {
  let stored = initial;
  let revision = 3;
  const posts: ExplorerRequest[] = [];
  const data = (feedback: unknown = null) => ({
    ...explorerView(stored, today),
    today,
    student,
    revision,
    feedback,
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (!options?.body) return new Response(JSON.stringify({ data: data() }));
      const input = JSON.parse(options.body as string) as ExplorerRequest;
      posts.push(input);
      return (replies.shift() ?? ok)(input);
    }),
  );
  return {
    posts,
    stars: () => stored.profile.stars,
    /** 다음 POST 하나를 이렇게 답한다. */
    next(reply: "offline" | "lost" | "conflict" | 500 | 400) {
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
  render(<StudentMathExplorers />);
  fireEvent.click(await screen.findByRole("button", { name: /우리 기지/ }));
  const sheet = await screen.findByRole("dialog", { name: "우리 기지" });
  const rows = within(sheet).getAllByLabelText("단원 보상상자");
  const readyRow = rows.find((row) =>
    row.querySelector('[data-state="ready"]'),
  )!;
  const ready = within(readyRow).getAllByRole("button");
  return { sheet, rows, ready };
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

  it("gives the star once when the lost response had actually been saved", async () => {
    const api = server(storedWithReadyChests());
    const { sheet, ready } = await openBase();
    api.next("lost");

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
