/**
 * 메뉴를 코드에 더하면 DB 의 CHECK 도 같이 넓혀야 한다 — `user.disabled_menus` 는
 * `user_disabled_menus_valid`(«꺼 둔 메뉴»는 이 목록 안)로 막혀 있다.
 *
 * 2026-10-01 원장님 «선생님 승인이 안 됨»: «오늘의 개념»(D-124) · «오늘의 기억 · SRS» · «오늘의 영어»(D-148) ·
 * «개념 백지»(D-150)를 코드에만 더하고 CHECK 는 9월 14일 여섯 개 그대로였다. 새 메뉴를 하나라도 끄고 저장하면
 * 23514 로 500 — 승인 · 메뉴 저장이 전부 실패했고, 운영에 메뉴를 꺼 둔 계정이 0 이었다(끄는 저장이 다 실패해서).
 * 마이그레이션 파일들에서 이 제약의 마지막 정의를 읽어 코드의 메뉴 목록과 같은지 본다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WORKSPACE_MENUS,
  workspaceMenuSchema,
} from "@/contracts/accountAccess.contract";

const MIGRATIONS = path.join(process.cwd(), "prisma", "migrations");

/** 마이그레이션을 이름 차례로 읽어 `user_disabled_menus_valid` 의 마지막 ADD CONSTRAINT 목록을 꺼낸다. */
function lastMenuCheck(): string[] | null {
  let last: string[] | null = null;
  for (const dir of readdirSync(MIGRATIONS).sort()) {
    let sql: string;
    try {
      sql = readFileSync(path.join(MIGRATIONS, dir, "migration.sql"), "utf8");
    } catch {
      continue;
    }
    const re =
      /ADD CONSTRAINT "user_disabled_menus_valid"\s+CHECK\s*\(\s*"disabled_menus"\s*<@\s*ARRAY\[([^\]]*)\]/g;
    for (const m of sql.matchAll(re))
      last = [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
  }
  return last;
}

describe("메뉴 목록 ↔ DB CHECK(user_disabled_menus_valid)", () => {
  it("마지막 CHECK 의 목록이 코드의 메뉴 전부와 같다", () => {
    const check = lastMenuCheck();
    expect(check).not.toBeNull();
    expect([...check!].sort()).toEqual([...ALL_WORKSPACE_MENUS].sort());
  });

  it("코드의 메뉴 배열과 enum 이 같다(두 곳을 같이 고친다)", () => {
    expect([...workspaceMenuSchema.options].sort()).toEqual(
      [...ALL_WORKSPACE_MENUS].sort(),
    );
  });
});
