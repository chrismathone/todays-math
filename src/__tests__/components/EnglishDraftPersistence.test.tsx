import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import type { EnglishSet } from "@/contracts/english.contract";
import {
  ENGLISH_MOCK_SETS,
  ENGLISH_SET_DRAFT_ID,
} from "@/mocks/handlers/english";
import { server } from "@/mocks/server";
import { Harness, installDialogShim, makeLog } from "./EnglishStudio.harness";

beforeEach(() => {
  localStorage.clear();
  installDialogShim();
});

const base = ENGLISH_MOCK_SETS[0];
type Update = Pick<
  EnglishSet,
  "title" | "status" | "passage" | "questions" | "revision"
>;
const navigate = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("[EnglishStudio] 저장과 메뉴 이동 중 초안 보존", () => {
  it("저장 중 입력을 보존하고 다음 저장은 응답의 revision과 새 내용을 보낸다", async () => {
    let finish!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const updates: Update[] = [];
    server.use(
      http.put(
        `/api/english/sets/${ENGLISH_SET_DRAFT_ID}`,
        async ({ request }) => {
          const update = (await request.json()) as Update;
          updates.push(update);
          if (updates.length === 1) await responseGate;
          return HttpResponse.json({
            data: { ...base, ...update, revision: update.revision + 1 },
          });
        },
      ),
    );
    render(<Harness log={makeLog()} openSetId={ENGLISH_SET_DRAFT_ID} />);
    const title = await screen.findByRole("textbox", { name: "세트 이름" });
    fireEvent.change(title, { target: { value: "저장 요청한 이름" } });
    navigate("저장");
    await waitFor(() => expect(updates).toHaveLength(1));
    fireEvent.change(title, { target: { value: "저장 중 새로 쓴 이름" } });
    fireEvent.change(screen.getByRole("textbox", { name: "지문" }), {
      target: { value: `${base.passage} More students joined later.` },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "검토 상태" }), {
      target: { value: "검토 중" },
    });
    navigate("1번 문제 수정");
    fireEvent.change(
      screen.getByRole("textbox", { name: "1번 문제 해설·채점 기준" }),
      {
        target: { value: "저장 응답을 기다리며 추가한 해설" },
      },
    );
    navigate("학교 메뉴");
    await act(async () => {
      finish();
    });
    navigate("보관함 메뉴");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "저장" })).toBeEnabled(),
    );
    expect(title).toHaveValue("저장 중 새로 쓴 이름");
    expect(screen.getByRole("textbox", { name: "지문" })).toHaveValue(
      `${base.passage} More students joined later.`,
    );
    expect(screen.getByRole("combobox", { name: "검토 상태" })).toHaveValue(
      "초안",
    );
    navigate("저장");
    await waitFor(() => expect(updates).toHaveLength(2));
    expect(updates[1]).toMatchObject({
      title: "저장 중 새로 쓴 이름",
      revision: base.revision + 1,
      status: "초안",
    });
    expect(updates[1].questions[0].explanation).toBe(
      "저장 응답을 기다리며 추가한 해설",
    );
  });

  it("링크로 연 세트를 저장한 뒤 메뉴를 왕복해도 최신 내용과 저장 버전을 유지한다", async () => {
    const updates: Update[] = [];
    server.use(
      http.put(
        `/api/english/sets/${ENGLISH_SET_DRAFT_ID}`,
        async ({ request }) => {
          const update = (await request.json()) as Update;
          updates.push(update);
          return HttpResponse.json({
            data: { ...base, ...update, revision: update.revision + 1 },
          });
        },
      ),
    );
    render(<Harness log={makeLog()} openSetId={ENGLISH_SET_DRAFT_ID} />);
    fireEvent.change(
      await screen.findByRole("textbox", { name: "세트 이름" }),
      { target: { value: "새로 저장한 제목" } },
    );
    navigate("저장");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "저장" })).toBeEnabled(),
    );
    navigate("학교 메뉴");
    expect(
      screen.queryByRole("textbox", { name: "세트 이름" }),
    ).not.toBeInTheDocument();
    navigate("보관함 메뉴");
    expect(screen.getByRole("textbox", { name: "세트 이름" })).toHaveValue(
      "새로 저장한 제목",
    );
    navigate("저장");
    await waitFor(() => expect(updates).toHaveLength(2));
    expect(updates[1].revision).toBe(base.revision + 1);
  });

  it("편집 중인 세트와 만들기 입력을 메뉴 왕복 후에도 유지한다", async () => {
    render(<Harness log={makeLog()} openSetId={ENGLISH_SET_DRAFT_ID} />);
    fireEvent.change(
      await screen.findByRole("textbox", { name: "세트 이름" }),
      { target: { value: "아직 저장하지 않은 제목" } },
    );
    navigate("만들기 메뉴");
    fireEvent.click(screen.getByText("다른 제작 방식"));
    navigate("외부 자료 가져오기");
    fireEvent.change(
      screen.getByRole("textbox", { name: "ChatGPT 결과 붙여넣기" }),
      { target: { value: "작성 중인 결과" } },
    );
    navigate("보관함 메뉴");
    expect(screen.getByRole("textbox", { name: "세트 이름" })).toHaveValue(
      "아직 저장하지 않은 제목",
    );
    navigate("학교 메뉴");
    navigate("만들기 메뉴");
    expect(
      screen.getByRole("textbox", { name: "ChatGPT 결과 붙여넣기" }),
    ).toHaveValue("작성 중인 결과");
  });

  it("생성 결과 저장 실패 후 메뉴를 왕복해도 같은 본문과 clientKey로 재시도한다", async () => {
    const posts: unknown[] = [];
    server.use(
      http.post(
        `/api/english/exams/${base.examId}/sets`,
        async ({ request }) => {
          posts.push(await request.json());
          return posts.length === 1
            ? HttpResponse.json({ error: "저장 서버 오류" }, { status: 503 })
            : HttpResponse.json({ data: { id: base.id } }, { status: 201 });
        },
      ),
    );
    render(<Harness log={makeLog()} initialView="english-maker" />);
    fireEvent.click(await screen.findByText("다른 제작 방식"));
    navigate("원문 복원 연습");
    fireEvent.change(screen.getByRole("textbox", { name: "복원할 원문" }), {
      target: { value: base.passage },
    });
    navigate("연습문제 만들기");
    await screen.findByRole("button", { name: "다시 저장" });
    navigate("학교 메뉴");
    navigate("보관함 메뉴");
    navigate("만들기 메뉴");
    expect(screen.getByRole("textbox", { name: "복원할 원문" })).toHaveValue(
      base.passage,
    );
    navigate("다시 저장");
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual(posts[0]);
    expect(posts[1]).toMatchObject({ meta: { clientKey: expect.any(String) } });
  });

  it("다른 메뉴에서 끝난 생성 저장은 열어 둔 세트의 미저장 편집을 교체하지 않는다", async () => {
    let finish!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let requested = false;
    server.use(
      http.post(`/api/english/exams/${base.examId}/sets`, async () => {
        requested = true;
        await responseGate;
        return HttpResponse.json(
          { data: { id: ENGLISH_MOCK_SETS[1].id } },
          { status: 201 },
        );
      }),
    );
    const log = makeLog();
    render(<Harness log={log} openSetId={base.id} />);
    fireEvent.change(
      await screen.findByRole("textbox", { name: "세트 이름" }),
      { target: { value: "계속 편집할 초안" } },
    );
    navigate("만들기 메뉴");
    fireEvent.click(screen.getByText("다른 제작 방식"));
    navigate("원문 복원 연습");
    fireEvent.change(screen.getByRole("textbox", { name: "복원할 원문" }), {
      target: { value: base.passage },
    });
    navigate("연습문제 만들기");
    await waitFor(() => expect(requested).toBe(true));
    navigate("보관함 메뉴");
    await act(async () => {
      finish();
    });
    await waitFor(() =>
      expect(log.notices).toContainEqual({
        message: "문제 세트를 저장했습니다.",
        tone: "status",
      }),
    );
    expect(screen.getByRole("textbox", { name: "세트 이름" })).toHaveValue(
      "계속 편집할 초안",
    );
  });
});
