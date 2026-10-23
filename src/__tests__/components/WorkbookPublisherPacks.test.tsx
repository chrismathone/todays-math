import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import WorkbookPublisherPacks from "@/components/commercial-workbooks/WorkbookPublisherPacks";
import { createLocalCommercialWorkbookSource } from "@/lib/commercialWorkbooks/local";

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
