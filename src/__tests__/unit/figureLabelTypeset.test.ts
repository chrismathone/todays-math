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
import { existsSync, readFileSync } from "node:fs";
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

  // ── ④ halo 가 **글자를 먹지 않는가**.
  //
  // 🔴 조판본은 **글자 하나가 `<path>` 하나**다. halo 를 `paint-order="stroke"` 로
  //    주면 그 규칙이 **요소마다** 걸려, 앞 글자를 칠한 뒤 뒤 글자의 굵은 흰 테두리가
  //    그 위를 덮는다 — 실측으로 `7 cm` 이 지면에 **`7 ⟨ m`** 으로 나갔다
  //    (원장님이 화면에서 찾아 주셨다, 2026-08-28). 옛 `<text>` 는 한 요소라
  //    테두리를 통째로 한 번 칠하고 글자를 통째로 얹으므로 이 일이 없었다.
  //
  //    이 부류는 **스스로 신고하지 않는다** — 글자는 그려지고 상자도 그대로다.
  //    여기서는 «순서»를 잠그고, 잉크를 실제로 세는 눈금은 브라우저 판정기에 있다
  //    (`probe-figure-label-collisions.mjs --selftest` ⑪ — 이 시험은 망 없이 돈다).
  it("halo 는 글자 **전체를 한 번** 두르고, 그 위에 글자를 얹는다", () => {
    const laid = typesetLabel("7 cm")!;
    const g = placeLabel(laid, "7 cm", 100, 80, 24, "#111111", {
      color: "#ffffff",
      width: 8,
    })!;
    // `paint-order` 는 **요소마다** 걸리는 규칙이라 여러 글리프에서는 못 쓴다.
    expect(g, "paint-order 로는 글자끼리 서로 지운다").not.toContain(
      "paint-order",
    );
    // 테두리 전용 사본이 **먼저**, 글자 사본이 **나중**.
    const ring = g.indexOf('fill="none" stroke="#ffffff"');
    const glyph = g.indexOf('fill="#111111" stroke="none"');
    expect(ring, "테두리 전용 사본이 없다").toBeGreaterThanOrEqual(0);
    expect(glyph, "글자 사본이 없다").toBeGreaterThanOrEqual(0);
    expect(ring, "테두리가 글자 뒤에 칠해진다 — 글자를 덮는다").toBeLessThan(
      glyph,
    );
    // halo 가 없으면 사본은 하나뿐이다(쓸데없이 두 배로 커지지 않는다).
    const plain = placeLabel(laid, "7 cm", 100, 80, 24, "#111111")!;
    expect(plain).not.toContain('stroke="#ffffff"');
    expect(plain.length).toBeLessThan(g.length);
  });

  // ── ⑤ 파이썬 배치기가 쓰는 **글자 폭 표**가 조판기와 어긋나지 않는가.
  //
  // 🔴 배치기는 라벨 자리를 미리 빼려고 폭을 어림한다. 그 어림이 실제보다 **좁으면**
  //    「자리가 남는다」고 판단해 라벨을 가장자리에 붙이고, 지면에서 잘린다.
  //    종전 어림은 「13pt 에서 8.0/글자」 한 값이었고 MathJax 글꼴에서 34종이 그보다
  //    넓었다 — 실측으로 `12 cm` 의 `1` 과 `timeAdd` 의 `+` 가 잘려 나갔다.
  //
  //    표는 `scripts/qa/build-label-width-table.ts` 가 **정본에서 뽑는다.** 여기서는
  //    그 표가 여전히 **위로만 새는지**(어림 ≥ 실제) 확인한다 — 손으로 고치거나
  //    MathJax 판이 올라가면 빨개진다.
  it("글자 폭 표가 조판기를 **아래로 새지 않고** 감싼다", () => {
    const table = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "scripts", "figure", "label-widths.json"),
        "utf8",
      ),
    ) as {
      safety: number;
      opSpace: number;
      operators: string[];
      default: number;
      widths: Record<string, number>;
    };
    expect(Object.keys(table.widths).length, "표가 비었다").toBeGreaterThan(50);
    const ops = new Set(table.operators);
    const estimate = (text: string): number => {
      const chars = [...text];
      let sum = chars.reduce(
        (a, c) => a + (table.widths[c] ?? table.default),
        0,
      );
      for (let i = 1; i < chars.length - 1; i += 1) {
        if (ops.has(chars[i]!)) sum += table.opSpace;
      }
      return sum * table.safety;
    };
    const short: string[] = [];
    let checked = 0;
    for (const text of [
      "0",
      "12",
      "1000",
      "0.5",
      "12.75",
      "1 cm",
      "6 cm",
      "12 cm",
      "0.5 cm",
      "125 cm",
      "0°",
      "45°",
      "125°",
      "360°",
      "x",
      "A",
      "M",
      "W",
      "AB",
      "ABCD",
      "+",
      "-",
      "×",
      "÷",
      "=",
      "3x°+5°",
      "2x°+40°",
      "x°-9°",
      "10%",
      "sin",
      "cos",
      "1/2",
    ]) {
      // ⚠️ 굵기 **두 갈래를 다** 본다 — 초등 엔진은 라벨을 `font-weight="700"` 으로
      //    내므로 보통 굵기만 재면 그쪽이 통째로 사각지대가 된다(실측 `+` 0.778 → 0.894em).
      for (const bold of [false, true]) {
        const laid = typesetLabel(text, bold);
        if (!laid) continue;
        checked += 1;
        if (estimate(text) < laid.widthEm - 1e-6) {
          short.push(
            `«${text}»${bold ? " (굵게)" : ""} 어림 ${estimate(text).toFixed(4)} < 실제 ${laid.widthEm.toFixed(4)}`,
          );
        }
      }
    }
    expect(checked, "잰 라벨이 없다 — 이 검사가 죽었다").toBeGreaterThan(50);
    expect(short, short.join("\n")).toEqual([]);
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

    /**
     * **라벨이 지면 밖으로 나가지 않는가.**
     *
     * 🔴 엔진의 `_body_bbox` 는 `<text>` 를 **닻점 하나**로 셌다. 그래서 글자가
     *    viewBox 밖으로 나가도 **아무 에러가 안 났다** — 실측으로 `12 cm` 의 `1` 이
     *    왼쪽으로 5.24단위 잘려 나가고 있었다(원장님 지적 2026-08-28, `netCuboid` 계열).
     *
     *    조판된 라벨은 제 폭·높이를 스스로 말하므로(`data-w`·`data-a`·`data-d`)
     *    **정확히** 잴 수 있다. halo 는 흰색이라 밖으로 나가도 안 보이니 **잉크만** 센다.
     */
    it("조판된 라벨이 지면(viewBox) 밖으로 나가지 않는다", async () => {
      const out: string[] = [];
      let measured = 0;
      const seen = new Set<string>();
      const scan = (svg: string, where: string) => {
        const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
        if (!vb) return;
        const W = Number(vb[1]);
        const H = Number(vb[2]);
        for (const l of svgLabels(svg)) {
          if (l.width === null) continue; // 조판 안 된 글은 폭을 브라우저가 정한다
          measured += 1;
          const left =
            l.anchor === "start"
              ? l.x
              : l.anchor === "end"
                ? l.x - l.width
                : l.x - l.width / 2;
          const over = [
            ["왼쪽", -left],
            ["오른쪽", left + l.width - W],
            ["위", -(l.baseline - (l.ascent ?? 0))],
            ["아래", l.baseline + (l.descent ?? 0) - H],
          ] as const;
          for (const [side, gap] of over) {
            if (gap > 0.01) {
              out.push(
                `${where}: «${l.text}» ${side}으로 ${gap.toFixed(2)} 나갔다`,
              );
            }
          }
        }
      };
      for (const unit of elementaryUnits()) {
        for (let seed = 1; seed <= 6; seed += 1) {
          let p;
          try {
            p = generateElementaryProblem(unit, seed);
          } catch {
            continue;
          }
          const spec = p?.figureSpec as Record<string, unknown> | undefined;
          if (!spec) continue;
          const tag = `${spec.kind}|${seed}`;
          if (seen.has(tag)) continue;
          seen.add(tag);
          const r = await renderFigureSpec(spec);
          if (r.ok) scan(r.svg, `초등 ${spec.kind}`);
        }
      }
      // ⚠️ **변형까지 돈다.** 씨앗 하나·변형 0만 보면 원장님이 찾으신 바로 그 자리
      //    (`netCuboid` 씨앗 2·변형 1의 `12 cm`)가 표본에 **안 들어온다** — 그러면
      //    이 가드는 그 결함을 구조적으로 못 본다.
      for (const { key } of registeredTypes()) {
        for (let seed = 1; seed <= 4; seed += 1) {
          for (let v = 0; v < 3; v += 1) {
            let p;
            try {
              p = generateMiddleProblem(key, seed, v);
            } catch {
              continue;
            }
            const spec = p.figureSpec as Record<string, unknown> | undefined;
            if (!spec) continue;
            const tag = `중${spec.kind ?? spec.version}|${seed}|${v}`;
            if (seen.has(tag)) continue;
            seen.add(tag);
            const r = await renderFigureSpec(spec);
            if (r.ok) scan(r.svg, `중등 ${key}`);
          }
        }
      }
      // 분모 — 잰 라벨이 0이면 이 시험은 아무것도 못 잰다(실측 500자리 이상).
      expect(measured, "잰 라벨이 없다 — 이 검사가 죽었다").toBeGreaterThan(
        300,
      );
      expect([...new Set(out)], out.join("\n")).toEqual([]);
    }, 600_000);

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
