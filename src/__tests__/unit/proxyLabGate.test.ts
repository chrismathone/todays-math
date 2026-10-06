/**
 * 수학 랩실(`/lab`) 관문 — src/proxy.ts.
 *
 * 원장님 결정(2026-09-21): `/lab` 은 **로그인 없이** 연다(GET·HEAD). 랩실은 서버·DB 를 부르지 않고
 * 진도는 브라우저(localStorage)에만 있다. 모형 파일(`public/lab/**` → `/lab/...`)도 같은 길로 받는다.
 * 같은 날 두 번째 결정(D-135 ⑼ «추천대로 가»): **로그인한 사람도** 연다 — 원장 · 선생님 · 검수 · 승인 대기 ·
 * 학생 세션. 전에는 검수는 `/review`, 승인 대기는 `/approval-pending`, 학생은 `/learn` 으로 보내졌고
 * 원장이 열면 요청마다 감사 기록(DB 쓰기)이 남았다. 이제 관문 맨 앞에서 보내 감사 기록도 없다.
 *
 * 🔴 여기서 더 중요한 쪽은 **「안 열리는가」**다. 처음 들어온 판은 `pathname.startsWith("/lab")` 여서
 *    `/label` · `/labx` · `/laboratory` 처럼 `/lab` 밖의 경로까지 로그인 없이 열었다(병합 검사에서 발견 —
 *    로그인 안 한 창의 `/labx` 가 로그인으로 안 가고 404 를 냈다). 지금은 그런 화면이 없지만,
 *    나중에 `/labels` 같은 원장 화면이 생기면 **만든 사람이 모르게 공개**된다.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (request: NextRequest) =>
    handler(Object.assign(request, { auth: session() })),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { recordAudit } from "@/lib/audit";
import { proxy } from "@/proxy";

import { labFileAddresses } from "../helpers/labAddresses";

async function run(method: string, path: string): Promise<Response> {
  const call = proxy as unknown as (r: NextRequest) => Promise<Response>;
  return await call(new NextRequest(`http://localhost${path}`, { method }));
}

function toLogin(res: Response): boolean {
  const location = res.headers.get("location");
  return (
    res.status === 307 &&
    location !== null &&
    new URL(location).pathname === "/login"
  );
}

beforeEach(() => {
  session.mockReset();
  session.mockReturnValue(null);
  vi.mocked(recordAudit).mockClear();
});

describe("로그인 안 한 사람의 /lab", () => {
  const OPEN = [
    "/lab",
    "/lab/",
    "/lab/play/area",
    "/lab/teacher",
    "/lab/blender/cube-net-fold.glb",
  ];

  it.each(OPEN)("GET %s 는 로그인 없이 지나간다", async (path) => {
    const res = await run("GET", path);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(OPEN)("HEAD %s 도 지나간다", async (path) => {
    const res = await run("HEAD", path);
    expect(res.headers.get("location")).toBeNull();
  });

  it.each(["/label", "/labels", "/labx", "/laboratory", "/lab-notes"])(
    "🔴 GET %s 는 /lab 이 아니다 — 로그인으로 보낸다",
    async (path) => {
      expect(toLogin(await run("GET", path))).toBe(true);
    },
  );

  it.each(["POST", "PUT", "DELETE"])(
    "🔴 %s /lab 은 열지 않는다 — 여는 것은 읽기뿐이다",
    async (method) => {
      expect(toLogin(await run(method, "/lab"))).toBe(true);
    },
  );
});

const STUDENT_ID = "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70";
const studentSession = (mustChangePassword: boolean) => ({
  student: {
    accountId: STUDENT_ID,
    studentId: STUDENT_ID,
    name: "이서준",
    mustChangePassword,
  },
  expires: "2099-01-01T00:00:00.000Z",
});
const account = (user: Record<string, unknown>) => ({
  user: { approvalStatus: "approved", ...user },
});

/**
 * 누가 오든 — 세션 모양은 proxyRoleGate·proxyStudentGate 가 싣는 그 모양이다.
 * 선생님은 관리자가 아닌 원장 역할 계정(메뉴 일부 — D-130 의 «역할 계정»).
 */
const IDENTITIES = [
  ["로그인 안 함", null],
  [
    "원장",
    account({ id: "u-director", isAdmin: true, menus: ALL_WORKSPACE_MENUS }),
  ],
  [
    "선생님",
    account({ id: "u-teacher", role: "director", menus: ["studio", "export"] }),
  ],
  [
    "검수",
    account({ id: "u-reviewer", role: "reviewer", menus: ALL_WORKSPACE_MENUS }),
  ],
  [
    "승인 대기",
    account({ id: "u-pending", approvalStatus: "pending", menus: [] }),
  ],
  ["학생", studentSession(false)],
  ["첫 로그인 학생", studentSession(true)],
] as const;

/** 응답을 한 낱말로 — 지나감 · 어디로 되돌림 · 403. */
function outcome(res: Response): string {
  const location = res.headers.get("location");
  if (location) return `→ ${new URL(location).pathname}`;
  if (res.status === 403) return "403";
  return res.headers.get("x-middleware-next") === "1"
    ? "통과"
    : `${res.status}`;
}

describe("🔴 로그인한 사람도 /lab 을 연다 (D-135 ⑼ — 원장님 2026-09-21 «추천대로 가»)", () => {
  const READ = ["/lab", "/lab/teacher", "/lab/play/x"];

  it.each(IDENTITIES)(
    "%s — GET·HEAD /lab · /lab/teacher · /lab/play/x 가 지나가고 감사 기록이 없다",
    async (_, identity) => {
      session.mockReturnValue(identity);
      for (const path of READ)
        for (const method of ["GET", "HEAD"]) {
          const res = await run(method, path);
          expect(outcome(res), `${method} ${path}`).toBe("통과");
        }
      // 랩실은 운영 데이터를 안 본다 — 원장이 오래 열어 둬도 감사 표가 늘지 않는다.
      expect(recordAudit).not.toHaveBeenCalled();
    },
  );

  /**
   * 🔴 여는 것은 `/lab` 과 그 아래 **읽기뿐**이다. 쓰기와 `/lab` 밖은 바꾸기 전 규칙 그대로 —
   * 기대값은 바꾸기 전 관문에서도 초록이다(그 판에 돌려 확인). 학생 세션이 `/lab` 밖에서 얻는 것은
   * 하나도 늘지 않는다(학생 전수는 proxyStudentGate.test.ts 가 집합째 견준다).
   */
  const BEFORE: Record<
    (typeof IDENTITIES)[number][0],
    { "POST /lab": string; "GET /labx": string; audit: boolean }
  > = {
    "로그인 안 함": {
      "POST /lab": "→ /login",
      "GET /labx": "→ /login",
      audit: false,
    },
    원장: { "POST /lab": "통과", "GET /labx": "통과", audit: true },
    선생님: { "POST /lab": "통과", "GET /labx": "통과", audit: true },
    검수: { "POST /lab": "→ /review", "GET /labx": "→ /review", audit: true },
    "승인 대기": {
      "POST /lab": "→ /approval-pending",
      "GET /labx": "→ /approval-pending",
      audit: true,
    },
    학생: { "POST /lab": "403", "GET /labx": "→ /learn", audit: false },
    "첫 로그인 학생": {
      "POST /lab": "403",
      "GET /labx": "→ /learn/password",
      audit: false,
    },
  };

  it.each(IDENTITIES)(
    "%s — POST /lab 과 GET /labx 는 지금 규칙 그대로",
    async (name, identity) => {
      session.mockReturnValue(identity);
      const got = {
        "POST /lab": outcome(await run("POST", "/lab")),
        "GET /labx": outcome(await run("GET", "/labx")),
        audit: vi.mocked(recordAudit).mock.calls.length > 0,
      };
      expect(got).toStrictEqual(BEFORE[name]);
    },
  );

  it.each(IDENTITIES)(
    "%s — PUT·DELETE /lab/teacher 도 /lab 판정을 안 탄다",
    async (_, identity) => {
      session.mockReturnValue(identity);
      for (const method of ["PUT", "DELETE"])
        expect(
          outcome(await run(method, "/lab/teacher")),
          method,
        ).toStrictEqual(outcome(await run(method, "/labx/teacher")));
    },
  );
});

/**
 * 🔴 랩실 화면이 부르는 **파일**도 누구에게나 받아져야 한다 (트랙 53).
 * 화면이 열려도 모형이 `/lab` 밖에 있으면 역할에 따라 되돌려져 안 그려진다 — 2026-09-21 에 모형 둘이
 * `/dev/blender-assets/` 에 있어서 실제로 그랬다. 파일 목록은 랩실 코드에서 **뽑는다**(손으로 안 적는다) —
 * 새 모형·그림이 생기면 저절로 여기 들어온다.
 */
describe("🔴 랩실이 부르는 파일은 누구에게나 받아진다 (트랙 53)", () => {
  const FILES = labFileAddresses();

  it("자가 모형 둘을 본다 — 빈 목록이면 아래 시험이 헛돈다", () => {
    expect(FILES).toEqual(
      expect.arrayContaining([
        "/lab/models/cuboid-fold.glb",
        "/lab/models/stack-cubes.glb",
      ]),
    );
  });

  it.each(IDENTITIES)(
    "%s — 랩실 코드가 부르는 파일을 GET·HEAD 로 받고 감사 기록이 없다",
    async (_, identity) => {
      session.mockReturnValue(identity);
      for (const path of FILES)
        for (const method of ["GET", "HEAD"])
          expect(outcome(await run(method, path)), `${method} ${path}`).toBe(
            "통과",
          );
      expect(recordAudit).not.toHaveBeenCalled();
    },
  );

  /**
   * 이 시험이 눈먼 게 아니다 — 옛 자리였다면 다섯 역할이 못 받았다(트랙 52 가 잰 그대로).
   * 원장도 못 받는다 — `/dev/**` 는 2026-10-03 부터 최고관리자 전용이다(`ca0d6f45b` · 지점 관리 고도화).
   */
  const OLD_PLACE: Record<(typeof IDENTITIES)[number][0], string> = {
    "로그인 안 함": "통과",
    원장: "→ /",
    선생님: "→ /",
    검수: "→ /",
    "승인 대기": "→ /approval-pending",
    학생: "→ /learn",
    "첫 로그인 학생": "→ /learn/password",
  };

  it.each(IDENTITIES)(
    "%s — 옛 자리 /dev/blender-assets/cuboid-fold.glb 는 관문 판정이 다르다",
    async (name, identity) => {
      session.mockReturnValue(identity);
      expect(
        outcome(await run("GET", "/dev/blender-assets/cuboid-fold.glb")),
      ).toBe(OLD_PLACE[name]);
    },
  );
});
