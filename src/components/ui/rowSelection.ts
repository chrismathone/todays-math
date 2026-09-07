/**
 * 표 안에서 «고른 반»을 나타내는 표현 — 원장님 확정 2026-08-26.
 *
 * 메인의 `LedgerTable`(표 보기)이 먼저 쓰던 어법이고, 2026-09-07 에 `ClassTable`(반 관리)이
 * 같은 것을 쓰게 하면서 여기로 뺐다. **베껴 두면 한쪽만 고쳐도 아무도 모른다** —
 * 같은 뜻을 나타내는 규칙이 둘이면 한 곳에 둔다.
 *
 * ## 🔴 왜 배경색으로 하지 않나
 *
 * `ClassTable` 은 2026-09-07 까지 고른 행에 **`bg-white`** 를 걸고 있었다. 그런데 앱 배경이
 * 흰색(05 §2.1, 원장님 지시 2026-08-18)이라 **아무것도 안 보였다.** 클래스는 분명히
 * 달라지므로 「선택 표시가 있는가」를 클래스 유무로 물으면 그 시험은 **초록**이다 —
 * 결함이 스스로 신고하지 않는 부류다.
 *
 * 그래서 표현은 **흰 바탕 위에서 반드시 보이는 것**(글자색 + 밑줄)으로 못 박는다.
 * `rowSelection.test.ts` 가 그 성질을 지킨다.
 *
 * ## 왜 카드 어법을 안 쓰나
 *
 * 메인의 `ClassCard` 는 고른 행을 `border-ink` + 파란 인셋으로 나타내는데, 그것은
 * **모든 행에 `border-2`(안 고른 행은 투명)를 깐 한 벌**이다 — 안 그러면 고를 때마다
 * 목록이 2px 씩 들썩인다. `<table border-collapse>` 는 셀별 밑선을 쓰므로 그 한 벌을
 * 그냥 옮길 수 없다. 카드 어법을 표로 가져오는 것은 «재사용»이 아니라 **새 형태**이고,
 * 그건 D-07 시안 절차 대상이다. 여기서는 **이미 표에서 확정된 어법**만 쓴다.
 */

/** 고른 반의 이름 버튼. 흰 바탕에서 보이는 것만 쓴다(글자색·밑줄). */
export const SELECTED_NAME_CLASS = "text-g-blue underline underline-offset-4";

/** 안 고른 반의 이름 버튼 — 누를 수 있음을 hover 로만 알린다. */
export const UNSELECTED_NAME_CLASS = "hover:underline hover:underline-offset-4";

/** 고름 여부에 따른 이름 버튼 클래스. */
export function nameSelectionClass(selected: boolean): string {
  return selected ? SELECTED_NAME_CLASS : UNSELECTED_NAME_CLASS;
}
