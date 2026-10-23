import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import WorkbookPublisherPacks from "@/components/commercial-workbooks/WorkbookPublisherPacks";
import { createLocalCommercialWorkbookSource } from "@/lib/commercialWorkbooks/local";
import {
  loadPublisherPack,
  PUBLISHER_PACKS,
} from "@/lib/commercialWorkbooks/publisherPacks";

it("registers the reviewed publisher scope and reopens the same edition without duplicating it", async () => {
  const source = createLocalCommercialWorkbookSource({ seed: false });
  const create = vi.spyOn(source, "createEdition");
  const saved = vi.fn();
  const view = render(
    <WorkbookPublisherPacks source={source} books={[]} onSaved={saved} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "확보한 자료 보기" }));
  expect(await screen.findByText(/등록 범위:/)).toHaveTextContent("8~26쪽");
  expect(create).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "이 범위의 정답표 등록" }),
  );
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  const books = await source.listCatalog();
  expect(books).toHaveLength(1);
  expect(books[0].metadata.isbn).toBe("979-11-7316-537-5");
  expect(books[0].missingKeyCount).toBeGreaterThan(0);
  const detail = await source.getEdition(books[0].id);
  expect(detail.provenance.kind).toBe("publisher");
  expect(
    detail.exercises
      .filter((item) => item.key)
      .every((item) => item.key?.sourcePage),
  ).toBe(true);
  view.rerender(
    <WorkbookPublisherPacks source={source} books={books} onSaved={saved} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "등록된 판본 열기" }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(2));
  expect(create).toHaveBeenCalledOnce();
  expect(saved.mock.calls[1][0].id).toBe(detail.id);
});

it("reuses an import receipt after a lost response without creating a second edition", async () => {
  const source = createLocalCommercialWorkbookSource({ seed: false });
  const original = source.createEdition.bind(source);
  const create = vi.spyOn(source, "createEdition");
  create.mockImplementationOnce(async (input) => {
    await original(input);
    throw new Error("응답 연결이 끊어졌습니다.");
  });
  const saved = vi.fn();
  render(<WorkbookPublisherPacks source={source} books={[]} onSaved={saved} />);
  fireEvent.click(screen.getByRole("button", { name: "확보한 자료 보기" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "이 범위의 정답표 등록" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("응답 연결");
  fireEvent.click(
    screen.getByRole("button", { name: "이 범위의 정답표 등록" }),
  );
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(await source.listCatalog()).toHaveLength(1);
  expect(create.mock.calls[0][0].requestId).toBe(
    create.mock.calls[1][0].requestId,
  );
});

it("does not mistake the same ISBN from a different edition for the selected publisher pack", async () => {
  const source = createLocalCommercialWorkbookSource({ seed: false });
  const { input } = await loadPublisherPack(PUBLISHER_PACKS[0]);
  const older = await source.createEdition({
    ...input,
    requestId: "another-printing-fixture",
    metadata: { ...input.metadata, edition: "다른 쇄 · 확인용 예시" },
  });
  const saved = vi.fn();
  render(
    <WorkbookPublisherPacks source={source} books={[older]} onSaved={saved} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "확보한 자료 보기" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "이 범위의 정답표 등록" }),
  );
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(saved.mock.calls[0][0].id).not.toBe(older.id);
  expect(saved.mock.calls[0][0].metadata.edition).toBe(input.metadata.edition);
  expect(await source.listCatalog()).toHaveLength(2);
});

it("keeps a failed selection available for retry without registering a workbook", async () => {
  const source = createLocalCommercialWorkbookSource({ seed: false });
  const create = vi.spyOn(source, "createEdition");
  const loader = vi
    .spyOn(PUBLISHER_PACKS[0], "load")
    .mockRejectedValueOnce(new Error("자료 연결 실패"));
  render(
    <WorkbookPublisherPacks source={source} books={[]} onSaved={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "확보한 자료 보기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("자료 연결 실패");
  expect(screen.getByLabelText("출판사 공개 교재")).toHaveValue(
    PUBLISHER_PACKS[0].id,
  );
  expect(
    screen.queryByRole("button", { name: "이 범위의 정답표 등록" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "자료 다시 불러오기" }));
  expect(
    await screen.findByRole("button", { name: "이 범위의 정답표 등록" }),
  ).toBeEnabled();
  expect(create).not.toHaveBeenCalled();
  loader.mockRestore();
});

it("allows the catalog to preserve an unsaved assignment before creating or opening a publisher edition", async () => {
  const source = createLocalCommercialWorkbookSource({ seed: false });
  const create = vi.spyOn(source, "createEdition");
  const saved = vi.fn();
  const beforeOpen = vi.fn(() => false);
  render(
    <WorkbookPublisherPacks
      source={source}
      books={[]}
      onSaved={saved}
      onBeforeOpen={beforeOpen}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "확보한 자료 보기" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "이 범위의 정답표 등록" }),
  );
  expect(beforeOpen).toHaveBeenCalledOnce();
  expect(create).not.toHaveBeenCalled();
  expect(saved).not.toHaveBeenCalled();
});

it("keeps the latest selected book when a previous download finishes late", async () => {
  const source = createLocalCommercialWorkbookSource({ seed: false });
  const saved = vi.fn();
  const first = PUBLISHER_PACKS[0];
  const next = PUBLISHER_PACKS[1];
  const originalLoad = first.load;
  let resolve!: (value: { default: unknown }) => void;
  const loader = vi.spyOn(first, "load").mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<WorkbookPublisherPacks source={source} books={[]} onSaved={saved} />);
  fireEvent.click(screen.getByRole("button", { name: "확보한 자료 보기" }));
  fireEvent.change(screen.getByLabelText("출판사 공개 교재"), {
    target: { value: next.id },
  });
  await screen.findByRole("button", { name: "이 범위의 정답표 등록" });
  await act(async () => {
    resolve(await originalLoad());
  });
  expect(screen.getByLabelText("출판사 공개 교재")).toHaveValue(next.id);
  fireEvent.click(
    screen.getByRole("button", { name: "이 범위의 정답표 등록" }),
  );
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(saved.mock.calls[0][0].metadata).toEqual(
    (await loadPublisherPack(next)).input.metadata,
  );
  loader.mockRestore();
});
