import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLibrarySaveConfirmation } from "@/components/unified/LibrarySaveDialog";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import type {
  DocumentKind,
  DocumentSharing,
} from "@/contracts/privateWorkspace.contract";

const branchA = "30000000-0000-4000-8000-000000000003";
const branchB = "40000000-0000-4000-8000-000000000004";
function Editor({
  branchId,
  kind = "draft",
  save,
}: {
  branchId?: string | null;
  kind?: DocumentKind;
  save: (sharing?: DocumentSharing) => Promise<void>;
}) {
  const confirm = useLibrarySaveConfirmation(branchId, kind, save);
  return (
    <>
      <button onClick={confirm.requestSave}>자료 저장</button>
      {confirm.dialog}
    </>
  );
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
});

it("binds an open confirmation to the old branch, rejects stale membership, then requires a new private-default confirmation", async () => {
  const refreshed = vi.fn();
  window.addEventListener("workspace-access-change", refreshed);
  const transport = vi.fn<typeof fetch>(async () =>
    Response.json(
      {
        error: {
          code: "BRANCH_CHANGED",
          message:
            "학원 소속이 변경되었습니다. 공개 범위를 다시 확인해 주세요.",
        },
      },
      { status: 409 },
    ),
  );
  const client = new PrivateCloudClient("owner-a", transport);
  const save = async (sharing?: DocumentSharing) => {
    await client.save(
      "draft-1",
      "draft",
      "시험지",
      { problems: [] },
      1,
      sharing,
    );
  };
  const editor = render(<Editor branchId={branchA} save={save} />);
  fireEvent.click(screen.getByRole("button", { name: "자료 저장" }));
  fireEvent.click(screen.getByRole("radio", { name: "학원에 공개" }));
  fireEvent.click(screen.getByRole("button", { name: "저장 확인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "학원 소속이 변경되었습니다",
  );
  expect(transport).toHaveBeenCalledTimes(1); // no reconciliation can accept a denied stale share
  expect(JSON.parse(String(transport.mock.calls[0][1]?.body))).toMatchObject({
    visibility: "branch",
    sharedBranchId: branchA,
  });
  expect(refreshed).toHaveBeenCalledOnce();
  editor.rerender(<Editor branchId={branchB} save={save} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "자료 저장" }));
  expect(screen.getByRole("radio", { name: "학원에 비공개" })).toBeChecked();
  window.removeEventListener("workspace-access-change", refreshed);
});

// 2026-10-16 외부 검토 §3 — 제목은 보관함(저장 위치)이고, 저장할 종류는 따로 보인다.
it("names the location in the title and shows the stored kind on its own line", async () => {
  const save = vi.fn(async () => {});
  const editor = render(
    <Editor branchId={branchA} kind="conceptBlank" save={save} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "자료 저장" }));
  const dialog = screen.getByRole("dialog", { name: "우리학원 시험지에 저장" });
  expect(
    within(dialog)
      .getAllByRole("term")
      .map((term) => term.textContent),
  ).toEqual(["종류", "저장 위치"]);
  expect(
    within(dialog)
      .getAllByRole("definition")
      .map((definition) => definition.textContent),
  ).toEqual(["개념 백지", "우리학원 시험지"]);
  editor.rerender(<Editor branchId={branchA} kind="extraction" save={save} />);
  expect(within(dialog).getAllByRole("definition")[0]).toHaveTextContent(
    "추출한 자료",
  );
});

it("keeps independent saves direct and removes an open branch dialog when affiliation is removed", async () => {
  const save = vi.fn(async () => {});
  const editor = render(<Editor branchId={branchA} save={save} />);
  fireEvent.click(screen.getByRole("button", { name: "자료 저장" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  editor.rerender(<Editor branchId={null} save={save} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "자료 저장" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith());
});
