import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";

vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => (
    <div data-testid="math-content">{content}</div>
  ),
}));
// 검수 칸의 본문·정답·풀이 편집기는 2026-09-14(bf1becc6)부터 MathLive 시각 편집기다.
// MathLive 는 jsdom 에서 못 뜬다(`MathfieldElement` 가 없어 지연 적재가 트리를 통째로 내린다).
// 편집기 자체는 브라우저 검수(scripts/qa/math-text-editor)가 맡고, 여기서는 StudioReviewDraft
// 시험과 같은 textarea 대역으로 «무엇이 편집 칸에 들어가고 저장이 무엇을 보내는가»만 본다.
vi.mock("@/components/math/editor/MathTextEditor", () => ({
  MathTextEditor: ({
    value,
    onChange,
    "aria-label": label,
  }: {
    value: string;
    onChange: (value: string) => void;
    "aria-label": string;
  }) => (
    <textarea
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
const posts: DevAiRequest[] = [];
let respond: (request: DevAiRequest) => Promise<Response>;
const recognized = String.raw`$\frac{7}{3}$ + 1의 값을 구하세요.`;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function normal(request: DevAiRequest) {
  return Promise.resolve(
    json({
      provider: request.provider,
      action: request.action,
      result: {
        content: recognized,
        answer: String.raw`$\frac{10}{3}$`,
        solution: "한 개를 더합니다.",
        warnings: [],
        detectedGrade: {
          grade: "초5",
          confidence: "high",
          evidence: "예제 초등학교 5학년",
        },
        problems: [
          {
            content: recognized,
            answer: "",
            bbox: { left: 80, top: 180, width: 840, height: 170 },
          },
        ],
      },
    }),
  );
}
beforeEach(() => {
  posts.length = 0;
  respond = normal;
  localStorage.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    new Proxy({}, { get: () => vi.fn() }) as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,c291cmNl",
  );
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const request = JSON.parse(init.body as string) as DevAiRequest;
        posts.push(request);
        return respond(request);
      }
      return json({
        enabled: true,
        mode: "subscription-cli",
        defaultProvider: "codex",
        providers: [
          {
            id: "codex",
            label: "Codex",
            status: "ready",
            detail: "사용 가능",
            image: true,
          },
          {
            id: "claude",
            label: "Claude",
            status: "login-required",
            detail: "Claude CLI에서 로그인해 주세요.",
            image: true,
          },
        ],
      });
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
async function open(canExport = true) {
  const onAdd = vi.fn();
  const onExport = vi.fn();
  const view = render(
    <DevAiProvider>
      <StudioView onAdd={onAdd} onExport={onExport} canExport={canExport} />
    </DevAiProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "예제로 시작" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "페이지 자동 인식" }),
    ).toBeEnabled(),
  );
  return { ...view, onAdd, onExport };
}
async function recognize() {
  fireEvent.click(screen.getByRole("button", { name: "페이지 자동 인식" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /^2 문항 검토 \d+$/ }));
  await waitFor(() => expect(reviewCard()).toHaveTextContent(/값을 구하세요/));
}
/** 검수 칸의 문항 카드 — 인식한 본문·편집·해설 단추가 모두 이 안에 있다. */
function reviewCard() {
  return screen.getByRole("article", { name: "문제 1 인식 결과" });
}

describe("Studio AI review controls", () => {
  it("keeps source review available while hiding disabled export actions", async () => {
    const { onAdd, onExport } = await open(false);
    fireEvent.click(screen.getByRole("button", { name: "페이지 자동 인식" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /^2 문항 검토 \d+$/ }));
    expect(
      screen.queryByRole("button", { name: /담고 내보내기|^내보내기$/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1문항 담기" }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onExport).not.toHaveBeenCalled();
  });
  it("stamps only a confirmed empty page and keeps grade settings outside the inspector", async () => {
    await open();
    respond = (request) =>
      Promise.resolve(
        json({
          provider: request.provider,
          action: request.action,
          result: {
            content: "",
            answer: "",
            solution: "",
            warnings: [],
            problems: [],
          },
        }),
      );
    fireEvent.click(screen.getByRole("button", { name: "페이지 자동 인식" }));
    await screen.findByLabelText("자동 인식 완료: 문제가 없는 빈 페이지");
    const grade = screen.getByRole("combobox", { name: "시험지 학년" });
    expect(grade.closest("aside")).toBeNull();
    expect(
      screen.queryByText("자른 문제를 여기서 검수합니다"),
    ).not.toBeInTheDocument();
    fireEvent.change(grade, { target: { value: "고1" } });
    const area = screen.getByRole("group", { name: "문제 자르기 영역" });
    fireEvent.keyDown(area, { key: "ArrowRight" });
    fireEvent.keyDown(area, { key: "Enter" });
    expect(
      screen.queryByLabelText("자동 인식 완료: 문제가 없는 빈 페이지"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "시험지 학년" })).toHaveValue(
      "고1",
    );
  });

  it("shows page recognition failures separately from empty pages and retries", async () => {
    await open();
    respond = () => Promise.resolve(json({ error: "응답 지연" }, 502));
    fireEvent.click(screen.getByRole("button", { name: "페이지 자동 인식" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /작업 진행 상세/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("응답 지연");
    expect(
      screen.queryByLabelText("자동 인식 완료: 문제가 없는 빈 페이지"),
    ).not.toBeInTheDocument();
    respond = normal;
    fireEvent.click(
      screen.getAllByRole("button", { name: "이 페이지 재시도" })[0],
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
      ).toBeEnabled(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("keeps review navigation available while guarding the next action during a crop job", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "페이지 자동 인식" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
      ).toBeEnabled(),
    );
    let release: (() => void) | undefined;
    respond = (request) =>
      new Promise<Response>((resolve) => {
        release = () => resolve(normal(request));
      });
    // 쪽이 아니라 문항 작업을 돌린다. 옛 조건(recognizingPage)은 쪽만 보므로 이 자리라야
    // 관문을 빼면 시험이 빨개진다 — 쪽 작업으로 쓴 첫 판은 변이 시험에서 그대로 통과했다.
    fireEvent.click(screen.getByRole("button", { name: "그림 다시 찾기" }));
    // 다음 일괄 실행은 기다리되 기존 결과를 보는 검수 탭은 열어 둔다.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: /^2 문항 검토 \d+$/ }),
    ).toBeEnabled();
    expect(
      within(
        screen.getByRole("navigation", { name: "제작 단계 이동" }),
      ).getByRole("button", { name: /2 문항 검토/ }),
    ).toBeEnabled();
    expect(screen.getByText(/남음$/)).toBeInTheDocument();
    await act(async () => {
      release?.();
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
      ).toBeEnabled(),
    );
    expect(screen.queryByText(/남음$/)).not.toBeInTheDocument();
  });
  it("imports without a paid request, reviews recognized text and sends edits to the solution request", async () => {
    const { onAdd } = await open();
    expect(posts).toEqual([]);
    // 상단의 «AI 연결» 칸은 없앴다(원장님 2026-09-21 ⑷) — 도구 고르기·연결 상태는 왼쪽
    // AI 상태판이 맡는다(devAiClient 시험). 여기서는 그 자리가 비었는지만 본다.
    expect(screen.queryByText("AI 연결")).toBeNull();
    expect(screen.queryByLabelText("Studio AI 도구")).toBeNull();
    await recognize();
    expect(posts.map((post) => post.action)).toEqual(["page-ocr"]);
    expect(
      screen.getByRole("combobox", { name: "문제 1 출력 방식" }),
    ).toHaveValue("text");
    // 검수한 본문이 해설 요청에 실린다. 새 화면은 편집 중에 해설을 못 돌리므로(저장한 본문만
    // 보낸다) «수정 → 저장 → 해설 생성» 순서다. 옛 화면은 편집 칸 그대로 요청했다.
    const card = reviewCard();
    fireEvent.click(within(card).getByRole("button", { name: "내용 수정" }));
    const content = within(card).getByLabelText("문제 내용");
    expect(content).toHaveValue(recognized);
    fireEvent.change(content, { target: { value: "검수한 도형 문제" } });
    expect(
      within(card).getByRole("button", { name: "해설 생성" }),
    ).toBeDisabled();
    fireEvent.click(within(card).getByRole("button", { name: "저장" }));
    expect(posts).toHaveLength(1);
    fireEvent.click(within(card).getByRole("button", { name: "해설 생성" }));
    expect(
      await within(card).findByText("한 개를 더합니다."),
    ).toBeInTheDocument();
    expect(posts[1]).toMatchObject({
      action: "solution",
      content: "검수한 도형 문제",
      imageDataUrl: "data:image/png;base64,c291cmNl",
      grade: "초5",
    });
    fireEvent.click(screen.getByRole("button", { name: "1문항 담기" }));
    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        croppedImage: undefined,
        content: "검수한 도형 문제",
        solution: "한 개를 더합니다.",
      }),
    ]);
  });

  // 대분수는 «보여 줄 때만»(fractionDisplay) — 원문·편집 칸은 가분수 그대로다.
  // 본문·정답·해설 미리보기와 인쇄가 한 규칙이다(원장님 2026-09-19 «통일시켜» — 본문 읽기가
  // 2026-09-14 bf1becc6 에 SourceEditorDisplay 로 바뀌며 빠졌던 것을 되돌렸다).
  it("keeps editable raw fractions and applies mixed fractions only in elementary previews", async () => {
    await open();
    await recognize();
    const card = reviewCard();
    fireEvent.click(within(card).getByRole("button", { name: "해설 생성" }));
    await within(card).findByText("한 개를 더합니다.");
    const answerPreview = () =>
      within(within(card).getByText("정답").parentElement!).getByTestId(
        "math-content",
      );
    // 초5: 정답 10/3 이 미리보기에서 대분수로 보인다.
    expect(answerPreview()).toHaveTextContent(String.raw`$3\frac{1}{3}$`);
    // 편집 칸에는 날것 그대로 — 본문도 정답도 가분수다.
    fireEvent.click(within(card).getByRole("button", { name: "내용 수정" }));
    expect(within(card).getByLabelText("문제 내용")).toHaveValue(recognized);
    expect(within(card).getByLabelText("정답")).toHaveValue(
      String.raw`$\frac{10}{3}$`,
    );
    fireEvent.click(within(card).getByRole("button", { name: "취소" }));
    // 중1: 같은 정답이 가분수 그대로 보인다.
    fireEvent.change(screen.getByRole("combobox", { name: "시험지 학년" }), {
      target: { value: "중1" },
    });
    expect(answerPreview()).toHaveTextContent(String.raw`$\frac{10}{3}$`);
    expect(answerPreview()).not.toHaveTextContent(String.raw`3\frac{1}{3}`);
  });

  /** 본문 미리보기(원본 편집기 읽기)가 그린 수식들 — 렌더러가 식마다 원식을 적어 둔다. */
  const bodyFormulas = (card: HTMLElement) =>
    Array.from(
      card.querySelectorAll<HTMLElement>(
        ".source-editor-display [data-math-tex]",
      ),
    ).map((element) => decodeURIComponent(element.dataset.mathTex ?? ""));
  const answerText = (card: HTMLElement) =>
    within(within(card).getByText("정답").parentElement!).getByTestId(
      "math-content",
    ).textContent;
  function recognizeAs(content: string, answer: string) {
    respond = (request) =>
      normal(request)
        .then((response) => response.json())
        .then((body) => {
          body.result.content = content;
          body.result.answer = answer;
          body.result.problems[0].content = content;
          return json(body);
        });
  }

  it("shows the elementary body preview in mixed fractions with the same rule as the answer preview", async () => {
    const body = String.raw`$\frac{10}{3}$ 보다 1 큰 수의 값을 구하세요.`;
    recognizeAs(body, String.raw`$\frac{10}{3}$`);
    await open();
    await recognize();
    const card = reviewCard();
    fireEvent.click(within(card).getByRole("button", { name: "해설 생성" }));
    await within(card).findByText("한 개를 더합니다.");
    // 초5: 본문의 10/3 이 정답 미리보기와 똑같이 대분수로 보인다.
    expect(bodyFormulas(card)).toEqual([String.raw`3\frac{1}{3}`]);
    expect(answerText(card)).toBe(`$${bodyFormulas(card)[0]}$`);
    // 편집 칸은 날것 그대로 — 본문도 정답도 가분수다.
    fireEvent.click(within(card).getByRole("button", { name: "내용 수정" }));
    expect(within(card).getByLabelText("문제 내용")).toHaveValue(body);
    expect(within(card).getByLabelText("정답")).toHaveValue(
      String.raw`$\frac{10}{3}$`,
    );
    fireEvent.click(within(card).getByRole("button", { name: "취소" }));
    expect(bodyFormulas(card)).toEqual([String.raw`3\frac{1}{3}`]);
    // 중1: 같은 본문이 가분수 그대로 보인다 — 정답 미리보기도 같다.
    fireEvent.change(screen.getByRole("combobox", { name: "시험지 학년" }), {
      target: { value: "중1" },
    });
    expect(bodyFormulas(card)).toEqual([String.raw`\frac{10}{3}`]);
    expect(answerText(card)).toBe(`$${bodyFormulas(card)[0]}$`);
  });

  it("keeps a conversion exercise's fractions in every preview, as print does", async () => {
    // 인쇄(NativeProblem·AnswerPage)는 본문을 «묻는 말»로 넘겨 바꾸기 문제를 알아본다.
    // 미리보기도 같은 인자로 부른다 — 정답 7/3 을 2⅓ 로 보이면 정답이 틀려 보인다.
    const body = String.raw`대분수 $2\frac{1}{3}$ 을 가분수로 바꾸어 값을 구하세요.`;
    recognizeAs(body, String.raw`$\frac{7}{3}$`);
    await open();
    await recognize();
    const card = reviewCard();
    fireEvent.click(within(card).getByRole("button", { name: "해설 생성" }));
    await within(card).findByText("한 개를 더합니다.");
    expect(bodyFormulas(card)).toEqual([String.raw`2\frac{1}{3}`]);
    expect(answerText(card)).toBe(String.raw`$\frac{7}{3}$`);
  });

  it("preserves a pending request on restart dialog cancel, then aborts and resets on acceptance without clearing added problems", async () => {
    const { onAdd } = await open();
    await recognize();
    fireEvent.click(screen.getByRole("button", { name: "1문항 담기" }));
    let finish!: (value: Response) => void;
    respond = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    fireEvent.click(screen.getByRole("button", { name: "다시 인식" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /작업 진행 상세/ }),
    );
    await screen.findByRole("button", { name: "문제 인식 취소" });
    const request = vi.mocked(fetch).mock.calls.at(-1)![1] as RequestInit;
    // 작업실 자체도 dialog 라(«문제 제작 스튜디오») 확인 창은 제목으로 집는다.
    const restartDialog = () =>
      screen.getByRole("dialog", { name: "새로 시작할까요?" });
    fireEvent.click(screen.getByRole("button", { name: "새로 시작" }));
    fireEvent.click(
      within(restartDialog()).getByRole("button", { name: "취소" }),
    );
    expect(request.signal?.aborted).toBe(false);
    expect(reviewCard()).toHaveTextContent(/값을 구하세요/);
    fireEvent.click(screen.getByRole("button", { name: "새로 시작" }));
    fireEvent.click(
      within(restartDialog()).getByRole("button", { name: "새로 시작" }),
    );
    expect(request.signal?.aborted).toBe(true);
    await act(async () => {
      finish(await normal(posts.at(-1)!));
    });
    expect(
      screen.queryByRole("article", { name: "문제 1 인식 결과" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/값을 구하세요/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "예제로 시작" }),
    ).toBeInTheDocument();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  /**
   * 원장님 2026-09-21: «도형 생성을 먼저 돌려버리고 있으니까 이후에 크롭 조정하게 되면 이중생성 … 잘라내기를 끝내고,
   * 다음단계(OCR, 디지털화)를 시작하게 되면 디지털화를 시작하는걸로. 크롭과 동시에 진행하지말고.»
   * 훅의 규칙은 `useStudioAi.test.tsx` 가 재고, 여기서는 **화면이 단계를 훅에 제대로 알리는가**(배선)를 잰다.
   */
  describe("도형 생성은 ② 영역 지정이 끝난 뒤에", () => {
    const withFigures = (request: DevAiRequest) =>
      Promise.resolve(
        json({
          provider: request.provider,
          action: request.action,
          result:
            request.action === "figure-redraw"
              ? {
                  content: "",
                  answer: "",
                  solution: "",
                  warnings: [],
                  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1 9L5 1L9 9Z"/></svg>',
                }
              : {
                  content: recognized,
                  answer: "",
                  solution: "",
                  warnings: [],
                  problems: [
                    {
                      content: recognized,
                      answer: "",
                      bbox: { left: 80, top: 180, width: 840, height: 170 },
                      figures: [
                        {
                          bbox: {
                            left: 120,
                            top: 200,
                            width: 200,
                            height: 160,
                          },
                        },
                      ],
                    },
                  ],
                },
        }),
      );
    const redraws = () =>
      posts.filter((request) => request.action === "figure-redraw");
    async function recognizeInCropStep() {
      await open();
      respond = withFigures;
      fireEvent.click(screen.getByRole("button", { name: "페이지 자동 인식" }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
        ).toBeEnabled(),
      );
      // 한 박자 더 — «아직 안 불렸을 뿐»과 가른다.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    }

    it("🔴 ② 에서는 인식이 끝나도 도형 생성을 부르지 않는다 — «다음»을 누르면 그때 부른다", async () => {
      await recognizeInCropStep();
      expect(redraws()).toEqual([]);
      expect(screen.queryByText("도형 생성 중")).toBeNull();
      fireEvent.click(
        screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
      );
      await waitFor(() => expect(redraws()).toHaveLength(1));
    });

    it("🔴 단계 탭으로 ③ 에 가도 미뤄 둔 도형을 만든다", async () => {
      await recognizeInCropStep();
      expect(redraws()).toEqual([]);
      fireEvent.click(
        screen.getByRole("button", { name: /^2 문항 검토 \d+$/ }),
      );
      await waitFor(() => expect(redraws()).toHaveLength(1));
    });
  });

  it("counts failed figures instead of losing them and offers a retry", async () => {
    await open();
    // 도형만 실패시킨다 — 실패는 처리 중·대기·완료 어디에도 안 들어가 분모에서만 사라졌었다.
    respond = (request) =>
      request.action === "figure-redraw"
        ? Promise.resolve(json({ error: "도형 생성 실패" }, 502))
        : Promise.resolve(
            json({
              provider: request.provider,
              action: request.action,
              result: {
                content: recognized,
                answer: "",
                solution: "",
                warnings: [],
                problems: [
                  {
                    content: recognized,
                    answer: "",
                    bbox: { left: 80, top: 180, width: 840, height: 170 },
                    figures: [
                      {
                        bbox: { left: 120, top: 200, width: 200, height: 160 },
                      },
                    ],
                  },
                  {
                    content: recognized,
                    answer: "",
                    bbox: { left: 80, top: 400, width: 840, height: 170 },
                    figures: [
                      {
                        bbox: { left: 120, top: 420, width: 200, height: 160 },
                      },
                    ],
                  },
                ],
              },
            }),
          );
    fireEvent.click(screen.getByRole("button", { name: "페이지 자동 인식" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "다음: OCR · 디지털화" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /작업 진행 상세/ }),
    );
    expect(
      await screen.findByRole("button", { name: /실패 \d+개 다시 생성/ }),
    ).toBeInTheDocument();
    // 원장님 2026-09-20 «전부 완료인데 도형 2/4 이니까 어딘지 알 수가 없음» —
    // 실패한 도형이 하나씩, 진행 문구와 같은 이름으로 보이고 눌러서 그 문항으로 간다.
    const failures = screen.getByLabelText("실패한 도형 목록");
    expect(within(failures).getAllByRole("button")).toHaveLength(2);
    expect(
      within(failures).getByRole("button", { name: "도형 1-1" }),
    ).toHaveAttribute("title", expect.stringContaining("도형 생성 실패"));
    fireEvent.click(within(failures).getByRole("button", { name: "도형 2-1" }));
    expect(screen.getByLabelText("문항 검수 이동")).toHaveTextContent(
      "문제 2 / 2",
    );
    expect(
      screen.getByRole("article", { name: "문제 2 인식 결과" }),
    ).toHaveAttribute("data-selected", "true");
  });
  it("retains keyboard crop controls and allows manual image output without OCR", async () => {
    const { onAdd } = await open();
    const area = screen.getByRole("group", { name: "문제 자르기 영역" });
    fireEvent.keyDown(area, { key: "ArrowRight" });
    fireEvent.keyDown(area, { key: "Enter" });
    expect(
      screen.getByRole("img", { name: "검수할 자른 원본 문제" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^2 문항 검토 \d+$/ }));
    fireEvent.click(screen.getByRole("button", { name: "1문항 담기" }));
    expect(posts).toEqual([]);
    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        croppedImage: "data:image/png;base64,c291cmNl",
      }),
    ]);
  });
});
