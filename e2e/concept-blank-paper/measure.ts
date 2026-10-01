import type { Page } from "@playwright/test";

/**
 * 개념 백지 지면 자 — 인쇄 매체에서 장마다 넘침 · 빈 공간 · 줄맞춤을 잰다(`overflow.spec.ts` · `estimate.spec.ts` 가 같이 쓴다).
 *
 * 재는 것(원장님 2026-09-30 «A4 에 맞게 · 줄맞춤»):
 *  ① 장 상자 210×297mm(794×1123px) · 안쪽 여백(시험지 지면과 같은 값)
 *  ② 넘침 — 칸마다 `scroll − client`, 장 안 모든 요소의 아래 · 오른쪽 끝(KaTeX · 긴 낱말)
 *  ③ 빈 공간 — 머리에서 발까지 세로로 아무 덩이도 없는 가장 큰 틈(px). 장의 1/4(281px)을 넘으면 장이 빈 것이다
 *  ④ 줄맞춤 — 번호 열 폭 · 번호와 첫 줄 기준선 · 줄 긋기 간격 · 좌우 칸 윗선/아랫선 · 채점표 열 폭 ·
 *     빈칸 밑줄 깊이 · KaTeX 기준선 · 굵은 핵심어 안 수식의 굵기
 *  ⑤ 새는 마크업 — 글이 나오는 모든 칸이 수식 경로를 지나는가(`$` · 역슬래시 글자 0 · 수식 오류 0)
 */
export type PageReport = {
  part: string;
  form: string;
  page: number;
  widthPx: number;
  heightPx: number;
  /** 안쪽 여백 위 · 오른쪽 · 아래 · 왼쪽. */
  padding: [number, number, number, number];
  overflowPx: number;
  where: string;
  /** 세로로 가장 큰 빈 틈. */
  emptyPx: number;
  emptyAt: string;
  /** 이 장이 그 지면의 마지막 장인가(채점표 마지막 장은 표가 끝나 남는다). */
  last: boolean;
  /**
   * 종이에 그대로 찍힌 수식 마크업 — `$` 나 역슬래시가 든 글 조각(KaTeX 의 MathML · 그림 속 이름표는 뺀다).
   * 글이 나오는 칸이 하나라도 수식 경로를 안 지나면 여기 잡힌다.
   */
  leaks: string[];
  /** KaTeX 가 못 읽어 붉게 그린 수식 수. */
  mathErrors: number;
  /**
   * 은행 글이 마크다운 꾸밈으로 읽힌 자리 — 제품 수식 경로(`MathText`)는 마크다운 렌더러라, 글 속 `*` · `_` · `~` ·
   * 줄 머리의 `-` · `1.` 이 기울임 · 굵게 · 지운 글 · 목록으로 바뀔 수 있다. 지면은 그런 요소를 스스로 쓰지 않는다.
   */
  markdown: string[];
  align: {
    /** 번호 열 폭(모두 같아야 한다) · 왼쪽 끝이 흩어진 폭. */
    qnWidths: number[];
    qnLeftSpread: number;
    /** 번호와 옆 글 첫 줄의 기준선 차(최댓값). */
    qnBaseline: number;
    /** 쓰기 줄 간격(모두 같아야 한다) · 그림 카드 이름 줄 높이. */
    rulePitch: string[];
    /** A — 왼쪽 쓰기 줄과 오른쪽 칸의 윗선 차 · 오른쪽 칸 아랫변이 줄 간격에서 벗어난 값. */
    zoneTop: number;
    zoneBottom: number;
    /** D · E — 나란한 두 칸의 윗선 · 높이 차. */
    pairTop: number;
    pairHeight: number;
    /** 채점표 — 번호 · 개념 열 폭. */
    keyCols: number[];
    /** 빈칸 — 밑줄 아래 끝이 기준선에서 내려간 깊이 ÷ 글씨 크기(최소 · 최대) · 개수. */
    blankDrop: [number, number] | null;
    blanks: number;
    /** KaTeX — 수식 기준선과 옆 글 기준선의 차(최댓값) · 수식 수. */
    katexBaseline: number;
    katex: number;
    /** 채점표 굵은 핵심어 안 수식의 굵기(가장 가는 것) · 그런 수식 수 — 수식은 둘레 글의 굵기를 따른다. */
    keywordMathWeight: number | null;
    keywordMath: number;
  };
};

export async function openSet(
  page: Page,
  set: string,
  view = "both",
  ready = "[data-cb-page]",
) {
  await page.setViewportSize({ width: 1000, height: 1400 });
  await page.emulateMedia({ media: "print" });
  // 첫 적재에서 Vite 가 의존을 묶고 새로 고치면 goto 가 끊긴다 — 몇 번 다시 연다
  for (let tries = 0; ; tries++) {
    try {
      await page.goto(`/?set=${set}&view=${view}`, { timeout: 60_000 });
      await page.waitForSelector(ready, { timeout: 30_000 });
      break;
    } catch (e) {
      if (tries >= 3) throw e;
    }
  }
  await page.evaluate(() => document.fonts.ready);
  // 지면 명조가 제품과 같은 파일로 실렸나(아니면 폭이 달라 잰 값이 헛돈다 — UI-09)
  const serif = await page.evaluate(() =>
    document.fonts.check('16px "cb-harness-noto-serif-kr"', "가"),
  );
  if (!serif)
    throw new Error("지면 명조(cb-harness-noto-serif-kr)가 안 실렸다");
}

export async function measurePages(page: Page): Promise<PageReport[]> {
  return page.evaluate(() => {
    const round = (n: number) => Math.round(n * 10) / 10;
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${[...el.attributes]
        .filter((a) => a.name.startsWith("data-cb"))
        .map((a) => `[${a.name}=${a.value}]`)
        .join("")}.${String(el.className).split(" ")[0] ?? ""}`;
    /** 그 자리 글줄의 기준선 y — 높이 0 인 인라인 상자는 기준선에 앉는다. */
    const probe = () => {
      const p = document.createElement("span");
      p.style.cssText =
        "display:inline-block;width:0;height:0;vertical-align:baseline;";
      return p;
    };
    const baselineIn = (el: Element, where: "start" | "end") => {
      const p = probe();
      if (where === "start") el.prepend(p);
      else el.append(p);
      const y = p.getBoundingClientRect().bottom;
      p.remove();
      return y;
    };
    /** 폭 0 이라 그 조각과 같은 줄에 남는다(앞에 두면 조각이 다음 줄로 넘어갈 때 윗줄 끝에 남는다). */
    const baselineAfter = (el: Element) => {
      const p = probe();
      el.after(p);
      const y = p.getBoundingClientRect().bottom;
      p.remove();
      return y;
    };
    const px = (v: string) => parseFloat(v) || 0;

    const sheets = [
      ...document.querySelectorAll<HTMLElement>("[data-cb-page]"),
    ];
    return sheets.map((sheet, index) => {
      const a4 = sheet.closest<HTMLElement>("[data-print-page]")!;
      const box = a4.getBoundingClientRect();
      const cs = getComputedStyle(sheet);
      const padding: [number, number, number, number] = [
        px(cs.paddingTop),
        px(cs.paddingRight),
        px(cs.paddingBottom),
        px(cs.paddingLeft),
      ];
      const innerBottom = box.bottom - padding[2];
      const innerRight = box.right - padding[1];

      /* ② 넘침 */
      let over = 0;
      let where = "";
      const bump = (d: number, el: Element, kind: string) => {
        if (d > over) {
          over = d;
          where = `${kind} ${describe(el)}`;
        }
      };
      for (const el of [
        sheet,
        ...sheet.querySelectorAll(
          "[data-cb-fit],[data-cb-card],[data-cb-node],[data-cb-zone],[data-cb-item]",
        ),
      ]) {
        bump(el.scrollHeight - el.clientHeight, el, "칸 세로");
        bump(el.scrollWidth - el.clientWidth, el, "칸 가로");
      }
      for (const el of sheet.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        // KaTeX 가 숨겨 둔 긴 근호 SVG 등 잘린 조각은 잉크가 아니다
        if (el.closest(".katex-html svg, .katex-mathml")) continue;
        bump(r.bottom - innerBottom, el, "아래");
        bump(r.right - innerRight, el, "오른쪽");
      }

      /* ③ 빈 공간 — 덩이들의 세로 구간을 이어 붙이고 가장 큰 틈을 찾는다 */
      const blocks = [
        ...[...sheet.children].filter((c) => !c.matches("[data-cb-fit]")),
        ...sheet.querySelectorAll(
          "[data-cb-fit] > :not([data-cb-side]):not(svg):not(table):not(ol), [data-cb-fit] li, [data-cb-fit] tr, [data-cb-side] > *, [data-cb-item]",
        ),
      ].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 0;
      });
      const spans = blocks
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, el };
        })
        .sort((a, b) => a.top - b.top);
      let cursor = box.top + padding[0];
      let emptyPx = 0;
      let emptyAt = "";
      for (const s of spans) {
        if (s.top - cursor > emptyPx) {
          emptyPx = s.top - cursor;
          emptyAt = `${describe(s.el)} 위`;
        }
        cursor = Math.max(cursor, s.bottom);
      }
      if (innerBottom - cursor > emptyPx) {
        emptyPx = innerBottom - cursor;
        emptyAt = "장 아래";
      }

      /* ④ 줄맞춤 */
      const qns = [...sheet.querySelectorAll<HTMLElement>("[data-cb-qn]")];
      const qnRects = qns.map((q) => q.getBoundingClientRect());
      // 같은 칸(같은 부모의 부모) 안에서 번호 왼쪽 끝이 한 줄에 서는가 — 카드는 칸마다 다른 자리다
      const lefts = new Map<Element, number[]>();
      qns.forEach((q, i) => {
        const group =
          q.closest("[data-cb-card]") ?? q.closest("[data-cb-fit]") ?? sheet;
        const inset = q.closest("[data-cb-item='apply']") ? 15 : 0;
        lefts.set(group, [
          ...(lefts.get(group) ?? []),
          qnRects[i]!.left - inset,
        ]);
      });
      const qnLeftSpread = Math.max(
        0,
        ...[...lefts.values()].map((xs) => Math.max(...xs) - Math.min(...xs)),
      );
      const qnBaseline = Math.max(
        0,
        ...qns.map((q) => {
          const text = q.nextElementSibling;
          if (!text) return 0;
          return Math.abs(baselineIn(q, "end") - baselineIn(text, "start"));
        }),
      );

      const rulePitch = [
        ...new Set([
          ...[...sheet.querySelectorAll("[data-cb-ruled]")].map((el) =>
            getComputedStyle(el).backgroundSize.split(" ").pop()!,
          ),
          ...[...sheet.querySelectorAll("[data-cb-line]")].map(
            (el) => `${round(el.getBoundingClientRect().height)}px`,
          ),
        ]),
      ];

      let zoneTop = 0;
      let zoneBottom = 0;
      for (const zone of sheet.querySelectorAll("[data-cb-zone]")) {
        const ruled = zone
          .querySelector("[data-cb-ruled]")!
          .getBoundingClientRect();
        const side = zone
          .querySelector("[data-cb-box]")!
          .getBoundingClientRect();
        zoneTop = Math.max(zoneTop, Math.abs(ruled.top - side.top));
        const rest = side.height % 30;
        zoneBottom = Math.max(zoneBottom, Math.min(rest, 30 - rest));
      }

      let pairTop = 0;
      let pairHeight = 0;
      const pair = (a?: Element, b?: Element) => {
        if (!a || !b) return;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        pairTop = Math.max(pairTop, Math.abs(ra.top - rb.top));
        pairHeight = Math.max(pairHeight, Math.abs(ra.height - rb.height));
      };
      const narrow = [...sheet.querySelectorAll('[data-cb-card="narrow"]')];
      for (let i = 0; i + 1 < narrow.length; i += 2)
        pair(narrow[i], narrow[i + 1]);
      const left = [
        ...sheet.querySelectorAll('[data-cb-side="left"] > [data-cb-node]'),
      ];
      const right = [
        ...sheet.querySelectorAll('[data-cb-side="right"] > [data-cb-node]'),
      ];
      if (left.length === right.length)
        left.forEach((node, i) => pair(node, right[i]));

      const keyCols = [...sheet.querySelectorAll("table thead th")]
        .slice(0, 2)
        .map((th) => round(th.getBoundingClientRect().width));

      const blanks = [
        ...sheet.querySelectorAll<HTMLElement>("[data-cb-blank]"),
      ];
      const drops = blanks.map((b) => {
        const font = px(getComputedStyle(b).fontSize);
        return (b.getBoundingClientRect().bottom - baselineAfter(b)) / font;
      });

      const maths = [...sheet.querySelectorAll<HTMLElement>(".katex")];
      const katexBaseline = Math.max(
        0,
        ...maths.map((k) => {
          // 수식은 연산자에서 줄이 바뀔 수 있다 — 마지막 조각과 그 바로 뒤 글의 기준선을 맞댄다
          const base = [...k.querySelectorAll(".katex-html > .base")].pop();
          if (!base) return 0;
          const math = Math.abs(baselineAfter(k) - baselineIn(base, "end"));
          // 수식을 감싼 인라인 껍데기(제품 MathText)가 바깥 글줄에서 떠 있지 않은가
          let outer: Element = k;
          while (
            outer.parentElement &&
            getComputedStyle(outer.parentElement).display.startsWith("inline")
          )
            outer = outer.parentElement;
          const shell =
            outer === k
              ? 0
              : Math.abs(baselineAfter(outer) - baselineIn(outer, "end"));
          return Math.max(math, shell);
        }),
      );

      const keywordMaths = [
        ...sheet.querySelectorAll<HTMLElement>("[data-cb-keyword] .katex"),
      ];
      const keywordMathWeight = keywordMaths.length
        ? Math.min(
            ...keywordMaths.map((k) => Number(getComputedStyle(k).fontWeight)),
          )
        : null;

      /* ⑤ 새는 마크업 — 종이에 찍히는 글 조각에 `$` · 역슬래시가 없다 */
      const leaks: string[] = [];
      const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const parent = walker.currentNode.parentElement;
        // KaTeX 의 MathML(그 안 annotation 에 TeX 원문)은 찍히지 않는다 · 그림 속 이름표는 SVG 글자(예외)
        if (!parent || parent.closest(".katex-mathml, [data-cb-tag]")) continue;
        const text = walker.currentNode.textContent ?? "";
        if (/[$\\]/.test(text)) leaks.push(text.trim().slice(0, 60));
      }
      const mathErrors = sheet.querySelectorAll(
        '.katex-error, .katex [style*="cc0000"]',
      ).length;
      // 지면이 쓰는 목록은 문장 목록 `ol > li` 하나뿐이다 — 그 안의 목록 · 그 밖의 꾸밈 요소는 마크다운이 만든 것
      const markdown = [
        ...sheet.querySelectorAll(
          "ul, li li, li ol, em, strong, del, code, pre, blockquote, hr, h1, h4, h5, h6, a, img",
        ),
      ].map(
        (el) =>
          `${el.tagName.toLowerCase()}: ${(el.textContent ?? "").slice(0, 40)}`,
      );

      const same = sheets.filter(
        (s) =>
          s.dataset.cbPart === sheet.dataset.cbPart &&
          s.dataset.cbSheet === sheet.dataset.cbSheet,
      );
      const next = sheets[index + 1];
      return {
        part: sheet.dataset.cbPart ?? "",
        form: sheet.dataset.cbSheet ?? "",
        page: Number(sheet.dataset.cbPage),
        widthPx: round(box.width),
        heightPx: round(box.height),
        padding,
        overflowPx: round(over),
        where,
        emptyPx: round(emptyPx),
        emptyAt,
        last:
          same.length > 0 &&
          (!next ||
            next.dataset.cbPage === "1" ||
            next.dataset.cbPart !== sheet.dataset.cbPart),
        leaks,
        mathErrors,
        markdown,
        align: {
          qnWidths: [...new Set(qnRects.map((r) => round(r.width)))],
          qnLeftSpread: round(qnLeftSpread),
          qnBaseline: round(qnBaseline),
          rulePitch,
          zoneTop: round(zoneTop),
          zoneBottom: round(zoneBottom),
          pairTop: round(pairTop),
          pairHeight: round(pairHeight),
          keyCols,
          blankDrop: drops.length
            ? [
                Math.round(Math.min(...drops) * 1000) / 1000,
                Math.round(Math.max(...drops) * 1000) / 1000,
              ]
            : null,
          blanks: blanks.length,
          katexBaseline: round(katexBaseline),
          katex: maths.length,
          keywordMathWeight,
          keywordMath: keywordMaths.length,
        },
      };
    });
  });
}
