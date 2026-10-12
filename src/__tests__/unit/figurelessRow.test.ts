import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { figurelessPointer } from "@/lib/engine/figurelessRow";

/**
 * **그림이 없는데 발문이 그림을 가리키는 행**을 출제에 넣지 않는다 (2026-09-04).
 *
 * 실측 — 적재기가 그림 렌더 실패를 **세기만** 하고 4행을 `directUseAllowed: true` 로
 * 넣었다. 발문은 「그림과 같이 $\triangle ABC$에서…」였고 마지막 줄은
 * 「4,852건 전부 출제허용」이라는 **초록**이었다.
 *
 * 🔴 이 시험은 규칙만 보지 않고 **그 규칙을 두 곳이 같이 쓰는지**도 잠근다 —
 *    넣는 쪽과 이미 넣은 것을 고치는 쪽이 갈리면 한쪽만 고쳐도 아무도 모른다.
 */
const REPO = path.resolve(__dirname, "..", "..", "..");
const read = (p: string): string => readFileSync(path.join(REPO, p), "utf8");

describe("그림 없는데 지면을 가리키는 행", () => {
  // ── 양성 대조군 — 걸려야 하는 것 ──────────────────────────────
  it("그림이 없고 발문이 가리키면 **가리키는 낱말**을 낸다", () => {
    for (const stem of [
      "그림과 같이 $\\triangle ABC$에서 $\\overline{AB}$의 중점을 $M$이라 하자.",
      "다음 그림에서 $x$의 값을 구하시오.",
      "아래 그림과 같은 사다리꼴의 넓이를 구하시오.",
    ]) {
      expect(figurelessPointer(false, stem), stem).not.toBeNull();
    }
  });

  // ── 음성 대조군 — 걸리면 안 되는 것 ───────────────────────────
  //    이것이 없으면 「전부 걸린다」는 판정기도 만점이다(2026-08-20).
  it("그림이 **있으면** 발문이 가리켜도 안 걸린다", () => {
    const stem = "그림과 같이 $\\triangle ABC$에서 넓이를 구하시오.";
    expect(figurelessPointer(true, stem)).toBeNull();
  });

  it("발문이 지면을 **안 가리키면** 그림이 없어도 안 걸린다", () => {
    for (const stem of [
      "$2x+3=7$을 풀어라.",
      "$\\dfrac{3}{4}$과 $\\dfrac{2}{5}$의 합을 구하시오.",
      // 「그림」이라는 낱말이 있어도 지면을 가리키는 것이 아닌 부류 —
      // 이 자리에서 옛 판정기가 오탐을 냈다(2026-08-18 「그림자」·「줄기와 잎 그림」).
      "나무의 그림자의 길이가 $6\\,\\mathrm{m}$일 때 나무의 높이를 구하시오.",
    ]) {
      expect(figurelessPointer(false, stem), stem).toBeNull();
    }
  });

  // ── 배선 — 규칙이 **두 벌이 아니다** ─────────────────────────
  it("넣는 쪽과 잠그는 쪽이 **같은 함수**를 부른다 (규칙이 두 벌이 아니다)", () => {
    for (const file of [
      "scripts/import/load-engine-problems.ts",
      "scripts/qa/lockFigurelessLoadedRows.ts",
    ]) {
      const src = read(file);
      expect(src, `${file} 가 공용 규칙을 안 부른다`).toContain(
        "figurelessPointer(",
      );
      // 🔴 자기 손으로 다시 판정하면(=`pointsAtFigure` 직접 호출) 두 벌이 된다.
      expect(
        src.includes("pointsAtFigure("),
        `${file} 가 규칙을 다시 짓는다`,
      ).toBe(false);
    }
  });

  it("적재기가 그 판정을 **출제허용에 실제로 건다**", () => {
    const src = read("scripts/import/load-engine-problems.ts");
    const review = read("scripts/import/engine-source-references.ts");
    // 세기만 하고 안 걸면 이 결함이 그대로 돌아온다 — 그것이 2026-09-04 의 모양이었다.
    expect(src).toContain("engineSourceReviewState(originProblemId, figureless)");
    expect(src).toContain("...review,");
    expect(review).toContain("directUseAllowed: originProblemId === null && !figureless");
    // 그리고 잠근 수를 **찍는다**(말없는 상한을 만들지 않는다).
    // 🔴 낱말 하나(`lockedFigureless`)만 보면 안 된다 — 그 이름은 세는 자리에도
    //    있어서, **찍는 줄을 통째로 지워도** 초록이었다(변이로 확인했다).
    //    그래서 «찍는 문장 자체»를 문다.
    expect(src).toContain(
      "발문이 그림을 가리켜** 출제에서 뺀 것 ${lockedFigureless}건",
    );
  });
});
