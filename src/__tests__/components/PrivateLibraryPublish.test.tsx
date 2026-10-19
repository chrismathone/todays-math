import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamPublicationList } from "@/contracts/examPublication.contract";
import type { PrivateDocumentSummary } from "@/contracts/privateWorkspace.contract";
import PrivateLibrary from "@/components/unified/PrivateLibrary";

/**
 * 월말평가 M1 — «내 시험지»의 반에 내기(Hi-fi H3 · 원장님 선택 2026-10-17).
 * 표 위 «채점이 남은 시험» 띠 · 시험지 줄의 «N개 반에 냄» 딱지와 «반에 내기» 단추 · 작업실 확인 창 그대로의 «반에 내기» 창.
 */

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
beforeEach(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: showModal },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const items: PrivateDocumentSummary[] = [
  {
    id: "monthly",
    kind: "draft",
    title: "중2 10월 월말평가",
    problemCount: 25,
    revision: 4,
    createdAt: "2026-10-28T00:00:00Z",
    updatedAt: "2026-10-28T00:00:00Z",
  },
  {
    id: "crops",
    kind: "extraction",
    title: "추출 자료",
    problemCount: 3,
    revision: 1,
    createdAt: "2026-10-20T00:00:00Z",
    updatedAt: "2026-10-20T00:00:00Z",
  },
];
const list: ExamPublicationList = {
  publications: [
    {
      id: uuid(1),
      documentId: "monthly",
      title: "중2 10월 월말평가",
      examType: "monthly",
      testDate: "2026-10-30",
      createdAt: "2026-10-30T01:00:00.000Z",
      problemCount: 25,
      classes: [
        {
          testId: uuid(11),
          classId: uuid(21),
          className: "중2 A반",
          students: 12,
          graded: 12,
          absent: 0,
          remaining: 0,
        },
        {
          testId: uuid(12),
          classId: uuid(22),
          className: "중2 B반",
          students: 9,
          graded: 4,
          absent: 1,
          remaining: 4,
        },
      ],
    },
  ],
  classes: [
    { id: uuid(21), name: "중2 A반", students: 12 },
    { id: uuid(22), name: "중2 B반", students: 9 },
    { id: uuid(23), name: "중3 A반", students: 11 },
  ],
};

function server(publish: (body: Record<string, unknown>) => Response) {
  const posts: Record<string, unknown>[] = [];
  const transport = vi.fn<typeof fetch>(async (url, init) => {
    const path = String(url);
    if (path.startsWith("/api/exam-publications")) {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        posts.push(body);
        return publish(body);
      }
      return Response.json({ data: list });
    }
    return Response.json({ data: items, meta: { total: items.length } });
  });
  vi.stubGlobal("fetch", transport);
  return { posts };
}
const props = () => ({
  storageScope: "owner-a",
  canExport: true,
  canStudio: true,
  canBank: true,
  onOpenDraft: vi.fn(),
  onOpenExtraction: vi.fn(),
});
const row = (title: string) =>
  within(screen.getByRole("button", { name: `${title} 열기` }).closest("tr")!);

describe("내 시험지에서 반에 내기", () => {
  it("채점이 남은 시험 띠 · 낸 반 수 딱지 · 시험지에만 «반에 내기»", async () => {
    server(() => new Response(null, { status: 500 }));
    render(<PrivateLibrary {...props()} />);
    const strip = await screen.findByRole("region", {
      name: "채점이 남은 시험",
    });
    expect(within(strip).getAllByRole("listitem")).toHaveLength(1);
    expect(strip).toHaveTextContent("중2 10월 월말평가 · 중2 B반 · 10/30");
    expect(strip).toHaveTextContent("남음 4명");
    expect(
      within(strip).getByRole("link", { name: "채점하기" }),
    ).toHaveAttribute("href", `/tests/${uuid(12)}/grade`);
    expect(row("중2 10월 월말평가").getByText("2개 반에 냄")).toBeVisible();
    expect(
      row("중2 10월 월말평가").getByRole("button", { name: "반에 내기" }),
    ).toBeVisible();
    expect(
      row("추출 자료").queryByRole("button", { name: "반에 내기" }),
    ).toBeNull();
  });

  it("반을 골라 내면 화면이 본 판 · 고른 종류 · 반으로 보내고, 반마다 채점하기를 보인다", async () => {
    const { posts } = server(() =>
      Response.json(
        {
          data: {
            publicationId: uuid(2),
            tests: [
              { classId: uuid(23), className: "중3 A반", testId: uuid(13) },
            ],
            problemCount: 25,
          },
        },
        { status: 201 },
      ),
    );
    render(<PrivateLibrary {...props()} />);
    await screen.findByRole("region", { name: "채점이 남은 시험" });
    await screen.findByRole("button", { name: "중2 10월 월말평가 열기" });
    fireEvent.click(
      row("중2 10월 월말평가").getByRole("button", { name: "반에 내기" }),
    );
    const dialog = within(
      await screen.findByRole("dialog", { name: "반에 내기" }),
    );
    // 반을 안 고르면 보내지 않는다.
    fireEvent.click(dialog.getByRole("button", { name: "반에 내기" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "낼 반을 하나 이상 고르십시오.",
    );
    expect(posts).toHaveLength(0);
    fireEvent.change(dialog.getByLabelText("시험 종류"), {
      target: { value: "unit" },
    });
    fireEvent.click(dialog.getByRole("checkbox", { name: "중3 A반 · 11명" }));
    await act(async () =>
      fireEvent.click(dialog.getByRole("button", { name: "1개 반에 내기" })),
    );
    expect(posts).toEqual([
      expect.objectContaining({
        documentId: "monthly",
        expectedRevision: 4,
        classIds: [uuid(23)],
        examType: "unit",
      }),
    ]);
    const done = within(
      await screen.findByRole("dialog", { name: "반에 냈습니다" }),
    );
    expect(
      done.getByRole("link", { name: "중3 A반 채점하기" }),
    ).toHaveAttribute("href", `/tests/${uuid(13)}/grade`);
  });

  it("서버가 거절하면 그 까닭을 창에 그대로 보이고, 같은 창의 재시도는 같은 요청 번호다", async () => {
    const { posts } = server(() =>
      Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "직접 가져온 문항(3번)은 낼 수 없습니다 — 문제은행 문항만 반에 낼 수 있습니다.",
          },
        },
        { status: 422 },
      ),
    );
    render(<PrivateLibrary {...props()} />);
    await screen.findByRole("region", { name: "채점이 남은 시험" });
    await screen.findByRole("button", { name: "중2 10월 월말평가 열기" });
    fireEvent.click(
      row("중2 10월 월말평가").getByRole("button", { name: "반에 내기" }),
    );
    const dialog = within(
      await screen.findByRole("dialog", { name: "반에 내기" }),
    );
    fireEvent.click(dialog.getByRole("checkbox", { name: "중2 A반 · 12명" }));
    fireEvent.click(dialog.getByRole("button", { name: "1개 반에 내기" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "직접 가져온 문항(3번)",
    );
    fireEvent.click(dialog.getByRole("button", { name: "1개 반에 내기" }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[0]!.requestId).toBe(posts[1]!.requestId);
  });
});
