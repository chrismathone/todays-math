/**
 * **변형은 언제나 문항류의 대표(`-001`)에서** — 원장님 지시 2026-08-27:
 * 「변형된 문제는 재변형 불가능하게. 항상 001(문항류의 가장 메인 문항)만 변형
 *  가능하게.」 · 「002~ 에서 변형 누르면 001이 변형되는 걸로 배선.」
 */
import { describe, expect, it } from "vitest";

import { isRedirected, pickFamilyMain } from "@/lib/problem/familyMainProblem";

const at = (iso: string) => new Date(iso);

const 대표 = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  unitId: "unit-1",
  familyKey: "mid:1-1|소인수분해|02",
  createdAt: at("2026-08-01T00:00:00Z"),
};
const 변형1 = {
  id: "bbbbbbbb-0000-4000-8000-000000000002",
  unitId: "unit-1",
  familyKey: "mid:1-1|소인수분해|02",
  createdAt: at("2026-08-27T10:00:00Z"),
};
const 변형2 = {
  id: "cccccccc-0000-4000-8000-000000000003",
  unitId: "unit-1",
  familyKey: "mid:1-1|소인수분해|02",
  createdAt: at("2026-08-27T10:05:00Z"),
};

describe("문항류의 대표 고르기", () => {
  it("변형본에서 부르면 **가장 먼저 만들어진 행**(=001)이 나온다", () => {
    expect(pickFamilyMain(변형2, [대표, 변형1, 변형2]).id).toBe(대표.id);
    expect(pickFamilyMain(변형1, [대표, 변형1, 변형2]).id).toBe(대표.id);
  });

  it("대표에서 부르면 자기 자신이다 — 옮기지 않는다", () => {
    const got = pickFamilyMain(대표, [대표, 변형1, 변형2]);
    expect(got.id).toBe(대표.id);
    expect(isRedirected(대표, got)).toBe(false);
  });

  /**
   * 🔴 **`solo:` 접두사는 «혼자»라는 뜻이 아니다.** 변형본은 원본의 키를 물려받고,
   *    원본이 AI 생성이면 그 키가 `solo:<uuid>` 다 — 그러면 형제들이 **같은 `solo:`
   *    키**를 든다(2026-08-27 실측 `A07-001`~`A07-006`).
   *    처음 판은 `solo:` 면 일찍 끊었고, **변이 시험이 그 자리를 잡았다**:
   *    그 판으로는 `A07-003` 에서 변형해도 `A07-001` 로 안 옮겨진다.
   */
  it("🔴 같은 solo: 키를 든 형제는 한 류다 — 대표로 옮긴다", () => {
    const KEY = "solo:500efa7e-7edb-4f7a-9116-154790f82a0a";
    const 원본 = { ...대표, familyKey: KEY };
    const 변형 = { ...변형2, familyKey: KEY };
    expect(pickFamilyMain(변형, [원본, 변형]).id).toBe(원본.id);
  });

  it("🔴 서로 다른 solo: 는 남남이다 — 엉뚱한 문항으로 안 옮긴다", () => {
    const solo = {
      ...변형2,
      familyKey: "solo:11111111-2222-4333-8444-555555555555",
    };
    const 남 = {
      ...대표,
      familyKey: "solo:99999999-2222-4333-8444-555555555555",
    };
    expect(pickFamilyMain(solo, [solo, 남]).id).toBe(solo.id);
  });

  it("🔴 키가 없으면(레거시) 자기 자신이 대표다", () => {
    const 레거시 = { ...변형2, familyKey: null };
    expect(pickFamilyMain(레거시, [{ ...대표, familyKey: null }]).id).toBe(
      레거시.id,
    );
  });

  /**
   * 🔴 **단원이 다르면 다른 류다** — `ProblemFamily` 의 복합키 `@@id([unitId, familyKey])`
   *    가 그렇게 잠근다. 키 문자열만 보면 확인테스트(여러 단원을 묶는다)에서 다른
   *    단원의 다른 류로 옮겨 변형한다.
   */
  it("🔴 키가 같아도 단원이 다르면 형제가 아니다", () => {
    const 딴단원 = {
      ...대표,
      id: "dddddddd-0000-4000-8000-000000000004",
      unitId: "unit-2",
    };
    expect(pickFamilyMain(변형2, [딴단원, 변형2]).id).toBe(변형2.id);
  });

  /**
   * 🔴 같은 시각이면 **id 로 갈라 결정적**이어야 한다. 안 그러면 같은 입력에
   *    다른 답이 나와 재현이 안 되고, 「왜 저 문항으로 옮겼나」를 못 짚는다.
   */
  it("🔴 만든 시각이 같으면 id 가 작은 쪽 — 답이 흔들리지 않는다", () => {
    const 작은id = {
      ...변형1,
      id: "00000000-0000-4000-8000-00000000000a",
      createdAt: at("2026-08-27T10:00:00Z"),
    };
    const 큰id = {
      ...변형2,
      id: "ffffffff-0000-4000-8000-00000000000b",
      createdAt: at("2026-08-27T10:00:00Z"),
    };
    // ⚠️ **작은 id 를 뒤에 둔다.** 앞에 두면 「먼저 온 것을 유지」하는 판도
    //    우연히 맞아서 이 시험이 아무것도 안 지킨다(변이 시험으로 확인).
    const family = [큰id, 작은id];
    expect(pickFamilyMain(큰id, family).id).toBe(작은id.id);
    expect(pickFamilyMain(작은id, family).id).toBe(작은id.id);
  });

  it("형제 목록이 비면 자기 자신이다", () => {
    expect(pickFamilyMain(변형2, []).id).toBe(변형2.id);
  });
});
