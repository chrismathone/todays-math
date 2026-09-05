/**
 * **기출 2단 지면의 단 나눔** — 절대 규칙 2(TDD) 로 먼저 쓴다.
 *
 * 원장님이 「기출시험지용 폼을 2단으로」라 하셨고, Wire → **C 머리띠형**,
 * Hi-fi → **H2 금색 톤 띠**를 고르셨다(2026-09-05). 그 폼을 실제 인쇄로 옮기려면
 * 「어느 문항이 어느 단에 앉는가」를 정하는 자리가 필요하다.
 *
 * ## 🔴 왜 `packProblems` 를 못 쓰나
 *
 * 자습 지면의 분할기는 **「한 장에 문항 둘」**을 전제한다. 칸 실측
 * (`JASEUP_MEASURED_PX`)도 「그 장에 하나/둘」 두 가지뿐이고, `.problemItem` 이
 * `flex: 1 1 0%` 라 칸이 **개수로** 나뉜다. 2단 기출 지면은 그 어느 것도 아니다 —
 * 단 높이가 고정이고, 한 단에 문항이 몇 개든 들어가는 만큼 들어간다.
 * 형태가 다르므로 규칙도 다르다. 억지로 물려받으면 분모가 다른 임계값을
 * 물려받는 그 함정이다(CLAUDE.md 2026-08-17).
 *
 * ## 이 파일이 지키는 것
 *
 * 높이를 **어떻게 재는가**는 여기 없다 — 그건 자의 몫이고 따로 검증한다.
 * 여기서 지키는 것은 **「잰 높이를 받아 어떻게 앉히는가」** 하나다. 그래야
 * 자가 바뀌어도 이 규칙은 그대로고, 규칙이 바뀌면 여기가 빨개진다.
 *
 * ## 🔴 조용히 버리지 않는다
 *
 * 한 단을 통째로 써도 안 들어가는 문항이 있다. 그때 **빼면 시험지에서 문항이
 * 사라지고**, 사라진 것은 아무도 못 본다. 그래서 넣되 `tooTall` 로 **알린다** —
 * 자습 분할기가 「혼자 놓아도 안 들어가는 문항은 그래도 혼자 놓는다」로 정한 것과
 * 같은 판단이다(경고는 판정기가 따로 한다).
 */
import { describe, expect, it } from "vitest";

import { packColumns } from "@/lib/print/packColumns";

interface Item {
  id: string;
  px: number;
}

const 자 = (item: Item) => item.px;

/** 첫 장은 머리말이 얹혀 좁고, 이어지는 장은 넓다 — 자습 지면과 같은 성질이다. */
const GEOM = {
  firstPageColumnPx: 800,
  continuationColumnPx: 1000,
  columnsPerPage: 2,
  gapPx: 20,
} as const;

const 문항 = (id: string, px: number): Item => ({ id, px });

/** 앉은 순서대로 편 id 목록. 「하나도 안 잃었나」를 이걸로 본다. */
function flatIds(pages: readonly (readonly (readonly Item[])[])[]): string[] {
  return pages.flatMap((page) => page.flatMap((col) => col.map((i) => i.id)));
}

describe("packColumns — 기출 2단 지면의 단 나눔", () => {
  it("빈 입력은 빈 결과다 — 빈 장을 만들지 않는다", () => {
    const got = packColumns([], 자, GEOM);
    expect(got.pages).toEqual([]);
    expect(got.tooTall).toEqual([]);
  });

  it("한 단에 들어가면 첫 단에만 앉는다", () => {
    const got = packColumns([문항("a", 300), 문항("b", 300)], 자, GEOM);
    expect(got.pages).toHaveLength(1);
    expect(got.pages[0]!.columns[0]!.map((i) => i.id)).toEqual(["a", "b"]);
    expect(got.pages[0]!.columns[1]).toEqual([]);
  });

  it("단이 차면 다음 단으로 넘어간다", () => {
    // 첫 장 단 800. 500 + 20(사이) + 500 = 1020 > 800 이므로 둘째는 다음 단.
    const got = packColumns([문항("a", 500), 문항("b", 500)], 자, GEOM);
    expect(got.pages).toHaveLength(1);
    expect(got.pages[0]!.columns[0]!.map((i) => i.id)).toEqual(["a"]);
    expect(got.pages[0]!.columns[1]!.map((i) => i.id)).toEqual(["b"]);
  });

  it("두 단이 다 차면 새 장을 연다", () => {
    const got = packColumns(
      [문항("a", 500), 문항("b", 500), 문항("c", 500)],
      자,
      GEOM,
    );
    expect(got.pages).toHaveLength(2);
    expect(flatIds(got.pages.map((p) => p.columns))).toEqual(["a", "b", "c"]);
    expect(got.pages[1]!.columns[0]!.map((i) => i.id)).toEqual(["c"]);
  });

  it("🔴 첫 장 단 높이를 이어지는 장에 쓰지 않는다", () => {
    // 900 은 첫 장 단(800)에는 안 들어가지만 이어지는 장 단(1000)에는 들어간다.
    // 두 값을 하나로 뭉개면 이 문항이 «어디서나 안 들어가는 것»이 되어
    // `tooTall` 로 새고, 지면은 반쯤 빈 채로 나간다.
    const got = packColumns(
      [문항("a", 700), 문항("b", 700), 문항("c", 900)],
      자,
      GEOM,
    );
    expect(got.tooTall).toEqual([]);
    expect(got.pages[1]!.columns[0]!.map((i) => i.id)).toEqual(["c"]);
  });

  it("🔴 첫 장 단이 **좁다**는 것을 실제로 쓴다", () => {
    // 900 은 첫 장 단(800)에 안 들어간다. 두 값을 하나로 뭉개면(둘 다 1000 으로 보면)
    // 이 문항이 «들어가는 것»이 되어 `tooTall` 이 비고, 50 짜리가 그 아래 앉는다 —
    // 종이에서는 둘이 **겹쳐 찍힌다**.
    //
    // ⚠️ 이 시험은 변이가 찾아 줬다. 앞서 쓴 「첫 장 단 높이를 이어지는 장에 쓰지
    //    않는다」는 뭉개도 초록이었다 — 그 표본에서는 넓게 봐도 결과가 같았다.
    const got = packColumns([문항("큰", 900), 문항("작", 50)], 자, GEOM);
    expect(got.tooTall.map((i) => i.id)).toEqual(["큰"]);
    expect(got.pages[0]!.columns[0]!.map((i) => i.id)).toEqual(["큰"]);
    expect(got.pages[0]!.columns[1]!.map((i) => i.id)).toEqual(["작"]);
  });

  it("🔴 사이 여백을 **세지 않으면** 두 문항이 겹친다", () => {
    // 400 + 20(사이) + 400 = 820 > 800 이라 둘째는 다음 단이어야 한다.
    // 여백을 안 세면 800 이 딱 맞아 보여 한 단에 앉고, 종이에서는 20px 이 겹친다.
    // (위 「딱 맞는다」 시험과 짝이다 — 390 쌍은 들어가고 400 쌍은 안 들어간다.
    //  둘이 같이 있어야 여백이 **정확히 20** 이라는 것이 못 박힌다.)
    const got = packColumns([문항("a", 400), 문항("b", 400)], 자, GEOM);
    expect(got.pages[0]!.columns[0]!.map((i) => i.id)).toEqual(["a"]);
    expect(got.pages[0]!.columns[1]!.map((i) => i.id)).toEqual(["b"]);
  });

  it("🔴 다음 장에서 들어가게 된 문항은 단을 통째로 먹지 않는다", () => {
    // c(900)는 첫 장 단(800)에는 안 들어가지만 이어지는 장 단(1000)에는 들어간다.
    // 「안 들어간다」를 **옮기기 전** 단으로 판정하면 c 가 «혼자 써야 하는 문항»으로
    // 굳어, 옮겨 간 뒤에도 옆자리를 비운다 — 단마다 한 문항씩 빈다.
    const got = packColumns(
      [문항("a", 700), 문항("b", 700), 문항("c", 900), 문항("d", 50)],
      자,
      GEOM,
    );
    expect(got.pages[1]!.columns[0]!.map((i) => i.id)).toEqual(["c", "d"]);
  });

  it("🔴 단보다 큰 문항도 버리지 않는다 — 제 단에 앉히고 tooTall 로 알린다", () => {
    const got = packColumns(
      [문항("a", 300), 문항("커", 4000), 문항("b", 300)],
      자,
      GEOM,
    );
    expect(flatIds(got.pages.map((p) => p.columns))).toEqual(["a", "커", "b"]);
    expect(got.tooTall.map((i) => i.id)).toEqual(["커"]);
    // 제 단을 통째로 쓴다 — 옆에 아무도 안 앉힌다(앉히면 그 문항까지 겹쳐 찍힌다).
    const 큰단 = got.pages
      .flatMap((p) => p.columns)
      .find((col) => col.some((i) => i.id === "커"));
    expect(큰단!.map((i) => i.id)).toEqual(["커"]);
  });

  it("🔴 읽기 순서를 지키고 하나도 안 잃는다", () => {
    const items = Array.from({ length: 40 }, (_, i) =>
      문항(`q${i + 1}`, 120 + ((i * 137) % 700)),
    );
    const got = packColumns(items, 자, GEOM);
    expect(flatIds(got.pages.map((p) => p.columns))).toEqual(
      items.map((i) => i.id),
    );
  });

  it("사이 간격은 **사이에만** 든다 — 마지막 뒤에는 안 붙는다", () => {
    // 390 × 2 + 사이 20 = 800 → 딱 맞는다. 마지막 뒤에도 20 을 세면 820 이 되어
    // 둘째가 헛되이 다음 단으로 밀린다(단마다 한 문항씩 빈다).
    const got = packColumns([문항("a", 390), 문항("b", 390)], 자, GEOM);
    expect(got.pages[0]!.columns[0]!.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("한 장의 단 수는 기하가 정한다 — 2단이라고 박아 두지 않는다", () => {
    const got = packColumns(
      [문항("a", 500), 문항("b", 500), 문항("c", 500)],
      자,
      {
        ...GEOM,
        columnsPerPage: 3,
      },
    );
    expect(got.pages).toHaveLength(1);
    expect(got.pages[0]!.columns).toHaveLength(3);
  });

  it("모든 장의 단 배열 길이는 늘 columnsPerPage 다 — 빈 단은 빈 배열", () => {
    const got = packColumns([문항("a", 100)], 자, GEOM);
    expect(got.pages[0]!.columns).toHaveLength(2);
    expect(got.pages[0]!.columns[1]).toEqual([]);
  });
});
