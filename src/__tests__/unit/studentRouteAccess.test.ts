/**
 * 학생 관문 규칙 — 「학생 세션이 어디까지 갈 수 있나」 (D-124 ⑶ · D-125 ⑷ · 브리프 §2.1 · §6).
 *
 * 규칙: src/lib/studentRouteAccess.ts (허용 목록 — `routeAccess.ts` 와 같은 원칙: 잊으면 **닫힌다**)
 * 배선: src/proxy.ts — 그쪽은 `proxyStudentGate.test.ts` 가 파일 목록 전수로 본다.
 */
import { describe, expect, it } from "vitest";

import {
  anonymousLearnGate,
  STUDENT_CAPABILITIES,
  STUDENT_MUST_CHANGE_CAPABILITIES,
  studentGateFor,
} from "@/lib/studentRouteAccess";

describe("🔴 학생이 할 수 있는 것 전부 — 늘거나 넓어지면 빨개져 리뷰에 보인다", () => {
  it("첫 비밀번호를 바꾼 학생", () => {
    expect(STUDENT_CAPABILITIES).toStrictEqual([
      "GET|HEAD /learn",
      "GET|HEAD /learn/password",
      "GET|HEAD /learn/watch/{id}",
      "GET|HEAD /learn/math-srs",
      "GET|POST /api/learn/math-srs",
      "POST /api/learn/math-srs/attempts",
      "POST /api/learn/math-srs/hint",
      "GET /api/learn/lectures",
      "GET /api/learn/lectures/{id}",
      "POST /api/learn/watch",
      "POST /api/learn/password",
      // 학생 화면에서 난 오류도 모은다(원장님 2026-09-22) — 보내기 하나뿐, 읽는 것은 없다
      "POST /api/logs/client",
      "POST /api/learn/logout",
      "GET /api/auth/session",
      "GET /api/auth/csrf",
      "POST /api/auth/signout",
      "GET|HEAD /favicon.ico",
      "GET|HEAD /icon.svg",
      "GET|HEAD /apple-icon.png",
      "GET|HEAD /brand/**",
    ]);
  });

  it("🔴 첫 로그인(비밀번호를 아직 안 바꾼) 학생 — 비밀번호 바꾸기 · 나가기 · 세션 · 오류 보고뿐", () => {
    expect(STUDENT_MUST_CHANGE_CAPABILITIES).toStrictEqual([
      "GET|HEAD /learn/password",
      "POST /api/learn/password",
      // 비밀번호 바꾸기 화면에서 난 오류도 와야 한다(원장님 2026-09-22)
      "POST /api/logs/client",
      "POST /api/learn/logout",
      "GET /api/auth/session",
      "GET /api/auth/csrf",
      "POST /api/auth/signout",
      "GET|HEAD /favicon.ico",
      "GET|HEAD /icon.svg",
      "GET|HEAD /apple-icon.png",
      "GET|HEAD /brand/**",
    ]);
  });
});

describe("학생 세션 — 허용 목록 밖은 막힌다", () => {
  const active = (m: string, p: string) => studentGateFor(false, m, p);

  it("학생 화면 넷", () => {
    for (const p of [
      "/learn",
      "/learn/",
      "/learn/password",
      "/learn/watch/0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70",
    ])
      expect(active("GET", p), p).toStrictEqual({ kind: "allow" });
  });

  it("🔴 /learn 밖의 화면은 /learn 으로 — 원장 화면·로그인 화면·검수 화면·dev 전부", () => {
    for (const p of [
      "/",
      "/studio",
      "/classes",
      "/review",
      "/login",
      "/signup",
      "/approval-pending",
      "/admin",
      "/dev/print-check",
      "/learning",
      "/learnx/watch/a",
      "/figures/a.png",
      "/figures-svg/a.svg",
    ])
      expect(active("GET", p), p).toStrictEqual({
        kind: "redirect",
        to: "/learn",
      });
  });

  it("이미 들어온 학생이 /learn/login 에 오면 목록으로", () => {
    expect(active("GET", "/learn/login")).toStrictEqual({
      kind: "redirect",
      to: "/learn",
    });
  });

  it("학생 화면의 한 칸 아래까지만 — 재생 주소에 칸을 더 붙이면 막힌다", () => {
    expect(active("GET", "/learn/watch/a/b")).toStrictEqual({
      kind: "redirect",
      to: "/learn",
    });
    expect(active("GET", "/learn/watch")).toStrictEqual({
      kind: "redirect",
      to: "/learn",
    });
  });

  it("🔴 화면에 GET 이 아닌 요청은 되돌리지 않고 막는다 — 307 은 메서드를 들고 가서 되돌림이 돈다", () => {
    for (const [m, p] of [
      ["POST", "/learn"],
      ["POST", "/learn/watch/a"],
      ["POST", "/"],
      ["PUT", "/learn/password"],
    ] as const)
      expect(active(m, p).kind, `${m} ${p}`).toBe("forbidden");
  });

  it("🔴 원장 API 는 전부 403 — 학생 API 만 열린다", () => {
    for (const [m, p] of [
      ["GET", "/api/problems"],
      ["GET", "/api/classes"],
      ["GET", "/api/students"],
      ["POST", "/api/students/x/account"],
      ["GET", "/api/tests"],
      ["POST", "/api/auth/signup"],
      ["POST", "/api/auth/callback/credentials"],
      ["POST", "/api/auth/callback/student"],
      ["GET", "/api/auth/providers"],
      ["GET", "/api/shared-figures/figures/a.png"],
      ["GET", "/api/account/access"],
      ["POST", "/api/learn/login"],
      ["GET", "/api/learn/lectures/x/watch"],
      ["DELETE", "/api/learn/lectures/x"],
      ["GET", "/api/learnx"],
    ] as const)
      expect(active(m, p), `${m} ${p}`).toStrictEqual({
        kind: "forbidden",
        message: "학생 계정은 이 기능을 쓸 수 없습니다.",
      });
  });

  it("학생 API · 나가기 · 세션 · 브랜드 이미지", () => {
    for (const [m, p] of [
      ["GET", "/api/learn/lectures"],
      ["GET", "/api/learn/lectures/x"],
      ["POST", "/api/learn/watch"],
      ["POST", "/api/learn/password"],
      ["POST", "/api/learn/logout"],
      ["GET", "/api/auth/session"],
      ["GET", "/api/auth/csrf"],
      ["POST", "/api/auth/signout"],
      ["GET", "/favicon.ico"],
      ["HEAD", "/brand/today-math-mark.svg"],
    ] as const)
      expect(active(m, p), `${m} ${p}`).toStrictEqual({ kind: "allow" });
  });
});

describe("🔴 첫 로그인 — 비밀번호 바꾸기 외에는 못 간다 (브리프 §2.3)", () => {
  const first = (m: string, p: string) => studentGateFor(true, m, p);

  it("학생 화면은 전부 비밀번호 바꾸기로", () => {
    for (const p of ["/learn", "/learn/watch/a", "/learn/login", "/"])
      expect(first("GET", p), p).toStrictEqual({
        kind: "redirect",
        to: "/learn/password",
      });
    expect(first("GET", "/learn/password")).toStrictEqual({ kind: "allow" });
  });

  it("강의 목록·시청 기록 API 도 막힌다 — 까닭을 말한다", () => {
    for (const [m, p] of [
      ["GET", "/api/learn/lectures"],
      ["POST", "/api/learn/watch"],
    ] as const)
      expect(first(m, p), `${m} ${p}`).toStrictEqual({
        kind: "forbidden",
        message: "비밀번호를 바꾼 뒤 이용할 수 있습니다.",
      });
  });

  it("바꾸기 · 나가기 · 세션은 된다", () => {
    for (const [m, p] of [
      ["POST", "/api/learn/password"],
      ["POST", "/api/learn/logout"],
      ["GET", "/api/auth/session"],
      ["POST", "/api/auth/signout"],
    ] as const)
      expect(first(m, p), `${m} ${p}`).toStrictEqual({ kind: "allow" });
  });
});

describe("🔴 브라우저 오류 보고 — 학생에게 연 것은 POST /api/logs/client 한 줄뿐 (원장님 2026-09-22)", () => {
  const states = [
    ["첫 비밀번호를 바꾼 학생", false],
    ["첫 로그인 학생", true],
  ] as const;

  it.each(states)("%s — 보고는 지나간다", (_, mustChange) => {
    expect(
      studentGateFor(mustChange, "POST", "/api/logs/client"),
    ).toStrictEqual({ kind: "allow" });
    // 끝의 빗금은 같은 주소다(관문의 경로 정규화)
    expect(
      studentGateFor(mustChange, "POST", "/api/logs/client/"),
    ).toStrictEqual({ kind: "allow" });
  });

  it.each(states)(
    "%s — 다른 메서드·옆 경로·그 아래는 막힌다(쌓인 기록을 읽거나 지우는 길은 없다)",
    (_, mustChange) => {
      for (const [m, p] of [
        ["GET", "/api/logs/client"],
        ["HEAD", "/api/logs/client"],
        ["PUT", "/api/logs/client"],
        ["PATCH", "/api/logs/client"],
        ["DELETE", "/api/logs/client"],
        ["GET", "/api/logs"],
        ["POST", "/api/logs"],
        ["POST", "/api/logs/clientx"],
        ["POST", "/api/logs/client/x"],
        ["GET", "/api/logs/purge/cron"],
        ["POST", "/api/logs/purge/cron"],
        ["POST", "/api/logs/purge"],
      ] as const)
        expect(studentGateFor(mustChange, m, p), `${m} ${p}`).toStrictEqual({
          kind: "forbidden",
          message: "학생 계정은 이 기능을 쓸 수 없습니다.",
        });
    },
  );
});

describe("로그인 안 한 사람이 /learn 에 오면 (D-125 ⑷)", () => {
  it("🔴 /learn/login 이 아닌 학생 화면은 /learn/login 으로 — 원장님 /login 과 섞지 않는다", () => {
    for (const p of ["/learn", "/learn/", "/learn/password", "/learn/watch/a"])
      expect(anonymousLearnGate("GET", p), p).toStrictEqual({
        kind: "redirect",
        to: "/learn/login",
      });
  });

  it("/learn/login 은 열려 있다 (화면·서버 액션)", () => {
    expect(anonymousLearnGate("GET", "/learn/login")).toStrictEqual({
      kind: "allow",
    });
    expect(anonymousLearnGate("POST", "/learn/login")).toStrictEqual({
      kind: "allow",
    });
  });

  it("/learn 밖은 판정하지 않는다(null) — 기존 관문이 하던 대로", () => {
    for (const p of [
      "/",
      "/login",
      "/learning",
      "/api/learn/lectures",
      "/studio",
    ])
      expect(anonymousLearnGate("GET", p), p).toBeNull();
  });
});
