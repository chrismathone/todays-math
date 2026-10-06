/**
 * 🔴 RED → 🟢 — 검토·편집 화면 (D-148 · 25 §1.3). «학교별 내신 대비» 뷰 안 상태(`editing: setId`)로 열린다.
 *
 * 구현: src/components/english/EnglishEditor.tsx (뿌리 EnglishStudio 가 마운트)
 *
 * 무엇을 잠그나
 * 1. 세트를 읽어 «1번 · 유형» 머리 · 발문 · 보기 ①~⑤ · 정답 · 해설 · 근거를 **지면과 같은 규칙으로** 그린다(어법의 `<u>` 는 밑줄).
 *    고칠 칸(`aria-label` «N번 문제 M번 선택지» 등)은 «N번 문제 수정»을 누르면 열린다 — 원장님 2026-10-01 «후보정»·«스크롤 없이».
 * 2. 내용을 고치면 상태가 «초안»으로 내려간다(ChatGPT 앱 규칙).
 * 3. 저장은 `revision` 을 싣고, 성공하면 응답의 `revision` 으로 갱신한다(두 번째 저장이 새 값을 싣는다).
 * 4. 409 면 알림 줄 + «다시 불러오기» — 다시 읽으면 알림이 걷히고 서버 내용으로 돌아온다.
 * 5. 인쇄 창은 학생용·교사용 새 탭 링크. 검토 완료가 아니면 «아직 검토 완료하지 않은 문제입니다.» 한 줄.
 * 6. 삭제는 확인 창 뒤 목록으로 돌아간다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { http, HttpResponse } from "msw";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import {
  ENGLISH_MOCK_SETS,
  ENGLISH_SET_DONE_ID,
  ENGLISH_SET_DRAFT_ID,
} from "@/mocks/handlers/english";
import { englishSetResponseSchema } from "@/contracts/english.contract";

import { Harness, installDialogShim, makeLog } from "./EnglishStudio.harness";

beforeEach(() => {
  localStorage.clear();
  installDialogShim();
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function openDraft(log = makeLog()) {
  render(<Harness log={log} openSetId={ENGLISH_SET_DRAFT_ID} />);
  await screen.findByRole("textbox", { name: "세트 이름" });
  return log;
}

describe("[EnglishEditor] 검토·편집", () => {
  it("세트를 읽어 문항 머리 · 보기 · 정답 · 해설 · 근거를 그린다", async () => {
    await openDraft();
    expect(screen.getByText("1번 · 주제")).toBeVisible();
    expect(screen.getByText("3번 · 서술형")).toBeVisible();
    // 읽기 모양 — 보기는 ①~⑤ 와 글, 정답은 번호 글자
    const first = screen.getByRole("region", { name: "1번 문항" });
    expect(
      within(first)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual([
      "①강가에 나무를 심는 일의 어려움",
      "②학생들의 나무 심기가 마을에 가져온 변화",
      "③홍수를 막는 여러 가지 방법",
      "④여름에 강가를 걷는 즐거움",
      "⑤교사와 학생의 갈등",
    ]);
    expect(within(first).getByText("②", { selector: "dd span" })).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: "1번 문제 1번 선택지" }),
    ).not.toBeInTheDocument();
    for (const n of [1, 3])
      fireEvent.click(screen.getByRole("button", { name: `${n}번 문제 수정` }));
    expect(
      screen.getByRole("textbox", { name: "1번 문제 1번 선택지" }),
    ).toHaveValue("강가에 나무를 심는 일의 어려움");
    expect(
      screen.getByRole("textbox", { name: "1번 문제 5번 선택지" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "1번 문제 정답 번호" }),
    ).toHaveValue("2");
    // 서술형은 보기 없이 정답·인정 답안 글
    expect(
      screen.queryByRole("textbox", { name: "3번 문제 1번 선택지" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "3번 문제 정답·인정 답안" }),
    ).toHaveValue("몇 년 뒤 돌아와 자신들이 심은 나무가 얼마나 자랐는지 볼 때");
    expect(
      screen.getByRole("textbox", { name: "1번 문제 해설·채점 기준" }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "1번 문제 지문 속 근거" }),
    ).toHaveValue(
      "Today the young forest protects the town from floods and gives shade to people who walk there in summer.",
    );
    expect(screen.getByRole("textbox", { name: "지문" })).toHaveValue(
      ENGLISH_MOCK_SETS[0].passage,
    );
    expect(screen.getByRole("combobox", { name: "검토 상태" })).toHaveValue(
      "초안",
    );
    expect(screen.getByText(/ChatGPT 초안 · 3문항 · 침산중학교/)).toBeVisible();
  });

  it("내용을 고치면 상태가 «초안»으로 내려간다", async () => {
    render(<Harness log={makeLog()} openSetId={ENGLISH_SET_DONE_ID} />);
    const status = await screen.findByRole("combobox", { name: "검토 상태" });
    expect(status).toHaveValue("검토 완료");
    fireEvent.change(screen.getByRole("textbox", { name: "지문" }), {
      target: { value: `${ENGLISH_MOCK_SETS[1].passage} And so on.` },
    });
    expect(status).toHaveValue("초안");
    // 상태만 바꾸는 것은 내용 편집이 아니다 — 다시 검토 완료로 올릴 수 있다
    fireEvent.change(status, { target: { value: "검토 완료" } });
    expect(status).toHaveValue("검토 완료");
  });

  it("저장은 revision 을 싣고 성공하면 응답 revision 으로 갱신한다", async () => {
    const bodies: { revision: number; title: string }[] = [];
    server.use(
      http.put(
        `/api/english/sets/${ENGLISH_SET_DRAFT_ID}`,
        async ({ request }) => {
          const body = (await request.json()) as {
            revision: number;
            title: string;
            status: string;
            passage: string;
            questions: unknown[];
          };
          bodies.push({ revision: body.revision, title: body.title });
          return HttpResponse.json(
            englishSetResponseSchema.parse({
              data: {
                ...ENGLISH_MOCK_SETS[0],
                title: body.title,
                status: body.status,
                revision: body.revision + 1,
              },
            }),
          );
        },
      ),
    );
    const log = await openDraft();
    fireEvent.change(screen.getByRole("textbox", { name: "세트 이름" }), {
      target: { value: "협력의 가치 · 고친 이름" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      revision: 1,
      title: "협력의 가치 · 고친 이름",
    });
    await waitFor(() =>
      expect(log.notices.at(-1)).toEqual({
        message: "저장했습니다.",
        tone: "status",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].revision).toBe(2);
  });

  it("409 면 알림 줄과 «다시 불러오기» — 다시 읽으면 알림이 걷히고 서버 내용으로 돌아온다", async () => {
    server.use(
      http.put(`/api/english/sets/${ENGLISH_SET_DRAFT_ID}`, () =>
        HttpResponse.json(
          {
            error: {
              code: "REVISION_MISMATCH",
              message:
                "다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.",
            },
          },
          { status: 409 },
        ),
      ),
    );
    await openDraft();
    fireEvent.change(screen.getByRole("textbox", { name: "세트 이름" }), {
      target: { value: "충돌 나는 이름" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.",
    );
    fireEvent.click(
      within(alert).getByRole("button", { name: "다시 불러오기" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "세트 이름" })).toHaveValue(
        "협력의 가치 · 외부지문 기본 훈련",
      ),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("인쇄 창은 학생용·교사용 새 탭 링크이고 검토 완료가 아니면 한 줄을 적는다", async () => {
    await openDraft();
    fireEvent.click(screen.getByRole("button", { name: "인쇄" }));
    const print = within(screen.getByRole("dialog", { name: "인쇄" }));
    expect(print.getByRole("link", { name: "학생용" })).toHaveAttribute(
      "href",
      `/english/sets/${ENGLISH_SET_DRAFT_ID}/print?view=student`,
    );
    expect(print.getByRole("link", { name: "교사용" })).toHaveAttribute(
      "href",
      `/english/sets/${ENGLISH_SET_DRAFT_ID}/print?view=teacher`,
    );
    expect(print.getByRole("link", { name: "학생용" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(
      print.getByText("아직 검토 완료하지 않은 문제입니다."),
    ).toBeVisible();
  });

  it("검토 완료 세트의 인쇄 창에는 경고 줄이 없다", async () => {
    render(<Harness log={makeLog()} openSetId={ENGLISH_SET_DONE_ID} />);
    await screen.findByRole("textbox", { name: "세트 이름" });
    fireEvent.click(screen.getByRole("button", { name: "인쇄" }));
    const print = within(screen.getByRole("dialog", { name: "인쇄" }));
    expect(print.getByRole("link", { name: "교사용" })).toBeVisible();
    expect(
      print.queryByText("아직 검토 완료하지 않은 문제입니다."),
    ).not.toBeInTheDocument();
  });

  it("삭제는 확인 창 뒤 목록으로 돌아가고 카드가 사라진다", async () => {
    const log = await openDraft();
    fireEvent.click(screen.getByRole("button", { name: "세트 삭제" }));
    const dialog = within(
      screen.getByRole("dialog", { name: "문제 세트를 삭제할까요?" }),
    );
    fireEvent.click(dialog.getByRole("button", { name: "삭제" }));
    expect(
      await screen.findByRole("heading", { name: "문제 보관함" }),
    ).toBeVisible();
    expect(
      screen.queryByText("협력의 가치 · 외부지문 기본 훈련"),
    ).not.toBeInTheDocument();
    expect(log.notices.at(-1)).toEqual({
      message: "문제 세트를 삭제했습니다.",
      tone: "status",
    });
  });

  it("보기가 다섯이 아니면 보내지 않고 «N번 문항: …» 사유를 적는다 — 저장 전 공용 검증기 관문 (검토 #4)", async () => {
    let puts = 0;
    const listener = ({ request }: { request: Request }) => {
      if (request.method === "PUT") puts += 1;
    };
    server.events.on("request:start", listener);
    await openDraft();
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 수정" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "1번 문제 5번 선택지" }),
      { target: { value: "   " } },
    );
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "1번 문항: 보기는 5개여야 합니다 (지금 4개).",
    );
    await waitFor(() => expect(puts).toBe(0));
    expect(screen.getByRole("combobox", { name: "검토 상태" })).toHaveValue(
      "초안",
    );
    server.events.removeListener("request:start", listener);
  });

  it("«언급 없음»은 다섯째 칸을 비우면 보기 넷으로 저장한다 — 4지선다 (D-158)", async () => {
    const base = ENGLISH_MOCK_SETS[0];
    const fourChoice = {
      ...base,
      questions: [
        { ...base.questions[0]!, type: "언급 없음" as const },
        ...base.questions.slice(1),
      ],
    };
    const sent: { options: string[]; type: string }[][] = [];
    server.use(
      http.get(`/api/english/sets/${ENGLISH_SET_DRAFT_ID}`, () =>
        HttpResponse.json(englishSetResponseSchema.parse({ data: fourChoice })),
      ),
      http.put(
        `/api/english/sets/${ENGLISH_SET_DRAFT_ID}`,
        async ({ request }) => {
          const body = (await request.json()) as {
            revision: number;
            questions: { options: string[]; type: string }[];
          };
          sent.push(body.questions);
          return HttpResponse.json(
            englishSetResponseSchema.parse({
              data: {
                ...fourChoice,
                questions: body.questions,
                revision: body.revision + 1,
              },
            }),
          );
        },
      ),
    );
    await openDraft();
    expect(screen.getByText("1번 · 언급 없음")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 수정" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "1번 문제 5번 선택지" }),
      { target: { value: "" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]![0]).toMatchObject({ type: "언급 없음" });
    expect(sent[0]![0]!.options).toHaveLength(4);
    // 정답 번호가 보기 수를 넘으면 같은 관문이 막는다
    fireEvent.change(
      screen.getByRole("combobox", { name: "1번 문제 정답 번호" }),
      { target: { value: "5" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "1번 문항: 정답은 보기 번호 1~4 여야 합니다.",
    );
    expect(sent).toHaveLength(1);
  });

  it("세트를 못 읽으면 문구와 «목록»만 남긴다", async () => {
    server.use(
      http.get(`/api/english/sets/${ENGLISH_SET_DRAFT_ID}`, () =>
        HttpResponse.json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "세트를 읽지 못했습니다.",
            },
          },
          { status: 500 },
        ),
      ),
    );
    const log = makeLog();
    render(<Harness log={log} />);
    await screen.findByRole("heading", { name: "학교별 내신 대비" });
    fireEvent.click(
      await screen.findByRole("button", {
        name: "협력의 가치 · 외부지문 기본 훈련 열기",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "세트를 읽지 못했습니다.",
    );
    expect(
      screen.queryByRole("textbox", { name: "세트 이름" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(
      await screen.findByRole("heading", { name: "문제 보관함" }),
    ).toBeVisible();
  });
});

describe("[EnglishEditor] 읽기 모양 · 칸 높이 · 글꼴 (원장님 2026-10-01 «후보정» · «스크롤 없이» · «폰트 일치»)", () => {
  const grammarSet = {
    ...ENGLISH_MOCK_SETS[0],
    questions: [
      {
        type: "어법" as const,
        prompt:
          "밑줄 친 ①~⑤ 가운데 어법상 틀린 것을 고르시오.\n\nEvery Friday, groups ①<u>took turns</u> watering the beds. Students ②<u>recorded</u> how tall the plants were. When insects ③<u>appeared</u>, the class ④<u>looking up</u> which ones were helpful. They ⑤<u>avoided spraying</u> chemicals.",
        options: ["1", "2", "3", "4", "5"],
        answer: "4",
        explanation:
          "주어 the class 에 이어지는 동사 자리라 looked up 이어야 한다.",
        evidence:
          "Today the young forest protects the town from floods and gives shade to people who walk there in summer.",
      },
      ...ENGLISH_MOCK_SETS[0].questions.slice(1),
    ],
  };

  async function openGrammar() {
    server.use(
      http.get(`/api/english/sets/${ENGLISH_SET_DRAFT_ID}`, () =>
        HttpResponse.json(englishSetResponseSchema.parse({ data: grammarSet })),
      ),
    );
    render(<Harness log={makeLog()} openSetId={ENGLISH_SET_DRAFT_ID} />);
    await screen.findByRole("textbox", { name: "세트 이름" });
    return screen.getByRole("region", { name: "1번 문항" });
  }

  it("어법의 <u> 표기는 밑줄로 그린다 — 꺾쇠 글자가 화면에 없고, 번호뿐인 보기는 보기 줄을 찍지 않는다(지면과 같은 규칙)", async () => {
    const card = await openGrammar();
    expect(card.textContent).not.toContain("<u>");
    const underlined = [...card.querySelectorAll("u")].map(
      (u) => u.textContent,
    );
    expect(underlined).toEqual([
      "took turns",
      "recorded",
      "appeared",
      "looking up",
      "avoided spraying",
    ]);
    // ①~⑤ 는 밑줄 밖
    expect(underlined.join("")).not.toMatch(/[①-⑤]/);
    expect(within(card).queryByRole("list")).toBeNull();
    expect(within(card).getByText("④", { selector: "dd span" })).toBeVisible();
  });

  it("«수정»을 누르면 고칠 칸이 열리고(표기 그대로) «수정 끝»을 누르면 고친 글로 다시 그린다", async () => {
    const card = await openGrammar();
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 수정" }));
    const prompt = screen.getByRole("textbox", { name: "1번 문제 발문" });
    expect((prompt as HTMLTextAreaElement).value).toContain(
      "④<u>looking up</u>",
    );
    fireEvent.change(prompt, {
      target: {
        value: (prompt as HTMLTextAreaElement).value.replace(
          "looking up",
          "looked up",
        ),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 수정 끝" }));
    expect(
      screen.queryByRole("textbox", { name: "1번 문제 발문" }),
    ).not.toBeInTheDocument();
    expect([...card.querySelectorAll("u")].map((u) => u.textContent)).toContain(
      "looked up",
    );
    // 내용을 고쳤으니 상태가 초안으로
    expect(screen.getByRole("combobox", { name: "검토 상태" })).toHaveValue(
      "초안",
    );
  });

  it("저장 전 검증에 걸린 문항은 고칠 칸을 다시 연다", async () => {
    await openDraft();
    fireEvent.click(screen.getByRole("button", { name: "2번 문제 수정" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "2번 문제 3번 선택지" }),
      { target: { value: "" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "2번 문제 수정 끝" }));
    expect(
      screen.queryByRole("textbox", { name: "2번 문제 1번 선택지" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("2번 문항");
    expect(
      screen.getByRole("textbox", { name: "2번 문제 1번 선택지" }),
    ).toBeVisible();
  });

  it("글 칸은 내용만큼 늘어난다 — 지문 · 발문이 칸 안에서 굴러가지 않는다", async () => {
    const spy = vi
      .spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get")
      .mockReturnValue(612);
    await openDraft();
    const passage = screen.getByRole("textbox", { name: "지문" });
    expect(passage.style.height).toBe(
      `${612 + passage.offsetHeight - passage.clientHeight}px`,
    );
    fireEvent.click(screen.getByRole("button", { name: "1번 문제 수정" }));
    const prompt = screen.getByRole("textbox", { name: "1번 문제 발문" });
    expect(prompt.style.height).toBe(
      `${612 + prompt.offsetHeight - prompt.clientHeight}px`,
    );
    spy.mockRestore();
  });

  it("만든 조건이 있으면 메타 줄 아래에 한 줄로 보인다 — 없으면(옛 세트) 줄이 없다", async () => {
    server.use(
      http.get(`/api/english/sets/${ENGLISH_SET_DRAFT_ID}`, () =>
        HttpResponse.json(
          englishSetResponseSchema.parse({
            data: {
              ...ENGLISH_MOCK_SETS[0],
              meta: {
                path: "api",
                mode: "original",
                difficulty: "표준",
                count: 3,
                types: ["주제", "내용 일치", "서술형"],
                model: "gpt-6-luna",
                promptVersion: "v3",
              },
            },
          }),
        ),
      ),
    );
    render(<Harness log={makeLog()} openSetId={ENGLISH_SET_DRAFT_ID} />);
    expect(
      await screen.findByText(
        "만든 조건 — API 직접 생성(gpt-6-luna · 프롬프트 v3) · 원문 유지 · 표준 · 3문항 · 주제 · 내용 일치 · 서술형",
      ),
    ).toBeVisible();
  });

  it("옛 세트(만든 조건 없음)에는 그 줄이 없다", async () => {
    await openDraft();
    expect(screen.queryByText(/만든 조건 —/)).not.toBeInTheDocument();
  });

  it("🔴 화면에는 앱 글꼴 하나 — 영어 스튜디오 화면 CSS 에 명조(세리프) 글꼴이 없다", () => {
    for (const file of [
      "src/components/english/EnglishStudio.module.css",
      "src/components/english/EnglishMaker.module.css",
    ]) {
      const css = readFileSync(path.join(process.cwd(), file), "utf8").replace(
        /\/\*[\s\S]*?\*\//g,
        "",
      );
      expect(css).not.toMatch(/(?<!sans-)serif|Myeongjo|Batang|Georgia/i);
    }
  });
});

/** «확인해 볼 곳» 줄의 글 — 원문자가 따로 span 에 들어가 글이 갈리므로 줄 글 span 의 textContent 로 찾는다 */
const noteText =
  (pattern: RegExp | string) => (_: string, element: Element | null) =>
    element?.tagName === "SPAN" &&
    element.parentElement?.tagName === "P" &&
    (typeof pattern === "string"
      ? element.textContent === pattern
      : pattern.test(element.textContent ?? ""));

describe("[EnglishEditor] 확인해 볼 곳 (3자 합의 25 §12.13 · Q1)", () => {
  const base = ENGLISH_MOCK_SETS[0].questions[0]!;
  const blank = {
    type: "빈칸 추론" as const,
    prompt: "다음 빈칸에 들어갈 말로 가장 적절한 것은? Trees ________.",
    options: [
      "grow without any care",
      "are never planted by students",
      "only protect towns in winter",
      "protect the town and give shade",
      "matter only to every teacher",
    ],
    answer: "4",
    explanation: "마지막 문장이 근거다.",
    evidence: base.evidence,
  };
  const noteSet = {
    ...ENGLISH_MOCK_SETS[0],
    questions: [
      { ...base, answer: "1", explanation: "첫 문장이 근거다." },
      { ...base, answer: "1", explanation: "첫 문장이 근거다." },
      { ...base, answer: "1", explanation: "정답은 ②. 둘째 문장이 근거다." },
      blank,
    ],
  };

  async function openNotes(log = makeLog()) {
    server.use(
      http.get(`/api/english/sets/${ENGLISH_SET_DRAFT_ID}`, () =>
        HttpResponse.json(englishSetResponseSchema.parse({ data: noteSet })),
      ),
    );
    render(<Harness log={log} openSetId={ENGLISH_SET_DRAFT_ID} />);
    await screen.findByText(
      noteText(/정답 번호 — 객관식 4문항 가운데 3문항의 정답 칸이 ①입니다/),
    );
    return log;
  }

  it("머리 줄은 세트 카드에 — 절대어가 오답에만(문항에 딸려 [4번으로]) · 정답 번호 쏠림(세트 단위라 이동 단추 없음)", async () => {
    await openNotes();
    const absolute = screen
      .getByText(noteText(/4번 빈칸 추론 — 오답 보기 ② · ③ · ⑤ 에만/))
      .closest("p")!;
    expect(
      within(absolute).getByRole("button", { name: "4번으로" }),
    ).toBeVisible();
    const spread = screen
      .getByText(noteText(/정답 번호 — 객관식 4문항/))
      .closest("p")!;
    expect(within(spread).queryByRole("button", { name: /번으로/ })).toBeNull();
    expect(
      within(spread).getByRole("button", { name: /^확인함 — / }),
    ).toBeVisible();
  });

  it("문항 줄은 그 자리 아래 — 해설의 정답 표기가 정답 칸과 다르면 3번 카드에", async () => {
    await openNotes();
    const third = screen.getByRole("region", { name: "3번 문항" });
    expect(
      within(third).getByText(
        noteText("정답 칸은 ①, 해설의 정답 표기는 ②입니다."),
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "1번 문항" })).queryByText(
        noteText(/해설의 정답 표기/),
      ),
    ).toBeNull();
  });

  it("[4번으로] 는 그 문항의 «수정» 단추에 초점을 옮긴다", async () => {
    await openNotes();
    fireEvent.click(screen.getByRole("button", { name: "4번으로" }));
    expect(screen.getByRole("button", { name: "4번 문제 수정" })).toHaveFocus();
  });

  it("[확인함] — 줄이 숨고 알림 · 숨긴 수와 [다시 보기] · 다시 열어도 숨어 있다(이 브라우저) · 다시 보기로 돌아온다", async () => {
    const log = await openNotes();
    fireEvent.click(
      screen.getByRole("button", {
        name: /^확인함 — 정답 번호 — 객관식 4문항/,
      }),
    );
    expect(screen.queryByText(noteText(/정답 번호 — 객관식 4문항/))).toBeNull();
    expect(log.notices.at(-1)).toEqual({
      message: "확인함으로 표시했습니다. 이 브라우저에서만 기억합니다.",
      tone: "status",
    });
    expect(screen.getByText("확인함으로 숨긴 것 1")).toBeVisible();
    cleanup();
    render(<Harness log={makeLog()} openSetId={ENGLISH_SET_DRAFT_ID} />);
    await screen.findByText(noteText(/4번 빈칸 추론 — 오답 보기/));
    expect(screen.queryByText(noteText(/정답 번호 — 객관식 4문항/))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다시 보기" }));
    expect(
      screen.getByText(noteText(/정답 번호 — 객관식 4문항/)),
    ).toBeVisible();
  });

  it("치는 도중에는 다시 세지 않고, 칸을 벗어나면 센다 — 해설을 고쳐 어긋남이 풀리면 줄이 사라진다", async () => {
    await openNotes();
    fireEvent.click(screen.getByRole("button", { name: "3번 문제 수정" }));
    const explanation = screen.getByRole("textbox", {
      name: "3번 문제 해설·채점 기준",
    });
    fireEvent.change(explanation, {
      target: { value: "정답은 ①. 첫 문장이 근거다." },
    });
    // 아직 그대로(치는 중)
    expect(
      screen.getByText(noteText("정답 칸은 ①, 해설의 정답 표기는 ②입니다.")),
    ).toBeVisible();
    fireEvent.blur(explanation);
    expect(
      screen.queryByText(noteText("정답 칸은 ①, 해설의 정답 표기는 ②입니다.")),
    ).toBeNull();
  });
});
