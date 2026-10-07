/**
 * «오늘 다시 만날 개념» 한 장 — 기억 복습 날 · 지난 학습 다시 풀기의 첫 활동 앞(원장님 2026-09-28 확정, 05 §8.19 · D-143 ③).
 *
 * 새 개념은 첫날 «뜻 만나기»로 만나지만, 기억 복습 날 · 다시 풀기는 뜻 없이 바로 조립으로 들어간다(엔진 실측) —
 * 원장님 제보의 «무작정 출몰» 한 갈래. 뜻은 가린 채 **이름 · 갈래 · 단원**만 보이고, 엔진(15활동 · 날짜 규칙)은
 * 그대로다(화면만의 한 장 — 서버에 요청을 보내지 않는다). 한 세션에 한 번만(이어하기로 들어와도 다시 안 보임).
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import {
  markSessionIntroSeen,
  sessionIntroKind,
  sessionIntroSeen,
} from "@/components/math-explorers/sessionIntro";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import type {
  ExplorerRequest,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";

// 라우터는 한 개체여야 한다 — 부를 때마다 새 개체면 불러오기 효과가 끝없이 다시 돈다.
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));

const student = { id: "student-intro", name: "학생", className: "테스트반" };
type Session = NonNullable<ExplorerState["session"]>;
const base: Session = {
  id: "memory-session",
  route: "memory",
  title: "기억 퀘스트",
  unitId: "g8-simultaneous",
  cardIds: [
    "g8-two-variable",
    "g8-simultaneous",
    "g8-substitution",
    "g8-elimination",
    "g8-common-solution",
  ],
  index: 0,
  total: 15,
  round: 0,
  continuation: 0,
  done: false,
  first: 0,
  stars: 0,
  unresolved: [],
  reviewOnly: false,
};

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {}
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sessionIntroKind — 어느 세션 첫머리에 한 장을 두나", () => {
  it("기억 복습 · 지난 학습 다시 풀기의 첫 활동 앞에만", () => {
    expect(sessionIntroKind(base)).toBe("memory");
    expect(sessionIntroKind({ ...base, route: "unit", reviewOnly: true })).toBe(
      "replay",
    );
    expect(
      sessionIntroKind({ ...base, route: "memory", reviewOnly: true }),
    ).toBe("replay");
  });
  it("오늘의 탐험(새 개념 — 뜻 만나기가 있다) · 회복 퀘스트 · 첫 활동 뒤 · 오답 복습 · 남은 문제 · 끝난 세션에는 없다", () => {
    expect(sessionIntroKind({ ...base, route: "unit" })).toBeNull();
    expect(sessionIntroKind({ ...base, route: "repair" })).toBeNull();
    expect(sessionIntroKind({ ...base, index: 1 })).toBeNull();
    expect(sessionIntroKind({ ...base, round: 1 })).toBeNull();
    expect(sessionIntroKind({ ...base, continuation: 1 })).toBeNull();
    expect(sessionIntroKind({ ...base, done: true })).toBeNull();
  });
  it("본 표시는 세션마다 한 번 — 저장소가 막혀도 던지지 않는다", () => {
    expect(sessionIntroSeen("s-1")).toBe(false);
    markSessionIntroSeen("s-1");
    expect(sessionIntroSeen("s-1")).toBe(true);
    expect(sessionIntroSeen("s-2")).toBe(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => sessionIntroSeen("s-3")).not.toThrow();
  });
});

describe("StudentMathExplorers — 기억 복습 날 첫 장", () => {
  function states() {
    const home: ExplorerState = {
      ...explorerView(createExplorerState(student.id, 8), "2026-09-28"),
      student,
      revision: 0,
      feedback: null,
      expedition: {
        mission: null,
        next: null,
        completedToday: false,
        canStart: true,
      },
    };
    const units = home.units;
    const first = units
      .flatMap((unit) => unit.cards)
      .find((card) => card.id === "g8-two-variable")!;
    const memory: ExplorerState = {
      ...home,
      session: base,
      currentActivity: {
        questionId: "memory-q0",
        cardId: first.id,
        cardName: first.name,
        unitId: "g8-simultaneous",
        unitTitle: "연립일차방정식",
        kind: "assemble",
        prompt: "말 조각을 순서대로 골라 문장을 완성하세요.",
        pieces: ["ax+by+c=0에서 a,b가 ", " 식이며 해를 ", "으로 나타낸다."],
        choices: [
          { id: 0, label: "순서쌍" },
          { id: 1, label: "평균" },
          { id: 2, label: "동시에 0이 아닌" },
          { id: 3, label: "모두 0인" },
        ],
      },
    };
    return { home, memory };
  }

  it("다섯 개념의 이름 · 갈래 · 단원만 — 뜻은 가리고, 시작을 누르면 요청 없이 첫 활동", async () => {
    const { home, memory } = states();
    const requests: ExplorerRequest[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: RequestInit) => {
        if (options?.body) requests.push(JSON.parse(options.body as string));
        return new Response(
          JSON.stringify({ data: options?.body ? memory : home }),
          { status: 200 },
        );
      }),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
    );
    const title = await screen.findByRole("heading", {
      name: "오늘 다시 만날 개념",
    });
    const list = within(title.closest("section")!).getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(
      items.map(
        (item) => item.querySelector("[data-concept-name]")?.textContent,
      ),
    ).toEqual([
      "미지수가 두 개인 일차방정식",
      "연립방정식",
      "대입법",
      "가감법",
      "연립방정식 해 확인",
    ]);
    expect(
      items.map(
        (item) => item.querySelector("[data-concept-kind]")?.textContent,
      ),
    ).toEqual(["정의", "정의", "방법", "방법", "방법"]);
    // 뜻은 가린다
    expect(screen.queryByText(/푸는 방법/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /순서쌍/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /기억 복습 시작하기/ }));
    expect(
      await screen.findByRole("button", { name: "1 순서쌍" }),
    ).toBeVisible();
    expect(requests.map((request) => request.action)).toEqual([
      { type: "expedition-start" },
    ]);
    expect(sessionIntroSeen("memory-session")).toBe(true);
  });

  it("저장소가 막혀도(setItem · getItem 이 던짐) «시작하기» 한 번에 첫 활동 — 이 화면의 세션 기억으로 넘어간다", async () => {
    const { home, memory } = states();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (_url: string, options?: RequestInit) =>
          new Response(
            JSON.stringify({ data: options?.body ? memory : home }),
            { status: 200 },
          ),
      ),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
    );
    const title = await screen.findByRole("heading", {
      name: "오늘 다시 만날 개념",
    });
    fireEvent.click(screen.getByRole("button", { name: /기억 복습 시작하기/ }));
    expect(
      await screen.findByRole("button", { name: "1 순서쌍" }),
    ).toBeVisible();
    expect(title).not.toBeInTheDocument();
  });

  it("이미 본 세션이면(이어하기) 한 장 없이 바로 활동", async () => {
    const { home, memory } = states();
    markSessionIntroSeen("memory-session");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (_url: string, options?: RequestInit) =>
          new Response(
            JSON.stringify({ data: options?.body ? memory : home }),
            { status: 200 },
          ),
      ),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
    );
    expect(
      await screen.findByRole("button", { name: "1 순서쌍" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "오늘 다시 만날 개념" }),
    ).not.toBeInTheDocument();
  });
});
