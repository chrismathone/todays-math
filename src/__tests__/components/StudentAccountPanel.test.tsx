/**
 * 원장님 «수업 · 학생 관리 › 학생» 안의 **학생 계정 발급 칸** — 시안 1안 `issue()`(05 §8.9 · D-125 ⑴) ·
 * learn-screens 브리프 §1.3 · §3 ②⑤.
 *
 *   발급 전 — 아이디 칸(비어서 시작 · 자동 제안 없음, D-125 ⑵) + «계정 생성»
 *   만든 직후 — 아이디 · 발급 날짜 · 발급한 사람 · 마지막 로그인 · 초기 비밀번호(지금 한 번만) · 다시 발급 · 계정 끄기
 *   끈 계정 — «계정 켜기»(시안에 없는 상태 — 최소한으로) · 퇴원 학생 — «퇴원 — 로그인 막힘» 한 줄
 *   남의 반 학생 — 서버가 403 → 칸을 안 그린다
 *
 * 🔴 ② 초기 비밀번호는 **응답을 받은 그 화면에만** — localStorage · sessionStorage · URL · 콘솔 어디에도 안 남고,
 *    화면을 벗어나면(다른 학생을 고르면) 사라진다.
 */
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudentList } from "@/components/class/StudentList";
import type { StudentAccountStatus } from "@/contracts/studentAccount.contract";
import { MOCK_CLASS_A, MOCK_STUDENTS_BY_CLASS } from "@/mocks/data";

const STUDENTS = MOCK_STUDENTS_BY_CLASS[MOCK_CLASS_A.id]!;
const [SEO, KIM] = STUDENTS as [
  (typeof STUDENTS)[number],
  (typeof STUDENTS)[number],
];
const PIN = "7392";
const PIN2 = "4816";
const ISSUED_AT = "2026-09-15T01:00:00.000Z";

type Call = { method: string; url: string; body: unknown };
let calls: Call[] = [];
/** 학생 id → GET 이 돌려줄 발급 칸 */
let panels: Record<string, { status: number; body: unknown }> = {};
let writes: Record<string, { status: number; body: unknown }> = {};
const logs: string[] = [];

const status = (
  over: Partial<StudentAccountStatus> = {},
): StudentAccountStatus => ({
  studentId: SEO.id,
  loginId: "m1a-01",
  issuedAt: ISSUED_AT,
  issuedByViewer: true,
  lastLoginAt: null,
  passwordChangedAt: null,
  disabledAt: null,
  mustChangePassword: true,
  locked: false,
  lockedUntil: null,
  ...over,
});
const panel = (account: StudentAccountStatus | null, withdrawn = false) => ({
  status: 200,
  body: { data: { withdrawn, account } },
});

function json(body: unknown, code = 200) {
  return new Response(JSON.stringify(body), {
    status: code,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  calls = [];
  logs.length = 0;
  panels = {
    [SEO.id]: panel(null),
    [KIM.id]: panel(status({ studentId: KIM.id, loginId: "m1a-02" })),
  };
  writes = {};
  localStorage.clear();
  sessionStorage.clear();
  for (const level of ["log", "info", "warn", "error", "debug"] as const)
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map((a) => String(a)).join(" "));
    });
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      // Account-flow assertions track account calls; learning-menu behavior has its own suite.
      if (url.endsWith("/learning-menus"))
        return json({
          data: { enabled: [], canManage: true, updatedAt: null },
        });
      calls.push({
        method,
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      const m = /^\/api\/students\/([^/]+)\/account(\/password)?$/.exec(url);
      if (!m)
        return json({ error: { code: "NOT_FOUND", message: "없음" } }, 404);
      const reply =
        method === "GET" ? panels[m[1]!] : writes[`${method} ${url}`];
      return reply
        ? json(reply.body, reply.status)
        : json({ error: { code: "NOT_FOUND", message: "없음" } }, 404);
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderList() {
  const user = userEvent.setup();
  render(
    <StudentList
      students={STUDENTS}
      selectedClass={MOCK_CLASS_A}
      status="ready"
      onRetry={() => {}}
      canManageAccounts
    />,
  );
  return user;
}
const card = () =>
  within(screen.getByRole("region", { name: /오늘의 개념 로그인/ }));
async function open(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name }));
}

describe("학생 이름을 누르면 그 학생의 발급 칸이 선다 — 한 명씩 (D-124 ⑷)", () => {
  it("계정 칸 닫기 버튼은 칸을 닫고 학생 이름으로 초점을 돌린다", async () => {
    const user = renderList();
    await open(user, SEO.name);
    await screen.findByRole("button", { name: "계정 생성" });
    await user.click(
      screen.getByRole("button", { name: `${SEO.name} 계정 정보 닫기` }),
    );
    expect(
      screen.queryByRole("region", { name: /오늘의 개념 로그인/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: SEO.name })).toHaveFocus();
    expect(screen.getByRole("button", { name: SEO.name })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("처음에는 칸이 없고 요청도 없다 · 이름을 누르면 그 학생 것만", async () => {
    const user = renderList();
    expect(
      screen.queryByRole("region", { name: /오늘의 개념 로그인/ }),
    ).not.toBeInTheDocument();
    expect(calls).toEqual([]);
    await open(user, SEO.name);
    expect(screen.getByRole("button", { name: SEO.name })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() =>
      expect(calls.map((c) => `${c.method} ${c.url}`)).toStrictEqual([
        `GET /api/students/${SEO.id}/account`,
      ]),
    );
  });
});

describe("🔴 ⑤ 발급 칸 두 상태 (시안 issue())", () => {
  it("발급 전 — 아이디 칸은 비어서 시작(자동 제안 없음) · 형식 안내 한 줄 · «계정 생성»", async () => {
    const user = renderList();
    await open(user, SEO.name);
    await screen.findByRole("button", { name: "계정 생성" });
    expect(card().getByText("오늘의 개념 로그인")).toBeInTheDocument();
    expect(
      card().getByText(
        "아직 로그인 계정이 없습니다. 계정을 생성하면 학생이 로그인할 수 있습니다.",
      ),
    ).toBeInTheDocument();
    expect(card().getByLabelText("아이디")).toHaveValue(SEO.name);
    expect(
      card().getByText("이름·영문·숫자·공백·-·_ 1~50자"),
    ).toBeInTheDocument();
  });

  it("만든 직후 — 아이디 · 발급 날짜 · 발급한 사람 · 마지막 로그인 · 초기 비밀번호(지금 한 번만) · 다시 발급 · 끄기", async () => {
    writes[`POST /api/students/${SEO.id}/account`] = {
      status: 201,
      body: {
        data: {
          studentId: SEO.id,
          loginId: "m1a-01",
          initialPassword: PIN,
          mustChangePassword: true,
          issuedAt: ISSUED_AT,
        },
      },
    };
    const user = renderList();
    await open(user, SEO.name);
    await user.clear(await card().findByLabelText("아이디"));
    await user.type(card().getByLabelText("아이디"), "m1a-01");
    await user.click(card().getByRole("button", { name: "계정 생성" }));
    await card().findByText("초기 비밀번호 — 지금 한 번만 보입니다");
    expect(calls.find((c) => c.method === "POST")?.body).toStrictEqual({
      loginId: "m1a-01",
    });
    expect(card().getByText("m1a-01")).toBeInTheDocument();
    expect(card().getByText("9월 15일 · 원장님")).toBeInTheDocument();
    expect(card().getByText("없음")).toBeInTheDocument();
    expect(card().getByText(PIN)).toBeInTheDocument();
    expect(
      card().getByText(
        "저장하지 않아 다시 볼 수 없습니다. 학생에게 전하면 첫 로그인에서 새 비밀번호로 바꿉니다.",
      ),
    ).toBeInTheDocument();
    expect(
      card().getByRole("button", { name: "비밀번호 다시 발급" }),
    ).toBeInTheDocument();
    expect(
      card().getByRole("button", { name: "계정 끄기" }),
    ).toBeInTheDocument();
  });

  it("비밀번호 다시 발급 — 새 번호가 그 자리에 한 번 더", async () => {
    panels[SEO.id] = panel(status({ mustChangePassword: false }));
    writes[`POST /api/students/${SEO.id}/account/password`] = {
      status: 200,
      body: {
        data: {
          studentId: SEO.id,
          loginId: "m1a-01",
          initialPassword: PIN2,
          mustChangePassword: true,
          issuedAt: ISSUED_AT,
        },
      },
    };
    const user = renderList();
    await open(user, SEO.name);
    await user.click(
      await card().findByRole("button", { name: "비밀번호 다시 발급" }),
    );
    expect(await card().findByText(PIN2)).toBeInTheDocument();
  });

  it("겹치는 아이디는 서버 문구 그대로 · 형식이 틀리면 보내지 않는다", async () => {
    writes[`POST /api/students/${SEO.id}/account`] = {
      status: 409,
      body: { error: { code: "CONFLICT", message: "이미 쓰는 아이디입니다." } },
    };
    const user = renderList();
    await open(user, SEO.name);
    const id = await card().findByLabelText("아이디");
    await user.clear(id);
    await user.type(id, "ab");
    await user.click(card().getByRole("button", { name: "계정 생성" }));
    expect(await card().findByRole("alert")).toHaveTextContent(/아이디는/);
    expect(calls.filter((c) => c.method === "POST")).toEqual([]);
    await user.clear(id);
    await user.type(id, "m1a-02");
    await user.click(card().getByRole("button", { name: "계정 생성" }));
    await waitFor(() =>
      expect(card().getByRole("alert")).toHaveTextContent(
        "이미 쓰는 아이디입니다.",
      ),
    );
  });
});

describe("🔴 ② 초기 비밀번호는 그 화면에만 — 저장소 · URL · 콘솔에 안 남는다", () => {
  it("발급한 뒤 모든 자리를 뒤지고, 다른 학생을 골랐다 돌아오면 사라져 있다", async () => {
    writes[`POST /api/students/${SEO.id}/account`] = {
      status: 201,
      body: {
        data: {
          studentId: SEO.id,
          loginId: "m1a-01",
          initialPassword: PIN,
          mustChangePassword: true,
          issuedAt: ISSUED_AT,
        },
      },
    };
    const user = renderList();
    await open(user, SEO.name);
    await user.clear(await card().findByLabelText("아이디"));
    await user.type(card().getByLabelText("아이디"), "m1a-01");
    await user.click(card().getByRole("button", { name: "계정 생성" }));
    // 흔적을 찾을 자리가 **실제로 채워져 있었다** — 번호가 화면에는 있다
    expect(await card().findByText(PIN)).toBeInTheDocument();
    const storage = [localStorage, sessionStorage].flatMap((st) =>
      Object.keys(st).map((k) => `${k}=${st.getItem(k)}`),
    );
    expect(storage.join("\n")).not.toContain(PIN);
    expect(window.location.href).not.toContain(PIN);
    expect(
      window.history.state === null ? "" : JSON.stringify(window.history.state),
    ).not.toContain(PIN);
    expect(logs.join("\n")).not.toContain(PIN);

    panels[SEO.id] = panel(status());
    await open(user, KIM.name);
    await card().findByText("m1a-02");
    await open(user, SEO.name);
    await card().findByText("m1a-01");
    expect(screen.queryByText(PIN)).not.toBeInTheDocument();
    expect(
      screen.queryByText("초기 비밀번호 — 지금 한 번만 보입니다"),
    ).not.toBeInTheDocument();
  });
});

describe("🔴 ⑤ 끈 계정 · 퇴원 학생 · 남의 반 학생", () => {
  it("끈 계정 — «계정 꺼짐 — 로그인 막힘» · «계정 켜기»(끄기 대신)", async () => {
    panels[SEO.id] = panel(status({ disabledAt: "2026-09-15T02:00:00.000Z" }));
    writes[`PATCH /api/students/${SEO.id}/account`] = {
      status: 200,
      body: { data: status() },
    };
    const user = renderList();
    await open(user, SEO.name);
    await card().findByText("계정 꺼짐 — 로그인 막힘");
    expect(
      card().queryByRole("button", { name: "계정 끄기" }),
    ).not.toBeInTheDocument();
    await user.click(card().getByRole("button", { name: "계정 켜기" }));
    await card().findByRole("button", { name: "계정 끄기" });
    expect(calls.find((c) => c.method === "PATCH")?.body).toStrictEqual({
      disabled: false,
    });
    expect(
      card().queryByText("계정 꺼짐 — 로그인 막힘"),
    ).not.toBeInTheDocument();
  });

  it("계정 끄기 → 끈 상태로", async () => {
    panels[SEO.id] = panel(status());
    writes[`PATCH /api/students/${SEO.id}/account`] = {
      status: 200,
      body: { data: status({ disabledAt: "2026-09-15T02:00:00.000Z" }) },
    };
    const user = renderList();
    await open(user, SEO.name);
    await user.click(await card().findByRole("button", { name: "계정 끄기" }));
    await card().findByText("계정 꺼짐 — 로그인 막힘");
    expect(calls.find((c) => c.method === "PATCH")?.body).toStrictEqual({
      disabled: true,
    });
  });

  it("🔴 퇴원 학생 — «퇴원 — 로그인 막힘» 한 줄, 발급 칸이 안 선다", async () => {
    panels[SEO.id] = panel(null, true);
    const user = renderList();
    await open(user, SEO.name);
    await card().findByText("퇴원 — 로그인 막힘");
    expect(
      card().queryByRole("button", { name: "계정 생성" }),
    ).not.toBeInTheDocument();
    expect(card().queryByLabelText("아이디")).not.toBeInTheDocument();
  });

  it("퇴원 학생의 계정 — 아이디는 보이고 한 줄이 선다, 다시 발급·끄기가 없다", async () => {
    panels[SEO.id] = panel(status(), true);
    const user = renderList();
    await open(user, SEO.name);
    await card().findByText("퇴원 — 로그인 막힘");
    expect(card().getByText("m1a-01")).toBeInTheDocument();
    expect(
      card().getByRole("button", { name: `${SEO.name} 계정 정보 닫기` }),
    ).toBeInTheDocument();
    expect(
      card().queryByRole("button", { name: "비밀번호 다시 발급" }),
    ).not.toBeInTheDocument();
    expect(
      card().queryByRole("button", { name: "계정 끄기" }),
    ).not.toBeInTheDocument();
  });

  it("🔴 남의 반 학생(서버 403) — 칸을 안 그린다", async () => {
    panels[SEO.id] = {
      status: 403,
      body: { error: { code: "FORBIDDEN", message: "권한이 없습니다." } },
    };
    const user = renderList();
    await open(user, SEO.name);
    await waitFor(() => expect(calls).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(
      screen.queryByRole("region", { name: /오늘의 개념 로그인/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "계정 생성" }),
    ).not.toBeInTheDocument();
  });
});

describe("🔴 잠김 한 줄 — «잠김 — N분 뒤 풀림» (D-127 Q5)", () => {
  /**
   * 서버가 준 `lockedUntil` 이 **지금보다 뒤일 때만**(서버의 `locked` 표지가 아니다 — 응답이 온 뒤 잠금이 끝났을 수 있다).
   * 시계는 `Date` 만 멈춘다 — 입력 흉내·waitFor 가 쓰는 타이머는 진짜다.
   */
  const NOW = new Date("2026-09-15T05:00:00.000Z");
  const until = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
  const line = (n: number) =>
    `잠김 — ${n}분 뒤 풀림 · 비밀번호를 다시 발급하면 바로 풀립니다.`;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("잠금 끝 1초 전 — «1분»(올림) · 막 잠긴 계정은 «10분»", async () => {
    panels[SEO.id] = panel(status({ locked: true, lockedUntil: until(1_000) }));
    panels[KIM.id] = panel(
      status({
        studentId: KIM.id,
        loginId: "m1a-02",
        locked: true,
        lockedUntil: until(10 * 60_000),
      }),
    );
    const user = renderList();
    await open(user, SEO.name);
    expect(await card().findByText(line(1))).toBeInTheDocument();
    await open(user, KIM.name);
    expect(await card().findByText(line(10))).toBeInTheDocument();
  });

  it("🔴 끝난 잠금은 줄이 없다 — 서버 표지(locked)가 아니라 «lockedUntil 이 지금보다 뒤인가»만 본다", async () => {
    panels[SEO.id] = panel(status({ locked: true, lockedUntil: until(0) }));
    const user = renderList();
    await open(user, SEO.name);
    await card().findByText("m1a-01");
    expect(card().queryByText(/잠김/)).not.toBeInTheDocument();
  });

  it("🔴 다시 발급하면 줄이 사라진다 — 다시 발급이 잠금을 푼다", async () => {
    panels[SEO.id] = panel(
      status({
        mustChangePassword: false,
        locked: true,
        lockedUntil: until(5 * 60_000),
      }),
    );
    writes[`POST /api/students/${SEO.id}/account/password`] = {
      status: 200,
      body: {
        data: {
          studentId: SEO.id,
          loginId: "m1a-01",
          initialPassword: PIN2,
          mustChangePassword: true,
          issuedAt: ISSUED_AT,
        },
      },
    };
    const user = renderList();
    await open(user, SEO.name);
    await card().findByText(line(5));
    await user.click(
      card().getByRole("button", { name: "비밀번호 다시 발급" }),
    );
    await card().findByText(PIN2);
    expect(card().queryByText(/잠김/)).not.toBeInTheDocument();
  });

  it("끈 계정 · 퇴원 계정에는 안 보인다 — 그쪽 줄이 먼저", async () => {
    panels[SEO.id] = panel(
      status({
        disabledAt: "2026-09-15T02:00:00.000Z",
        locked: true,
        lockedUntil: until(5 * 60_000),
      }),
    );
    panels[KIM.id] = panel(
      status({
        studentId: KIM.id,
        loginId: "m1a-02",
        locked: true,
        lockedUntil: until(5 * 60_000),
      }),
      true,
    );
    const user = renderList();
    await open(user, SEO.name);
    await card().findByText("계정 꺼짐 — 로그인 막힘");
    expect(card().queryByText(/잠김/)).not.toBeInTheDocument();
    await open(user, KIM.name);
    await card().findByText("퇴원 — 로그인 막힘");
    expect(card().queryByText(/잠김/)).not.toBeInTheDocument();
  });

  it("🔴 칸을 열어 둔 채 시간이 가면 N 이 줄고, 잠금이 끝나면 줄이 사라진다 (D-128 ⑶ — 리드)", async () => {
    // 이 시험만 타이머도 멈춘다 — 줄이 N 이 바뀌는 순간에 다시 세는지 본다. 입력 흉내 · findBy 가 돌도록
    // 시계는 흐르게 둔다(shouldAdvanceTime). 이미 Date 만 멈춘 채면 설정이 안 바뀌어 먼저 푼다.
    vi.useRealTimers();
    vi.useFakeTimers({
      toFake: ["Date", "setTimeout", "clearTimeout"],
      shouldAdvanceTime: true,
    });
    vi.setSystemTime(NOW);
    // 한 번에 몇 분을 넘기면 React 가 그 사이에 다시 그리지 않는다 — 실제처럼 N 이 바뀌는 순간마다 끊어 넘긴다
    const pass = (ms: number) =>
      act(async () => {
        vi.advanceTimersByTime(ms);
      });
    panels[SEO.id] = panel(
      status({ locked: true, lockedUntil: until(5 * 60_000 + 30_000) }),
    );
    const user = renderList();
    await open(user, SEO.name);
    expect(await card().findByText(line(6))).toBeInTheDocument();
    await pass(30_000);
    expect(card().getByText(line(5))).toBeInTheDocument();
    for (const n of [4, 3, 2, 1]) {
      await pass(60_000);
      expect(card().getByText(line(n))).toBeInTheDocument();
    }
    await pass(60_000);
    expect(card().queryByText(/잠김/)).not.toBeInTheDocument();
  });
});
