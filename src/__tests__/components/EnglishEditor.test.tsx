/**
 * 🔴 RED → 🟢 — 검토·편집 화면 (D-148 · 25 §1.3). «학교별 내신 대비» 뷰 안 상태(`editing: setId`)로 열린다.
 *
 * 구현: src/components/english/EnglishEditor.tsx (뿌리 EnglishStudio 가 마운트)
 *
 * 무엇을 잠그나
 * 1. 세트를 읽어 «QUESTION 01 · 유형» 머리 · 발문 · 보기 1~5(`aria-label` «N번 문제 M번 선택지») · 정답 · 해설 · 근거를 그린다.
 * 2. 내용을 고치면 상태가 «초안»으로 내려간다(ChatGPT 앱 규칙).
 * 3. 저장은 `revision` 을 싣고, 성공하면 응답의 `revision` 으로 갱신한다(두 번째 저장이 새 값을 싣는다).
 * 4. 409 면 알림 줄 + «다시 불러오기» — 다시 읽으면 알림이 걷히고 서버 내용으로 돌아온다.
 * 5. 인쇄 창은 학생용·교사용 새 탭 링크. 검토 완료가 아니면 «아직 검토 완료하지 않은 문제입니다.» 한 줄.
 * 6. 삭제는 확인 창 뒤 목록으로 돌아간다.
 */
import { http, HttpResponse } from "msw";
import {
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
    expect(screen.getByText("QUESTION 01 · 주제")).toBeVisible();
    expect(screen.getByText("QUESTION 03 · 서술형")).toBeVisible();
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
      await screen.findByRole("heading", { name: "학교별 내신 대비" }),
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
      await screen.findByRole("heading", { name: "학교별 내신 대비" }),
    ).toBeVisible();
  });
});
