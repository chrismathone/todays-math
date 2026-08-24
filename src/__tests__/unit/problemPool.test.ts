/**
 * 공용 풀 조회 조건 — D-31 → **D-78** (원장님 확정 2026-08-24: 「소유자 필요없고 전체 공유」).
 *
 * 종전 계약은 「shared **또는 본인 소유**」였다. 확정 시점에 문항 47,014개가 **전부
 * `shared`** 라 그 «본인 소유» 갈래는 아무것도 더 보여 주지 않고 있었고, 소유자를 없애며
 * 갈래도 지웠다.
 *
 * ⚠️ 그래서 이제 `private` 는 **아무에게도 안 보인다** — 「나만 보인다」가 아니다.
 *    이 갈래를 아래에서 못 박는 이유: 소유자가 사라졌다는 것을 모르고 `private` 를
 *    「내 개인 문항」으로 쓰면 **조용히 사라진 것처럼 보인다.**
 */
import { describe, expect, it } from "vitest";

import { isProblemAccessible, problemVisibleWhere } from "@/lib/problemPool";

describe("[D-78] 공용 풀 조회 조건 — 소유자를 묻지 않는다", () => {
  it("조회 조건은 pool=shared 하나다 (소유자 갈래 없음)", () => {
    expect(problemVisibleWhere()).toEqual({ pool: "shared" });
  });

  /**
   * 이 검사가 무는 것: 조건에 `userId`/`OR` 가 **다시 들어오면** 빨개진다.
   * 소유자를 되살리려는 변경이 조용히 섞이는 것을 막는다.
   */
  it("조회 조건에 소유자가 섞이지 않는다", () => {
    const where = problemVisibleWhere() as Record<string, unknown>;
    expect(Object.keys(where)).toEqual(["pool"]);
    expect(JSON.stringify(where)).not.toContain("userId");
    expect(JSON.stringify(where)).not.toContain("OR");
  });

  it("공용 문항은 누구나 접근한다", () => {
    expect(isProblemAccessible({ pool: "shared" })).toBe(true);
  });

  it("private 는 소유자가 없으므로 아무에게도 안 보인다", () => {
    expect(isProblemAccessible({ pool: "private" })).toBe(false);
  });
});
