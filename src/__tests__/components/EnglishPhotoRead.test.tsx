/**
 * 🔴 RED → 🟢 — «사진에서 글 읽기» 창 (D-158 · 25 §13.8 · 시안 `hifi-d158-english-photo-read.html` H4 · r2).
 *
 * 구현: src/components/english/EnglishPhotoReadDialog.tsx · 자료 줄의 «글 읽기» · «자료 추가»의 셋째 탭(EnglishPrepView)
 *
 * 무엇을 잠그나
 * 1. 열면 그 사진을 읽어 글 칸에 넣는다(읽는 동안 진행 줄). 사진은 자료 내려받기 주소로 보인다.
 * 2. «저장하고 다음 사진» — 글 자료로 저장하고(자료 POST · JSON) 다음 사진을 읽는다. 마지막 사진에서는 «지문 자료로 저장»이 주 단추다.
 * 3. 고친 글이 있으면 넘기기 · 닫기 전에 묻는다. 이미 읽은 사진으로 돌아가면 **다시 읽지 않는다**(읽을 때마다 AI 호출).
 * 4. 읽지 못하면 서버 문구와 «다시 읽기».
 * 5. 자료 줄의 «글 읽기»는 사진 자료에만 있다. «자료 추가»의 셋째 탭은 올린 뒤 읽기 창을 연다.
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

import EnglishPhotoReadDialog from "@/components/english/EnglishPhotoReadDialog";
import type {
  EnglishExam,
  EnglishMaterial,
} from "@/contracts/english.contract";
import {
  ENGLISH_EXAM_A_ID,
  ENGLISH_MOCK_MATERIALS,
} from "@/mocks/handlers/english";
import { server } from "@/mocks/server";

import { Harness, installDialogShim, makeLog } from "./EnglishStudio.harness";

const exam: EnglishExam = {
  id: ENGLISH_EXAM_A_ID,
  school: "한빛고등학교",
  grade: "고1",
  title: "2학기 총괄 평가",
  examDate: null,
  types: [],
  materialCount: 3,
  setCount: 0,
  reviewedCount: 0,
  createdAt: "2026-10-06T00:00:00.000Z",
  updatedAt: "2026-10-06T00:00:00.000Z",
};
const photo = (n: number): EnglishMaterial => ({
  id: `7300000${n}-0000-4000-8000-000000000001`,
  examId: exam.id,
  name: `총괄평가 ${n}쪽.jpg`,
  mimeType: "image/jpeg",
  size: 1_100_000,
  hasFile: true,
  content: null,
  createdAt: "2026-10-06T01:00:00.000Z",
});
const photos = [photo(1), photo(2), photo(3)];

let reads: string[];
let saved: { name: string; content: string }[];
let failNext: boolean;

beforeEach(() => {
  installDialogShim();
  reads = [];
  saved = [];
  failNext = false;
  server.use(
    http.post("/api/english/materials/:id/read", ({ params }) => {
      const id = String(params.id);
      reads.push(id);
      if (failNext) {
        failNext = false;
        return HttpResponse.json(
          {
            error: {
              code: "AI_GENERATION_FAILED",
              message:
                "글을 읽지 못했습니다. 사진이 흐리거나 글자가 작을 수 있습니다.",
            },
          },
          { status: 502 },
        );
      }
      const n = photos.findIndex((item) => item.id === id) + 1;
      return HttpResponse.json({
        data: { text: `Passage of page ${n || "new"}.` },
      });
    }),
    http.post("/api/english/exams/:id/materials", async ({ request }) => {
      const body = (await request.json()) as { name: string; content: string };
      saved.push(body);
      return HttpResponse.json(
        {
          data: {
            id: `7400000${saved.length}-0000-4000-8000-000000000001`,
            examId: exam.id,
            name: body.name,
            mimeType: "text/plain",
            size: body.content.length,
            hasFile: false,
            content: body.content,
            createdAt: "2026-10-06T02:00:00.000Z",
          },
        },
        { status: 201 },
      );
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

function open(startId = photos[0]!.id, list = photos) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <EnglishPhotoReadDialog
      exam={exam}
      photos={list}
      startId={startId}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  return { onClose, onSaved };
}
const textBox = () => screen.findByRole("textbox", { name: /읽은 글/ });
const button = (name: string) => screen.getByRole("button", { name });

describe("[사진에서 글 읽기] 읽기 창", () => {
  it("열면 그 사진을 읽어 글 칸에 넣는다 — 읽는 동안 진행 줄 · 사진은 자료 주소 · 이름은 확장자를 뗀 것", async () => {
    open();
    expect(
      screen.getByRole("dialog", { name: "사진에서 글 읽기" }),
    ).toBeVisible();
    expect(screen.getByText(/글을 읽는 중입니다/)).toBeVisible();
    expect(await textBox()).toHaveValue("Passage of page 1.");
    // 읽은 글이 오면 초점이 글 칸으로 온다(열릴 때는 읽는 중이라 닫기 단추에 있었다)
    await waitFor(async () => expect(await textBox()).toHaveFocus());
    expect(
      screen.getByRole("img", { name: "총괄평가 1쪽.jpg" }),
    ).toHaveAttribute("src", `/api/english/materials/${photos[0]!.id}`);
    expect(screen.getByRole("textbox", { name: "자료 이름" })).toHaveValue(
      "총괄평가 1쪽",
    );
    expect(screen.getByText("1 / 3")).toBeVisible();
    expect(button("이전")).toBeDisabled();
    expect(button("다음")).toBeEnabled();
    // 안내 문구 — 사실만(원장님 선택 «가»)
    expect(
      screen.getByText(
        "읽은 글은 틀릴 수 있습니다. 사진과 견주어 고친 뒤 저장해 주세요. 손글씨는 읽지 않습니다.",
      ),
    ).toBeVisible();
    expect(reads).toEqual([photos[0]!.id]);
  });

  it("«저장하고 다음 사진» — 고친 글을 글 자료로 저장하고 다음 사진을 읽는다", async () => {
    const { onSaved, onClose } = open();
    fireEvent.change(await textBox(), {
      target: { value: "Upcycling is a fun way to reuse old things." },
    });
    fireEvent.click(button("저장하고 다음 사진"));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toEqual({
      name: "총괄평가 1쪽",
      content: "Upcycling is a fun way to reuse old things.",
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved.mock.calls[0]![0]).toMatchObject({ name: "총괄평가 1쪽" });
    expect(await screen.findByText("2 / 3")).toBeVisible();
    await waitFor(async () =>
      expect(await textBox()).toHaveValue("Passage of page 2."),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(reads).toEqual([photos[0]!.id, photos[1]!.id]);
  });

  it("마지막 사진에서는 «저장하고 다음 사진»이 없고, «지문 자료로 저장»이 저장한 뒤 닫는다", async () => {
    const { onSaved, onClose } = open(photos[2]!.id);
    await textBox();
    expect(screen.getByText("3 / 3")).toBeVisible();
    expect(button("다음")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "저장하고 다음 사진" }),
    ).not.toBeInTheDocument();
    fireEvent.click(button("지문 자료로 저장"));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(saved[0]).toEqual({
      name: "총괄평가 3쪽",
      content: "Passage of page 3.",
    });
  });

  it("고친 글이 있으면 넘기기 전에 묻는다 — «계속 고치기»는 그대로 · «버리고 넘기기»는 넘긴다", async () => {
    open();
    fireEvent.change(await textBox(), { target: { value: "고친 글" } });
    fireEvent.click(button("다음"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "저장하지 않은 글이 있습니다. 넘기면 고친 글이 사라집니다.",
    );
    expect(screen.getByText("1 / 3")).toBeVisible();
    fireEvent.click(button("계속 고치기"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await textBox()).toHaveValue("고친 글");
    fireEvent.click(button("다음"));
    fireEvent.click(button("버리고 넘기기"));
    expect(await screen.findByText("2 / 3")).toBeVisible();
    expect(saved).toHaveLength(0);
  });

  it("고친 글이 있으면 닫기 전에도 묻는다", async () => {
    const { onClose } = open();
    fireEvent.change(await textBox(), { target: { value: "고친 글" } });
    fireEvent.click(button("닫기"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "저장하지 않은 글이 있습니다. 닫으면 고친 글이 사라집니다.",
    );
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(button("버리고 닫기"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("이미 읽은 사진으로 돌아가면 다시 읽지 않는다 — 읽을 때마다 AI 호출이다", async () => {
    open();
    await textBox();
    fireEvent.click(button("다음"));
    expect(await screen.findByText("2 / 3")).toBeVisible();
    await waitFor(async () =>
      expect(await textBox()).toHaveValue("Passage of page 2."),
    );
    fireEvent.click(button("이전"));
    expect(await screen.findByText("1 / 3")).toBeVisible();
    expect(await textBox()).toHaveValue("Passage of page 1.");
    expect(reads).toEqual([photos[0]!.id, photos[1]!.id]);
  });

  it("읽지 못하면 서버 문구와 «다시 읽기» — 다시 누르면 한 번 더 읽는다", async () => {
    failNext = true;
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "글을 읽지 못했습니다. 사진이 흐리거나 글자가 작을 수 있습니다.",
    );
    expect(
      screen.queryByRole("textbox", { name: /읽은 글/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(button("다시 읽기"));
    expect(await textBox()).toHaveValue("Passage of page 1.");
    expect(reads).toHaveLength(2);
  });

  it("«크게»를 누르면 사진이 2배로 — 칸 안에서 굴린다", async () => {
    open();
    await textBox();
    const image = screen.getByRole("img", { name: "총괄평가 1쪽.jpg" });
    expect(button("폭 맞춤")).toHaveAttribute("aria-pressed", "true");
    expect(image).toHaveAttribute("data-zoom", "fit");
    fireEvent.click(button("크게"));
    expect(button("크게")).toHaveAttribute("aria-pressed", "true");
    expect(image).toHaveAttribute("data-zoom", "large");
  });

  it("사진이 한 장이면 넘김 줄이 없다", async () => {
    open(photos[0]!.id, [photos[0]!]);
    await textBox();
    expect(
      screen.queryByRole("button", { name: "다음" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
    expect(button("지문 자료로 저장")).toBeVisible();
  });

  it("글이나 이름이 비면 저장하지 않고 사유를 적는다", async () => {
    open();
    fireEvent.change(await textBox(), { target: { value: "   " } });
    fireEvent.click(button("지문 자료로 저장"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "읽은 글이 비어 있습니다.",
    );
    expect(saved).toHaveLength(0);
  });
});

describe("[사진에서 글 읽기] 자료 화면에서 들어가는 길", () => {
  const withPhoto = [
    ...ENGLISH_MOCK_MATERIALS,
    { ...photo(1), examId: ENGLISH_EXAM_A_ID },
  ];

  it("«글 읽기»는 사진 자료 줄에만 있고, 누르면 읽기 창이 열린다", async () => {
    server.use(
      http.get("/api/english/exams/:id/materials", () =>
        HttpResponse.json({ data: withPhoto }),
      ),
    );
    render(<Harness log={makeLog()} />);
    const materials = within(
      await screen.findByRole("region", { name: "시험 자료" }),
    );
    const read = await materials.findByRole("button", {
      name: "총괄평가 1쪽.jpg 글 읽기",
    });
    // PDF · 글 자료에는 없다
    expect(materials.getAllByRole("button", { name: /글 읽기$/ })).toHaveLength(
      1,
    );
    fireEvent.click(read);
    expect(
      await screen.findByRole("dialog", { name: "사진에서 글 읽기" }),
    ).toBeVisible();
    expect(await textBox()).toHaveValue("Passage of page 1.");
  });

  it("«자료 추가»의 셋째 탭 — 사진만 받고, 올리면 읽기 창이 열린다", async () => {
    const realFetch = globalThis.fetch;
    let sent: File | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (
        init?.method === "POST" &&
        init.body instanceof FormData &&
        /\/api\/english\/exams\/[^/]+\/materials$/.test(url)
      ) {
        sent = init.body.get("file") as File;
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: { ...photo(9), name: sent.name } }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return realFetch(input, init);
    });
    render(<Harness log={makeLog()} />);
    await screen.findByRole("heading", { name: "학교별 내신 대비" });
    fireEvent.click(screen.getByRole("button", { name: "자료 추가" }));
    const dialog = within(screen.getByRole("dialog", { name: "자료 추가" }));
    fireEvent.click(dialog.getByRole("tab", { name: "사진에서 읽기" }));
    expect(
      dialog.getByText(
        "사진은 자료로 보관되고, 글을 읽을 때 AI 서버로 보냅니다. 손글씨는 읽지 않습니다.",
      ),
    ).toBeVisible();
    // 사진이 아니면 올리지 않는다
    fireEvent.change(dialog.getByLabelText("사진"), {
      target: {
        files: [new File(["x"], "범위.pdf", { type: "application/pdf" })],
      },
    });
    fireEvent.click(dialog.getByRole("button", { name: "올리고 읽기" }));
    expect(dialog.getByRole("alert")).toHaveTextContent(
      "png · jpg 사진만 읽을 수 있습니다.",
    );
    expect(sent).toBeNull();
    fireEvent.change(dialog.getByLabelText("사진"), {
      target: {
        files: [new File(["x"], "총괄평가 9쪽.jpg", { type: "image/jpeg" })],
      },
    });
    fireEvent.click(dialog.getByRole("button", { name: "올리고 읽기" }));
    expect(
      await screen.findByRole("dialog", { name: "사진에서 글 읽기" }),
    ).toBeVisible();
    expect((sent as File | null)?.name).toBe("총괄평가 9쪽.jpg");
    expect(await textBox()).toHaveValue("Passage of page new.");
    expect(
      screen.queryByRole("dialog", { name: "자료 추가" }),
    ).not.toBeInTheDocument();
  });
});
