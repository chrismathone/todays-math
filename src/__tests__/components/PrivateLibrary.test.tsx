import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivateLibrary from "@/components/unified/PrivateLibrary";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import { privateServer, sessionData } from "../fixtures/privateCloud";

afterEach(() => {
  vi.unstubAllGlobals();
});
const article = (title: string) =>
  within(
    screen.getByRole("heading", { name: title, level: 2 }).closest("article")!,
  );
describe("private library", () => {
  it("lists both kinds, opens stable IDs, and waits for persisted rename/delete results", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await client.save(
      "worksheet",
      "draft",
      "내 시험지",
      { problems: [] },
      null,
    );
    await client.save(
      "source",
      "extraction",
      "추출 원본",
      { data: sessionData(), assets: {} },
      null,
    );
    vi.stubGlobal("fetch", server.transport);
    const openDraft = vi.fn();
    const openExtraction = vi.fn();
    const deleted = vi.fn();
    render(
      <PrivateLibrary
        storageScope="owner-a"
        canExport
        canStudio
        onOpenDraft={openDraft}
        onOpenExtraction={openExtraction}
        onDeleted={deleted}
      />,
    );
    await screen.findByRole("heading", { name: "추출 원본" });
    fireEvent.click(article("추출 원본").getByRole("button", { name: "열기" }));
    expect(openExtraction).toHaveBeenCalledWith("source");
    fireEvent.click(article("내 시험지").getByRole("button", { name: "열기" }));
    expect(openDraft).toHaveBeenCalledWith("worksheet");
    await waitFor(() =>
      expect(
        article("추출 원본").getByRole("button", {
          name: "추출 원본 이름 변경",
        }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      article("추출 원본").getByRole("button", { name: "추출 원본 이름 변경" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "새 자료 이름" }), {
      target: { value: "바꾼 원본" },
    });
    fireEvent.click(screen.getByRole("button", { name: "이름 저장" }));
    await screen.findByRole("heading", { name: "바꾼 원본" });
    expect(server.documents.get("owner-a:source")?.title).toBe("바꾼 원본");
    fireEvent.click(
      article("바꾼 원본").getByRole("button", { name: "바꾼 원본 삭제" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "바꾼 원본" }),
      ).not.toBeInTheDocument(),
    );
    expect(deleted).toHaveBeenCalledWith(
      expect.objectContaining({ id: "source", revision: 2 }),
    );
    expect(server.documents.has("owner-a:source")).toBe(false);
  });
  it("keeps library-only rename/delete available while editor and studio actions remain hidden", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    await client.save(
      "worksheet",
      "draft",
      "읽기 자료",
      { problems: [] },
      null,
    );
    vi.stubGlobal("fetch", server.transport);
    render(
      <PrivateLibrary
        storageScope="owner-a"
        canExport={false}
        canStudio={false}
        onOpenDraft={vi.fn()}
        onOpenExtraction={vi.fn()}
      />,
    );
    await screen.findByRole("heading", { name: "읽기 자료" });
    expect(
      screen.queryByRole("button", { name: "열기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "읽기 자료 이름 변경" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "작업 파일 불러오기" }),
    ).not.toBeInTheDocument();
    await client.rename("worksheet", "다른 기기 변경", 1);
    fireEvent.click(screen.getByRole("button", { name: "읽기 자료 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "다른 창이나 기기",
    );
    expect(server.documents.has("owner-a:worksheet")).toBe(true);
  });
  it("shows helpful loading, empty and failed-list states with retry", async () => {
    const server = privateServer();
    server.fail(503);
    vi.stubGlobal("fetch", server.transport);
    render(
      <PrivateLibrary
        storageScope="owner-a"
        canExport
        canStudio
        onOpenDraft={vi.fn()}
        onOpenExtraction={vi.fn()}
      />,
    );
    expect(screen.getByText("저장한 자료를 불러오는 중입니다…")).toBeVisible();
    await screen.findByRole("alert");
    expect(
      screen.queryByText("아직 저장한 자료가 없어요"),
    ).not.toBeInTheDocument();
    server.fail(0);
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    expect(await screen.findByText("아직 저장한 자료가 없어요")).toBeVisible();
  });
});
