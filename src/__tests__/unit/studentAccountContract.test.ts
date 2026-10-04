/**
 * 학생 계정 계약 — 아이디 규칙 · 숫자 4자리 · 문구 · 잠금 상수 (D-124 ⑶ · D-125 ⑵⑶ · 브리프 §6·§7).
 *
 * 원장 계정 규칙(`auth.contract.ts` — 이메일 · 8~72자)과 **따로** 둔다(브리프 §7). 비밀번호 판정은
 * `initialPassword.ts` 의 `isPinFormat` · `isEasyPin` 을 부른다 — 여기서 다시 적지 않는다.
 */
import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { authLoginRequestSchema } from "@/contracts/auth.contract";
import {
  normalizeLoginId,
  STUDENT_ACCOUNT_WITHDRAWN_MESSAGES,
  STUDENT_LOGIN_ID_RULE,
  STUDENT_LOGIN_LOCK,
  STUDENT_LOGIN_MESSAGES,
  studentAccountIssueRequestSchema,
  studentAccountIssueResponseSchema,
  studentAccountPanelSchema,
  studentAccountStatusSchema,
  studentLoginIdSchema,
  studentLoginRequestSchema,
  studentNewPinSchema,
  studentPasswordChangeRequestSchema,
  studentPinSchema,
} from "@/contracts/studentAccount.contract";

describe("아이디 — 원장님이 직접 적는다 (D-125 ⑵)", () => {
  it("앞뒤 공백을 걷고 소문자로 접는다 — 대소문자를 가리지 않는다", () => {
    expect(normalizeLoginId("  Kim_Seo-01 ")).toBe("kim_seo-01");
    expect(studentLoginIdSchema.parse("  Kim_Seo-01 ")).toBe("kim_seo-01");
  });

  it("영문·숫자·-·_ 로 4~20자 — 경계", () => {
    expect(studentLoginIdSchema.safeParse("abcd").success).toBe(true);
    expect(studentLoginIdSchema.safeParse("a".repeat(20)).success).toBe(true);
    expect(studentLoginIdSchema.safeParse("-_-_").success).toBe(true);
    expect(studentLoginIdSchema.safeParse("2026").success).toBe(true);
    for (const bad of [
      "abc",
      "a".repeat(21),
      "",
      "    ",
      "kim seo",
      "kim.seo",
      "kim@seo",
      "ｋｉｍ１",
    ]) {
      expect(studentLoginIdSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("규칙은 한 곳이다 — 보고서·화면이 이 상수를 읽는다", () => {
    expect(STUDENT_LOGIN_ID_RULE).toStrictEqual({
      minLength: 1,
      maxLength: 50,
      pattern:
        /^(?:[a-z0-9_-]{4,20}|(?=[가-힣a-z0-9 _-]{1,50}$)(?=.*[가-힣])[가-힣a-z0-9 _-]+)$/u,
    });
  });

  it("실제 한글 이름으로 로그인하며 NFC 정규화 후 비교한다", () => {
    expect(studentLoginIdSchema.parse(" 김민서A ")).toBe("김민서a");
    expect(studentLoginIdSchema.parse("김민서".normalize("NFD"))).toBe(
      "김민서",
    );
    expect(
      studentLoginRequestSchema.safeParse({
        loginId: "김민서",
        password: "0042",
      }).success,
    ).toBe(true);
  });

  it("발급 요청은 아이디 한 칸뿐이다 (비밀번호는 서버가 뽑는다)", () => {
    expect(
      studentAccountIssueRequestSchema.parse({ loginId: " Seo01 " }),
    ).toStrictEqual({ loginId: "seo01" });
    expect(
      studentAccountIssueRequestSchema.safeParse({
        loginId: "seo01",
        password: "5809",
      }).success,
    ).toBe(false);
  });
});

describe("🔴 비밀번호 숫자 4자리 (D-125 ⑶)", () => {
  it("형식은 isPinFormat 그대로 — 네 자리 ASCII 숫자만", () => {
    expect(studentPinSchema.safeParse("0042").success).toBe(true);
    for (const bad of ["123", "12345", "12a4", "١٢٣٤", " 1234", "", "12 4"]) {
      expect(studentPinSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("🔴 새 번호는 쉬운 번호(반복·오름·내림)를 받지 않는다 — 발급과 같은 제외 규칙", () => {
    for (const easy of ["0000", "1111", "0123", "1234", "4321", "9876"]) {
      const r = studentNewPinSchema.safeParse(easy);
      expect(r.success, easy).toBe(false);
    }
    expect(studentNewPinSchema.safeParse("5809").success).toBe(true);
    // 넘어가는 연속은 쉬운 번호가 아니다 — initialPassword.ts 의 결정을 그대로 따른다
    expect(studentNewPinSchema.safeParse("7890").success).toBe(true);
  });

  it("로그인은 기존 4자리 번호와 별도로 설정된 긴 비밀번호를 모두 받는다", () => {
    expect(
      studentLoginRequestSchema.safeParse({
        loginId: "seo01",
        password: "1111",
      }).success,
    ).toBe(true);
    expect(
      studentLoginRequestSchema.safeParse({
        loginId: "seo01",
        password: "1234@@@@",
      }).success,
    ).toBe(true);
    expect(
      studentLoginRequestSchema.safeParse({
        loginId: "seo01",
        password: "12@@",
      }).success,
    ).toBe(false);
  });

  it("바꿀 때 지금 번호와 같은 번호는 안 된다", () => {
    expect(
      studentPasswordChangeRequestSchema.safeParse({
        currentPassword: "5809",
        newPassword: "5809",
      }).success,
    ).toBe(false);
    expect(
      studentPasswordChangeRequestSchema.safeParse({
        currentPassword: "5809",
        newPassword: "7314",
      }).success,
    ).toBe(true);
    expect(
      studentPasswordChangeRequestSchema.safeParse({
        currentPassword: "1234@@@@",
        newPassword: "7314",
      }).success,
    ).toBe(true);
  });

  it("원장 계정 규칙과는 따로다 — 숫자 4자리는 원장 로그인 계약을 통과하지 않는다", () => {
    expect(
      authLoginRequestSchema.safeParse({
        email: "a@example.test",
        password: "5809",
      }).success,
    ).toBe(false);
  });
});

describe("문구 · 잠금 (D-125 ⑶ — 리드 제안)", () => {
  it("🔴 실패 문구는 하나, 잠금 문구도 하나 — 아이디가 있는지 흘리지 않는다", () => {
    expect(STUDENT_LOGIN_MESSAGES).toStrictEqual({
      invalid: "아이디 또는 비밀번호가 맞지 않습니다.",
      locked: "잠시 뒤 다시 시도하세요.",
      loginIdTaken: "이미 쓰는 아이디입니다.",
      accountExists: "이미 계정이 있습니다.",
      easyPin: "쉬운 번호는 쓸 수 없습니다.",
      samePin: "지금 번호와 다른 번호를 적어 주세요.",
      wrongCurrentPin: "지금 비밀번호가 맞지 않습니다.",
    });
  });

  it("🔴 퇴원 학생 발급 거부 — 발급 · 다시 발급 · 켜기 문구 (D-127 · 리드 결정)", () => {
    expect(STUDENT_ACCOUNT_WITHDRAWN_MESSAGES).toStrictEqual({
      issue: "퇴원한 학생은 계정을 만들 수 없습니다.",
      reissue: "퇴원한 학생은 비밀번호를 다시 발급할 수 없습니다.",
      enable: "퇴원한 학생은 계정을 켤 수 없습니다.",
    });
  });

  it("연속 5회 틀리면 10분 잠금", () => {
    expect(STUDENT_LOGIN_LOCK).toStrictEqual({
      maxFailures: 5,
      lockMs: 10 * 60 * 1000,
    });
  });
});

describe("응답 모양 — 초기 비밀번호는 발급 응답에 한 번만", () => {
  it("발급 응답에만 initialPassword 칸이 있다", () => {
    const ok = studentAccountIssueResponseSchema.safeParse({
      data: {
        studentId: "30000000-0000-4000-8000-000000000001",
        loginId: "seo01",
        initialPassword: "5809",
        mustChangePassword: true,
        issuedAt: "2026-09-15T09:00:00.000Z",
      },
    });
    expect(ok.success).toBe(true);
  });

  it("🔴 상태 조회 모양에는 비밀번호·해시 칸이 아예 없다", () => {
    const keys = Object.keys(studentAccountStatusSchema.shape).sort();
    expect(keys).toStrictEqual([
      "disabledAt",
      "issuedAt",
      "issuedByViewer",
      "lastLoginAt",
      "locked",
      "lockedUntil",
      "loginId",
      "mustChangePassword",
      "passwordChangedAt",
      "studentId",
    ]);
    // `mustChangePassword`·`passwordChangedAt` 는 여부·시각이다 — 번호를 싣는 칸 이름만 겨눈다
    expect(
      keys.filter((k) => /hash|initial|^password$|^pin$/i.test(k)),
    ).toEqual([]);
    // 발급 칸이 읽는 모양은 퇴원 여부 + 그 상태뿐이다(learn-screens 브리프 §1.3)
    expect(Object.keys(studentAccountPanelSchema.shape).sort()).toStrictEqual([
      "account",
      "withdrawn",
    ]);
  });
});

describe("🔴 화면에서도 읽히는 계약이다 — import 를 따라가도 node 모듈이 없다", () => {
  /**
   * 학생 로그인 화면의 폼 검증이 이 계약을 읽을 자리다. 판정(`isPinFormat`·`isEasyPin`)을
   * `initialPassword.ts` 에서 부르면 그 파일 머리의 `node:crypto` 가 화면 번들에 딸려 가 깨진다.
   * 화면이 아직 없어 `npm run build` 는 못 잡으므로 여기서 **글자로** 따라간다.
   */
  const ROOT = process.cwd();
  const BUILTINS = new Set(builtinModules);
  const IMPORT = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g;

  function resolveLocal(fromFile: string, spec: string): string | null {
    const base = spec.startsWith("@/")
      ? path.join(ROOT, "src", spec.slice(2))
      : path.resolve(path.dirname(fromFile), spec);
    for (const candidate of [
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, "index.ts"),
    ])
      if (existsSync(candidate)) return candidate;
    return null;
  }

  it("studentAccount.contract.ts 에서 닿는 파일에 node: · 내장 모듈 import 가 없다", () => {
    const start = path.join(
      ROOT,
      "src",
      "contracts",
      "studentAccount.contract.ts",
    );
    const seen = new Set<string>();
    const nodeImports: string[] = [];
    const unresolved: string[] = [];
    const queue = [start];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(IMPORT)) {
        const spec = m[1]!;
        if (spec.startsWith("node:") || BUILTINS.has(spec.split("/")[0]!))
          nodeImports.push(`${path.relative(ROOT, file)} → ${spec}`);
        else if (spec.startsWith("@/") || spec.startsWith(".")) {
          const next = resolveLocal(file, spec);
          if (next) queue.push(next);
          else unresolved.push(`${path.relative(ROOT, file)} → ${spec}`);
        }
      }
    }
    expect(unresolved, "못 따라간 import — 이 검사가 눈을 감는다").toEqual([]);
    expect(nodeImports).toEqual([]);
    // 분모 — 따라간 파일이 계약 자신뿐이면 이 검사는 아무것도 안 본 것이다
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});
