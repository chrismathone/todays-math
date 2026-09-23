/**
 * 담당을 글자로 적는 규칙 · 내 반 맨 위 순서 (D-132 ⑷ ⑹ ⑻ · 05 §8.11).
 *
 * 규칙: `src/lib/class/ownerLabel.ts`(글자) · `src/lib/class/classOwner.ts`(순서 · 판정)
 *
 * 🔴 6자 자르기는 **코드 포인트**로 센다 — `String.prototype.slice` 는 UTF-16 단위라 보충 평면 글자
 *    (이모지 · 확장 한자)를 반쪽으로 잘라 깨진 글자(�)를 상자에 띄운다.
 */
import { describe, expect, it } from "vitest";

import type { ClassOwner } from "@/contracts/class.contract";
import { conceptBoardSchema } from "@/contracts/conceptAdmin.contract";
import { hifiBoard } from "@/app/dev/concept-hifi/fixture";
import {
  CONCEPT_BOARD_OWNERS,
  LONGEST_OWNER,
} from "@/app/dev/class-owner-hifi/fixture";
import {
  mineFirst,
  mineRank,
  showsClassOwner,
  toClassOwner,
} from "@/lib/class/classOwner";
import {
  MY_CLASS_LABEL,
  OWNER_PICKER_MAX,
  classOptionLabel,
  classOptionTitle,
  clipOwnerName,
  hasOwners,
  ownerTagText,
} from "@/lib/class/ownerLabel";

const other = (name: string): ClassOwner => ({ name, mine: false });
const mine: ClassOwner = { name: "관리자", mine: true };

describe("clipOwnerName — 선택 상자의 담당 앞 6자 (D-132 ⑻)", () => {
  it("«이어하기선생님»(7자) → «이어하기선생» — «…» 를 붙이지 않는다", () => {
    expect(OWNER_PICKER_MAX).toBe(6);
    expect(clipOwnerName(LONGEST_OWNER)).toBe("이어하기선생");
    expect(clipOwnerName(LONGEST_OWNER)).not.toMatch(/…|\.\.\./);
  });

  it.each(["강선생", "원장", "빈손선생님", "여섯글자이름", ""])(
    "6자 이하는 그대로 — «%s»",
    (name) => {
      expect(clipOwnerName(name)).toBe(name);
    },
  );

  it("코드 포인트로 센다 — 보충 평면 글자를 반쪽으로 자르지 않는다", () => {
    const name = "𠀀𠀁𠀂𠀃𠀄𠀅𠀆"; // 확장 한자 7자 = UTF-16 14단위
    expect(name.length).toBe(14);
    const clipped = clipOwnerName(name);
    expect(Array.from(clipped)).toHaveLength(6);
    expect(clipped).toBe("𠀀𠀁𠀂𠀃𠀄𠀅");
    expect(clipOwnerName("선생님😀😀😀😀")).toBe("선생님😀😀😀");
    // 외톨이 서로게이트가 하나도 없다
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(clipped)).toBe(false);
  });
});

describe("선택 상자 글자 · title", () => {
  it("담당이 있으면 «반 이름 · 담당 6자», title 은 자르지 않은 전체", () => {
    const cls = { name: "이어반", owner: other(LONGEST_OWNER) };
    expect(classOptionLabel(cls)).toBe("이어반 · 이어하기선생");
    expect(classOptionTitle(cls)).toBe(`이어반 · ${LONGEST_OWNER}`);
  });

  it("내 반은 이름 대신 «내 반» — 글자와 title 둘 다", () => {
    const cls = { name: "목요 심화반", owner: mine };
    expect(classOptionLabel(cls)).toBe(`목요 심화반 · ${MY_CLASS_LABEL}`);
    expect(classOptionTitle(cls)).toBe("목요 심화반 · 내 반");
  });

  it("담당이 없으면(관리자 아님) 반 이름 그대로 · title 없음", () => {
    expect(classOptionLabel({ name: "이어반" })).toBe("이어반");
    expect(classOptionTitle({ name: "이어반" })).toBeUndefined();
    expect(classOptionTitle(undefined)).toBeUndefined();
  });

  it("딱지 글자는 자르지 않는다", () => {
    expect(ownerTagText(other(LONGEST_OWNER))).toBe(LONGEST_OWNER);
    expect(ownerTagText(mine)).toBe("내 반");
  });

  it("hasOwners — 한 행이라도 담당이 실렸나", () => {
    expect(hasOwners([])).toBe(false);
    expect(hasOwners([{}, {}])).toBe(false);
    expect(hasOwners([{}, { owner: mine }])).toBe(true);
  });
});

describe("판정 · 조인 → 담당", () => {
  it("싣는 판정은 관리자 표시 하나 — 빈 값 · true 아닌 값은 안 싣는다", () => {
    expect(
      showsClassOwner({ id: "a", isAdmin: true, branchId: "branch-1" }),
    ).toBe(true);
    expect(showsClassOwner({ id: "a", isAdmin: false })).toBe(false);
    expect(showsClassOwner({ id: "a" })).toBe(false);
  });

  it("계정 이름 · 보는 사람의 반인가", () => {
    const viewer = { id: "me", isAdmin: true };
    expect(
      toClassOwner(viewer, { userId: "me", user: { name: "관리자" } }),
    ).toEqual({ name: "관리자", mine: true });
    expect(
      toClassOwner(viewer, { userId: "t", user: { name: "강선생" } }),
    ).toEqual({ name: "강선생", mine: false });
  });
});

describe("mineFirst — 내 반 맨 위, 묶음 안의 순서는 그대로", () => {
  const rows = [
    { id: 1, owner: other("강선생") },
    { id: 2, owner: mine },
    { id: 3, owner: other("원장") },
    { id: 4, owner: mine },
    { id: 5, owner: other("강선생") },
  ];

  it("안정 정렬 — 내 반 [2,4] 뒤에 나머지 [1,3,5]", () => {
    expect(mineFirst(rows, (r) => r.owner).map((r) => r.id)).toEqual([
      2, 4, 1, 3, 5,
    ]);
  });

  it("담당이 없으면(관리자 아님) 하나도 안 움직인다 · 입력을 건드리지 않는다", () => {
    const plain = rows.map(({ id }) => ({ id, owner: undefined }));
    expect(mineFirst(plain, (r) => r.owner).map((r) => r.id)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    const before = rows.map((r) => r.id);
    mineFirst(rows, (r) => r.owner);
    expect(rows.map((r) => r.id)).toEqual(before);
  });

  it("mineRank — 내 반만 0", () => {
    expect(mineRank(mine)).toBe(0);
    expect(mineRank(other("강선생"))).toBe(1);
    expect(mineRank(undefined)).toBe(1);
  });
});

describe("오늘의 개념 판 조립 — 담당을 행에 싣고 내 반을 맨 위로 (assembleConceptBoard)", () => {
  it("담당이 없으면 행에 owner 키가 없다(관리자 아님 — 넓히기 전과 같은 모양)", () => {
    const board = conceptBoardSchema.parse(hifiBoard());
    for (const row of board.rows) expect(row).not.toHaveProperty("owner");
  });

  it("담당이 있으면 모든 행에 싣고, 내 반이 맨 위 · 나머지는 학년 · 이름 순서 그대로", () => {
    const plainRows = hifiBoard().rows;
    const board = conceptBoardSchema.parse(
      hifiBoard({ owners: CONCEPT_BOARD_OWNERS }),
    );
    expect(board.rows.every((r) => r.owner !== undefined)).toBe(true);
    // 원장님 반은 시안 두 번째 반(초6 A반) — 학년 순서로는 첫째가 아니다
    expect(plainRows[0]!.className).not.toBe("초6 A반");
    expect(board.rows[0]).toMatchObject({
      className: "초6 A반",
      owner: { mine: true },
    });
    expect(board.rows.slice(1).map((r) => r.classId)).toEqual(
      plainRows
        .map((r) => r.classId)
        .filter((id) => id !== board.rows[0]!.classId),
    );
    // 행 내용은 담당 말고는 그대로
    const byId = new Map(plainRows.map((r) => [r.classId, r]));
    for (const { owner, ...rest } of board.rows) {
      void owner;
      expect(rest).toEqual(byId.get(rest.classId));
    }
  });
});
