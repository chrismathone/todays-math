/**
 * **기출 2단 지면의 단 나눔.** 잰 높이를 받아 「어느 문항이 어느 단에 앉는가」만 정한다.
 *
 * ## 왜 자습 분할기(`packProblems`)를 안 쓰나
 *
 * 자습 지면은 **「한 장에 문항 둘」**이 전제다 — `.problemItem` 이 `flex: 1 1 0%` 라
 * 칸이 «그 장에 몇 개인가»로 나뉘고, 실측 칸도 「하나/둘」 두 가지뿐이다.
 * 2단 기출 지면은 단 높이가 **고정**이고 한 단에 들어가는 만큼 들어간다.
 * 성질이 다르므로 규칙도 다르다 — 임계값을 물려받을 때는 분모가 같은지부터
 * 봐야 한다(CLAUDE.md 2026-08-17).
 *
 * ## 이 함수가 **모르는 것**
 *
 * 높이를 어떻게 재는지 모른다(`heightOf` 로 받는다). 그래서 자가 바뀌어도 이 규칙은
 * 그대로다. 반대로 이 함수는 자를 검증하지 못하므로, 자는 **지면에서 실측**해
 * 따로 채점한다(`scripts/qa/measure-exam-paper-units.tsx`).
 *
 * ## 규칙
 *
 * 읽기 순서대로 앞에서 채운다. 지금 단에 안 들어가면 다음 단, 단이 다 차면 새 장.
 * 뒤 문항을 앞으로 당기지 않는다 — 시험지는 번호 순서로 읽는다.
 *
 * ⚠️ **한 단을 통째로 써도 안 들어가는 문항은 그래도 앉힌다.** 빼면 시험지에서
 *    문항이 사라지고, 사라진 것은 아무도 못 본다. 대신 `tooTall` 로 알려 부르는
 *    쪽이 경고하게 한다(자습 분할기가 같은 자리에서 내린 판단이다).
 */

export interface ColumnGeometry {
  /** 첫 장 한 단의 높이(px). 머리말이 얹혀 이어지는 장보다 좁다. */
  firstPageColumnPx: number;
  /** 이어지는 장 한 단의 높이(px). */
  continuationColumnPx: number;
  /** 한 장의 단 수. */
  columnsPerPage: number;
  /** 문항 **사이** 여백(px). 단의 마지막 문항 뒤에는 안 붙는다. */
  gapPx: number;
}

export interface PackedColumnPage<T> {
  /** 단마다의 문항. 길이는 늘 `columnsPerPage` — 빈 단은 빈 배열이다. */
  columns: T[][];
}

export interface PackedColumns<T> {
  pages: PackedColumnPage<T>[];
  /**
   * 한 단을 통째로 써도 안 들어가는 문항. **버린 것이 아니라 앉힌 것**이고,
   * 부르는 쪽이 원장님께 알려야 하는 목록이다.
   */
  tooTall: T[];
}

export function packColumns<T>(
  items: readonly T[],
  heightOf: (item: T) => number,
  geometry: ColumnGeometry,
): PackedColumns<T> {
  const { firstPageColumnPx, continuationColumnPx, columnsPerPage, gapPx } =
    geometry;

  const pages: PackedColumnPage<T>[] = [];
  const tooTall: T[] = [];
  if (items.length === 0) return { pages, tooTall };

  const emptyPage = (): T[][] =>
    Array.from({ length: Math.max(1, columnsPerPage) }, () => []);

  let columns = emptyPage();
  let columnIndex = 0;
  let used = 0;

  /** 지금 열려 있는 장이 첫 장인가 — 아직 `pages` 에 안 밀어 넣었으므로 길이로 본다. */
  const columnPx = () =>
    pages.length === 0 ? firstPageColumnPx : continuationColumnPx;

  const nextColumn = () => {
    columnIndex += 1;
    used = 0;
    if (columnIndex >= columns.length) {
      pages.push({ columns });
      columns = emptyPage();
      columnIndex = 0;
    }
  };

  for (const item of items) {
    const px = heightOf(item);

    // ① 지금 단에 안 들어가면 자리를 옮긴다. 여기서는 아직 「혼자 써야 하는가」를
    //    묻지 않는다 — 🔴 첫 장 단(좁다)으로 그걸 굳히면, 이어지는 장에서는
    //    **들어가는데도** 옆자리를 비운 채로 옮겨 가 단마다 한 문항씩 빈다.
    if (used > 0 && used + gapPx + px > columnPx()) nextColumn();

    columns[columnIndex]!.push(item);
    used = used === 0 ? px : used + gapPx + px;

    // ② 자리를 정한 **뒤에** 그 단 기준으로 묻는다. 한 단을 통째로 써도 안 들어가면
    //    앉히되 **알린다** — 빼면 시험지에서 문항이 사라지고, 사라진 것은 아무도 못 본다.
    //
    //    옆에 아무도 안 앉는 것은 여기서 단을 넘겨서가 아니라 **산술로** 그렇다:
    //    이 가지에 들어왔다면 넣기 전 `used` 가 0 이었다(0 이 아니었다면 ①을 지나
    //    그 단에 들어간다는 뜻이고, 그러면 `px < columnPx()` 라 여기 못 온다).
    //    그래서 지금 `used === px > columnPx()` 이고, 다음 문항은 무엇이든 ①에서 넘어간다.
    //
    // ⚠️ 예전에는 여기서 `nextColumn()` 을 한 번 더 불렀다. 변이 시험이 **그 줄을 지워도
    //    산출물이 한 글자도 안 바뀌는 것**을 보여 줬다 — 위 산술과 대수적으로 같은 말이라
    //    아무것도 더 안 갈랐다. 장식은 지운다(CLAUDE.md 2026-08-18 「죽은 검사」).
    if (px > columnPx()) tooTall.push(item);
  }

  // 마지막 장은 다 안 찼어도 내보낸다 — 안 내보내면 문항이 조용히 사라진다.
  if (columns.some((col) => col.length > 0)) pages.push({ columns });

  return { pages, tooTall };
}
