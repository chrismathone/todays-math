/**
 * «오늘의 개념» 원장님 화면 — 시안 1안(05 §8.9, D-125 ⑴) · 브리프 §1 · §3.
 *
 * 구현: `src/components/unified/ConceptView.tsx` (+ `ConceptUnitPanel` · `ConceptUnitTree`)
 * 데이터: `src/app/dev/concept-hifi/fixture.ts` — **시드 735차시 전량** 위의 시안 1안 데이터를
 * 제품과 같은 조립(`assembleConceptBoard`)으로 지은 것. 개발용 시안 페이지의 캡처와 같은 데이터다.
 *
 * 브리프 §3 이 화면에 못 박으라는 것:
 *   ① 관리자가 아니면 **쓰기 단추가 없다** — 대신 «관리자만 바꿀 수 있습니다» 한 줄
 *   ③ **n/m 과 펼친 이름 수가 같다** — 모든 반 × 강의에서
 *   ④ **가장 긴 차시 이름 · 반 여럿**에서 표가 깨지지 않는다 — 여기서는 «이름이 잘리지 않고 전부
 *      나온다 · 반이 전부 나온다»까지만 본다. 줄 깨짐·가로 넘침은 jsdom 에 레이아웃이 없어 못 잰다 →
 *      실물 브라우저 계측(`scripts/qa/concept-admin-layout.mjs`)이 본다.
 * ② 남의 반은 서버가 거른다(`conceptAdmin.test.ts`) — 화면은 받은 반만 그린다.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ConceptView from "@/components/unified/ConceptView";
import {
  conceptBoardResponseSchema,
  conceptUnitsResponseSchema,
  type ConceptBoard,
} from "@/contracts/conceptAdmin.contract";
import {
  HIFI_DISCLOSURE,
  HIFI_LONGEST_UNIT,
  hifiBoard,
  hifiUnitLectures,
  hifiUnits,
  type HifiOptions,
} from "@/app/dev/concept-hifi/fixture";

type Call = { method: string; url: string; body: unknown };
let calls: Call[] = [];
let boardOptions: HifiOptions = {};
let nextWrite: { status: number; body: unknown } | null = null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** 픽스처를 **계약으로 검사한 뒤** 내준다 — 계약에 없는 모양으로 화면을 시험하지 않게 */
function boardBody(options: HifiOptions = boardOptions) {
  return conceptBoardResponseSchema.parse({ data: hifiBoard(options) });
}

beforeEach(() => {
  calls = [];
  boardOptions = {};
  nextWrite = null;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({
        method,
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      if (method !== "GET") {
        const reply = nextWrite ?? { status: 200, body: { data: {} } };
        return json(reply.body, reply.status);
      }
      if (url === "/api/concept") return json(boardBody());
      if (url === "/api/concept/units")
        return json(
          conceptUnitsResponseSchema.parse({
            data: hifiUnits(boardOptions.canEdit ?? true),
          }),
        );
      const unitId = new URL(url, "http://localhost").searchParams.get(
        "unitId",
      );
      if (unitId) {
        const data = hifiUnitLectures(unitId);
        return data
          ? json({ data })
          : json(
              {
                error: {
                  code: "NOT_FOUND",
                  message: "차시를 찾을 수 없습니다.",
                },
              },
              404,
            );
      }
      return json({ error: { code: "NOT_FOUND", message: "없음" } }, 404);
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

async function renderView(options: HifiOptions = {}, props = {}) {
  boardOptions = options;
  render(<ConceptView videoEmbed={false} {...props} />);
  await screen.findByRole("table", { name: "반별 이번 주 차시" });
}
const table = () =>
  within(screen.getByRole("table", { name: "반별 이번 주 차시" }));
const panel = () =>
  within(screen.getByRole("complementary", { name: "차시 판" }));
const board = (): ConceptBoard => hifiBoard(boardOptions);
const gets = (url: string) =>
  calls.filter((c) => c.method === "GET" && c.url === url).length;

describe("첫 화면 — 시안 1안 그대로", () => {
  it("머리 · 요약 · 반별 표 · 오른쪽 차시 판", async () => {
    await renderView();
    expect(
      screen.getByRole("heading", { level: 1, name: "오늘의 개념" }),
    ).toBeVisible();
    // 시안은 «9월 15일 (월)» 이라 적었지만 2026-09-15 는 화요일이다 — 요일은 달력이 정한다
    expect(
      screen.getByText("9월 15일 (화) · 이번 주 진도에 닿는 차시와 그 강의"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "전체 차시 735" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "meta.json 으로 등록" }),
    ).toBeVisible();

    const { summary } = board();
    const sum = within(screen.getByRole("region", { name: "이번 주 요약" }));
    expect(sum.getByText(String(summary.units))).toBeVisible();
    expect(sum.getByText(`개 · 반 ${summary.classes}개`)).toBeVisible();
    expect(sum.getByText("게시").previousSibling).toHaveTextContent(
      String(summary.published),
    );
    expect(sum.getByText("초안만").previousSibling).toHaveTextContent(
      String(summary.draftOnly),
    );
    expect(sum.getByText("영상 없음").previousSibling).toHaveTextContent(
      String(summary.none),
    );

    expect(
      table()
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual([
      "반",
      "최근 진도",
      "강의",
      "다음 차시",
      "강의",
      "끝까지 본 학생",
    ]);
    expect(
      table().getAllByRole("button", { pressed: false }).length,
    ).toBeGreaterThan(0);
  });

  it("처음 고른 반은 최근 진도 차시에 강의가 있는 첫 반이다 — 그 차시가 오른쪽 판에 선다", async () => {
    await renderView();
    const selected = table().getByRole("button", { pressed: true });
    expect(selected).toHaveAccessibleName(/^중1 A반/);
    expect(
      panel().getByRole("heading", { name: "공약수와 최대공약수" }),
    ).toBeVisible();
    // 강의 목록 — 게시 한 편 · 초안 한 편, 처음엔 손볼 것(초안)을 고른다
    expect(
      panel().getByRole("button", { name: "최대공약수 구하기", pressed: true }),
    ).toBeVisible();
    expect(
      panel().getByRole("button", {
        name: "공약수와 최대공약수, 그리고 서로소",
        pressed: false,
      }),
    ).toBeVisible();
  });

  it("반 이름을 누르면 그 반의 최근 진도 차시로 판이 바뀐다 — 행은 옅은 면으로 표시된다", async () => {
    await renderView();
    fireEvent.click(table().getByRole("button", { name: /^중1 B반/ }));
    expect(table().getByRole("button", { name: /^중1 B반/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(panel().getByRole("heading", { name: "소인수분해" })).toBeVisible();
    expect(panel().getByText(/중1 B반 · 9월 12일 진도/)).toBeVisible();
  });
});

describe("① 관리자가 아니면 쓰기 단추가 없다", () => {
  const WRITE = [
    "meta.json 으로 등록",
    "meta.json 붙여넣어 등록",
    "끝까지 봤다",
    "게시",
    "게시 내리기",
    "다시 게시",
    "주소 넣기",
  ];

  it("🔴 단추 대신 «관리자만 바꿀 수 있습니다» 한 줄", async () => {
    await renderView({ canEdit: false });
    for (const name of WRITE)
      expect(
        screen.queryByRole("button", { name }),
        name,
      ).not.toBeInTheDocument();
    expect(panel().getByText("관리자만 바꿀 수 있습니다.")).toBeVisible();
    // 게시된 강의만 있는 반 · 강의가 없는 반에서도
    fireEvent.click(table().getByRole("button", { name: /^중1 B반/ }));
    for (const name of WRITE)
      expect(
        screen.queryByRole("button", { name }),
        name,
      ).not.toBeInTheDocument();
    fireEvent.click(table().getByRole("button", { name: /^초3 A반/ }));
    for (const name of WRITE)
      expect(
        screen.queryByRole("button", { name }),
        name,
      ).not.toBeInTheDocument();
    expect(panel().getByText("관리자만 바꿀 수 있습니다.")).toBeVisible();
  });

  it("관리자는 같은 자리에서 단추를 본다 — 게시는 권장 조건을 기다리지 않는다(D-124 ⑻)", async () => {
    await renderView({ canEdit: true });
    expect(panel().getByRole("button", { name: "끝까지 봤다" })).toBeEnabled();
    expect(panel().getByRole("button", { name: "게시" })).toBeEnabled();
    expect(
      panel().getByText("끝까지 보지 않아도 게시할 수 있습니다 — 권장입니다."),
    ).toBeVisible();
    expect(
      panel().queryByText("관리자만 바꿀 수 있습니다."),
    ).not.toBeInTheDocument();
  });
});

describe("③ 끝까지 본 학생 — n/m 을 누르면 아직 안 본 학생 이름", () => {
  it("🔴 모든 반 × 게시 강의에서 펼친 이름 수 = m − n, 이름은 서버가 낸 그대로", async () => {
    await renderView();
    const lines = board().rows.flatMap((r) => r.watch.map((w) => ({ r, w })));
    expect(lines.length).toBe(3); // 중1 A반 한 편 · 중1 B반 두 편 — 분모를 못 박는다
    const titleOf = (id: string) =>
      board().lectures.find((l) => l.id === id)!.title;
    for (const { w } of lines) {
      const button = table().getByRole("button", {
        name: `«${titleOf(w.lectureId)}» 끝까지 본 학생 ${w.watched}/${w.total}명`,
      });
      expect(button).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
      const list = screen.getByRole("list", {
        name: `«${titleOf(w.lectureId)}» 아직 끝까지 안 본 학생`,
      });
      const names = within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent);
      expect(names).toHaveLength(w.total - w.watched);
      expect(names).toEqual(w.pending.map((p) => p.name));
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("시안의 수 — 중1 A반 7/12명(퇴원 한 명은 분모에 없다)", async () => {
    await renderView();
    expect(table().getByRole("button", { name: /7\/12명$/ })).toBeVisible();
  });

  it("학생 시청 기록이 하나도 없으면 빈 상태 문구 — 0/m 이 정상이다", async () => {
    await renderView({ views: false });
    expect(table().getByRole("button", { name: /0\/12명$/ })).toBeVisible();
    expect(
      screen.getByText(
        "아직 학생 시청 기록이 없습니다. 학생 로그인이 열리면 끝까지 본 학생이 여기에 쌓입니다.",
      ),
    ).toBeVisible();
  });

  it("시청 기록이 있으면 그 문구는 없다", async () => {
    await renderView();
    expect(
      screen.queryByText(/아직 학생 시청 기록이 없습니다/),
    ).not.toBeInTheDocument();
  });
});

describe("④ 가장 긴 차시 이름 · 반 여럿", () => {
  it("🔴 가장 긴 차시 이름(41자)이 잘리지 않고 전부 나온다 — 반 스물다섯이 전부 표에 선다", async () => {
    await renderView({ stress: true });
    expect(HIFI_LONGEST_UNIT.section.length).toBe(41);
    const cells = table().getAllByText(HIFI_LONGEST_UNIT.section);
    expect(cells.length).toBeGreaterThanOrEqual(1);
    for (const cell of cells)
      expect(cell.textContent).toBe(HIFI_LONGEST_UNIT.section);
    const classButtons = board().rows.map((r) =>
      table().getByRole("button", {
        name: new RegExp(`^${r.className.replace(/[()]/g, "\\$&")}`),
      }),
    );
    expect(classButtons).toHaveLength(25);
  });

  it("진도가 없는 반과 마지막 차시 반도 표에 남는다 — 빈 칸은 «—»", async () => {
    await renderView({ stress: true });
    const row = table()
      .getByRole("button", { name: /^진도 없는 반/ })
      .closest("tr")!;
    expect(within(row).getByText("진도 기록 없음")).toBeVisible();
  });
});

describe("오른쪽 차시 판 — 게시 조건은 관문 결과 그대로", () => {
  it("✓ 통과한 조건 · ! 알리는 것(권장) — 문구는 서버 관문의 것", async () => {
    await renderView();
    const checks = within(panel().getByRole("list", { name: "게시 조건" }));
    const items = checks.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "✓제목 · 길이 1:44",
      "✓유튜브 주소",
      `✓AI 고지 «${HIFI_DISCLOSURE}»`,
      "!아직 끝까지 시청하지 않았습니다. 게시 전 시청을 권장합니다.",
    ]);
  });

  it("✗ 막는 것 — 주소 없는 초안은 게시 단추가 잠기고 «주소 넣기»가 앞선다", async () => {
    await renderView({ stress: true });
    fireEvent.click(table().getByRole("button", { name: /^중1 C반/ }));
    expect(
      panel().getByRole("heading", { name: "공배수와 최소공배수" }),
    ).toBeVisible();
    const checks = within(panel().getByRole("list", { name: "게시 조건" }));
    expect(
      checks
        .getByText("영상 주소가 없습니다. 업로드한 뒤 주소를 넣으세요.")
        .closest("li"),
    ).toHaveAttribute("data-kind", "bad");
    expect(panel().getByRole("button", { name: "게시" })).toBeDisabled();
    expect(panel().getByRole("button", { name: "주소 넣기" })).toBeEnabled();
    expect(
      panel().getByText("올린 영상의 주소를 넣으면 게시할 수 있습니다."),
    ).toBeVisible();
  });

  it("게시된 강의 — «게시 내리기» 와 게시한 날 · 이 반의 끝까지 본 학생", async () => {
    await renderView();
    fireEvent.click(
      panel().getByRole("button", {
        name: "공약수와 최대공약수, 그리고 서로소",
      }),
    );
    expect(panel().getByRole("button", { name: "게시 내리기" })).toBeEnabled();
    expect(
      panel().getByText("9월 12일 게시 · 끝까지 본 학생 7명"),
    ).toBeVisible();
    expect(
      panel().queryByRole("button", { name: "게시" }),
    ).not.toBeInTheDocument();
  });

  it("강의가 없는 차시 — 빈 판과 등록 단추", async () => {
    await renderView();
    fireEvent.click(table().getByRole("button", { name: /^초3 A반/ }));
    expect(
      panel().getByRole("heading", { name: HIFI_LONGEST_UNIT.section }),
    ).toBeVisible();
    expect(panel().getByText("이 차시에는 강의가 없습니다.")).toBeVisible();
    expect(
      panel().getByRole("button", { name: "meta.json 붙여넣어 등록" }),
    ).toBeVisible();
  });

  it("«AI 보충 강의» 고지는 이 화면에만 — 판 아래 한 줄", async () => {
    await renderView();
    expect(
      panel().getByText(
        "«AI 보충 강의» 고지는 이 화면에만 보이고 학생 화면에는 없습니다.",
      ),
    ).toBeVisible();
  });

  it("영상 자리 — 주소가 있으면 유튜브 nocookie 임베드(앞으로 감기를 막지 않는다)", async () => {
    boardOptions = {};
    render(<ConceptView />);
    await screen.findByRole("table", { name: "반별 이번 주 차시" });
    const frame = panel().getByTitle("«최대공약수 구하기» 영상");
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/hifiLect006",
    );
  });
});

describe("쓰기 — 누르면 서버에 묻고 다시 불러온다", () => {
  it("keeps publish success when GET fails and retries reads without repeating PATCH", async () => {
    await renderView();
    const fetchBefore = globalThis.fetch;
    let failRead = true;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (
          String(input) === "/api/concept" &&
          (!init?.method || init.method === "GET") &&
          failRead
        )
          return json({}, 503);
        return fetchBefore(input, init);
      },
    );
    fireEvent.click(panel().getByRole("button", { name: "게시" }));
    expect(
      await screen.findByText(
        "변경은 저장했습니다. 최신 조회에 실패해 화면이 이전 상태일 수 있습니다.",
      ),
    ).toBeVisible();
    expect(screen.getByText("게시했습니다.")).toBeVisible();
    expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
    failRead = false;
    fireEvent.click(
      screen.getByRole("button", { name: "최신 상태 다시 조회" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText(
          "변경은 저장했습니다. 최신 조회에 실패해 화면이 이전 상태일 수 있습니다.",
        ),
      ).not.toBeInTheDocument(),
    );
    expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });
  it("게시 → PATCH { action: publish } 뒤 표를 다시 불러온다", async () => {
    await renderView();
    const before = gets("/api/concept");
    fireEvent.click(panel().getByRole("button", { name: "게시" }));
    await waitFor(() => expect(gets("/api/concept")).toBe(before + 1));
    const write = calls.find((c) => c.method === "PATCH")!;
    expect(write.url).toMatch(
      /^\/api\/concept\/lectures\/5f000000-0000-4000-8000-000000000006$/,
    );
    expect(write.body).toEqual({ action: "publish" });
  });

  it("서버가 거절하면 그 문구를 그대로 보인다", async () => {
    await renderView();
    nextWrite = {
      status: 422,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "영상 주소가 없습니다. 업로드한 뒤 주소를 넣으세요.",
        },
      },
    };
    fireEvent.click(panel().getByRole("button", { name: "게시" }));
    expect(await panel().findByRole("alert")).toHaveTextContent(
      "영상 주소가 없습니다. 업로드한 뒤 주소를 넣으세요.",
    );
  });

  it("주소 넣기 → PATCH { action: video, videoUrl }", async () => {
    await renderView({ stress: true });
    fireEvent.click(table().getByRole("button", { name: /^중1 C반/ }));
    fireEvent.click(panel().getByRole("button", { name: "주소 넣기" }));
    fireEvent.change(panel().getByRole("textbox", { name: "영상 주소" }), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" },
    });
    fireEvent.click(panel().getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(calls.some((c) => c.method === "PATCH")).toBe(true),
    );
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({
      action: "video",
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
  });

  it("meta.json 으로 등록 — 지금 고른 차시를 함께 보내고, 실패는 해석기의 «왜»를 그대로", async () => {
    await renderView();
    fireEvent.click(
      screen.getByRole("button", { name: "meta.json 으로 등록" }),
    );
    fireEvent.change(panel().getByRole("textbox", { name: "meta.json 내용" }), {
      target: { value: '{"fps":30}' },
    });
    nextWrite = {
      status: 422,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message:
            "lessonTitle이 없습니다. 강의 meta.json이 맞는지 확인하세요.",
        },
      },
    };
    fireEvent.click(panel().getByRole("button", { name: "초안으로 등록" }));
    expect(await panel().findByRole("alert")).toHaveTextContent(
      "lessonTitle이 없습니다. 강의 meta.json이 맞는지 확인하세요.",
    );
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe("/api/concept/lectures");
    const u13 = board().rows.find((r) => r.className === "중1 A반")!.progress!
      .unitId;
    expect(post.body).toEqual({ raw: '{"fps":30}', unitId: u13 });
  });

  it("등록이 되면 판을 닫고 표를 다시 불러온다", async () => {
    await renderView();
    const before = gets("/api/concept");
    fireEvent.click(
      screen.getByRole("button", { name: "meta.json 으로 등록" }),
    );
    fireEvent.change(panel().getByRole("textbox", { name: "meta.json 내용" }), {
      target: { value: "{}" },
    });
    nextWrite = { status: 201, body: { data: {} } };
    fireEvent.click(panel().getByRole("button", { name: "초안으로 등록" }));
    await waitFor(() => expect(gets("/api/concept")).toBe(before + 1));
    expect(
      panel().queryByRole("textbox", { name: "meta.json 내용" }),
    ).not.toBeInTheDocument();
    expect(panel().getByRole("status")).toHaveTextContent(
      "초안으로 등록했습니다.",
    );
  });
});

describe("전체 차시 735 — 학년 › 단원 › 차시", () => {
  it("전부 펼쳐 차시마다 강의 상태를 보이고, 고른 차시를 오른쪽 판에 세운다", async () => {
    await renderView();
    fireEvent.click(screen.getByRole("button", { name: "전체 차시 735" }));
    const tree = within(
      await screen.findByRole("region", { name: "전체 차시" }),
    );
    expect(tree.getAllByRole("listitem")).toHaveLength(735);
    expect(
      tree
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent?.split(" ")[0]),
    ).toContain("공통수학1");
    expect(tree.getByText(HIFI_LONGEST_UNIT.section).textContent).toBe(
      HIFI_LONGEST_UNIT.section,
    );

    fireEvent.click(tree.getByRole("button", { name: "공배수와 최소공배수" }));
    // 판은 차시가 바뀌면 새로 선다 — 기다릴 때마다 판을 다시 찾는다(옛 판은 떨어져 나간다)
    await waitFor(() =>
      expect(
        panel().getByRole("button", {
          name: "공배수와 최소공배수",
          pressed: true,
        }),
      ).toBeVisible(),
    );
    expect(
      panel().getByRole("heading", { name: "공배수와 최소공배수" }),
    ).toBeVisible();
    expect(panel().getByText("전체 차시")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "이번 주 진도" }));
    expect(
      await screen.findByRole("table", { name: "반별 이번 주 차시" }),
    ).toBeVisible();
  });
});

describe("불러오기 실패", () => {
  it("recovers the full unit tree from its own error panel", async () => {
    const transport = globalThis.fetch;
    let failed = false;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === "/api/concept/units" && !failed) {
          failed = true;
          return json({ error: { message: "차시 목록 연결 실패" } }, 503);
        }
        return transport(input, init);
      },
    );
    await renderView();
    fireEvent.click(screen.getByRole("button", { name: "전체 차시 735" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "차시 목록 연결 실패",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "전체 차시 다시 불러오기" }),
    );
    expect(
      await screen.findByRole("region", { name: "전체 차시" }),
    ).toBeVisible();
  });

  it("shows a selected unit load failure and retries that unit", async () => {
    const transport = globalThis.fetch;
    let failed = false;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).startsWith("/api/concept/lectures?") && !failed) {
          failed = true;
          return json({ error: { message: "강의 연결 실패" } }, 503);
        }
        return transport(input, init);
      },
    );
    await renderView();
    fireEvent.click(screen.getByRole("button", { name: "전체 차시 735" }));
    const tree = within(
      await screen.findByRole("region", { name: "전체 차시" }),
    );
    fireEvent.click(tree.getByRole("button", { name: "공배수와 최소공배수" }));
    expect(await panel().findByRole("alert")).toHaveTextContent(
      "강의 연결 실패",
    );
    fireEvent.click(
      panel().getByRole("button", { name: "차시 강의 다시 불러오기" }),
    );
    await waitFor(() =>
      expect(
        panel().getByRole("heading", { name: "공배수와 최소공배수" }),
      ).toBeVisible(),
    );
  });

  it("로그인이 풀리면 서버 문구와 다시 불러오기", async () => {
    vi.stubGlobal("fetch", async () =>
      json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        401,
      ),
    );
    render(<ConceptView videoEmbed={false} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "로그인이 필요합니다.",
    );
    expect(screen.getByRole("button", { name: "다시 불러오기" })).toBeVisible();
  });
});
