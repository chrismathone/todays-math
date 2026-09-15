// @vitest-environment node
/**
 * **변이 탐침** — `scripts/qa/mutate-student-auth.ts` 가 변이 **전후로** 불러 산출물을 견준다
 * (20번 교훈 2026-08-21 «변이가 동작을 안 바꾸면 …» 의 ⑶ 단계 — 파일이 바뀐 것과 동작이 바뀐 것은 다르다).
 *
 * 평소 시험 실행에서는 **건너뛴다**(`STUDENT_AUTH_PROBE=1` 일 때만 돈다). 판정(단언)은 하지 않고
 * `STUDENT_AUTH_PROBE_OUT` 파일에 `{ name, value }` 한 줄만 적는다 — 판정은 시험
 * (studentSessionPipeline.test.ts)의 몫이다.
 *
 * 왜 tsx 가 아니라 여기인가: `src/lib/auth.ts` 는 진짜 next-auth 를 부르는데, next-auth 는 `next/server` 를
 * 확장자 없이 import 해서 Node 가 직접 못 읽는다(vitest.config.mts 의 `server.deps.inline` 참고).
 */
import { appendFileSync } from "node:fs";

import { describe, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.AUTH_SECRET = "student-auth-test-secret-0123456789abcdef";
  process.env.AUTH_URL = "http://localhost:3000";
});

vi.mock("server-only", () => ({}));
vi.mock(
  "next/headers",
  async () => (await import("../helpers/authRequestContext")).nextHeadersModule,
);
vi.mock("next/navigation", async (orig) => ({
  ...(await orig<object>()),
  redirect: (await import("../helpers/authRequestContext")).redirectMock,
}));
vi.mock("@/lib/db", async () => {
  const { prismaTestDouble } = await import("@/mocks/prismaTestDouble");
  const { composeLearnDb } = await import("@/mocks/learnTestDouble");
  return { db: composeLearnDb(prismaTestDouble) };
});

import { auth, signIn } from "@/lib/auth";
import { hashStudentPin } from "@/lib/learn/pinHash";
import { MOCK_STUDENT_1 } from "@/mocks/data";
import {
  patchStudentAccount,
  resetLearnTestDouble,
  seedStudentAccount,
} from "@/mocks/learnTestDouble";

import {
  resetRequest,
  sessionCookieFromJar,
} from "../helpers/authRequestContext";

const ON = process.env.STUDENT_AUTH_PROBE === "1";

/** 하네스가 준 파일에 한 줄 적는다 — 콘솔은 vitest 가 통과한 시험에서 안 옮길 때가 있다 */
async function probe(name: string, work: () => Promise<unknown>) {
  let value: unknown;
  try {
    value = await work();
  } catch (error) {
    value = { error: (error as Error).name };
  }
  const out = process.env.STUDENT_AUTH_PROBE_OUT;
  if (out) appendFileSync(out, `${JSON.stringify({ name, value })}\n`);
}

/** 학생 한 명을 새로 세우고 로그인한 쿠키를 돌려준다 */
async function signedInStudent() {
  resetLearnTestDouble();
  resetRequest();
  // 🔴 id 를 **고정**한다 — 무작위면 변이 전후 산출물이 늘 달라 «동작이 바뀌었다»가 거짓으로 늘 참이 된다
  const id = seedStudentAccount({
    id: "4a000000-0000-4000-8000-000000000001",
    studentId: MOCK_STUDENT_1.id,
    loginId: "seo01",
    passwordHash: await hashStudentPin("5809"),
    mustChangePassword: false,
  }).id;
  await signIn("student", {
    loginId: "seo01",
    password: "5809",
    redirect: false,
  });
  const value = sessionCookieFromJar();
  return { id, cookie: value ? `authjs.session-token=${value}` : "" };
}

const shape = (session: unknown) =>
  session && typeof session === "object"
    ? { ...(session as Record<string, unknown>), expires: "<expires>" }
    : session;

describe.runIf(ON)("학생 인증 탐침", () => {
  it("auth-student-session", async () => {
    await probe("auth-student-session", async () => {
      const { cookie } = await signedInStudent();
      resetRequest({ cookie });
      return shape(await auth());
    });
  });

  it("auth-student-after-disable", async () => {
    await probe("auth-student-after-disable", async () => {
      const { id, cookie } = await signedInStudent();
      patchStudentAccount(id, { disabledAt: new Date(0) });
      resetRequest({ cookie });
      return shape(await auth());
    });
  });
});
