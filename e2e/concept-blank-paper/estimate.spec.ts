import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { GEOMETRY } from "../../src/components/concept-blank/paper/paginate";
import { textEm } from "../../src/components/concept-blank/paper/text";
import { openSet } from "./measure";

/**
 * 쪽 나누기 어림의 자 — `paginate.ts` 는 DOM 을 재지 않고 글자 수로 높이를 어림한다. **어림이 실제보다 작으면 넘친다.**
 * 그래서 어림과 실제를 덩이마다 맞대어 «어림 ≥ 실제»를 잠근다(넘침 검사는 결과만 본다 — 여기는 원인을 본다).
 *
 *  ① 글자 폭 — `textEm` 이 잡은 폭이 지면 명조 · 고딕의 실제 폭보다 작지 않다(글자 갈래마다)
 *  ② 덩이 높이 — B 용어 · ○× · C 문장 · 적용 · 채점표 줄의 어림 ≥ 늘어나지 않은 실제 높이
 *  ③ 몸 높이 — `GEOMETRY.bodyFirst · bodyNext · keyFirst · keyNext` ≤ 잰 몸 높이(가장 낮은 장)
 */
const OUT = path.join(process.cwd(), "test-results", "concept-blank-paper");

const SETS = [
  "worst",
  "worst-m",
  "real-e3",
  "real-e4",
  "real-e5",
  "real-e6",
  "real-m1",
  "real-m3",
  "stress",
  "math",
  "cal",
  "fuzz&seed=1",
  "fuzz&seed=2",
];

test("글자 폭 — textEm 은 지면 글꼴의 실제 폭보다 작지 않다", async ({
  page,
}) => {
  await openSet(page, "fixture", "student");
  // 아스키 전부 + 은행에 나오는 기호 + 한글. 글자마다 열 번 이어 써서 재고 10 으로 나눈다(띄어쓰기는 «가» 사이에 끼워)
  const chars = [
    ...Array.from({ length: 0x7f - 0x21 }, (_, i) =>
      String.fromCharCode(0x21 + i),
    ),
    ..."가힣·×÷°→←↔○△□◇●▲■㎝㎞㎡㎥㎏²³½¼…—–‘’“”≤≥≠±√π∠⊥∥△≡∽①⑳".split(""),
  ];
  const measured = await page.evaluate((chars) => {
    const host = document.querySelector<HTMLElement>("[data-print-page]")!;
    const span = document.createElement("span");
    span.style.cssText =
      "position:absolute;visibility:hidden;white-space:pre;font-size:100px;line-height:1;";
    host.append(span);
    const faces = ["var(--paper-font-serif)", "var(--paper-font-sans)"];
    const width = (text: string) => {
      span.textContent = text;
      return span.getBoundingClientRect().width / 100;
    };
    const out: Record<string, number> = {};
    for (const family of faces)
      for (const weight of [400, 700, 800, 900]) {
        span.style.fontFamily = family;
        span.style.fontWeight = String(weight);
        for (const ch of chars)
          out[ch] = Math.max(out[ch] ?? 0, width(ch.repeat(10)) / 10);
        out[" "] = Math.max(
          out[" "] ?? 0,
          (width("가 가 가 가 가 가") - width("가가가가가가")) / 5,
        );
      }
    span.remove();
    return out;
  }, chars);

  const rows = Object.entries(measured).map(([ch, actual]) => ({
    ch,
    est: Math.round(textEm(ch) * 1000) / 1000,
    actual: Math.round(actual * 1000) / 1000,
  }));
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, "glyph-widths.json"),
    JSON.stringify(rows, null, 2),
  );
  const under = rows
    .filter((r) => r.actual > r.est + 0.005)
    .map(
      (r) => `${JSON.stringify(r.ch)}: 어림 ${r.est}em < 실제 ${r.actual}em`,
    );
  expect(under).toEqual([]);
});

test("숫자 폭 — 고딕은 같은 폭(tabular-nums) · 지면 명조에는 그 기능이 없다", async ({
  page,
}) => {
  await openSet(page, "fixture", "student");
  const widths = await page.evaluate(() => {
    // 지면(`.page` — tabular-nums 를 물려준다) 안에서 잰다
    const host = document.querySelector<HTMLElement>("[data-cb-page]")!;
    const span = document.createElement("span");
    span.style.cssText =
      "position:absolute;visibility:hidden;white-space:pre;font-size:100px;line-height:1;";
    host.append(span);
    const out: Record<string, number[]> = {};
    for (const [face, family] of [
      ["serif", "var(--paper-font-serif)"],
      ["sans", "var(--paper-font-sans)"],
    ] as const)
      for (const weight of [400, 800]) {
        span.style.fontFamily = family;
        span.style.fontWeight = String(weight);
        out[`${face}-${weight}`] = "0123456789".split("").map((d) => {
          span.textContent = d.repeat(10);
          return Math.round(span.getBoundingClientRect().width) / 1000;
        });
      }
    const numeric = getComputedStyle(host).fontVariantNumeric;
    span.remove();
    return { numeric, out };
  });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, "digit-widths.json"),
    JSON.stringify(widths, null, 2),
  );
  expect(widths.numeric).toContain("tabular-nums");
  const spread = (face: string) =>
    Math.max(...widths.out[face]!) - Math.min(...widths.out[face]!);
  // 고딕(채점표 번호 · 맞은 개수 칸 · 쪽 번호)은 숫자 열 개가 같은 폭이다
  expect(spread("sans-400")).toBeLessThanOrEqual(0.002);
  expect(spread("sans-800")).toBeLessThanOrEqual(0.002);
  // 🔴 지면 명조(NotoSerifKR 서브셋)에는 같은 폭 숫자(tnum)가 **없다** — «1» 만 0.09em 좁다(잰 값 0.471 · 나머지 0.557).
  //    그래서 명조 숫자(«문 12»)의 자리 맞춤은 글꼴이 아니라 **고정 폭 번호 열**(`--cb-num`)이 한다(overflow.spec 가 잠근다).
  //    글꼴에 기능이 생기면 이 값이 0 이 된다 — 그때 이 줄을 «같다»로 바꾼다.
  expect(spread("serif-400")).toBeGreaterThan(0.05);
});

for (const set of SETS) {
  test(`${set} — 덩이마다 어림 ≥ 실제 · 몸 높이`, async ({ page }) => {
    await openSet(page, set);
    const bodies = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-cb-page]")].map(
        (sheet) => {
          const fit = sheet.querySelector<HTMLElement>("[data-cb-fit]")!;
          const thead = sheet.querySelector("thead");
          const notes = sheet.querySelector("[data-cb-notes]");
          return {
            part: sheet.dataset.cbPart!,
            form: sheet.dataset.cbSheet!,
            first: sheet.dataset.cbPage === "1",
            // 채점표는 표 머리 · 채점 안내 상자를 뺀 자리가 줄 칸이다(상자 높이는 `notesCost` 가 따로 센다)
            body:
              fit.getBoundingClientRect().height -
              (thead?.getBoundingClientRect().height ?? 0) +
              (notes
                ? notes.getBoundingClientRect().height +
                  parseFloat(getComputedStyle(notes).marginTop)
                : 0),
          };
        },
      ),
    );
    // 늘어나는 칸을 멈춰 «가장 낮은 높이»를 잰다
    await page.addStyleTag({
      content:
        "[data-cb-item]{flex:none !important;} [data-cb-item] [data-cb-ruled]{flex:none !important;}",
    });
    const actual = await page.evaluate(() => {
      const h = (el: Element) => el.getBoundingClientRect().height;
      const gap = (el: Element) =>
        el.matches("[data-cb-item='sentence']")
          ? 4
          : el.matches("[data-cb-item='apply']")
            ? 12
            : 0;
      return {
        items: [
          ...document.querySelectorAll(
            "[data-cb-item='term'],[data-cb-item='ox'],[data-cb-item='sentence'],[data-cb-item='apply']",
          ),
        ].map((el) => ({
          kind: el.getAttribute("data-cb-item")!,
          px: h(el) + gap(el),
          text: (el.textContent ?? "").slice(0, 40),
        })),
        rows: [...document.querySelectorAll("tr[data-cb-key-row]")].map(
          (el) => ({
            kind: el.getAttribute("data-cb-key-row")!,
            px: h(el),
            text: (el.textContent ?? "").slice(0, 40),
          }),
        ),
        estimates: JSON.parse(
          document.getElementById("cb-estimates")!.textContent!,
        ) as { items: number[]; rows: number[] },
      };
    });
    expect(actual.items.length).toBe(actual.estimates.items.length);
    expect(actual.rows.length).toBe(actual.estimates.rows.length);

    const compare = (
      xs: { kind: string; px: number; text: string }[],
      est: number[],
    ) =>
      xs.map((x, i) => ({
        ...x,
        px: Math.round(x.px * 10) / 10,
        est: Math.round(est[i]! * 10) / 10,
        slack: Math.round((est[i]! - x.px) * 10) / 10,
      }));
    const items = compare(actual.items, actual.estimates.items);
    const rows = compare(actual.rows, actual.estimates.rows);
    const summary = (xs: typeof items) => {
      const kinds = [...new Set(xs.map((x) => x.kind))];
      return Object.fromEntries(
        kinds.map((k) => {
          const of = xs.filter((x) => x.kind === k);
          return [
            k,
            {
              count: of.length,
              minSlack: Math.min(...of.map((x) => x.slack)),
              maxSlack: Math.max(...of.map((x) => x.slack)),
              meanSlack:
                Math.round(
                  (of.reduce((s, x) => s + x.slack, 0) / of.length) * 10,
                ) / 10,
            },
          ];
        }),
      );
    };
    const min = (part: string, first: boolean, forms?: string[]) => {
      const of = bodies.filter(
        (b) =>
          b.part === part &&
          b.first === first &&
          (!forms || forms.includes(b.form)),
      );
      return of.length ? Math.min(...of.map((b) => b.body)) : null;
    };
    const body = {
      // B · C 만 높이 예산으로 나눈다(A · D · E 는 첫 장에 쓰는 법 상자가 있고 칸이 늘고 줄어든다)
      studentFirst: min("student", true, ["term", "cloze"]),
      studentNext: min("student", false, ["term", "cloze"]),
      keyFirst: min("key", true),
      keyNext: min("key", false),
    };
    mkdirSync(OUT, { recursive: true });
    writeFileSync(
      path.join(OUT, `estimate-${set.replace("&seed=", "-")}.json`),
      JSON.stringify(
        {
          body,
          items: summary(items),
          rows: summary(rows),
          under: [...items, ...rows].filter((x) => x.slack < 0),
          // 눈금 맞추기 표본은 덩이를 다 적는다 — 수식 갈래마다 줄이 얼마나 높아지는지 읽는다
          all: set === "cal" ? [...items, ...rows] : undefined,
          // 어림이 헐거운 덩이(한 줄 넘게 남는 것) — 수식 · 긴 낱말에서 어림이 얼마나 넉넉한지 본다
          loose: [...items, ...rows]
            .filter((x) => x.slack > 18)
            .sort((a, b) => b.slack - a.slack)
            .slice(0, 40),
        },
        null,
        2,
      ),
    );

    // ② 어림이 실제보다 작은 덩이가 없다(0.5px 은 소수점 버림)
    const under = [...items, ...rows].filter((x) => x.slack < -0.5);
    expect(under, JSON.stringify(under.slice(0, 12), null, 2)).toEqual([]);
    // ③ 어림에 쓰는 몸 높이가 잰 몸 높이를 넘지 않는다
    if (body.studentFirst !== null)
      expect(GEOMETRY.bodyFirst).toBeLessThanOrEqual(body.studentFirst);
    if (body.studentNext !== null)
      expect(GEOMETRY.bodyNext).toBeLessThanOrEqual(body.studentNext);
    if (body.keyFirst !== null)
      expect(GEOMETRY.keyFirst).toBeLessThanOrEqual(body.keyFirst);
    if (body.keyNext !== null)
      expect(GEOMETRY.keyNext).toBeLessThanOrEqual(body.keyNext);
  });
}
