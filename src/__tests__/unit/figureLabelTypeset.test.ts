/**
 * **그림 라벨 조판이 새는 자리가 없는가** (원장님 지시 2026-08-28 「전학년 mathjax」).
 *
 * ## 왜 이 파일이 따로 있나
 *
 * 라벨을 내는 자리는 한 곳이 아니다 — `elementary.py`·`elem_advanced.py`·
 * `figure_svg.py`·`figure_assets.py`·`figure_scene.py` 에 흩어져 있다. 처음에는
 * `<text` 를 손으로 찾아 네 자리에 표식을 달았는데 **아홉 자리를 놓쳤고**, 그
 * 그림들은 조판 없이 나가고 있었다. 그 결함은 **스스로 신고하지 않는다** — 글자가
 * 그려지긴 하므로 에러도, 빈 지면도 없다. 원장님이 종이에서 찾아 주실 때까지 아무도
 * 모른다(이 저장소가 여러 번 밟은 자리).
 *
 * 그래서 「무엇이 라벨을 내는가」를 **미리 정하지 않고** 나온 SVG 를 전량 훑어 센다.
 * 새 emitter 가 생겨도 여기가 잡는다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import { placeLabel, typesetLabel } from "@/lib/figure/mathjaxLabel";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { stripLabels, svgLabels } from "@/lib/figure/svgLabels";

const hasFigureEngine =
  existsSync(path.join(process.cwd(), "vendor", "figure-engine")) ||
  existsSync(process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기");

/** 한글·한자·가나. 이 글자가 든 라벨은 TeX 글꼴에 글리프가 없어 **일부러** 안 바꾼다. */
const CJK_RE = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯]/;

describe("[도형] 라벨 조판", () => {
  // ── ① 눈금 — MathJax 가 **실제로 도는가**. 이게 없으면 아래 「0건」이
  //    「깨끗」인지 「조판이 아예 안 돈다」인지 안 갈린다.
  it("조판이 살아 있다 — 아는 글이 실제로 글리프가 된다", () => {
    const laid = typesetLabel("125°");
    expect(laid, "MathJax 가 «125°» 를 조판하지 못했다").toBeTruthy();
    expect(laid!.widthEm).toBeGreaterThan(0.5);
    expect(laid!.ascentEm).toBeGreaterThan(0.3);
    expect(laid!.inner).toContain("<path");
    // 글꼴이 필요 없어야 한다 — 지면·프린터·다른 OS 에서 같게 나오는 근거다.
    expect(laid!.inner).not.toContain("<text");
  });

  // ── ② 음성 대조 — 한글은 **안** 조판한다. 이게 빠지면 ①만으로는
  //    「무엇이든 조판한다」는 판정기도 만점이다.
  it("글리프가 없는 글은 조판하지 않는다 — 뒤집힌 글자가 나가면 안 된다", () => {
    for (const label of ["가", "ㄱ", "바닐라", "㎠", "④"]) {
      expect(typesetLabel(label), `«${label}» 을 조판했다`).toBeNull();
    }
  });

  // ── ③ 자리·크기·닻을 **되물을 수 있는가**. 조판하면 글자가 한 톨도 안 남으므로
  //    이 속성이 없으면 시험도 판정기도 라벨을 영영 못 찾는다.
  it("조판된 라벨은 제 자리와 치수를 스스로 말한다", () => {
    const laid = typesetLabel("5 cm")!;
    const g = placeLabel(laid, "5 cm", 40, 90, 12, "#111111", {
      color: "#ffffff",
      width: 8,
    })!;
    const [label] = svgLabels(g);
    expect(label).toBeTruthy();
    expect(label!.text).toBe("5 cm");
    expect(label!.x).toBe(40);
    expect(label!.y).toBe(90);
    expect(label!.fontSize).toBe(12);
    expect(label!.halo).toBe(8);
    expect(label!.typeset).toBe(true);
    expect(label!.width).toBeGreaterThan(0);
    // 라벨 덩어리를 걷어내면 아무것도 안 남는다 — 기하를 훑는 검사가 글자 외곽선을
    // 도형으로 세지 않으려면 이 성질이 필요하다.
    expect(stripLabels(g).trim()).toBe("");
  });

  describe.skipIf(!hasFigureEngine)("실렌더 — 새는 자리가 없다", () => {
    /**
     * 나온 SVG 의 `<text>` 를 전량 훑어 **표식 없이 나가는 라벨**을 센다.
     * 「어느 파일이 라벨을 내는가」를 묻지 않는다 — 물으면 그 목록이 곧 사각지대다.
     */
    const bare = (svg: string): string[] =>
      [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)]
        .filter((m) => !m[1]!.includes("data-mj=") && m[2]!.trim())
        .map((m) => m[2]!.trim());

    it("초등 — 조판할 수 있는 라벨이 표식 없이 나가지 않는다", async () => {
      const missed: string[] = [];
      const seen = new Set<string>();
      let typeset = 0;
      let kept = 0;
      for (const unit of elementaryUnits()) {
        for (let seed = 1; seed <= 4; seed += 1) {
          let p;
          try {
            p = generateElementaryProblem(unit, seed);
          } catch {
            continue;
          }
          const spec = p?.figureSpec as Record<string, unknown> | undefined;
          if (!spec) continue;
          const kind = String(spec.kind ?? "");
          if (seen.has(kind)) continue;
          const r = await renderFigureSpec(spec);
          if (!r.ok) continue;
          seen.add(kind);
          for (const t of bare(r.svg)) missed.push(`${kind}: ${t}`);
          for (const l of svgLabels(r.svg)) {
            if (l.typeset) typeset += 1;
            else kept += 1;
          }
        }
      }
      // 분모 — 표본이 실제로 그림을 밟았는가. 0이면 이 시험은 아무것도 못 잰다.
      // 종류마다 **한 장**만 그리므로(같은 kind 를 되풀이해도 새 사각지대가 안 생긴다)
      // 자리 수는 크지 않다 — 실측 조판 71 · 그대로 25. 바닥만 못 박는다.
      expect(seen.size, "초등 그림 종류를 하나도 못 그렸다").toBeGreaterThan(
        20,
      );
      expect(typeset, "조판된 라벨이 하나도 없다").toBeGreaterThan(40);
      expect(
        kept,
        "한글 라벨이 하나도 없다 — 음성 쪽 표본이 비었다",
      ).toBeGreaterThan(10);
      expect([...new Set(missed)], missed.join("\n")).toEqual([]);
    }, 300_000);

    it("중등 — 조판할 수 있는 라벨이 표식 없이 나가지 않는다", async () => {
      const missed: string[] = [];
      const seen = new Set<string>();
      let typeset = 0;
      for (const { key } of registeredTypes()) {
        for (let seed = 1; seed <= 2; seed += 1) {
          let p;
          try {
            p = generateMiddleProblem(key, seed, 0);
          } catch {
            continue;
          }
          const spec = p.figureSpec as Record<string, unknown> | undefined;
          if (!spec) continue;
          const tag = `${spec.kind ?? spec.version}`;
          if (seen.has(tag)) continue;
          const r = await renderFigureSpec(spec);
          if (!r.ok) continue;
          seen.add(tag);
          for (const t of bare(r.svg)) missed.push(`${key}: ${t}`);
          typeset += svgLabels(r.svg).filter((l) => l.typeset).length;
        }
      }
      expect(seen.size, "중등 그림을 하나도 못 그렸다").toBeGreaterThan(3);
      expect(typeset, "조판된 라벨이 하나도 없다").toBeGreaterThan(5);
      expect([...new Set(missed)], missed.join("\n")).toEqual([]);
    }, 300_000);

    it("한글 라벨은 **그대로** 나가고, 그 자리에 조판이 끼지 않는다", async () => {
      const r = await renderFigureSpec({
        version: "elem-1",
        kind: "barChart",
        values: [
          { label: "사과", value: 14 },
          { label: "배", value: 8 },
        ],
        yMax: 18,
        yLabel: "명",
      });
      expect(r.ok, r.ok ? "" : r.error).toBe(true);
      if (!r.ok) return;
      for (const l of svgLabels(r.svg)) {
        expect(
          l.typeset,
          `«${l.text}» 은 ${CJK_RE.test(l.text) ? "한글인데 조판됐다" : "조판됐어야 한다"}`,
        ).toBe(!CJK_RE.test(l.text));
      }
    }, 60_000);
  });
});
