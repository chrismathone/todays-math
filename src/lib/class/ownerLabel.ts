/**
 * 담당을 **글자로** 적는 규칙 — 딱지 글자 · 반 고르는 상자의 «반 이름 · 담당» (D-132 · 05 §8.11).
 *
 * 딱지(`OwnerTag`)와 선택 상자(출제 · 장바구니)가 같은 글자를 쓴다. 같은 뜻이 두 벌이면 한쪽만
 * 고쳐진다(`rowSelection.ts` 머리말) — 그래서 «내 반»도 자르는 규칙도 여기 한 곳이다.
 *
 * ## 선택 상자만 자른다 (D-132 ⑻)
 *
 * 원장님 2026-09-16 *「... 말고 그냥 잘라버리고 앞부분만. 마우스 올리면 풀네임 보이게」* —
 * 담당은 **앞 6자**, «…» 를 붙이지 않는다. 전체는 `title`(마우스를 올리면). 딱지는 자르지 않는다.
 * 글자 수는 **코드 포인트**로 센다 — UTF-16 단위로 자르면 이모지·보충 평면 글자가 반쪽이 된다.
 */
import type { ClassOwner } from "@/contracts/class.contract";

/** 원장님(보는 사람) 계정의 반 — 이름 대신 적는다(D-132 ⑹). */
export const MY_CLASS_LABEL = "내 반";

/** 반 고르는 상자에서 담당 이름을 자르는 글자 수(D-132 ⑻). */
export const OWNER_PICKER_MAX = 6;

/** 앞 `max` 코드 포인트만 — 말줄임표를 붙이지 않는다. */
export function clipOwnerName(name: string, max = OWNER_PICKER_MAX): string {
  return Array.from(name).slice(0, max).join("");
}

/** 딱지에 적는 글자 — 내 반은 «내 반», 아니면 계정 이름 그대로(자르지 않는다). */
export function ownerTagText(owner: ClassOwner): string {
  return owner.mine ? MY_CLASS_LABEL : owner.name;
}

type NamedClass = { name: string; owner?: ClassOwner };

/** 선택 상자 `<option>` 글자 — 담당이 없으면(관리자 아님) 반 이름 그대로. */
export function classOptionLabel(cls: NamedClass): string {
  if (!cls.owner) return cls.name;
  const owner = cls.owner.mine ? MY_CLASS_LABEL : clipOwnerName(cls.owner.name);
  return `${cls.name} · ${owner}`;
}

/** 선택 상자 `title` — 자르지 않은 «반 이름 · 담당». 담당이 없으면 `undefined`(속성을 안 단다). */
export function classOptionTitle(
  cls: NamedClass | undefined,
): string | undefined {
  if (!cls?.owner) return undefined;
  return `${cls.name} · ${ownerTagText(cls.owner)}`;
}

/** 담당이 실린 목록인가 — 표의 «담당» 열을 세울지 가른다(관리자에게만 실린다). */
export function hasOwners(rows: readonly { owner?: ClassOwner }[]): boolean {
  return rows.some((row) => row.owner !== undefined);
}
