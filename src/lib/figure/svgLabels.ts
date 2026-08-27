/**
 * 그림 SVG 에서 **라벨을 읽는다** — 조판됐든 안 됐든 한 자로.
 *
 * ## 왜 이 파일이 있나
 *
 * 2026-08-28 부터 라벨은 두 모습으로 나간다:
 *   · 조판됨   `<g data-label="5 cm" data-x data-y data-base data-fs data-anchor data-w …>`
 *              — MathJax 가 그린 `<path>` 들. **글자가 한 톨도 없다.**
 *   · 그대로   `<text x y font-size text-anchor data-mj="가">가</text>`
 *              — TeX 글꼴에 글리프가 없는 글(한글·㎠·④). 엔진이 넣은 그대로다.
 *
 * 어느 쪽인지는 **글자에 따라 갈린다.** 그러니 「라벨이 몇 개인가」·「`0` 이 지면에
 * 있나」·「축 이름표가 어디 앉았나」를 묻는 쪽이 `<text>` 만 보면, 조판된 라벨은
 * 구조적으로 **0** 이 된다 — 그리고 그건 에러가 아니라 **조용한 0** 이다.
 *
 * 그래서 읽는 규칙을 **한 곳**에 둔다. 두 벌이 되면 한쪽만 고쳐지고, 고쳐지지 않은
 * 쪽은 「깨끗하다」고 보고한다(이 저장소가 여러 번 밟은 자리다).
 */

export interface SvgLabel {
  /** 라벨 원문. */
  text: string;
  /** 엔진이 준 닻 x — `<text x>` 와 같은 값이다. */
  x: number;
  /** 엔진이 준 닻 y — `<text y>` 와 같은 값이다(밑선일 수도, 세로 가운데일 수도). */
  y: number;
  /** 실제로 그린 밑선. 조판 안 된 것은 `y` 와 같다(브라우저가 정하므로 모른다). */
  baseline: number;
  fontSize: number;
  anchor: "start" | "middle" | "end";
  /** 조판된 것만 폭을 **정확히** 안다. 그대로 나간 것은 `null`. */
  width: number | null;
  /** 밑선 위/아래 잉크 높이. 조판된 것만 안다. */
  ascent: number | null;
  descent: number | null;
  /**
   * 흰 테두리(halo) 폭, **그림 좌표 그대로**. 없으면 0.
   * halo 는 잉크를 더하지 않지만 **밑의 실선을 지운다** — 겹침을 재는 쪽은
   * 라벨 상자를 이만큼 넓혀 봐야 한다.
   */
  halo: number;
  /** MathJax 로 조판됐나. */
  typeset: boolean;
}

const GROUP_RE = /<g\s+data-label="([^"]*)"([^>]*)>/g;
const TEXT_RE = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;

function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1]! : null;
}

function num(tag: string, name: string): number | null {
  const raw = attr(tag, name);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function anchorOf(raw: string | null): "start" | "middle" | "end" {
  return raw === "start" || raw === "end" ? raw : "middle";
}

/** SVG 안의 라벨 전부. 나온 순서 그대로. */
export function svgLabels(svg: string): SvgLabel[] {
  const out: SvgLabel[] = [];

  for (const m of svg.matchAll(GROUP_RE)) {
    const tag = m[2]!;
    const x = num(tag, "data-x") ?? 0;
    const y = num(tag, "data-y") ?? 0;
    out.push({
      text: unescapeXml(m[1]!),
      x,
      y,
      baseline: num(tag, "data-base") ?? y,
      fontSize: num(tag, "data-fs") ?? 0,
      anchor: anchorOf(attr(tag, "data-anchor")),
      width: num(tag, "data-w"),
      ascent: num(tag, "data-a"),
      descent: num(tag, "data-d"),
      halo: num(tag, "data-halo") ?? 0,
      typeset: true,
    });
  }

  for (const m of svg.matchAll(TEXT_RE)) {
    const tag = m[1]!;
    // `data-mj` 가 있으면 그것이 원문이다(안쪽은 `<tspan>` 으로 쪼개져 있을 수 있다).
    const raw = attr(tag, "data-mj");
    const text = unescapeXml(raw ?? m[2]!.replace(/<[^>]+>/g, "")).trim();
    if (!text) continue;
    const x = num(tag, "x") ?? 0;
    const y = num(tag, "y") ?? 0;
    out.push({
      text,
      x,
      y,
      baseline: y,
      fontSize: num(tag, "font-size") ?? 0,
      anchor: anchorOf(attr(tag, "text-anchor")),
      width: null,
      ascent: null,
      descent: null,
      halo: num(tag, "stroke-width") ?? 0,
      typeset: false,
    });
  }

  return out;
}

/**
 * **조판된 라벨 덩어리를 걷어낸** SVG — 남는 것은 도형 잉크와 조판 못 한 `<text>` 뿐.
 *
 * 조판된 라벨은 `<path d="M266 654H280…">` 인데 그 좌표는 **em 단위(1em = 1000)** 라
 * 그림 좌표가 아니다. 「그린 점이 viewBox 안인가」·「transform 을 안 쓰는가」처럼
 * **기하를 훑는 검사**가 이것을 같이 세면 통째로 헛돈다 — 실측으로 viewBox 밖 점이
 * 525개 나왔는데 전부 글자 외곽선이었다(2026-08-28).
 *
 * 라벨의 자리·크기는 `svgLabels()` 로 따로 묻는다. 걷어내는 것과 재는 것이 **다른 함수**다.
 */
export function stripLabels(svg: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const start = svg.indexOf("<g data-label=", at);
    if (start < 0) break;
    out += svg.slice(at, start);
    // `<g>` 는 안에 `<g>` 를 또 문다(MathJax 가 그렇게 낸다). 짝을 세어 닫는 자리를 찾는다.
    let depth = 0;
    let i = start;
    while (i < svg.length) {
      const open = svg.indexOf("<g", i);
      const close = svg.indexOf("</g>", i);
      if (close < 0) return out + svg.slice(start);
      if (open >= 0 && open < close) {
        depth += 1;
        i = open + 2;
      } else {
        depth -= 1;
        i = close + 4;
        if (depth === 0) break;
      }
    }
    at = i;
  }
  return out + svg.slice(at);
}

/** 라벨 글만. 「지면에 이 글이 있나」를 묻는 자리용. */
export function labelTexts(svg: string): string[] {
  return svgLabels(svg).map((l) => l.text);
}

/** 그 글이 라벨로 나갔나. */
export function hasLabel(svg: string, text: string): boolean {
  return labelTexts(svg).includes(text);
}
