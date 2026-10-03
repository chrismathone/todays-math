import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TextbookConceptLinkEditor,
  type TextbookConceptLink,
  type TextbookConceptLinkEditorProps,
} from "@/components/textbook/TextbookConceptLinkEditor";
import { textbookConceptLinkSchema } from "@/contracts/textbookConcept.contract";
import type { TextbookConceptTargetCatalog } from "@/contracts/textbookConceptCatalog.contract";

type Entry = TextbookConceptTargetCatalog["entries"][number];
const factorization: Entry = {
  target: { namespace: "explorer-card", cardId: "factorization" },
  title: "인수분해",
  context: "중3 · 다항식의 곱셈과 인수분해",
  description:
    "다항식을 두 개 이상의 다항식의 곱으로 나타내는 것. 예: $x^2-1=(x-1)(x+1)$",
};
const course: Entry = {
  target: { namespace: "course-section", courseSectionId: "course-exact-id" },
  title: "약분",
  context: "초5 · 1학기 · 약분과 통분",
  description: "분모와 분자를 1보다 큰 공약수로 나누어 분수를 간단히 합니다.",
};
const graph: Entry = {
  target: { namespace: "graph-unit", graphUnitId: "graph-exact-id" },
  title: "다항식",
  context: "고등 · 공통수학 · 교육적 추론 · 검토 중",
  description: "다항식의 연산; 인수분해",
};
const fetchMock = vi.fn<typeof fetch>();
function response(entries: Entry[], nextCursor: string | null = null) {
  return new Response(JSON.stringify({ data: { entries, nextCursor } }), {
    headers: { "content-type": "application/json" },
  });
}
function failure(status: number) {
  return new Response(
    JSON.stringify({ error: { message: "자료를 읽지 못했습니다." } }),
    { status },
  );
}
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function approved(
  id = "approved-1",
  entry = factorization,
): TextbookConceptLink {
  return {
    linkId: id,
    target: entry.target,
    relation: "same",
    review: {
      status: "confirmed",
      candidateRule: "manual",
      reviewedBy: "11111111-1111-4111-8111-111111111111",
      reviewedAt: "2026-10-03T00:00:00.000Z",
      targetHash: "a".repeat(64),
    },
  };
}
function Harness({
  links: initialLinks = [],
  confirmLinkIds: initialConfirmIds = [],
  onChange,
  disabled,
}: Partial<TextbookConceptLinkEditorProps> & {
  onChange: TextbookConceptLinkEditorProps["onChange"];
}) {
  const [links, setLinks] = useState(initialLinks);
  const [confirmLinkIds, setConfirmLinkIds] = useState(initialConfirmIds);
  return (
    <TextbookConceptLinkEditor
      links={links}
      confirmLinkIds={confirmLinkIds}
      disabled={disabled}
      onChange={(next, confirmed) => {
        setLinks(next);
        setConfirmLinkIds(confirmed);
        onChange(next, confirmed);
      }}
    />
  );
}
function setup(
  links: TextbookConceptLink[] = [],
  confirmLinkIds: string[] = [],
) {
  const onChange = vi.fn<TextbookConceptLinkEditorProps["onChange"]>();
  const rendered = render(
    <Harness
      links={links}
      confirmLinkIds={confirmLinkIds}
      onChange={onChange}
    />,
  );
  return { ...rendered, onChange };
}
function query(text: string) {
  fireEvent.change(
    screen.getByRole("searchbox", { name: "이름·정의·ID 검색" }),
    { target: { value: text } },
  );
}
async function search(entry = factorization) {
  fetchMock.mockResolvedValueOnce(response([entry]));
  fireEvent.change(screen.getByRole("combobox", { name: "자료 종류" }), {
    target: { value: entry.target.namespace },
  });
  query(entry.title);
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  fireEvent.click(
    await screen.findByRole("button", { name: `${entry.title} 정의 보기` }),
  );
}
function row(index = 1) {
  return within(screen.getByRole("listitem", { name: `연결 ${index}` }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("TextbookConceptLinkEditor", () => {
  it("searches exact canonical sources, previews real math, and explicitly confirms a manual link only for save", async () => {
    const { onChange } = setup();
    expect(fetchMock).not.toHaveBeenCalled();
    await search();
    const preview = screen.getByLabelText("선택한 대상 정의");
    expect(within(preview).getByText(factorization.context)).toBeVisible();
    expect(preview).toHaveTextContent(
      "다항식을 두 개 이상의 다항식의 곱으로 나타내는 것.",
    );
    expect(preview.querySelector(".katex")).not.toBeNull();
    expect(
      screen.getByRole("combobox", { name: "선택한 대상과의 관계" }),
    ).toHaveValue("related");
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "연결 추가" }));
    const [added, confirmations] = onChange.mock.lastCall!;
    expect(confirmations).toEqual([]);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      target: factorization.target,
      relation: "related",
      review: {
        status: "candidate",
        candidateRule: "manual",
        reviewedBy: null,
        reviewedAt: null,
        targetHash: null,
      },
    });
    expect(textbookConceptLinkSchema.safeParse(added[0]).success).toBe(true);
    expect(row().getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(row().getByRole("checkbox"));
    expect(onChange.mock.lastCall).toEqual([added, [added[0].linkId]]);
    expect(row().getByText(/저장 시 확인 예정/)).toBeVisible();
    fireEvent.change(row().getByRole("combobox", { name: "연결 1 관계" }), {
      target: { value: "covers-part" },
    });
    expect(onChange.mock.lastCall![0][0].relation).toBe("covers-part");
    expect(onChange.mock.lastCall![1]).toEqual([]);
    fireEvent.click(row().getByRole("checkbox"));
    fireEvent.click(row().getByRole("button", { name: "연결 삭제" }));
    expect(onChange.mock.lastCall).toEqual([[], []]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "/api/textbook/concepts/targets?namespace=explorer-card&q=%EC%9D%B8%EC%88%98%EB%B6%84%ED%95%B4&limit=50",
    );
    expect(init).toMatchObject({
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves unrelated approved review metadata, IDs, order and pending confirmations", async () => {
    const original = [approved(), approved("approved-2", course)];
    const { onChange } = setup(original, ["approved-2"]);
    await search(graph);
    fireEvent.change(
      screen.getByRole("combobox", { name: "선택한 대상과의 관계" }),
      { target: { value: "covers-part" } },
    );
    expect(screen.getByLabelText("선택한 대상 정의")).toHaveTextContent(
      "교육적 추론 · 검토 중",
    );
    expect(
      screen.getByText(/공식 선수 관계나 그래프 간선을 만들지 않습니다/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "연결 추가" }));
    expect(onChange.mock.lastCall![0].slice(0, 2)).toEqual(original);
    expect(onChange.mock.lastCall![0][2].target).toEqual(graph.target);
    expect(onChange.mock.lastCall![1]).toEqual(["approved-2"]);
    fireEvent.change(row().getByRole("combobox"), {
      target: { value: "related" },
    });
    const [changed, confirmed] = onChange.mock.lastCall!;
    expect(changed[0]).toMatchObject({
      linkId: original[0].linkId,
      review: {
        status: "candidate",
        reviewedBy: null,
        reviewedAt: null,
        targetHash: null,
      },
    });
    expect(changed[1]).toEqual(original[1]);
    expect(confirmed).toEqual(["approved-2"]);
  });

  it("rejects duplicate exact target/relation while allowing different explicit relations", async () => {
    const original = approved();
    const { onChange } = setup([original]);
    await search();
    fireEvent.change(
      screen.getByRole("combobox", { name: "선택한 대상과의 관계" }),
      { target: { value: "same" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "연결 추가" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "같은 대상과 관계가 이미 연결",
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("searchbox")).toHaveValue("인수분해");
    fireEvent.change(
      screen.getByRole("combobox", { name: "선택한 대상과의 관계" }),
      { target: { value: "related" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "연결 추가" }));
    expect(onChange.mock.lastCall![0]).toHaveLength(2);
    expect(
      new Set(onChange.mock.lastCall![0].map((link) => link.linkId)).size,
    ).toBe(2);
    onChange.mockClear();
    fireEvent.change(row(2).getByRole("combobox"), {
      target: { value: "same" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "같은 대상과 관계가 이미 연결",
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(row(2).getByRole("combobox")).toHaveValue("related");
    expect(row(1).getByText("확인 완료")).toBeVisible();
  });

  it("loads the exact existing target across catalog pages before confirmation, never equating names", async () => {
    const original = approved();
    const { onChange } = setup([original]);
    expect(row().getByRole("checkbox")).toBeDisabled();
    const namesake: Entry = {
      ...factorization,
      target: { namespace: "explorer-card", cardId: "different-id" },
      description: "이름만 같은 다른 정의",
    };
    fetchMock
      .mockResolvedValueOnce(response([namesake], "50"))
      .mockResolvedValueOnce(response([factorization]));
    fireEvent.click(row().getByRole("button", { name: "정의 불러오기" }));
    await waitFor(() => expect(row().getByRole("checkbox")).toBeEnabled());
    expect(screen.queryByText("이름만 같은 다른 정의")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "/api/textbook/concepts/targets?namespace=explorer-card&q=factorization&limit=50",
      "/api/textbook/concepts/targets?namespace=explorer-card&q=factorization&limit=50&cursor=50",
    ]);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(row().getByRole("checkbox"));
    expect(onChange.mock.lastCall).toEqual([[original], [original.linkId]]);
  });

  it("does not confirm a missing exact target or guess from its title", async () => {
    const { onChange } = setup([approved()]);
    fetchMock.mockResolvedValueOnce(
      response([
        {
          ...factorization,
          target: { namespace: "explorer-card", cardId: "namesake" },
        },
      ]),
    );
    fireEvent.click(row().getByRole("button", { name: "정의 불러오기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "정확한 대상 ID를 찾지 못했습니다",
    );
    expect(row().getByRole("checkbox")).toBeDisabled();
    expect(row().getByText("확인 완료")).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels target replacement without input loss, then clears only the edited link review on apply", async () => {
    const first = approved();
    const second = approved("approved-2", course);
    const { onChange } = setup([first, second], [first.linkId, second.linkId]);
    fireEvent.click(row().getByRole("button", { name: "대상 바꾸기" }));
    await search(graph);
    fireEvent.click(screen.getByRole("button", { name: "대상 변경 취소" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("searchbox")).toHaveValue(graph.title);
    expect(row().getByRole("checkbox")).toBeChecked();
    fireEvent.click(row().getByRole("button", { name: "대상 바꾸기" }));
    await search(graph);
    fireEvent.click(screen.getByRole("button", { name: "대상 변경 적용" }));
    const [changed, confirmations] = onChange.mock.lastCall!;
    expect(changed).toHaveLength(2);
    expect(changed[0]).toMatchObject({
      linkId: first.linkId,
      target: graph.target,
      relation: "same",
      review: {
        status: "candidate",
        candidateRule: "manual",
        reviewedBy: null,
        reviewedAt: null,
        targetHash: null,
      },
    });
    expect(changed[1]).toEqual(second);
    expect(confirmations).toEqual([second.linkId]);
  });

  it.each(["namespace", "query"] as const)(
    "ignores stale responses after a %s switch even when fetch ignores abort",
    async (change) => {
      const { onChange } = setup();
      const old = deferred();
      const latest = deferred();
      fetchMock
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise);
      query("인수");
      fireEvent.click(screen.getByRole("button", { name: "검색" }));
      const oldSignal = fetchMock.mock.calls[0][1]?.signal;
      if (change === "namespace")
        fireEvent.change(screen.getByRole("combobox", { name: "자료 종류" }), {
          target: { value: "course-section" },
        });
      else query("다른 검색어");
      expect(oldSignal?.aborted).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "검색" }));
      const newest =
        change === "namespace"
          ? course
          : {
              ...factorization,
              title: "새 결과",
              target: {
                namespace: "explorer-card" as const,
                cardId: "latest-exact",
              },
            };
      await act(async () => {
        latest.resolve(response([newest]));
      });
      expect(
        await screen.findByRole("button", {
          name: `${newest.title} 정의 보기`,
        }),
      ).toBeVisible();
      await act(async () => {
        old.resolve(response([factorization]));
      });
      expect(
        screen.queryByRole("button", { name: "인수분해 정의 보기" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `${newest.title} 정의 보기` }),
      ).toBeVisible();
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("paginates the same search without losing selection and deduplicates repeated target results", async () => {
    setup();
    const second: Entry = {
      ...factorization,
      target: { namespace: "explorer-card", cardId: "factorization-other" },
      title: "다른 인수분해",
    };
    fetchMock
      .mockResolvedValueOnce(response([factorization], "50"))
      .mockResolvedValueOnce(response([factorization, second]));
    query("인수");
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "인수분해 정의 보기" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "결과 더 보기" }));
    expect(
      await screen.findByRole("button", { name: "다른 인수분해 정의 보기" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "인수분해 정의 보기" }),
    ).toHaveLength(1);
    expect(screen.getByLabelText("선택한 대상 정의")).toHaveTextContent(
      "factorization",
    );
    expect(
      new URL(
        String(fetchMock.mock.calls[1][0]),
        "https://example.test",
      ).searchParams.get("cursor"),
    ).toBe("50");
    expect(
      screen.queryByRole("button", { name: "결과 더 보기" }),
    ).not.toBeInTheDocument();
  });

  it.each([401, 403, 500])(
    "handles HTTP %i without erasing input or existing links and allows retry",
    async (status) => {
      const original = approved();
      const { onChange } = setup([original]);
      fetchMock.mockResolvedValueOnce(failure(status));
      query("인수분해");
      fireEvent.click(screen.getByRole("button", { name: "검색" }));
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        status === 401
          ? "로그인이 필요"
          : status === 403
            ? "권한이 없습니다"
            : "자료를 읽지 못했습니다",
      );
      expect(screen.getByRole("searchbox")).toHaveValue("인수분해");
      expect(row().getByText("확인 완료")).toBeVisible();
      expect(onChange).not.toHaveBeenCalled();
      fetchMock.mockResolvedValueOnce(response([factorization]));
      fireEvent.click(screen.getByRole("button", { name: "검색" }));
      expect(
        await screen.findByRole("button", { name: "인수분해 정의 보기" }),
      ).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it.each(["malformed", "wrong namespace", "network"] as const)(
    "fails closed for %s responses",
    async (kind) => {
      const { onChange } = setup();
      if (kind === "network")
        fetchMock.mockRejectedValueOnce(new Error("connection lost"));
      else if (kind === "wrong namespace")
        fetchMock.mockResolvedValueOnce(response([course]));
      else
        fetchMock.mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: {
                entries: [{ ...factorization, extraUntrustedField: "x" }],
                nextCursor: null,
              },
            }),
          ),
        );
      fireEvent.click(screen.getByRole("button", { name: "검색" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "연결 대상을 불러오지 못했습니다",
      );
      expect(
        screen.queryByRole("list", { name: "연결 대상 검색 결과" }),
      ).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("cancels pending searches and definition reads without late updates and aborts on unmount", async () => {
    const { unmount, onChange } = setup([approved()]);
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    query("保留");
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    fireEvent.click(screen.getByRole("button", { name: "검색 취소" }));
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => {
      pending.resolve(response([factorization]));
    });
    expect(
      screen.queryByRole("button", { name: "인수분해 정의 보기" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("保留");
    const definition = deferred();
    fetchMock.mockReturnValueOnce(definition.promise);
    fireEvent.click(row().getByRole("button", { name: "정의 불러오기" }));
    fireEvent.click(row().getByRole("button", { name: "불러오기 취소" }));
    await act(async () => {
      definition.resolve(response([factorization]));
    });
    expect(row().getByRole("checkbox")).toBeDisabled();
    const abandoned = deferred();
    fetchMock.mockReturnValueOnce(abandoned.promise);
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    unmount();
    expect(fetchMock.mock.calls[2][1]?.signal?.aborted).toBe(true);
    await act(async () => {
      abandoned.resolve(response([factorization]));
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("lets a published read-only link load its exact definition without enabling mutations", async () => {
    const original = approved();
    const onChange = vi.fn<TextbookConceptLinkEditorProps["onChange"]>();
    render(
      <TextbookConceptLinkEditor
        links={[original]}
        confirmLinkIds={[]}
        disabled
        onChange={onChange}
      />,
    );
    expect(row().getByRole("button", { name: "정의 불러오기" })).toBeEnabled();
    fetchMock.mockResolvedValueOnce(response([factorization]));
    fireEvent.click(row().getByRole("button", { name: "정의 불러오기" }));
    expect(await row().findByText(factorization.context)).toBeVisible();
    expect(row().getByText("인수분해")).toBeVisible();
    expect(row().getByRole("checkbox")).toBeDisabled();
    expect(row().getByRole("combobox")).toBeDisabled();
    expect(row().getByRole("button", { name: "대상 바꾸기" })).toBeDisabled();
    expect(row().getByRole("button", { name: "연결 삭제" })).toBeDisabled();
    expect(row().getByText("확인 완료")).toBeVisible();
    expect(fetchMock.mock.calls[0][1]?.method ?? "GET").toBe("GET");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is controlled and cannot mutate when disabled, including a selection made before publication", async () => {
    const original = approved();
    const { rerender, onChange } = setup([original], [original.linkId]);
    await search(graph);
    rerender(
      <Harness
        links={[original]}
        confirmLinkIds={[original.linkId]}
        disabled
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("searchbox")).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "자료 종류" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "연결 추가" })).toBeDisabled();
    for (const control of [
      row().getByRole("checkbox"),
      row().getByRole("button", { name: "대상 바꾸기" }),
      row().getByRole("button", { name: "연결 삭제" }),
      screen.getByRole("button", { name: "연결 추가" }),
    ])
      fireEvent.click(control);
    fireEvent.change(row().getByRole("combobox"), {
      target: { value: "related" },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(row().getByRole("checkbox")).toBeChecked();
    expect(row().getByRole("combobox")).toHaveValue("same");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    rerender(
      <Harness
        links={[original]}
        confirmLinkIds={[original.linkId]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "연결 추가" }));
    expect(onChange.mock.lastCall![0][0]).toEqual(original);
    expect(onChange.mock.lastCall![0][1].target).toEqual(graph.target);
  });
});
