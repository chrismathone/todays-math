/**
 * «오늘의 개념» 학생 화면 네 장 — 05 §8.9 · 시안 1안 «1 작업실 그대로»(D-125 ⑴) · learn-screens 브리프 §1.1 · §1.2 · §3.
 *
 * 데이터: `src/app/dev/learn-hifi/fixture.ts` — 시드 735차시 위에 **제품과 같은 셈·같은 조립**으로 지은 목록
 * (개발용 시안 페이지의 캡처와 같은 데이터다). 재생기는 가짜(`PlayerFactoryContext`) — 유튜브를 부르지 않는다.
 *
 * 브리프 §3 이 이 화면에 못 박으라는 것:
 *   ① 앞으로 감기 가드의 **배선** — 규칙 자체는 `learnSeekGuard.test.ts`
 *   ③ 목록의 날짜 묶음 · «오늘» 표시(오늘 · 어제 · 수업 여러 날) — 규칙 자체는 `learnLectureGroups.test.ts`
 *   ④ 학생 화면에 AI 고지가 없다
 * 줄 깨짐·넘침은 jsdom 에 레이아웃이 없어 못 잰다 → 실물 브라우저 계측(`scripts/qa/learn-screens-layout.mjs`).
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import {
  LEARN_HIFI_LECTURE_IDS as L,
  LEARN_HIFI_LONGEST_TITLE,
  LEARN_HIFI_LONGEST_UNIT,
  learnHifiDetail,
  learnHifiList,
  type LearnHifiSet,
} from "@/app/dev/learn-hifi/fixture";
import { LectureList } from "@/components/learn/LectureList";
import {
  PlayerFactoryContext,
  type CreatePlayer,
  type PlayerEvent,
} from "@/components/learn/playerAdapter";
import { StudentLoginForm } from "@/components/learn/StudentLoginForm";
import { StudentPasswordForm } from "@/components/learn/StudentPasswordForm";
import { WatchScreen } from "@/components/learn/WatchScreen";
import { STUDENT_LOGIN_MESSAGES } from "@/contracts/studentAccount.contract";

type Call = { method: string; url: string; body: unknown; keepalive: boolean };
let calls: Call[] = [];
let set: LearnHifiSet = "mockup";
/** `메서드 경로` → 응답을 갈아 끼운다(없으면 픽스처) */
let override: Record<string, { status: number; body: unknown }> = {};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  calls = [];
  set = "mockup";
  override = {};
  router.replace.mockReset();
  router.push.mockReset();
  router.refresh.mockReset();
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({
        method,
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        keepalive: init?.keepalive === true,
      });
      const key = `${method} ${url}`;
      if (override[key]) return json(override[key].body, override[key].status);
      if (key === "GET /api/learn/lectures")
        return json({ data: learnHifiList(set) });
      const detail = /^GET \/api\/learn\/lectures\/(.+)$/.exec(key);
      if (detail) {
        const data = learnHifiDetail(decodeURIComponent(detail[1]!), set);
        return data
          ? json({ data })
          : json(
              {
                error: {
                  code: "NOT_FOUND",
                  message: "강의을(를) 찾을 수 없습니다.",
                },
              },
              404,
            );
      }
      if (key === "POST /api/learn/watch") {
        const b = JSON.parse(String(init!.body)) as { seconds: number };
        return json({
          data: {
            watch: {
              maxSeconds: Math.round(b.seconds),
              percent: 50,
              completed: false,
            },
          },
        });
      }
      if (key === "POST /api/learn/logout")
        return json({ data: { redirectTo: "/learn/login" } });
      return json({ error: { code: "NOT_FOUND", message: "없음" } }, 404);
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** ④ 학생 화면에 AI 고지 · 잡 ID 가 없다 (D-124 ⑹) */
const expectNoAiNotice = () => {
  expect(document.body.textContent ?? "").not.toMatch(
    /AI|보충 강의|검수한|잡 ID|jobId/,
  );
};

// ── 로그인 ────────────────────────────────────────────────────────────────
describe("학생 로그인 (/learn/login — 시안 sLogin)", () => {
  it("로고 · 아이디 · 비밀번호 · 들어가기 · 도움말 · 원장님 로그인", () => {
    render(<StudentLoginForm />);
    expect(screen.getByText("오늘 수학")).toBeInTheDocument();
    expect(screen.getByText("오늘의 개념 · 학생")).toBeInTheDocument();
    expect(screen.getByLabelText("아이디")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    const pin = screen.getByLabelText("비밀번호");
    expect(pin).toHaveAttribute("type", "password");
    expect(pin).toHaveAttribute("autocomplete", "current-password");
    expect(pin).toHaveAttribute("maxlength", "72");
    expect(
      screen.getByRole("button", { name: "들어가기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "처음이면 선생님께 받은 비밀번호로 들어온 뒤 새 비밀번호로 바꿉니다.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "원장님 로그인 ›" }),
    ).toHaveAttribute("href", "/login");
    expectNoAiNotice();
  });

  it("비밀번호 칸은 긴 비밀번호를 그대로 입력할 수 있다", async () => {
    const user = userEvent.setup();
    render(<StudentLoginForm />);
    const pin = screen.getByLabelText("비밀번호");
    await user.type(pin, "1234@@@@");
    expect(pin).toHaveValue("1234@@@@");
  });

  it("맞으면 첫 로그인은 비밀번호 바꾸기로", async () => {
    const user = userEvent.setup();
    override["POST /api/learn/login"] = {
      status: 200,
      body: { data: { mustChangePassword: true } },
    };
    render(<StudentLoginForm />);
    await user.type(screen.getByLabelText("아이디"), "m1a-01");
    await user.type(screen.getByLabelText("비밀번호"), "5809");
    await user.click(screen.getByRole("button", { name: "들어가기" }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/learn/password"),
    );
    expect(calls.find((c) => c.method === "POST")?.body).toStrictEqual({
      loginId: "m1a-01",
      password: "5809",
    });
  });

  it("비밀번호를 바꾼 학생은 목록으로", async () => {
    const user = userEvent.setup();
    override["POST /api/learn/login"] = {
      status: 200,
      body: { data: { mustChangePassword: false } },
    };
    render(<StudentLoginForm />);
    await user.type(screen.getByLabelText("아이디"), "m1a-01");
    await user.type(screen.getByLabelText("비밀번호"), "1234@@@@");
    await user.click(screen.getByRole("button", { name: "들어가기" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/learn"));
    expect(calls.find((c) => c.method === "POST")?.body).toStrictEqual({
      loginId: "m1a-01",
      password: "1234@@@@",
    });
  });

  it("🔴 틀림 · 잠금 문구는 서버 문구 그대로", async () => {
    const user = userEvent.setup();
    render(<StudentLoginForm />);
    await user.type(screen.getByLabelText("아이디"), "m1a-01");
    await user.type(screen.getByLabelText("비밀번호"), "0001");
    override["POST /api/learn/login"] = {
      status: 401,
      body: {
        error: {
          code: "UNAUTHORIZED",
          message: STUDENT_LOGIN_MESSAGES.invalid,
        },
      },
    };
    await user.click(screen.getByRole("button", { name: "들어가기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      STUDENT_LOGIN_MESSAGES.invalid,
    );
    override["POST /api/learn/login"] = {
      status: 429,
      body: {
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: STUDENT_LOGIN_MESSAGES.locked,
        },
      },
    };
    await user.click(screen.getByRole("button", { name: "들어가기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        STUDENT_LOGIN_MESSAGES.locked,
      ),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("형식이 틀리면 보내지 않고 계약의 문구를 보인다", async () => {
    const user = userEvent.setup();
    render(<StudentLoginForm />);
    await user.type(screen.getByLabelText("아이디"), "ab");
    await user.type(screen.getByLabelText("비밀번호"), "12");
    await user.click(screen.getByRole("button", { name: "들어가기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/아이디는/);
    expect(calls).toEqual([]);
  });
});

// ── 첫 비밀번호 ────────────────────────────────────────────────────────────
describe("첫 로그인 — 비밀번호 바꾸기 (/learn/password — 시안 sPw + 🔴 받은 번호 칸, D-126 ⑹)", () => {
  const fill = async (
    user: ReturnType<typeof userEvent.setup>,
    current: string,
    next: string,
    again: string,
  ) => {
    if (current)
      await user.type(screen.getByLabelText("선생님께 받은 번호"), current);
    if (next) await user.type(screen.getByLabelText("새 비밀번호"), next);
    if (again) await user.type(screen.getByLabelText("한 번 더"), again);
  };

  it("🔴 세 칸 — 받은 번호가 맨 위, 새 번호 · 한 번 더. 새 번호는 숫자 4자리", () => {
    render(<StudentPasswordForm studentName="이서준" />);
    expect(screen.getByText("처음 들어왔습니다")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "새 비밀번호를 정하세요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("선생님께 받은 비밀번호는 이번 한 번만 씁니다."),
    ).toBeInTheDocument();
    const inputs = [...document.querySelectorAll("input")];
    expect(
      inputs.map((i) => i.closest("label")?.firstElementChild?.textContent),
    ).toStrictEqual(["선생님께 받은 번호", "새 비밀번호", "한 번 더"]);
    for (const input of inputs.slice(1)) {
      expect(input).toHaveAttribute("inputmode", "numeric");
      // 브라우저의 maxlength가 붙여넣기를 먼저 자르면 숫자 필터가 네 자리를 채우지 못한다.
      expect(input).not.toHaveAttribute("maxlength");
      expect(input).toHaveAttribute("type", "password");
    }
    expect(inputs[0]).toHaveAttribute("maxlength", "72");
    expect(inputs[0]).not.toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("선생님께 받은 번호")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByLabelText("새 비밀번호")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expectNoAiNotice();
  });

  it("문자가 섞인 번호를 붙여넣어도 숫자 네 자리로 정리한다", async () => {
    const user = userEvent.setup();
    render(<StudentPasswordForm studentName="이서준" />);
    for (const label of ["새 비밀번호", "한 번 더"]) {
      const input = screen.getByLabelText(label);
      await user.click(input);
      await user.paste("2a584");
      expect(input).toHaveValue("2584");
    }
  });

  it("규칙 줄은 숫자 4자리 · 반복·연속 안 됨 · 두 칸이 같음 — 맞으면 표시가 선다", async () => {
    const user = userEvent.setup();
    render(<StudentPasswordForm studentName="이서준" />);
    const rules = within(
      screen.getByRole("list", { name: "새 비밀번호 규칙" }),
    );
    const met = () =>
      rules.getAllByRole("listitem").map((li) => li.getAttribute("data-met"));
    expect(
      rules.getAllByRole("listitem").map((li) => li.textContent),
    ).toStrictEqual([
      "숫자 4자리",
      "같은 숫자 반복·연속 숫자 안 됨",
      "두 칸이 같음",
    ]);
    expect(met()).toStrictEqual(["false", "false", "false"]);
    await user.type(screen.getByLabelText("새 비밀번호"), "1234");
    expect(met()).toStrictEqual(["true", "false", "false"]);
    await user.clear(screen.getByLabelText("새 비밀번호"));
    await fill(user, "", "7314", "7314");
    expect(met()).toStrictEqual(["true", "true", "true"]);
  });

  it("두 칸이 다르면 · 쉬운 번호면 보내지 않는다", async () => {
    const user = userEvent.setup();
    render(<StudentPasswordForm studentName="이서준" />);
    await fill(user, "5809", "7314", "7315");
    await user.click(screen.getByRole("button", { name: "바꾸고 들어가기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "두 칸이 같지 않습니다.",
    );
    await user.clear(screen.getByLabelText("새 비밀번호"));
    await user.clear(screen.getByLabelText("한 번 더"));
    await fill(user, "", "1111", "1111");
    await user.click(screen.getByRole("button", { name: "바꾸고 들어가기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        STUDENT_LOGIN_MESSAGES.easyPin,
      ),
    );
    expect(calls).toEqual([]);
  });

  it("바꾸면 목록으로 — 받은 번호와 새 번호를 보낸다", async () => {
    const user = userEvent.setup();
    override["POST /api/learn/password"] = {
      status: 200,
      body: { data: { mustChangePassword: false } },
    };
    render(<StudentPasswordForm studentName="이서준" />);
    await fill(user, "5809", "7314", "7314");
    await user.click(screen.getByRole("button", { name: "바꾸고 들어가기" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/learn"));
    expect(calls[0]?.body).toStrictEqual({
      currentPassword: "5809",
      newPassword: "7314",
    });
  });

  it("🔴 받은 번호가 틀리면 · 잠기면 서버 문구 그대로 (잠금이 이 칸에도 걸린다)", async () => {
    const user = userEvent.setup();
    render(<StudentPasswordForm studentName="이서준" />);
    await fill(user, "0001", "7314", "7314");
    override["POST /api/learn/password"] = {
      status: 401,
      body: {
        error: {
          code: "UNAUTHORIZED",
          message: STUDENT_LOGIN_MESSAGES.wrongCurrentPin,
        },
      },
    };
    await user.click(screen.getByRole("button", { name: "바꾸고 들어가기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      STUDENT_LOGIN_MESSAGES.wrongCurrentPin,
    );
    override["POST /api/learn/password"] = {
      status: 429,
      body: {
        error: {
          code: "TOO_MANY_ATTEMPTS",
          message: STUDENT_LOGIN_MESSAGES.locked,
        },
      },
    };
    await user.click(screen.getByRole("button", { name: "바꾸고 들어가기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        STUDENT_LOGIN_MESSAGES.locked,
      ),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("🔴 나가기 — 목록 윗줄과 같은 자리·같은 모양, 학생 로그아웃 API 를 부르고 학생 로그인으로 (D-127 Q1)", async () => {
    // 잘못 들어온 학생(받은 번호를 모른다)이 갇히지 않는다. 모양은 목록 화면의 윗줄과 견준다 — 같은 부품이어야 한다
    const shapeOf = () => {
      const bar = screen.getByRole("banner");
      return {
        bar: bar.className,
        brand: bar.firstElementChild?.textContent,
        leave: within(bar).getByRole("button", { name: "로그아웃" }).className,
      };
    };
    await renderList();
    const listShape = shapeOf();
    expect(listShape.bar).not.toBe("");
    cleanup();
    calls = [];

    const user = userEvent.setup();
    render(<StudentPasswordForm studentName="이서준" />);
    expect(shapeOf()).toStrictEqual(listShape);
    // 같은 자리 — 윗줄이 폼보다 앞(화면 맨 위)
    const bar = screen.getByRole("banner");
    expect(
      bar.compareDocumentPosition(
        screen.getByRole("form", { name: "비밀번호 바꾸기" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await user.click(within(bar).getByRole("button", { name: "로그아웃" }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/learn/login"),
    );
    expect(calls.map((c) => `${c.method} ${c.url}`)).toStrictEqual([
      "POST /api/learn/logout",
    ]);
  });

  it("🔴 «오늘 수학»은 윗줄 한 번뿐 — 큰 로고를 뺐다 (D-128 ⑴ · 원장님 답 17 ①)", () => {
    // D-127 로 윗줄(목록과 같은 부품)을 둔 뒤, 그 아래 로고가 같은 이름을 한 번 더 세우고 있었다
    render(<StudentPasswordForm studentName="이서준" />);
    expect(screen.getAllByText("오늘 수학")).toHaveLength(1);
    expect(
      within(screen.getByRole("banner")).getByText("오늘 수학"),
    ).toBeInTheDocument();
    expect(screen.queryByText("오늘의 개념 · 학생")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "새 비밀번호를 정하세요" }),
    ).toBeInTheDocument();
  });

  it("🔴 윗줄에 학생 이름 — 반은 이 화면이 모른다(목록 API 가 준다) (D-128 ⑵ · 원장님 답 18 ①)", () => {
    // 다른 학생 아이디로 잘못 들어온 학생이 윗줄 이름으로 바로 안다 — 그러면 «나가기»
    render(<StudentPasswordForm studentName="이서준" />);
    expect(screen.getByRole("banner").textContent).toBe(
      "오늘 수학이서준·로그아웃",
    );
    cleanup();
    render(<StudentPasswordForm studentName={null} />);
    expect(screen.getByRole("banner").textContent).toBe("오늘 수학로그아웃");
  });

  it("학생 세션이 없으면(받은 번호 탓이 아닌 401) 학생 로그인으로", async () => {
    const user = userEvent.setup();
    override["POST /api/learn/password"] = {
      status: 401,
      body: {
        error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
      },
    };
    render(<StudentPasswordForm studentName="이서준" />);
    await fill(user, "5809", "7314", "7314");
    await user.click(screen.getByRole("button", { name: "바꾸고 들어가기" }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/learn/login"),
    );
  });
});

// ── 목록 ──────────────────────────────────────────────────────────────────
/** 2026-09-15 (화) 오후 — 학원 날짜 9/15 */
const TODAY = new Date("2026-09-15T08:00:00.000Z");

async function renderList(opts: { now?: Date; set?: LearnHifiSet } = {}) {
  set = opts.set ?? "mockup";
  render(<LectureList now={opts.now ?? TODAY} />);
  await screen.findByRole("heading", { name: "강의 자료" });
  await waitFor(() =>
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument(),
  );
}
const daySections = () =>
  screen
    .getAllByRole("region")
    .filter((r) => /월 \d+일/.test(r.getAttribute("aria-label") ?? ""));

describe("🔴 ③ 목록 (/learn — 시안 sList) — 수업한 날로 묶는다", () => {
  it("윗줄 — 이름 · 반 · 나가기", async () => {
    await renderList();
    const top = screen.getByRole("banner");
    expect(top).toHaveTextContent("오늘 수학");
    expect(top).toHaveTextContent("김도윤 · 중1 A반");
    expect(
      within(top).getByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
  });

  it("🔴 오늘 수업 — 남색 판이 맨 앞, «9월 15일 (화)» + «오늘» (요일은 달력이 정한다)", async () => {
    await renderList();
    const all = daySections();
    expect(all.map((s) => s.getAttribute("aria-label"))).toStrictEqual([
      "9월 15일 (화) 오늘",
      "9월 12일 (토)",
      "9월 10일 (목)",
    ]);
    const today = within(all[0]!);
    expect(today.getByText("오늘")).toBeInTheDocument();
    expect(
      today.getByRole("heading", { name: "공약수와 최대공약수" }),
    ).toBeInTheDocument();
    expect(
      today.getByRole("link", { name: /공약수와 최대공약수, 그리고 서로소/ }),
    ).toHaveAttribute("href", `/learn/watch/${L.l5}`);
    expect(within(all[1]!).queryByText("오늘")).not.toBeInTheDocument();
  });

  it("🔴 KST 자정을 넘긴 새벽(UTC 로는 아직 9/15) — 9/15 수업은 «오늘»이 아니다", async () => {
    await renderList({ now: new Date("2026-09-15T16:00:00.000Z") });
    expect(daySections()[0]).toHaveAccessibleName("9월 15일 (화)");
    expect(screen.queryByText("오늘")).not.toBeInTheDocument();
  });

  it("🔴 어제 수업이면 날짜만 — «오늘» 표시가 어디에도 없다", async () => {
    await renderList({ now: new Date("2026-09-16T03:00:00.000Z") });
    expect(daySections()[0]).toHaveAccessibleName("9월 15일 (화)");
    expect(screen.queryByText("오늘")).not.toBeInTheDocument();
  });

  it("차시마다 게시 강의 · 상태 알약(새로 · 64% 봄 · 끝까지 봄) · 초안은 없다", async () => {
    await renderList();
    const links = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")?.startsWith("/learn/watch/"));
    const byTitle = (t: string) =>
      links.find((a) => a.textContent?.includes(t))!;
    expect(byTitle("공약수와 최대공약수, 그리고 서로소")).toHaveTextContent(
      "2:02 · 새로",
    );
    expect(byTitle("약수를 빠짐없이 세는 법")).toHaveTextContent(
      "2:07 · 64% 봄",
    );
    expect(byTitle("소수와 합성수")).toHaveTextContent("2:19 · 끝까지 봄");
    expect(screen.queryByText("최대공약수 구하기")).not.toBeInTheDocument();
    expect(screen.queryByText("공배수와 최소공배수")).not.toBeInTheDocument();
    expect(links).toHaveLength(5);
  });

  it("강의 칸 그림은 종이 판서 바탕에 제목 — 유튜브 썸네일을 끌어오지 않는다", async () => {
    await renderList();
    expect(document.querySelector("img")).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/ytimg|youtube/);
  });

  it("④ 학생 목록에 AI 고지가 없다", async () => {
    await renderList();
    expectNoAiNotice();
  });

  it("🔴 가장 큰 실데이터 — 지난 수업 20일치 · 강의 많은 날(6편) · 가장 긴 차시 이름 · 가장 긴 강의 제목이 다 선다", async () => {
    // 픽스처가 정말 계약 한계(200자)를 채웠나 — 처음엔 192자였다(실물 계측이 잡았다)
    expect(LEARN_HIFI_LONGEST_TITLE).toHaveLength(200);
    await renderList({ set: "stress" });
    const all = daySections();
    expect(all).toHaveLength(21);
    expect(within(all[0]!).getAllByRole("link")).toHaveLength(6);
    expect(
      within(all[0]!).getByRole("heading", {
        name: LEARN_HIFI_LONGEST_UNIT.section,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(LEARN_HIFI_LONGEST_TITLE, { selector: "b" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent(
      `남궁서연 · ${LEARN_HIFI_LONGEST_UNIT.grade} 심화 주말 특별반 (토 · 일 오전 9시)`,
    );
  });

  it("볼 강의가 없으면 한 줄", async () => {
    await renderList({ set: "empty" });
    expect(screen.getByText("아직 배정된 강의가 없어요")).toBeInTheDocument();
  });

  it("나가기 — 학생 로그아웃 API 를 부르고 학생 로그인으로", async () => {
    const user = userEvent.setup();
    await renderList();
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/learn/login"),
    );
    expect(
      calls.some((c) => c.method === "POST" && c.url === "/api/learn/logout"),
    ).toBe(true);
  });

  it("세션이 없으면(401) 학생 로그인으로", async () => {
    override["GET /api/learn/lectures"] = {
      status: 401,
      body: {
        error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
      },
    };
    render(<LectureList now={TODAY} />);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/learn/login"),
    );
  });

  it("첫 비밀번호를 안 바꿨으면(403) 바꾸기로", async () => {
    override["GET /api/learn/lectures"] = {
      status: 403,
      body: {
        error: {
          code: "FORBIDDEN",
          message: "비밀번호를 바꾼 뒤 이용할 수 있습니다.",
        },
      },
    };
    render(<LectureList now={TODAY} />);
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/learn/password"),
    );
  });
});

// ── 재생 ──────────────────────────────────────────────────────────────────
interface Fake {
  create: CreatePlayer;
  seekTo: number[];
  rates: number[];
  created: number;
  time: number;
  emit: (e: PlayerEvent) => void;
}

function fakePlayer(opts: { fail?: boolean } = {}): Fake {
  const fake: Fake = {
    seekTo: [],
    rates: [],
    created: 0,
    time: 0,
    emit: () => {},
    create: async ({ start, onEvent }) => {
      fake.created += 1;
      if (opts.fail) throw new Error("학교 망 차단");
      fake.time = start;
      fake.emit = onEvent;
      return {
        play: () => onEvent("playing"),
        pause: () => onEvent("paused"),
        seekTo: (s) => {
          fake.seekTo.push(s);
          fake.time = s;
        },
        currentTime: () => fake.time,
        duration: () => 0,
        setRate: (r) => fake.rates.push(r),
        destroy: () => {},
      };
    },
  };
  return fake;
}

function Wrap({ fake, children }: { fake: Fake; children: ReactNode }) {
  return (
    <PlayerFactoryContext.Provider value={fake.create}>
      {children}
    </PlayerFactoryContext.Provider>
  );
}

async function renderWatch(id: string, fake = fakePlayer()) {
  render(
    <Wrap fake={fake}>
      <WatchScreen lectureId={id} />
    </Wrap>,
  );
  const slider = await screen.findByRole("slider", { name: "재생 위치" });
  await waitFor(() => expect(slider).toBeEnabled());
  return { fake, slider };
}

/** 1배속 감시 틱(250ms)마다 1.5초씩 — 가드가 «저절로 흐름»으로 받는 걸음(여유 1.5초 + 0.25초) */
function playTo(fake: Fake, to: number) {
  while (fake.time < to) {
    fake.time = Math.min(to, fake.time + 1.5);
    act(() => vi.advanceTimersByTime(250));
  }
}

const watchPosts = () => calls.filter((c) => c.url === "/api/learn/watch");

describe("재생 (/learn/watch/<id> — 시안 sPlay)", () => {
  it("‹ 목록 · 제목 · 차시 · 길이 · 상태 · 감기 안내 · 다음 영상", async () => {
    await renderWatch(L.l4);
    expect(screen.getByRole("link", { name: "‹ 목록" })).toHaveAttribute(
      "href",
      "/learn/lectures",
    );
    expect(
      screen.getByText("약수를 빠짐없이 세는 법", { selector: "h1" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/소인수분해 · 2:07 ·/)).toHaveTextContent(
      "소인수분해 · 2:07 · 64% 봄",
    );
    expect(
      screen.getByText(
        "앞으로 감기는 본 곳(1:21)까지만 됩니다. 뒤로 감기와 배속은 됩니다.",
      ),
    ).toBeInTheDocument();
    const next = screen.getByRole("link", { name: /다음 영상/ });
    expect(next).toHaveTextContent("공약수와 최대공약수, 그리고 서로소");
    expect(next).toHaveAttribute("href", `/learn/watch/${L.l5}`);
    expect(screen.getByRole("banner")).toHaveTextContent("김도윤 · 중1 A반");
    expectNoAiNotice();
  });

  it("안내 문구 — 처음 보는 영상 (마지막 영상은 다음 영상이 없다)", async () => {
    await renderWatch(L.l5);
    expect(
      screen.getByText("처음부터 봅니다. 앞으로 감기는 본 곳까지만 됩니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText("다음 영상")).not.toBeInTheDocument();
  });

  it("안내 문구 — 끝까지 본 영상", async () => {
    await renderWatch(L.l1);
    expect(
      screen.getByText(
        "끝까지 본 영상입니다 — 어느 곳이든 다시 볼 수 있습니다.",
      ),
    ).toBeInTheDocument();
  });

  it("🔴 ① 막대로 안 본 곳을 누르면 본 곳까지만 · 본 곳 ±1초 · 뒤로는 그대로", async () => {
    const { fake, slider } = await renderWatch(L.l4);
    fireEvent.change(slider, { target: { value: "120" } });
    expect(fake.seekTo.at(-1)).toBe(81);
    fireEvent.change(slider, { target: { value: "82" } });
    expect(fake.seekTo.at(-1)).toBe(81);
    fireEvent.change(slider, { target: { value: "80" } });
    expect(fake.seekTo.at(-1)).toBe(80);
    fireEvent.change(slider, { target: { value: "5" } });
    expect(fake.seekTo.at(-1)).toBe(5);
  });

  it("🔴 ① 한 번 끝까지 본 영상은 어디든", async () => {
    const { fake, slider } = await renderWatch(L.l1);
    fireEvent.change(slider, { target: { value: "120" } });
    expect(fake.seekTo.at(-1)).toBe(120);
  });

  it("🔴 ① 배속 — 단추로 1 → 1.25 → 1.5 → 2. 2배속이면 한 틱에 1.9초는 흐른 것, 1배속이면 감은 것", async () => {
    const { fake } = await renderWatch(L.l4);
    const user = userEvent.setup();
    const rate = screen.getByRole("button", { name: /재생 속도/ });
    await user.click(rate);
    await user.click(rate);
    await user.click(rate);
    expect(fake.rates).toStrictEqual([1.25, 1.5, 2]);
    expect(rate).toHaveTextContent("2×");
    vi.useFakeTimers();
    act(() => fake.emit("playing"));
    fake.time = 82.9;
    act(() => vi.advanceTimersByTime(250));
    expect(fake.seekTo).toStrictEqual([]);
    fireEvent.click(rate);
    expect(fake.rates.at(-1)).toBe(1);
    fake.time = 84.8;
    act(() => vi.advanceTimersByTime(250));
    expect(fake.seekTo.at(-1)).toBe(82.9);
    // 한 틱에 30초 — 감은 것이다
    fake.time = 113;
    act(() => vi.advanceTimersByTime(250));
    expect(fake.seekTo.at(-1)).toBe(82.9);
  });

  it("시청 보고 — 재생 중 15초마다 · 멈춤 · 창 가림(keepalive) · 끝. 상태는 서버가 센 값으로 바뀐다", async () => {
    const { fake } = await renderWatch(L.l5);
    vi.useFakeTimers();
    act(() => fake.emit("playing"));
    playTo(fake, 90); // 벽시계 15초
    await act(async () => {});
    expect(watchPosts().length).toBeGreaterThanOrEqual(1);
    expect(watchPosts()[0]!.body).toMatchObject({ lectureId: L.l5 });

    playTo(fake, 91.5);
    const beforePause = watchPosts().length;
    act(() => fake.emit("paused"));
    await act(async () => {});
    expect(watchPosts().length).toBe(beforePause + 1);
    expect(watchPosts().at(-1)!.body).toMatchObject({ seconds: 91.5 });

    act(() => fake.emit("playing"));
    playTo(fake, 93);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {});
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    expect(watchPosts().at(-1)!.keepalive).toBe(true);
    expect(watchPosts().at(-1)!.body).toMatchObject({ seconds: 93 });

    playTo(fake, 122);
    act(() => fake.emit("ended"));
    await act(async () => {});
    expect(watchPosts().at(-1)!.body).toMatchObject({ seconds: 122 });
    expect(screen.getByText("50% 봄")).toBeInTheDocument();
  });

  it("보고가 실패해도 학생 화면에 오류를 띄우지 않는다 — 다음 보고가 다시 보낸다", async () => {
    override["POST /api/learn/watch"] = {
      status: 500,
      body: { error: { code: "INTERNAL", message: "x" } },
    };
    const { fake } = await renderWatch(L.l5);
    vi.useFakeTimers();
    act(() => fake.emit("playing"));
    playTo(fake, 1.5);
    act(() => fake.emit("paused"));
    await act(async () => {});
    expect(watchPosts()).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    delete override["POST /api/learn/watch"];
    act(() => fake.emit("paused"));
    await act(async () => {});
    expect(watchPosts()).toHaveLength(2);
    expect(watchPosts()[1]!.body).toMatchObject({ seconds: 1.5 });
  });

  it("영상을 못 불러오면 한 줄 + 다시 시도", async () => {
    const fake = fakePlayer({ fail: true });
    render(
      <Wrap fake={fake}>
        <WatchScreen lectureId={L.l4} />
      </Wrap>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "영상을 불러오지 못했습니다.",
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(fake.created).toBe(2));
  });

  it("안 열린 강의 · 없는 강의는 한 줄과 목록 길", async () => {
    render(
      <Wrap fake={fakePlayer()}>
        <WatchScreen lectureId={L.l6} />
      </Wrap>,
    );
    expect(
      await screen.findByText("볼 수 없는 강의입니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "‹ 목록" })).toHaveAttribute(
      "href",
      "/learn/lectures",
    );
  });

  it("가장 긴 강의 제목도 전부 나온다", async () => {
    set = "stress";
    const id = learnHifiList("stress").lectures.find(
      (l) => l.title === LEARN_HIFI_LONGEST_TITLE,
    )!.id;
    await renderWatch(id);
    expect(
      screen.getByText(LEARN_HIFI_LONGEST_TITLE, { selector: "h1" }),
    ).toBeInTheDocument();
  });
});
