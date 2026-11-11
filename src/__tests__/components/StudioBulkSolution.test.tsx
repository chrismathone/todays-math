import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioView from "@/components/unified/StudioView";
import { DevAiProvider } from "@/components/unified/useDevAi";
import type { StudioSessionData } from "@/components/unified/studioSessionStore";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import type { StudioProblem } from "@/components/unified/types";

/**
 * 원장님 2026-09-20 «상단 열을 줄여서 «전체 해설 생성» 버튼 추가. 순서대로 해설 생성».
 * 크롭 상태를 AI 없이 꾸미려고 계정 저장소를 모킹해 «되살린 작업»으로 연다(트랙 1 과 같은 길).
 * 유료 AI 는 부르지 않는다 — fetch 를 통째로 대역으로 세운다.
 */
const saved: { current: Promise<unknown> } = { current: new Promise(() => {}) };
vi.mock("@/components/unified/studioSessionStore", () => ({
  StudioSessionStore: class {
    documentId = "doc-1";
    load = () => saved.current;
    save = () => Promise.resolve();
    clear = () => Promise.resolve();
    retain() {}
    release() {}
  },
}));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <div>{content}</div>,
}));
vi.mock("@/components/math/editor/MathTextEditor", () => ({
  MathTextEditor: ({
    value,
    "aria-label": label,
  }: {
    value: string;
    "aria-label": string;
  }) => <textarea aria-label={label} defaultValue={value} />,
}));

interface Post {
  action: string;
  content?: string;
}
let posts: Post[] = [];
let respond: (post: Post) => Promise<Response>;
const solved = (post: Post) =>
  Promise.resolve(
    Response.json({
      provider: "codex",
      action: post.action,
      result: {
        content: post.content ?? "",
        answer: "",
        solution: `${post.content} 해설`,
        warnings: [],
      },
    }),
  );

function crop(id: string, patch: Partial<StudioCrop> = {}): StudioCrop {
  return {
    id,
    sourceId: "s1",
    sourceLabel: "예제",
    page: 1,
    rect: { x: 0.1, y: 0.1, width: 0.8, height: 0.2 },
    image: "data:image/png;base64,Y3JvcA==",
    content: `${id} 본문`,
    answer: "",
    solution: "",
    level: "secondary",
    grade: "중2",
    mode: "text",
    added: false,
    ...patch,
  };
}

beforeEach(() => {
  posts = [];
  respond = solved;
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const post = JSON.parse(init.body as string) as Post;
        posts.push(post);
        return respond(post);
      }
      return Response.json({
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
        ],
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  saved.current = new Promise(() => {});
});

async function openStudio(
  crops: StudioCrop[],
  cart?: {
    picked: StudioProblem[];
    onAdd: (problems: StudioProblem[]) => void;
  },
) {
  saved.current = Promise.resolve({
    data: {
      sources: [{ id: "s1", name: "예제 지면", kind: "sample", pages: 1 }],
      crops,
      sourceId: "s1",
      pageNumber: 1,
      activeCropId: crops[0]?.id ?? "",
      inspectedPages: {},
      step: "review",
      grade: "중2",
      level: "secondary",
    } satisfies StudioSessionData,
    originals: new Map(),
  });
  render(
    <DevAiProvider>
      <StudioView
        picked={cart?.picked}
        removed={cart ? [] : undefined}
        onAdd={cart?.onAdd ?? (() => {})}
        onExport={() => {}}
        canExport
        storageScope="owner-a"
      />
    </DevAiProvider>,
  );
  await screen.findByText("이전 문제 추출 작업을 복원했습니다.");
  return screen.findByRole("button", { name: "전체 해설 생성" });
}
const solutionOrder = () =>
  posts
    .filter((post) => post.action === "solution")
    .map((post) => post.content);

describe("전체 해설 생성 — 원장님 2026-09-20 «순서대로 해설 생성»", () => {
  it("해설이 없는 문항만 문제 차례대로 부른다", async () => {
    const button = await openStudio([
      crop("c1"),
      crop("c2", { solution: "이미 있는 해설" }),
      crop("c3"),
      crop("c4"),
    ]);
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(solutionOrder()).toHaveLength(3));
    expect(solutionOrder()).toEqual(["c1 본문", "c3 본문", "c4 본문"]);
  });

  it("검수 완료된 문항과 본문 없는 문항은 건너뛴다", async () => {
    const button = await openStudio([
      crop("c1", { reviewed: true }),
      crop("c2", { content: "" }),
      crop("c3"),
    ]);
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(solutionOrder()).toHaveLength(1));
    expect(solutionOrder()).toEqual(["c3 본문"]);
  });

  it("한 문항이 실패해도 멈추지 않고 다음으로 간다", async () => {
    respond = (post) =>
      post.content === "c1 본문"
        ? Promise.resolve(
            Response.json({ error: "응답 지연" }, { status: 502 }),
          )
        : solved(post);
    const button = await openStudio([crop("c1"), crop("c2"), crop("c3")]);
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(solutionOrder()).toHaveLength(3));
    expect(solutionOrder()).toEqual(["c1 본문", "c2 본문", "c3 본문"]);
    expect(await screen.findByRole("alert")).toHaveTextContent("응답 지연");
  });

  it("도는 동안 진행이 보이고 취소가 된다", async () => {
    // 끝나지 않는 응답 — «도는 중» 을 붙잡아 둔다.
    respond = () => new Promise<Response>(() => {});
    const button = await openStudio([crop("c1"), crop("c2"), crop("c3")]);
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(solutionOrder()).toHaveLength(2));
    fireEvent.click(
      await screen.findByRole("button", { name: /^작업 진행 상세/ }),
    );
    const panel = screen.getByRole("region", { name: "작업별 진행 상황" });
    expect(within(panel).getByText("해설 생성 중")).toBeInTheDocument();
    expect(
      within(panel).getByRole("progressbar", { name: "해설 생성 중" }),
    ).toHaveAttribute("aria-valuemax", "3");
    fireEvent.click(
      within(panel).getByRole("button", { name: "해설 생성 취소" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("해설 생성 중")).not.toBeInTheDocument(),
    );
    expect(solutionOrder()).toHaveLength(2);
  });

  it("해설이 없는 문항이 없으면 안 눌린다", async () => {
    const button = await openStudio([
      crop("c1", { solution: "있음" }),
      crop("c2", { reviewed: true }),
    ]);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute(
      "title",
      expect.stringContaining("해설이 없는 문항"),
    );
  });
});

describe("담은 뒤 만든 해설 — 원장님 2026-11-11 «해설은 자동 반영»", () => {
  it("담은 문항도 해설을 만들고, 만든 해설이 시험지의 같은 자리에 들어간다", async () => {
    const crops = [crop("c1"), crop("c2")];
    const onAdd = vi.fn();
    const button = await openStudio(crops, {
      picked: crops.map(studioProblem),
      onAdd,
    });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(solutionOrder()).toHaveLength(2));
    await waitFor(() =>
      expect(
        onAdd.mock.calls
          .flatMap(([problems]) => problems as StudioProblem[])
          .map((problem) => [problem.id, problem.solution]),
      ).toEqual(
        expect.arrayContaining([
          ["c1", "c1 본문 해설"],
          ["c2", "c2 본문 해설"],
        ]),
      ),
    );
  });
});
