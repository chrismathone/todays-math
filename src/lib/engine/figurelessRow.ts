import { pointsAtFigure } from "@/lib/middle/figureReference";

/**
 * **그림이 없는데 발문이 그림을 가리키는가** — 그러면 종이에서 못 푸는 문항이다.
 *
 * 2026-09-04 실측 — 적재기가 그림 렌더 실패를 **세기만** 하고 그 4행을
 * `directUseAllowed: true` 로 넣었다. 발문은 「그림과 같이 $\triangle ABC$에서…」였고,
 * 적재 마지막 줄은 「4,852건 전부 출제허용」이라는 **초록**이었다.
 *
 * 🔴 **이 규칙이 두 곳에 필요하다** — 넣을 때(`load-engine-problems.ts`)와
 * 이미 넣은 것을 고칠 때(`scripts/qa/lockFigurelessLoadedRows.ts`). 두 벌로 두면
 * 한쪽만 고쳐도 아무도 모른다(2026-08-18 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를
 * 두 곳이 쓰게 하라」). 그래서 **여기 하나**를 둘이 부른다.
 *
 * ⚠️ 「그림이 있나」(`hasFigure`)는 부르는 쪽이 정한다 — 넣을 때는 방금 렌더가 낸 SVG 고,
 *    고칠 때는 DB 의 `figureSvg`·`figureUrls` 다. **그 둘은 다른 자료**다.
 *    같아야 하는 것은 「가리키나」이고, 그건 `pointsAtFigure` 한 곳이다.
 *
 * @returns 가리키는 낱말(예: `"그림과 같이"`). 문제 없으면 `null`.
 */
export function figurelessPointer(
  hasFigure: boolean,
  content: string,
): string | null {
  if (hasFigure) return null;
  return pointsAtFigure(content);
}
