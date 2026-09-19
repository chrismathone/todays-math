/**
 * 🔴 RED → 🟢 — 검수 콘솔 신고 흐름 가속 (원장님 요청 2026-08-22).
 *
 * 「신고를 눌렀을 때도 하단에 숫자 입력으로 빠르게 넘어갈 수 있게.
 *  1행당 하나의 라벨로 빠르게. 모바일에서도 신고 기능 작동할 수 있게.」
 *
 * 잠그는 것:
 *  1. 신고 패널이 열리면 숫자 1~6 이 **사유**가 된다 — 누르는 즉시 신고하고 다음.
 *     (패널이 닫혀 있을 때의 1·2·3 판정 단축은 그대로.)
 *  2. 사유 줄을 **탭(클릭)해도 즉시** 신고하고 다음 — 모바일은 이 길 하나로 끝난다.
 *  3. 「그 밖의 것」만 예외 — 설명이 필수라 자동 제출하지 않는다.
 *  4. Escape 가 신고 패널을 닫는다 (예전엔 2가 토글이었지만 이제 2는 사유다).
 */
import { describe, expect, it } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import {
  ReviewConsole,
  type ConsoleProblem,
  type ConsoleQueue,
} from "@/components/review/ReviewConsole";
import { REASON_LABELS } from "@/components/review/reasonLabels";
import { server } from "@/mocks/server";

const QUEUES: ConsoleQueue[] = [
  {
    key: "figure",
    label: "그림을 보라",
    why: "테스트",
    look: "그림",
    remaining: 5,
  },
];

const problem = (i: number): ConsoleProblem => ({
  id: `90000000-0000-4000-8000-00000000010${i}`,
  problemCode: `T-000${i}`,
  content: `문항 ${i} 본문 $x=${i}$`,
  answer: `${i}`,
  solution: null,
  questionType: "객관식",
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  directUseAllowed: true,
  unitName: "테스트 단원",
  grade: "중2",
  // 원본 메타데이터 (2026-08-24). 타입이 이걸 요구하는 것이 **의도한 가드**다 —
  // 예전에는 API 응답을 캐스팅해 받아 모양이 갈려도 아무도 몰랐다.
  source: "past_exam",
  sourceFile: "N:/기출/테스트.PDF",
  school: "테스트중",
  subject: null,
  examId: null,
  questionNumber: i,
  solutionSource: "none",
});

function arm() {
  const posts: Array<{ id: string; body: Record<string, unknown> }> = [];
  server.use(
    http.post("/api/problems/:id/review", async ({ params, request }) => {
      posts.push({
        id: String(params.id),
        body: (await request.json()) as Record<string, unknown>,
      });
      return HttpResponse.json({ data: { ok: true } });
    }),
    http.get("/api/review/queue", () =>
      HttpResponse.json({
        data: [],
        meta: {
          queue: { ...QUEUES[0]!, remaining: 0 },
          reviewedByMe: 0,
        },
      }),
    ),
  );
  return posts;
}

function renderConsole() {
  return render(
    <ReviewConsole
      queues={QUEUES}
      initialKey="figure"
      initialRows={[problem(1), problem(2), problem(3), problem(4), problem(5)]}
      reviewedByMe={0}
    />,
  );
}

describe("검수 콘솔 — 신고 가속 (2026-08-22)", () => {
  it("사유가 1행 1라벨 + 번호로 선다", async () => {
    arm();
    const user = userEvent.setup();
    renderConsole();
    await user.keyboard("2");
    const panel = screen.getByText("무엇이 이상한가").closest("div")!;
    const rows = within(panel).getAllByRole("button");
    // 6개 사유 각각이 제 줄(버튼)이고 번호를 단다
    expect(
      rows.filter((b) => /[1-6]/.test(b.textContent ?? "")).length,
    ).toBeGreaterThanOrEqual(6);
    expect(within(panel).getByText("그림이 이상하다")).toBeInTheDocument();
  });

  it("숫자키: 2(신고) → 1(그림) 이 곧바로 신고하고 다음이다", async () => {
    const posts = arm();
    const user = userEvent.setup();
    renderConsole();

    expect(screen.getByText(/문항 1 본문/)).toBeInTheDocument();
    await user.keyboard("2");
    await user.keyboard("1");

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.body).toMatchObject({
      verdict: "defect",
      reason: "figure",
    });
    // 다음 문항으로 넘어갔고 패널은 닫혔다
    await screen.findByText(/문항 2 본문/);
    expect(screen.queryByText("무엇이 이상한가")).not.toBeInTheDocument();
  });

  it("사유 줄을 탭하면 즉시 신고하고 다음 — 모바일 동선", async () => {
    const posts = arm();
    const user = userEvent.setup();
    renderConsole();

    await user.click(screen.getByRole("button", { name: /신고/ }));
    await user.click(screen.getByRole("button", { name: /답이 틀렸다/ }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.body).toMatchObject({
      verdict: "defect",
      reason: "answer",
    });
  });

  it("그 밖의 것(6)은 설명 없이 자동 제출하지 않는다", async () => {
    const posts = arm();
    const user = userEvent.setup();
    renderConsole();

    await user.keyboard("2");
    await user.keyboard("6");
    expect(posts).toHaveLength(0);

    await user.type(
      screen.getByPlaceholderText(/무엇이 이상한지 적는다/),
      "보기 순서가 섞였다",
    );
    await user.click(screen.getByRole("button", { name: "신고하고 다음" }));
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.body).toMatchObject({
      verdict: "defect",
      reason: "other",
      note: "보기 순서가 섞였다",
    });
  });

  it("Escape 가 신고 패널을 닫고, 닫힌 뒤 1은 다시 판정이다", async () => {
    const posts = arm();
    const user = userEvent.setup();
    renderConsole();

    await user.keyboard("2");
    expect(screen.getByText("무엇이 이상한가")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("무엇이 이상한가")).not.toBeInTheDocument();

    await user.keyboard("1");
    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.body).toMatchObject({ verdict: "pass" });
  });
});

/**
 * 🔴 RED → 🟢 — **정답도 수식 렌더러를 탄다** (원장님 관찰 2026-08-24).
 *
 * 원장님이 두 가지를 화면에서 찾아 주셨다:
 *   ⑴ 정답이 `$\frac{12}{13}$` **날 글자 그대로** 나온다.
 *   ⑵ 정답의 `④` 가 보기의 `④` 와 **글꼴이 다르다**.
 *
 * 뿌리가 하나다 — 본문·해설은 렌더러를 타는데 **정답만 `{row.answer}` 날 문자열**이었다.
 * 그래서 수식은 안 그려지고, 글꼴도 렌더러를 탄 보기와 갈렸다.
 *
 * ⚠️ `MathText` 의 머리주석이 이미 그 규칙을 적어 두고 있었다 —
 *    「**정답**·해설 등 단문 수식 렌더러 … 검수(S-05)·문제은행(S-08)·인쇄(S-06)가
 *    **이 경로만 쓴다 — 렌더 경로 분기 금지**」. 검수 화면이 그 규칙을 어기고 있었다.
 *    규칙을 문서에만 적어 두면 이렇게 조용히 갈라진다. 그래서 여기서 잠근다.
 */
describe("검수 콘솔 — 정답 렌더 (2026-08-24)", () => {
  /**
   * ⚠️ 역슬래시를 **코드로 만든다.** 이 저장소가 여러 번 겪은 자리다 — 셸 heredoc·
   *    정규식·JSON 을 거치며 역슬래시가 한 겹 붙거나 사라진다. 실제로 이 테스트를
   *    처음 쓸 때 `"$\\frac…"` 가 파일에 `"$\frac…"` 로 들어갔고, JS 는 그것을
   *    **폼피드(`\f`)** 로 읽어 KaTeX 에 `rac{12}{13}` 이 갔다. 그래서 **제품이 아니라
   *    픽스처가 빨간불을 냈다.** 코드로 만들면 그 축이 아예 없어진다.
   */
  const BS = String.fromCharCode(92);
  const FRAC = `$${BS}frac{12}{13}$`;

  const withAnswer = (answer: string): ConsoleProblem => ({
    ...problem(1),
    answer,
  });

  function renderWith(answer: string) {
    return render(
      <ReviewConsole
        queues={QUEUES}
        initialKey="figure"
        initialRows={[withAnswer(answer)]}
        reviewedByMe={0}
      />,
    );
  }

  it("정답의 수식이 날 LaTeX 로 새지 않는다", () => {
    arm();
    renderWith(FRAC);

    // 화면 어디에도 `\frac` 이나 감싼 `$` 가 글자로 남으면 안 된다.
    expect(document.body.textContent).not.toContain(BS + "frac");
    expect(document.body.textContent).not.toContain("$");
  });

  it("정답도 본문과 같은 렌더 경로(KaTeX)를 탄다", () => {
    arm();
    const { container } = renderWith(FRAC);

    // 본문이 쓰는 것과 같은 렌더러라면 KaTeX 산출물이 정답 자리에도 생긴다.
    const label = screen.getByText("정답");
    const row = label.parentElement!;
    expect(row.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).toContain("12");
  });

  it("수식이 아닌 정답(④)도 같은 경로로 그린다 — 보기와 글꼴이 갈리지 않게", () => {
    arm();
    renderWith("④");

    const row = screen.getByText("정답").parentElement!;
    expect(row.textContent).toContain("④");
  });
});

/**
 * 🔴 RED → 🟢 — **원본 메타데이터를 하단에 보여 준다** (원장님 요청 2026-08-24:
 * 「검수 계정은 원본이 어디에 있는지 원본 메타데이터도 하단에 나오게」).
 *
 * 검수자가 이상한 문항을 만났을 때 **원본을 열어 대 보려면** 경로가 화면에 있어야 한다.
 * 값이 화면에 안 뜨면 검수는 「이상하다」까지만 하고 원인을 못 짚는다.
 */
describe("검수 콘솔 — 원본 메타데이터 (2026-08-24)", () => {
  it("출처·원본 파일·문항 코드를 하단에 보여 준다", () => {
    arm();
    renderConsole();

    const meta = screen.getByLabelText("원본 정보");
    expect(meta).toHaveTextContent("기출");
    expect(meta).toHaveTextContent("테스트중");
    expect(meta).toHaveTextContent("N:/기출/테스트.PDF");
    expect(meta).toHaveTextContent("T-0001");
  });

  it("기계 키를 날것으로 내보이지 않는다", () => {
    arm();
    renderConsole();

    const meta = screen.getByLabelText("원본 정보");
    expect(meta.textContent).not.toContain("past_exam");
    expect(meta).toHaveTextContent("해설 없음");
  });
});

/**
 * 🔴 RED → 🟢 — **대기열이 신고 사유를 강조한다** (원장님 확정 2026-08-24, 「가」안).
 *
 * 「대기열에 따라 위에서 신고 내용이 달라져야 할 것 같다」는 요청에 두 갈래를 냈다:
 *   가. 순서는 **고정**하고 그 대기열에 해당하는 사유만 강조
 *   나. 대기열마다 순서를 재배치
 *
 * ⚠️ **「가」를 고른 이유가 이 테스트의 핵심이다.** 신고 패널은 「숫자 키·탭 즉시 신고」다.
 *    순서를 대기열마다 바꾸면 **숫자 키의 뜻이 같이 바뀐다** — 손에 익은 채로 다른 대기열에
 *    가면 엉뚱한 사유로 신고가 들어가고, 그건 **에러 없이 조용히 틀린다.** 그래서 순서는
 *    어느 대기열에서도 고정이고, 강조만 바뀐다.
 */
describe("검수 콘솔 — 대기열별 사유 강조 (2026-08-24)", () => {
  function renderQueue(q: Partial<ConsoleQueue>) {
    return render(
      <ReviewConsole
        queues={[{ ...QUEUES[0]!, ...q }]}
        initialKey={(q.key ?? "figure") as ConsoleQueue["key"]}
        initialRows={[problem(1)]}
        reviewedByMe={0}
      />,
    );
  }

  /**
   * 사유 줄을 **번호 → 사유 라벨**로 읽는다.
   *
   * ⚠️ 글자 전체를 견주면 안 된다 — 강조된 줄에는 「이 대기열」이 덧붙어 대기열마다
   *    글자가 달라진다. 이 검사가 지키려는 것은 **숫자 키의 뜻**(순서)이지 꾸밈이 아니다.
   */
  const reasonOrder = () =>
    within(screen.getByText("무엇이 이상한가").closest("div")!)
      .getAllByRole("button")
      .filter((b) => /[1-6]$/.test((b.textContent ?? "").trim()))
      .map((b) => {
        const t = (b.textContent ?? "").trim();
        const label = Object.values(REASON_LABELS).find((l) => t.startsWith(l));
        return `${t.slice(-1)}:${label ?? t}`;
      });

  it("숫자 키의 뜻은 어느 대기열에서도 같다 — 순서 고정", async () => {
    arm();
    const user = userEvent.setup();

    renderQueue({ key: "figure", emphasize: ["figure"] });
    await user.keyboard("2");
    const a = reasonOrder();
    cleanup();

    renderQueue({ key: "nosolution", emphasize: ["solution"] });
    await user.keyboard("2");
    const b = reasonOrder();

    expect(a).toEqual(b);
  });

  it("그 대기열이 가리키는 사유를 강조한다", async () => {
    arm();
    const user = userEvent.setup();
    renderQueue({ key: "nosolution", emphasize: ["solution"] });
    await user.keyboard("2");

    const solution = screen.getByRole("button", { name: /해설이 없다·틀렸다/ });
    const unit = screen.getByRole("button", { name: /단원이 틀렸다/ });
    expect(solution).toHaveAttribute("data-emphasis", "true");
    expect(unit).not.toHaveAttribute("data-emphasis", "true");
  });

  it("강조는 색만으로 알리지 않는다 — 말로도 적는다", async () => {
    arm();
    const user = userEvent.setup();
    renderQueue({ key: "nosolution", emphasize: ["solution"] });
    await user.keyboard("2");

    const solution = screen.getByRole("button", { name: /해설이 없다·틀렸다/ });
    expect(solution.textContent).toContain("이 대기열");
  });
});

/**
 * 🔴 검수 계정에 **나갈 방법이 없었다** (원장님 지적 2026-08-25).
 *
 * `/review` 는 `AppChrome` 을 안 쓴다 — 검수 계정은 메인·반·문제은행에 못 들어가므로
 * 그 nav 를 그리면 눌러도 「권한 없음」인 링크가 된다(D-30). 그래서 크롬 전체가 아니라
 * **계정 구역만** 가져왔다. D-77 이 막으려던 모양 그대로였다: *「잘못된 계정에 갇히면 안 된다」*.
 *
 * ⚠️ **이 검사가 못 보는 것**: 로그아웃이 실제로 세션을 지우는지는 못 본다
 *    (`vitest.setup.ts` 가 서버 액션을 전역 모킹한다). 그 축은 실물 검사의 몫이고,
 *    게이트 쪽은 `routeAccess.test.ts` 가 «POST /review 가 열려 있나»로 따로 지킨다 —
 *    **그게 없으면 화면에는 단추가 보이는데 눌러도 막힌다.**
 */
describe("[D-77] 검수 화면에도 계정·로그아웃이 있다", () => {
  // 헬퍼를 이 블록 안에 따로 둔다 — 다른 describe 의 것을 빌려 쓰면 그쪽이 바뀔 때
  // 이 검사가 «관계없는 이유로» 같이 깨진다.
  function renderConsole() {
    return render(
      <ReviewConsole
        queues={QUEUES}
        initialKey="figure"
        initialRows={[problem(1)]}
        reviewedByMe={0}
      />,
    );
  }

  it("헤더에 지금 계정과 로그아웃이 보인다", async () => {
    arm();
    renderConsole();

    const header = screen.getByRole("banner");
    expect(
      await within(header).findByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
    expect(
      await within(header).findByTestId("account-email"),
    ).toHaveTextContent(/@/);
  });

  it("세션 조회가 실패해도 로그아웃은 남는다 — 갇히면 안 된다", async () => {
    arm();
    server.use(http.get("/api/auth/session", () => HttpResponse.error()));
    renderConsole();

    const header = screen.getByRole("banner");
    expect(
      await within(header).findByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
    expect(within(header).queryByTestId("account-email")).toBeNull();
  });
});
