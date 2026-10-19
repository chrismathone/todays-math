/**
 * 오늘의 영어 인쇄 미리보기 `EnglishPrintClient` (D-148 · 25 §5 · 브리프 english-print §3 · D-151 · 25 §12.11).
 * 묶음 고르기(학생용은 순서가 있는 묶음 · 교사용은 따로) · 인쇄 단추 · 닫기 · 검토 상태 문구 · 쪽 나눔을 재기 전엔 인쇄가 눌리지 않는다.
 *
 * jsdom 은 크기를 모른다 — `useMeasuredPages.test` 처럼 `getClientRects`·`getBoundingClientRect` 를 흉내 내어
 * 측정이 끝나게 한다(«준비 중» → «인쇄하기»).
 *
 * 표본 세트(`SAMPLE_SET`)의 문항: 1 주제 · 2 어법(고르기형 — 밑줄 없음) · 3 서술형 · 4 원문 복원.
 * 누출 짝이 없어 묶음은 둘이다 — 묶음 1(변형 · 2, 4번 · 원 지문 없음) → 묶음 2(독해 · 원 지문 + 1, 3번).
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ENGLISH_NOT_REVIEWED_NOTICE,
  EnglishPrintClient,
  parseEnglishPrintBundle,
  parseEnglishPrintMerge,
  parseEnglishPrintView,
} from "@/components/english/print/EnglishPrintClient";
import type { EnglishQuestion, EnglishSet } from "@/contracts/english.contract";

import { SAMPLE_EXAM as EXAM, SAMPLE_SET } from "../fixtures/englishPrintSet";

/**
 * 크기 흉내. `cont` 를 주면 이어지는 쪽(`[data-english-body="2"]`)만 그 높이, `passage` 를 주면
 * 지문 상자(`[data-english-passage]`)만 그 높이 — 훅이 **어느 요소를 읽는지**를 가르는 데 쓴다(리드 검토 D4).
 */
function mockLayout(
  bodyHeight = 900,
  blockHeight = 100,
  extra: { cont?: number; passage?: number } = {},
) {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const height =
        extra.cont !== undefined && this.matches('[data-english-body="2"]')
          ? extra.cont
          : this.matches("[data-english-body]")
            ? bodyHeight
            : extra.passage !== undefined &&
                this.matches("[data-english-passage]")
              ? extra.passage
              : blockHeight;
      return { height } as DOMRect;
    },
  );
}

function client(props: Partial<Parameters<typeof EnglishPrintClient>[0]> = {}) {
  return render(
    <EnglishPrintClient
      academyName="오늘 수학"
      exam={EXAM}
      set={SAMPLE_SET}
      {...props}
    />,
  );
}
const gallery = () => screen.getByRole("region", { name: "지면 미리보기" });
const numbers = (root: Element = gallery()) =>
  [...root.querySelectorAll("[data-english-question]")].map((node) =>
    node.getAttribute("data-english-question"),
  );
const sheet = (name: RegExp) => screen.getByRole("button", { name });

// ── 누출이 있는 세트 — 삽입(3번)의 지문이 빈칸(2번)의 원문을 싣는다(한 방향) ─────────────
const S1 = "Many students think that talent decides success.";
const S2 = "However, research shows that steady practice matters more.";
const S3 =
  "A pianist who practices every day improves faster than one who waits for inspiration.";
const S4 = "Small efforts, repeated over time, build real skill.";
const S5 = "Therefore, habits are more important than gifts.";
const question = (patch: Partial<EnglishQuestion>): EnglishQuestion => ({
  type: "주제",
  prompt: "윗글의 주제로 가장 적절한 것은?",
  options: ["a", "b", "c", "d", "e"],
  answer: "1",
  explanation: "해설",
  evidence: S1,
  ...patch,
});
const LEAKY_SET: EnglishSet = {
  ...SAMPLE_SET,
  passage: [S1, S2, S3, S4, S5].join(" "),
  questionCount: 4,
  types: ["주제", "빈칸 추론", "문장 삽입", "어법"],
  questions: [
    question({}),
    // 빈칸의 지문은 삽입 문장(S4)을 싣지 않는다 — 삽입의 답을 보여 주지 않는다
    question({
      type: "빈칸 추론",
      prompt: `다음 빈칸에 들어갈 말로 가장 적절한 것은?\n${S1} However, research shows that ________ matters more. ${S3}`,
      options: ["steady practice", "natural talent", "luck", "money", "rest"],
    }),
    // 삽입의 지문은 S2 를 그대로 싣는다 — 빈칸의 답(steady practice)이 보인다. S5 는 싣지 않는다(어법의 답까지 보이면 짝이 둘)
    question({
      type: "문장 삽입",
      prompt: `[주어진 문장] ${S4}\n\n글의 흐름으로 보아 주어진 문장이 들어가기에 가장 적절한 곳은?\n( ① ) ${S1} ( ② ) ${S2} ( ③ ) ${S3} ( ④ )`,
      options: ["①", "②", "③", "④", "⑤"],
      answer: "4",
    }),
    question({
      type: "어법",
      prompt: `밑줄 친 ①~② 가운데 어법상 틀린 것은?\nTherefore, habits ①<u>is</u> more ②<u>important</u> than gifts.`,
      options: ["is", "important", "c", "d", "e"],
    }),
  ],
};

beforeEach(() => {
  window.print = vi.fn();
  window.close = vi.fn();
  window.history.replaceState(null, "", "/english/sets/x/print");
});
afterEach(() => vi.restoreAllMocks());

describe("EnglishPrintClient — 묶음 고르기 (D-151 · 3자 합의 «가»)", () => {
  it("🔴 처음 열리면 묶음 1 — 원 지문 상자 없이 변형 문항만 지면에 선다", () => {
    mockLayout();
    client();
    expect(sheet(/^묶음 1/)).toHaveAttribute("aria-pressed", "true");
    expect(sheet(/^묶음 2/)).toHaveAttribute("aria-pressed", "false");
    expect(sheet(/^교사용/)).toHaveAttribute("aria-pressed", "false");
    expect(gallery().querySelector("[data-english-passage]")).toBeNull();
    expect(numbers()).toEqual(["2", "4"]);
    expect(
      within(gallery()).getByText("문제 묶음 1 · 2, 4번"),
    ).toBeInTheDocument();
  });

  it("묶음 단추는 종류 · 수록 문항 · 쪽 수를 말한다 — 쪽 수는 고르지 않은 묶음도 잰다", async () => {
    mockLayout();
    client();
    await waitFor(() => {
      expect(sheet(/^묶음 1/)).toHaveAccessibleName(
        "묶음 1 — 변형 · 2, 4번 · 1쪽",
      );
      expect(sheet(/^묶음 2/)).toHaveAccessibleName(
        "묶음 2 — 독해 · 1, 3번 · 1쪽",
      );
      expect(sheet(/^교사용/)).toHaveAccessibleName(
        "교사용 — 정답 · 해설 · 모든 문항 · 1쪽",
      );
    });
  });

  it("묶음 2 를 고르면 원 지문과 독해형만 — 눌림 표시 · 지면 · 주소 · 인쇄 단추가 같이 바뀐다", async () => {
    mockLayout();
    const user = userEvent.setup();
    client();
    await user.click(sheet(/^묶음 2/));
    expect(sheet(/^묶음 2/)).toHaveAttribute("aria-pressed", "true");
    expect(sheet(/^묶음 1/)).toHaveAttribute("aria-pressed", "false");
    expect(gallery().querySelector("[data-english-passage]")).not.toBeNull();
    expect(numbers()).toEqual(["1", "3"]);
    expect(window.location.search).toBe("?view=student&bundle=2");
    expect(
      await screen.findByRole("button", { name: "인쇄하기 — 묶음 2" }),
    ).toBeEnabled();
  });

  it("교사용으로 바꾸면 모든 문항 · 정답 상자 · 머리의 안내 줄 — 주소는 `?view=teacher`", async () => {
    mockLayout();
    const user = userEvent.setup();
    const { container } = client();
    expect(
      gallery().querySelector('[data-page-kind="questions"]'),
    ).not.toBeNull();
    await user.click(sheet(/^교사용/));
    expect(sheet(/^교사용/)).toHaveAttribute("aria-pressed", "true");
    expect(sheet(/^묶음 1/)).toHaveAttribute("aria-pressed", "false");
    expect(
      gallery().querySelector('[data-page-kind="answers"]'),
    ).not.toBeNull();
    expect(
      gallery().querySelector("[data-english-teacher-box]"),
    ).not.toBeNull();
    expect(numbers()).toEqual(["1", "2", "3", "4"]);
    expect(window.location.search).toBe("?view=teacher");
    const paper = within(gallery());
    expect(paper.getByText("배부 순서")).toBeInTheDocument();
    expect(
      paper.getByText("묶음 1(2, 4번) → 걷은 뒤 묶음 2(1, 3번)"),
    ).toBeInTheDocument();
    expect(paper.getByText("검사에서 찾은 누출 없음")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "인쇄하기 — 교사용" }),
    ).toBeEnabled();
    // 측정 틀은 화면 밖·보조기술에서 숨김 — 지면 묶음 밖에, 지면(묶음 둘 + 교사용)마다 하나
    expect(
      container.querySelectorAll('[aria-hidden="true"] [data-measure-items]'),
    ).toHaveLength(3);
    expect(gallery().querySelector("[data-measure-items]")).toBeNull();
  });

  it("`initialView` · `initialBundle` 로 시작 지면을 정한다 · 없는 묶음 번호는 묶음 1", () => {
    mockLayout();
    const teacher = client({ initialView: "teacher" });
    expect(sheet(/^교사용/)).toHaveAttribute("aria-pressed", "true");
    teacher.unmount();
    const second = client({ initialBundle: 2 });
    expect(sheet(/^묶음 2/)).toHaveAttribute("aria-pressed", "true");
    second.unmount();
    client({ initialBundle: 9 });
    expect(sheet(/^묶음 1/)).toHaveAttribute("aria-pressed", "true");
  });

  it("주소 읽기: `?view=` 는 모르는 값을 학생용으로 · `?bundle=` 은 1 이상의 정수만 · `?merge=1` 만 합침", () => {
    expect(parseEnglishPrintView("teacher")).toBe("teacher");
    expect(parseEnglishPrintView("student")).toBe("student");
    expect(parseEnglishPrintView(undefined)).toBe("student");
    expect(parseEnglishPrintView(["teacher"])).toBe("student");
    expect(parseEnglishPrintBundle("2")).toBe(2);
    expect(parseEnglishPrintBundle("0")).toBe(1);
    expect(parseEnglishPrintBundle("-1")).toBe(1);
    expect(parseEnglishPrintBundle("2.5")).toBe(1);
    expect(parseEnglishPrintBundle(["2"])).toBe(1);
    expect(parseEnglishPrintBundle(undefined)).toBe(1);
    expect(parseEnglishPrintMerge("1")).toBe(true);
    expect(parseEnglishPrintMerge("true")).toBe(false);
    expect(parseEnglishPrintMerge(undefined)).toBe(false);
  });

  it("배부 순서 줄 · 누출이 없으면 «누출 검사 — 검사에서 찾은 누출 없음» (합치기 단추 없음)", () => {
    mockLayout();
    client();
    const notes = within(screen.getByRole("region", { name: "배부 안내" }));
    expect(
      notes.getByText(
        "묶음 1을 풀고 걷은 뒤 묶음 2를 나눠 줍니다. 한꺼번에 주면 가른 효과가 없습니다.",
      ),
    ).toBeInTheDocument();
    expect(notes.getByText("누출 검사")).toBeInTheDocument();
    expect(notes.getByText("검사에서 찾은 누출 없음")).toBeInTheDocument();
    expect(notes.queryByRole("button")).toBeNull();
    expect(notes.queryByText("답이 보이는 문항")).toBeNull();
  });

  it("묶음이 하나뿐인 세트는 «학생용» 단추 하나 — 배부 안내도 종이의 묶음 줄도 없다", async () => {
    mockLayout();
    client({
      set: {
        ...SAMPLE_SET,
        questions: SAMPLE_SET.questions.filter((q) =>
          ["주제", "서술형"].includes(q.type),
        ),
        questionCount: 2,
      },
    });
    expect(sheet(/^학생용/)).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /^묶음/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "배부 안내" })).toBeNull();
    expect(within(gallery()).queryByText(/문제 묶음/)).toBeNull();
    expect(numbers()).toEqual(["1", "2"]);
    expect(
      await screen.findByRole("button", { name: "인쇄하기 — 학생용" }),
    ).toBeEnabled();
  });
});

describe("EnglishPrintClient — 누출 짝과 합치기 (3자 합의 «가-2»)", () => {
  it("답을 보여 주는 문항은 뒤 묶음 — 까닭 → 합치면 생기는 일 → 단추 차례로 읽힌다", () => {
    mockLayout();
    client({ set: LEAKY_SET });
    // 묶음 1(빈칸 2번 · 어법 4번) → 묶음 2(삽입 3번) → 묶음 3(독해 1번)
    expect(numbers()).toEqual(["2", "4"]);
    expect(sheet(/^묶음 2/)).toHaveAccessibleName(/변형 · 3번/);
    expect(sheet(/^묶음 3/)).toHaveAccessibleName(/독해 · 1번/);
    const region = screen.getByRole("region", { name: "배부 안내" });
    const notes = within(region);
    expect(notes.getByText("답이 보이는 문항")).toBeInTheDocument();
    expect(
      notes.getByText(
        "3번의 지문에 2번의 답이 있어 3번을 묶음 2로 두었습니다.",
      ),
    ).toBeInTheDocument();
    const effect = notes.getByText("합치면 2번의 답이 3번의 지문에 보입니다.");
    const merge = notes.getByRole("button", { name: "3번을 묶음 1에 합치기" });
    // 영향 문장이 단추보다 먼저 읽힌다
    expect(
      effect.compareDocumentPosition(merge) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("«근거 보기»를 누르면 짝마다 근거 구절이 선다", async () => {
    mockLayout();
    const user = userEvent.setup();
    client({ set: LEAKY_SET });
    const notes = within(screen.getByRole("region", { name: "배부 안내" }));
    const toggle = notes.getByRole("button", { name: "근거 보기" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(notes.queryByText(/그대로 있습니다/)).toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      notes.getByText(
        /^2번의 답 «.*steady practice.*» — 3번의 지문에 그대로 있습니다\.$/,
      ),
    ).toBeInTheDocument();
  });

  it("🔴 합치면 변형 문항이 한 묶음 · 줄이 «합쳤습니다»로 바뀌고 «합치기 되돌리기»로 다시 갈린다", async () => {
    mockLayout();
    const user = userEvent.setup();
    client({ set: LEAKY_SET });
    const notes = within(screen.getByRole("region", { name: "배부 안내" }));
    await user.click(
      notes.getByRole("button", { name: "3번을 묶음 1에 합치기" }),
    );
    expect(numbers()).toEqual(["2", "3", "4"]);
    expect(screen.queryByRole("button", { name: /^묶음 3/ })).toBeNull();
    expect(
      notes.getByText(
        "3번을 묶음 1에 합쳤습니다. 2번의 답이 3번의 지문에 보입니다.",
      ),
    ).toBeInTheDocument();
    expect(window.location.search).toBe("?view=student&bundle=1&merge=1");
    // 교사용 머리도 합친 순서를 적는다
    await user.click(sheet(/^교사용/));
    expect(
      within(gallery()).getByText("묶음 1(2~4번) → 걷은 뒤 묶음 2(1번)"),
    ).toBeInTheDocument();
    expect(
      within(gallery()).getByText("3번의 지문에 2번의 답"),
    ).toBeInTheDocument();

    await user.click(notes.getByRole("button", { name: "합치기 되돌리기" }));
    expect(sheet(/^묶음 3/)).toBeInTheDocument();
    expect(window.location.search).toBe("?view=teacher");
  });

  it("`initialMerged` 면 합친 채로 시작한다", () => {
    mockLayout();
    client({ set: LEAKY_SET, initialMerged: true });
    expect(numbers()).toEqual(["2", "3", "4"]);
  });
});

describe("EnglishPrintClient — 어법의 밑줄 표기가 깨졌을 때 (3자 합의 «라»)", () => {
  const BROKEN: EnglishSet = {
    ...LEAKY_SET,
    questions: LEAKY_SET.questions.map((q) =>
      q.type === "어법"
        ? {
            ...q,
            prompt:
              "밑줄 친 ①~② 가운데 어법상 틀린 것은?\nTherefore, habits ① is more ② important than gifts.",
          }
        : q,
    ),
  };

  it("🔴 학생용 묶음은 전부 막힌다 — 그 문항이 없는 묶음도 · 막는 줄은 문항 번호와 고치는 법을 말한다", async () => {
    mockLayout();
    const user = userEvent.setup();
    client({ set: BROKEN });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "4번 밑줄 문항(어법 · 어휘)에 밑줄 구간이 없습니다. 발문에서 밑줄 칠 곳을 <u> 와 </u> 로 감싼 뒤 학생용을 인쇄하십시오.",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "인쇄할 수 없음" }),
      ).toBeDisabled(),
    );
    // 4번이 없는 묶음 2(삽입 3번)도 막힌다 — 일부만 배부하면 세트가 중간에 끊긴다
    await user.click(sheet(/^묶음 2/));
    expect(numbers()).toEqual(["3"]);
    expect(
      screen.getByRole("button", { name: "인쇄할 수 없음" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^인쇄하기/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "인쇄할 수 없음" }));
    expect(window.print).not.toHaveBeenCalled();
  });

  it("교사용은 열려 있다 — 막는 줄은 남고, 종이 머리에 «밑줄 표기» 줄이 선다", async () => {
    mockLayout();
    const user = userEvent.setup();
    client({ set: BROKEN, initialView: "teacher" });
    const print = await screen.findByRole("button", {
      name: "인쇄하기 — 교사용",
    });
    expect(print).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "4번 밑줄 문항(어법 · 어휘)",
    );
    const paper = within(gallery());
    expect(paper.getByText("밑줄 표기")).toBeInTheDocument();
    expect(paper.getByText("4번: 밑줄 구간 없음")).toBeInTheDocument();
    await user.click(print);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("표기가 온전하면 막는 줄도 교사용 머리의 «밑줄 표기» 줄도 없다", async () => {
    mockLayout();
    client({ set: LEAKY_SET, initialView: "teacher" });
    await screen.findByRole("button", { name: "인쇄하기 — 교사용" });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(within(gallery()).queryByText("밑줄 표기")).toBeNull();
  });

  it("다른 유형에 섞인 표기는 주의 한 줄 — 인쇄는 막지 않는다", async () => {
    mockLayout();
    client({
      set: {
        ...SAMPLE_SET,
        questions: SAMPLE_SET.questions.map((q) =>
          q.type === "서술형"
            ? { ...q, prompt: "밑줄 친 <u>this</u> 를 우리말로 쓰시오." }
            : q,
        ),
      },
    });
    expect(
      screen.getByText(
        "3번 문항의 발문에 밑줄 표기(<u>)가 있습니다. 밑줄 문항(어법 · 어휘)이 아니어서 글자 그대로 찍힙니다.",
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "인쇄하기 — 묶음 1" }),
    ).toBeEnabled();
  });
});

describe("EnglishPrintClient — 인쇄 · 쪽 나눔", () => {
  it("쪽 나눔을 재기 전에는 «지면 준비 중»으로 눌리지 않고, 재고 나면 «인쇄하기 — 묶음 1» → window.print", async () => {
    mockLayout();
    const user = userEvent.setup();
    client();
    expect(screen.getByRole("button", { name: "지면 준비 중" })).toBeDisabled();
    const print = await screen.findByRole("button", {
      name: "인쇄하기 — 묶음 1",
    });
    expect(print).toBeEnabled();
    await user.click(print);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("🔴 크기를 아예 못 재면(측정 틀이 그려지지 않음) 인쇄 단추는 계속 잠겨 있다 — 한 쪽짜리 임시 지면이 종이로 나가지 않는다", async () => {
    // getClientRects 가 비어 있다 = 측정 틀이 배치되지 않았다(인쇄 매체·display:none)
    client();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("button", { name: "지면 준비 중" })).toBeDisabled();
    expect(gallery()).toHaveAttribute("data-english-pages-ready", "false");
  });

  it("잰 높이대로 쪽이 나뉜다 — 본문 240px 에 블록 100px 씩이면 두 블록마다 한 쪽", async () => {
    // 교사용: 블록 6 (문단 2 + 문항 4) · 간격 14 · 본문 240 − 여유 12 = 228 · 100+14+100 = 214 ≤ 228, 셋째는 328 > 228
    mockLayout(240, 100);
    client({ initialView: "teacher" });
    await screen.findByRole("button", { name: "인쇄하기 — 교사용" });
    await waitFor(() =>
      expect(gallery().querySelectorAll("[data-print-page]")).toHaveLength(3),
    );
    expect(gallery().getAttribute("data-english-pages-ready")).toBe("true");
    // 묶음마다 쪽 수가 다르다 — 묶음 1 은 문항 둘이라 한 쪽, 묶음 2 는 문단 둘 + 문항 둘이라 두 쪽
    await waitFor(() => {
      expect(sheet(/^묶음 1/)).toHaveAccessibleName(/· 1쪽$/);
      expect(sheet(/^묶음 2/)).toHaveAccessibleName(/· 2쪽$/);
      expect(sheet(/^교사용/)).toHaveAccessibleName(/· 3쪽$/);
    });
  });

  it("🔴 고른 묶음의 블록으로 잰다 — 묶음 2 는 두 쪽으로 나뉘고 문항이 제자리에 선다", async () => {
    // 묶음 2: 문단 0·1 + 1번 · 3번. 첫 쪽에 문단 둘(상자 여분 0), 둘째 쪽에 문항 둘
    mockLayout(240, 100);
    client({ initialBundle: 2 });
    await screen.findByRole("button", { name: "인쇄하기 — 묶음 2" });
    await waitFor(() =>
      expect(gallery().querySelectorAll("[data-print-page]")).toHaveLength(2),
    );
    const pages = gallery().querySelectorAll("[data-print-page]");
    expect(pages[0]!.querySelectorAll("[data-english-passage] p")).toHaveLength(
      2,
    );
    expect(numbers(pages[1]!)).toEqual(["1", "3"]);
    expect(
      within(pages[1] as HTMLElement).getByText("문제 묶음 2 · p. 2"),
    ).toBeInTheDocument();
  });

  it("한 쪽보다 큰 블록은 도구 줄에 어느 것인지 알린다", async () => {
    mockLayout(240, 300);
    client({ initialView: "teacher" });
    await screen.findByRole("button", { name: "인쇄하기 — 교사용" });
    const notice = await screen.findByText(
      /한 쪽보다 길어 지면에서 잘릴 수 있습니다/,
    );
    expect(notice.textContent).toContain("지문 1번째 문단");
    expect(notice.textContent).toContain("1번 문항");
  });

  it("«너무 큼» 알림은 고른 묶음의 문항 번호로 말한다", async () => {
    mockLayout(240, 300);
    client();
    const notice = await screen.findByText(
      /한 쪽보다 길어 지면에서 잘릴 수 있습니다/,
    );
    expect(notice.textContent).toContain("2번 문항 · 4번 문항");
    // 묶음 1 에는 원 지문이 없다 — 문단을 말하지 않는다
    expect(notice.textContent).not.toContain("번째 문단");
  });

  it("«닫기»는 창을 닫는다", async () => {
    mockLayout();
    const user = userEvent.setup();
    client();
    await user.click(screen.getByRole("button", { name: "닫기" }));
    expect(window.close).toHaveBeenCalledTimes(1);
  });

  it("검토 완료가 아니면 도구 줄에 한 줄 — 검토 완료면 없다", () => {
    mockLayout();
    const draft = client({ set: { ...SAMPLE_SET, status: "초안" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      ENGLISH_NOT_REVIEWED_NOTICE,
    );
    expect(ENGLISH_NOT_REVIEWED_NOTICE).toBe(
      "아직 검토 완료하지 않은 문제입니다.",
    );
    // 지면 머리에도 상태가 찍힌다 — 보이는 지면 묶음 안에서(숨은 측정 틀에도 같은 지면이 있다)
    expect(within(gallery()).getByText("학생용 · 초안")).toBeInTheDocument();
    draft.unmount();
    client();
    expect(screen.queryByText(ENGLISH_NOT_REVIEWED_NOTICE)).toBeNull();
  });

  it("도구 줄 머리: 세트 제목 · «학교 학년 · 시험 · N문항» — 느낌표·이모지 없음(D-08)", () => {
    mockLayout();
    const { container } = client({ set: LEAKY_SET });
    // 도구 줄은 main 바로 아래 header — 지면 안 header(머리)와 가른다
    const toolbar = within(
      container.querySelector("main > header") as HTMLElement,
    );
    expect(
      toolbar.getByRole("heading", { level: 1, name: "2학기 중간 대비 1차" }),
    ).toBeInTheDocument();
    expect(
      toolbar.getByText("한빛중 중2 · 2학기 중간고사 · 4문항"),
    ).toBeInTheDocument();
    expect(container.querySelector("main > header")?.textContent).not.toMatch(
      /!|[\u{1F300}-\u{1FAFF}]/u,
    );
    expect(
      screen.getByRole("region", { name: "배부 안내" }).textContent,
    ).not.toMatch(/!|[\u{1F300}-\u{1FAFF}]/u);
  });

  it("🔴 잰 뒤라도 틀이 깨졌으면(본문 40px 미만) 인쇄가 잠기고, 쪽 나눔·«너무 큼» 알림을 믿지 않는다 (리드 검토 D1)", async () => {
    // 본문 20px — layoutError. 임시 한 쪽 지면이 overflow:hidden 에 잘린 채 종이로 나가면 안 된다.
    mockLayout(20, 100);
    client({ initialView: "teacher" });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("지면 크기를 재지 못했습니다");
    const print = screen.getByRole("button", { name: "인쇄할 수 없음" });
    expect(print).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^인쇄하기/ })).toBeNull();
    // 본문이 20px 이면 블록 전부가 «너무 큼»이다 — 그 소음을 내지 않는다
    expect(screen.queryByText(/한 쪽보다 길어/)).toBeNull();
    expect(gallery()).toHaveAttribute("data-english-pages-ready", "false");
    // 깨진 측정으로 만든 쪽 나눔(블록마다 한 쪽)을 지면에 적용하지 않는다 — 임시 한 쪽 그대로
    expect(gallery().querySelectorAll("[data-print-page]")).toHaveLength(1);
    expect(window.print).not.toHaveBeenCalled();
    // 못 잰 쪽 수는 단추에 적지 않는다
    expect(sheet(/^교사용/)).toHaveAccessibleName(
      "교사용 — 정답 · 해설 · 모든 문항",
    );
  });

  it("훅이 첫 쪽·이어지는 쪽 높이와 지문 상자 여분을 각각 읽는다 — 다른 값을 주면 쪽 수가 갈린다 (리드 검토 D4)", async () => {
    // 첫 쪽 340(여유 빼면 328) · 이어지는 쪽 600(588) · 문단·문항 100 · 지문 상자 250 → 여분 250−200−10 = 40
    // 첫 쪽: 40+100 · +10+100 = 250 · 문항 +14+100 = 364 > 328 → 문항은 전부 둘째 쪽(100+114×3 = 442 ≤ 588)
    // 여분을 0 으로 읽으면 첫 쪽에 문항 하나가 들어가고(324 ≤ 328), 이어지는 쪽을 첫 쪽 높이로 읽으면 셋째 쪽이 생긴다
    mockLayout(340, 100, { cont: 600, passage: 250 });
    client({ initialView: "teacher" });
    await screen.findByRole("button", { name: "인쇄하기 — 교사용" });
    await waitFor(() =>
      expect(gallery().querySelectorAll("[data-print-page]")).toHaveLength(2),
    );
    const pages = gallery().querySelectorAll("[data-print-page]");
    expect(pages[0]!.querySelectorAll("[data-english-question]")).toHaveLength(
      0,
    );
    expect(pages[0]!.querySelectorAll("[data-english-passage] p")).toHaveLength(
      2,
    );
    expect(pages[1]!.querySelectorAll("[data-english-question]")).toHaveLength(
      4,
    );
  });

  it("측정 틀은 화면 밖 클래스(`measureHost`)를 달고 보조기술에서 숨는다 — 쪽 수만 재는 틀도 같다", () => {
    mockLayout();
    const { container } = client();
    const hosts = [...container.querySelectorAll("[data-measure-items]")].map(
      (node) => node.parentElement,
    );
    expect(hosts).toHaveLength(3);
    for (const host of hosts) {
      expect(host?.getAttribute("aria-hidden")).toBe("true");
      expect(host?.className).toMatch(/measureHost/);
    }
  });
});
