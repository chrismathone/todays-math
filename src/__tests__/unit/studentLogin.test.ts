/**
 * 학생 로그인 핵심 — 정규화 · 꺼짐 · bcrypt · **연속 5회 실패 10분 잠금** (브리프 §2.3 · §6, D-125 ⑶).
 *
 * 규칙: src/lib/learn/studentLogin.ts — 저장소(`LoginStore`)를 주입받는다. 여기서는 원자 연산을
 * 그대로 흉내 내는 메모리 저장소(`src/mocks/memoryLoginStore.ts`)를 쓰고, Prisma 쪽 저장소는
 * `learnRoutes.test.ts` · `studentLoginMissCleanup.test.ts` 가 본다.
 *
 * 🔴 브리프가 짚은 시험 넷: 잠금 5회 경계 · 10분 경계 · 성공 시 초기화 · 없는 아이디도 같은 문구.
 * 🔴 learn-screens 브리프 §1.4 가 더한 것: ⑥ 퇴원한 학생은 꺼진 계정과 똑같이(D-126 ⑺) ·
 *    ⑦ 없는 아이디 실패 행 정리(하루 넘은 행 · 한 번에 100행 — 리드 결정).
 */
import { describe, expect, it } from "vitest";

import { STUDENT_LOGIN_LOCK } from "@/contracts/studentAccount.contract";
import { studentAccountBlocked } from "@/lib/learn/accountBlock";
import {
  attemptStudentLogin,
  STUDENT_LOGIN_MISS_CLEANUP,
  verifyStudentPin,
  type LoginAudit,
  type LoginDeps,
} from "@/lib/learn/studentLogin";
import { studentLoginMissKey } from "@/lib/learn/pinHash";
import { createMemoryLoginStore } from "@/mocks/memoryLoginStore";

const MISS_SECRET = "unit-test-miss-secret";
const T0 = new Date("2026-09-15T09:00:00.000Z");
const PIN = "5809";
const ACCOUNT_ID = "acc-0001";
const STUDENT_ID = "stu-0001";
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function setup(opts: { disabled?: boolean; withdrawn?: boolean } = {}) {
  let now = T0;
  const store = createMemoryLoginStore({ now: () => now });
  store.addAccount({
    id: ACCOUNT_ID,
    studentId: STUDENT_ID,
    loginId: "seo01",
    passwordHash: `hash:${PIN}`,
    mustChangePassword: true,
    disabledAt: opts.disabled ? T0 : null,
    withdrawnAt: opts.withdrawn ? T0 : null,
  });
  const audits: LoginAudit[] = [];
  const realCompares: string[] = [];
  const deps: LoginDeps = {
    store,
    now: () => now,
    comparePin: async (pin, hash) => {
      if (hash !== null) realCompares.push(pin);
      await Promise.resolve(); // 동시성 시험이 끼어들 틈을 준다
      return hash === `hash:${pin}`;
    },
    // 진짜 열쇠 함수를 쓴다 — 가짜가 아이디를 품으면 «글자 그대로 안 남긴다»를 잴 수 없다
    missKey: (loginId) => studentLoginMissKey(loginId, MISS_SECRET),
    audit: async (entry) => {
      audits.push(entry);
    },
  };
  const login = (loginId: string, pin: string) =>
    attemptStudentLogin({ loginId, pin }, deps);
  return {
    store,
    deps,
    audits,
    realCompares,
    login,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

const reasons = async (
  run: () => Promise<{ ok: boolean; reason?: string }>,
  times: number,
) => {
  const out: string[] = [];
  for (let i = 0; i < times; i += 1) {
    const r = await run();
    out.push(r.ok ? "ok" : (r.reason ?? "?"));
  }
  return out;
};

describe("학생 로그인 — 기본", () => {
  it("아이디는 앞뒤 공백·대소문자를 가리지 않는다", async () => {
    const { login } = setup();
    expect((await login("  SEO01 ", PIN)).ok).toBe(true);
  });

  it("맞으면 성공 — 성공 감사에 번호는 없다", async () => {
    const { login, audits } = setup();
    const r = await login("seo01", PIN);
    expect(r).toMatchObject({ ok: true, account: { id: ACCOUNT_ID } });
    expect(audits).toStrictEqual([
      {
        action: "student_auth.login",
        outcome: "success",
        details: { studentAccountId: ACCOUNT_ID, studentId: STUDENT_ID },
      },
    ]);
  });

  it("🔴 꺼진 계정은 맞는 번호도 실패 — 문구는 «틀림»과 같다", async () => {
    const { login } = setup({ disabled: true });
    expect(await login("seo01", PIN)).toStrictEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("🔴 연속 5회 틀리면 10분 잠금 (D-125 ⑶)", () => {
  it("상수는 5회·10분이다", () => {
    expect(STUDENT_LOGIN_LOCK.maxFailures).toBe(5);
    expect(STUDENT_LOGIN_LOCK.lockMs).toBe(10 * MIN);
  });

  it("🔴 5회 경계 — 넷째까지는 «틀림», 다섯째에 잠긴다, 잠긴 뒤엔 맞는 번호도 거부", async () => {
    const { login } = setup();
    expect(await reasons(() => login("seo01", "0001"), 4)).toStrictEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
    ]);
    expect(await login("seo01", "0001")).toStrictEqual({
      ok: false,
      reason: "locked",
    });
    expect(await login("seo01", PIN)).toStrictEqual({
      ok: false,
      reason: "locked",
    });
  });

  it("🔴 10분 경계 — 10분에서 1ms 모자라면 잠김, 10분이 되면 풀린다", async () => {
    const { login, advance } = setup();
    await reasons(() => login("seo01", "0001"), 5);
    advance(10 * MIN - 1);
    expect(await login("seo01", PIN)).toStrictEqual({
      ok: false,
      reason: "locked",
    });
    advance(1);
    expect((await login("seo01", PIN)).ok).toBe(true);
  });

  it("잠금이 풀리면 다시 다섯 번이다 — 풀리자마자 한 번 틀려도 곧바로 잠기지 않는다", async () => {
    const { login, advance } = setup();
    await reasons(() => login("seo01", "0001"), 5);
    advance(10 * MIN);
    expect(await reasons(() => login("seo01", "0001"), 5)).toStrictEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
      "locked",
    ]);
  });

  it("🔴 성공하면 실패 수가 0 으로 — 넷 틀리고 맞힌 뒤 다시 넷 틀려도 안 잠긴다", async () => {
    const { login, store } = setup();
    await reasons(() => login("seo01", "0001"), 4);
    expect((await login("seo01", PIN)).ok).toBe(true);
    expect(store.accountLock(ACCOUNT_ID)).toStrictEqual({
      failedCount: 0,
      lockedUntil: null,
    });
    expect(await reasons(() => login("seo01", "0001"), 4)).toStrictEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
    ]);
  });

  it("🔴 동시에 스무 번 넣어도 번호를 실제로 대 보는 것은 다섯 번뿐이다 (먼저 한 칸을 잡고 대 본다)", async () => {
    const { login, realCompares } = setup();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        login("seo01", String(1000 + i).padStart(4, "0")),
      ),
    );
    expect(realCompares.length).toBeLessThanOrEqual(
      STUDENT_LOGIN_LOCK.maxFailures,
    );
    expect(results.filter((r) => !r.ok && r.reason === "locked").length).toBe(
      20 - realCompares.length + 1,
    );
  });
});

describe("🔴 없는 아이디도 같은 문구 · 같은 잠금 — 아이디가 있는지 흘리지 않는다", () => {
  it("있는 아이디에 틀린 번호를 넣은 것과 결과 줄이 똑같다", async () => {
    const a = setup();
    const b = setup();
    const known = await reasons(() => a.login("seo01", "0001"), 7);
    const unknown = await reasons(() => b.login("ghost-id", "0001"), 7);
    expect(unknown).toStrictEqual(known);
    expect(known).toStrictEqual([
      "invalid",
      "invalid",
      "invalid",
      "invalid",
      "locked",
      "locked",
      "locked",
    ]);
  });

  it("없는 아이디의 잠금도 10분이면 풀린다", async () => {
    const { login, advance } = setup();
    await reasons(() => login("ghost-id", "0001"), 5);
    advance(10 * MIN);
    expect(await login("ghost-id", "0001")).toStrictEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("🔴 없는 아이디는 **입력한 글자 그대로** 남기지 않는다 — 번호를 아이디 칸에 적는 실수가 있다", async () => {
    const { login, audits, store } = setup();
    await login("7314", "0001");
    await login("Ghost-ID", "5809");
    // 실패 수를 적는 자리는 64자 16진 열쇠뿐 — 입력한 글자를 품을 수 없는 모양이다
    expect(store.missKeys()).toStrictEqual([
      studentLoginMissKey("7314", MISS_SECRET),
      studentLoginMissKey("ghost-id", MISS_SECRET),
    ]);
    for (const key of store.missKeys()) expect(key).toMatch(/^[0-9a-f]{64}$/);
    // 감사 기록에는 입력한 아이디도 번호도 없다
    const dump = JSON.stringify(audits);
    for (const raw of ["7314", "ghost", "Ghost", "5809", "0001"])
      expect(dump).not.toContain(raw);
    expect(audits).toStrictEqual([
      {
        action: "student_auth.login",
        outcome: "failed",
        details: { reason: "unknown_id" },
      },
      {
        action: "student_auth.login",
        outcome: "failed",
        details: { reason: "unknown_id" },
      },
    ]);
  });
});

describe("지금 번호 확인 (비밀번호 바꾸기) — 같은 잠금을 쓴다", () => {
  it("틀린 번호는 잠금 수에 들어가고, 맞히면 0 으로", async () => {
    const { deps, store } = setup();
    const account = store.accountById(ACCOUNT_ID)!;
    expect(await verifyStudentPin(account, "0001", deps)).toBe("invalid");
    expect(store.accountLock(ACCOUNT_ID).failedCount).toBe(1);
    expect(await verifyStudentPin(account, PIN, deps)).toBe("ok");
    expect(store.accountLock(ACCOUNT_ID).failedCount).toBe(0);
  });

  it("로그인에서 잠긴 계정은 번호 바꾸기에서도 잠겨 있다", async () => {
    const { login, deps, store } = setup();
    await reasons(() => login("seo01", "0001"), 5);
    const account = store.accountById(ACCOUNT_ID)!;
    expect(await verifyStudentPin(account, PIN, deps)).toBe("locked");
  });
});

describe("🔴 ⑥ 퇴원한 학생 — 꺼진 계정과 똑같이 군다 (D-126 ⑺)", () => {
  it("막힘 판정은 한 함수 — 꺼짐 ∪ 퇴원", () => {
    expect(studentAccountBlocked({ disabledAt: null, withdrawnAt: null })).toBe(
      false,
    );
    expect(studentAccountBlocked({ disabledAt: T0, withdrawnAt: null })).toBe(
      true,
    );
    expect(studentAccountBlocked({ disabledAt: null, withdrawnAt: T0 })).toBe(
      true,
    );
    expect(studentAccountBlocked({ disabledAt: T0, withdrawnAt: T0 })).toBe(
      true,
    );
  });

  it("🔴 맞는 번호도 실패 — 문구는 «틀림»과 같고 실패 수에 든다", async () => {
    const { login, store } = setup({ withdrawn: true });
    expect(await login("seo01", PIN)).toStrictEqual({
      ok: false,
      reason: "invalid",
    });
    expect(store.accountLock(ACCOUNT_ID).failedCount).toBe(1);
  });

  it("🔴 맞는 번호를 일곱 번 넣어도 — 틀린 번호를 넣은 것과 결과 줄이 똑같다(다섯째에 잠긴다)", async () => {
    const gone = setup({ withdrawn: true });
    const wrong = setup();
    expect(await reasons(() => gone.login("seo01", PIN), 7)).toStrictEqual(
      await reasons(() => wrong.login("seo01", "0001"), 7),
    );
  });

  it("비밀번호 바꾸기의 «지금 번호 확인»도 막는다", async () => {
    const { deps, store } = setup({ withdrawn: true });
    expect(
      await verifyStudentPin(store.accountById(ACCOUNT_ID)!, PIN, deps),
    ).toBe("invalid");
  });

  it("감사 기록의 까닭은 withdrawn — 번호 없이", async () => {
    const { login, audits } = setup({ withdrawn: true });
    await login("seo01", PIN);
    expect(audits).toStrictEqual([
      {
        action: "student_auth.login",
        outcome: "failed",
        details: {
          studentAccountId: ACCOUNT_ID,
          studentId: STUDENT_ID,
          reason: "withdrawn",
        },
      },
    ]);
  });
});

describe("🔴 ⑦ 없는 아이디 실패 행 정리 — 하루 넘은 행을 한 번에 100행까지 (리드 결정 · student-auth §8-1)", () => {
  const key = (n: number) => n.toString(16).padStart(64, "0");
  const ago = (ms: number) => new Date(T0.getTime() - ms);
  const ghost = studentLoginMissKey("ghost-id", MISS_SECRET);

  it("상수는 24시간 · 100행", () => {
    expect(STUDENT_LOGIN_MISS_CLEANUP).toStrictEqual({
      staleAfterMs: 24 * HOUR,
      maxRows: 100,
    });
  });

  it("🔴 경계 — 23시간 59분 지난 행은 남기고, 24시간 1분 지난 행은 지운다", async () => {
    const { login, store } = setup();
    store.seedMiss(key(1), {
      failedCount: 3,
      lockedUntil: null,
      updatedAt: ago(24 * HOUR - MIN),
    });
    store.seedMiss(key(2), {
      failedCount: 3,
      lockedUntil: null,
      updatedAt: ago(24 * HOUR + MIN),
    });
    await login("ghost-id", "0001");
    expect(store.missKeys().sort()).toStrictEqual([key(1), ghost].sort());
  });

  it("🔴 한 번에 최대 100행 — 150행이 묵었으면 가장 오래된 100행만 지우고 50행이 남는다", async () => {
    const { login, store } = setup();
    for (let i = 1; i <= 150; i += 1)
      store.seedMiss(key(i), {
        failedCount: 1,
        lockedUntil: null,
        updatedAt: ago(2 * 24 * HOUR + i * MIN),
      });
    await login("ghost-id", "0001");
    const left = store.missKeys().filter((k) => k !== ghost);
    expect(left).toHaveLength(50);
    // i 가 작을수록 덜 묵었다 — 남는 것은 1..50
    expect(left.sort()).toStrictEqual(
      Array.from({ length: 50 }, (_, i) => key(i + 1)).sort(),
    );
  });

  it("방금 적은 없는 아이디 행과 계정 행은 안 지운다", async () => {
    const { login, store } = setup();
    await login("seo01", "0001");
    await login("ghost-id", "0001");
    expect(store.missKeys()).toStrictEqual([ghost]);
    expect(store.accountLock(ACCOUNT_ID).failedCount).toBe(1);
  });
});
