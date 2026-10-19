// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type WorksheetEditor from "@/components/unified/WorksheetEditor";
import { ExamPracticeWorkspace } from "@/components/exam-practice/ExamPracticeWorkspace";
import { studyCatalog, studyGeneration } from "./examStudyFixtures";

const editor = vi.hoisted(() => ({
  props: null as ComponentProps<typeof WorksheetEditor> | null,
}));
vi.mock("next/dynamic", () => ({
  default: () => (props: ComponentProps<typeof WorksheetEditor>) => {
    editor.props = props;
    return (
      <div>
        <p>공통 시험지 양식</p>
        <button
          type="button"
          onClick={props.stepNavigation?.items[0]?.onSelect}
        >
          문항 검토로 돌아가기
        </button>
      </div>
    );
  },
}));
vi.mock("@/components/unified/UnifiedProblem", () => ({
  default: ({ problem }: { problem: { content: string } }) => (
    <p>{problem.content}</p>
  ),
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: { text: string }) => <div>{text}</div>,
  SolutionText: ({ text }: { text: string }) => <div>{text}</div>,
}));

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  editor.props = null;
  fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("/resolve")) {
      const body = JSON.parse(String(init?.body));
      return json({ data: { digest: body.expectedDigest, deliveredCount: 1 } });
    }
    if (init?.method === "POST")
      return json({ data: studyGeneration(JSON.parse(String(init.body))) });
    return json({ data: studyCatalog });
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function open() {
  render(<ExamPracticeWorkspace allowedMenus={["bank"]} />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "연습 문제 만들기" }),
    ).toBeEnabled(),
  );
  return userEvent.setup();
}

describe("exam study generation, review and common output", () => {
  it.each(["bank", "arithmetic", "studio", "library", "conceptBlank"] as const)(
    "enables generation for the authorized output menu %s",
    async (menu) => {
      render(<ExamPracticeWorkspace allowedMenus={[menu]} />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "연습 문제 만들기" }),
        ).toBeEnabled(),
      );
    },
  );

  it.each(["export", "textbook"] as const)(
    "keeps generation closed without a practice output menu: %s",
    async (menu) => {
      render(<ExamPracticeWorkspace allowedMenus={[menu]} />);
      await screen.findByRole("combobox", { name: "학교·검토 자료" });
      expect(
        screen.getByRole("button", { name: "연습 문제 만들기" }),
      ).toBeDisabled();
      expect(
        fetcher.mock.calls.some((call) => call[1]?.method === "POST"),
      ).toBe(false);
    },
  );

  it("sends the reviewed school requirements, shows partial scope, and hides answers initially", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "연습 문제 만들기" }));
    expect(
      await screen.findByRole("heading", { name: "만든 연습 1문항" }),
    ).toBeVisible();
    const post = fetcher.mock.calls.find((call) => call[1]?.method === "POST")!;
    expect(JSON.parse(String(post[1].body))).toMatchObject({
      profileId: "fixture-profile",
      requirementIds: ["algebra.linear-model"],
      format: "혼합",
    });
    expect(screen.getByText(/현재 제공할 수 있는 범위/)).toBeVisible();
    expect(screen.getByText("$5$")).not.toBeVisible();
    await user.click(screen.getByText("정답·풀이 보기"));
    expect(screen.getByText("$5$")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "다른 조건으로 다시 만들기" }),
    );
    await waitFor(() =>
      expect(
        fetcher.mock.calls.filter((call) => call[1]?.method === "POST"),
      ).toHaveLength(2),
    );
    expect(screen.getByText("$5$")).not.toBeVisible();
  });

  it("requires explicit generic types and preserves generic mode for an unreviewed school", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "유형 직접 선택" }));
    await user.click(screen.getByRole("button", { name: "연습 문제 만들기" }));
    expect(screen.getByRole("alert")).toHaveTextContent("하나 이상");
    await user.click(
      screen.getByRole("checkbox", { name: /조건에서 식 세우기/ }),
    );
    await user.type(
      screen.getByRole("textbox", { name: /학교 이름/ }),
      "미검토학교",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "응답 형식" }),
      "단답형",
    );
    await user.click(screen.getByRole("button", { name: "연습 문제 만들기" }));
    await screen.findByRole("heading", { name: "만든 연습 1문항" });
    const body = JSON.parse(
      String(
        fetcher.mock.calls.find((call) => call[1]?.method === "POST")![1].body,
      ),
    );
    expect(body).toMatchObject({
      familyIds: ["fixture-model"],
      schoolName: "미검토학교",
      format: "단답형",
    });
    expect(body.profileId).toBeUndefined();
  });

  it("does not present a repeated logical set as different conditions and bounds its retry", async () => {
    fetcher.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method !== "POST") return json({ data: studyCatalog });
      const generated = studyGeneration(JSON.parse(String(init.body)));
      return json({
        data: {
          ...generated,
          questions: generated.questions.map((item) => ({
            ...item,
            logicalKey: "same-mathematical-conditions",
          })),
        },
      });
    });
    const user = await open();
    await user.click(screen.getByRole("button", { name: "연습 문제 만들기" }));
    await screen.findByRole("heading", { name: "만든 연습 1문항" });
    await user.click(
      screen.getByRole("button", { name: "다른 조건으로 다시 만들기" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "다른 문항 조합을 찾지 못했습니다",
    );
    expect(
      fetcher.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(4);
    expect(
      screen.getByRole("heading", { name: "만든 연습 1문항" }),
    ).toBeVisible();
  });

  it("uses the existing common editor without fake storage and rechecks the pinned recipe before output", async () => {
    const user = await open();
    await user.click(screen.getByRole("button", { name: "연습 문제 만들기" }));
    await user.click(
      await screen.findByRole("button", { name: "양식 구성·출력으로" }),
    );
    expect(screen.getByText("공통 시험지 양식")).toBeVisible();
    expect(editor.props).toMatchObject({
      draftActions: false,
      fixedComposition: true,
      answers: false,
      printOptions: { template: "workbook", showAnswers: false },
      printMeta: { grade: "중1", academyName: "기출 대비 자작 연습" },
    });
    expect(editor.props!.selected[0]!.questionId).toBeUndefined();
    await act(() => editor.props!.beforeOutput!("pdf"));
    const call = fetcher.mock.calls.find((row) => row[0].includes("/resolve"))!;
    expect(JSON.parse(String(call[1].body))).toMatchObject({
      expectedDigest: "b".repeat(64),
      recipe: { profileId: "fixture-profile" },
    });
    fetcher.mockImplementationOnce(async () =>
      json({ error: { message: "문항이 바뀌었습니다." } }, 409),
    );
    await expect(editor.props!.beforeOutput!("print")).rejects.toThrow(
      "문항이 바뀌었습니다.",
    );
  });

  it("shows an API denial without generating local substitutes and permits retrying the catalog", async () => {
    fetcher.mockImplementationOnce(async () =>
      json({ error: { message: "권한이 없습니다." } }, 403),
    );
    render(<ExamPracticeWorkspace allowedMenus={["bank"]} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "권한이 없습니다.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "다시 불러오기" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "연습 문제 만들기" }),
      ).toBeEnabled(),
    );
  });

  it("discards a generation response after its conditions have changed", async () => {
    const user = await open();
    let resolve!: (value: Response) => void;
    fetcher.mockImplementationOnce(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    await user.click(screen.getByRole("button", { name: "연습 문제 만들기" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "응답 형식" }),
      "서술형",
    );
    await act(async () => {
      resolve(
        json({
          data: studyGeneration({
            course: "중1",
            count: 10,
            seed: 1,
            format: "혼합",
            maxPerFamily: 1,
          }),
        }),
      );
    });
    expect(
      screen.queryByRole("heading", { name: "만든 연습 1문항" }),
    ).not.toBeInTheDocument();
  });
});
