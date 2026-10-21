import { isFigureGridLayer } from './figureGridMetadata';

export const SVG_NS = "http://www.w3.org/2000/svg";
const SHAPES = "path,line,polyline,polygon,circle,ellipse,rect,text";
const ALLOWED = new Set(
  "svg g defs clipPath mask marker pattern linearGradient radialGradient stop path line polyline polygon circle ellipse rect text tspan title desc use".split(
    " ",
  ),
);
const ATTRIBUTES = new Set(
  "id viewBox width height x y x1 y1 x2 y2 dx dy cx cy r rx ry d points transform preserveAspectRatio fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity color font-size font-family font-style font-weight text-anchor dominant-baseline alignment-baseline baseline-shift textLength lengthAdjust letter-spacing word-spacing paint-order vector-effect clip-path clip-rule mask maskUnits maskContentUnits marker-start marker-mid marker-end markerWidth markerHeight markerUnits refX refY orient patternUnits patternContentUnits patternTransform gradientUnits gradientTransform spreadMethod fx fy fr offset stop-color stop-opacity visibility display overflow".split(
    " ",
  ),
);
const STYLE_PROPERTIES = new Set(
  "fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity color font-size font-family font-style font-weight text-anchor dominant-baseline alignment-baseline baseline-shift letter-spacing word-spacing paint-order vector-effect clip-path clip-rule mask marker-start marker-mid marker-end stop-color stop-opacity visibility display".split(
    " ",
  ),
);
const METADATA =
  /^data-(?:mj|function|function-viewbox|mathgen-clipboard|label|anchor|halo|x|y|base|px|py|fs|w|a|d|group|size-locked|text-bg|line-gap|face|face-seed|shape|n|n-last|grid)$/;
const safeValue = (value: string) =>
  !/[\\<>@\u0000-\u001f]/.test(value) &&
  !/(?:javascript|vbscript|data|https?|file)\s*:|\/\*|expression\s*\(/i.test(
    value,
  ) &&
  (!/url\s*\(/i.test(value) ||
    /^url\(\s*["']?#[\w.-]+["']?\s*\)$/i.test(value));
const parse = (svg: string) => {
  if (/<!DOCTYPE|<!ENTITY/i.test(svg))
    throw new Error("도형 SVG에 문서 선언을 사용할 수 없습니다.");
  let doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw new Error("도형 SVG를 읽을 수 없습니다.");
  if (doc.documentElement.namespaceURI === null) {
    doc.documentElement.setAttribute("xmlns", SVG_NS);
    doc = new DOMParser().parseFromString(
      new XMLSerializer().serializeToString(doc.documentElement),
      "image/svg+xml",
    );
  }
  return doc;
};
export const serializeFigureSvg = (doc: Document) =>
  new XMLSerializer().serializeToString(doc.documentElement);

// 끄는 걸음마다 같은 원문을 서너 번 읽는다(원본 편집·미리보기·요소 목록 — 조절점이면 넷). 최근 것을 기억해 두고,
// 읽기만 할 때는 그대로, 고칠 때는 복사본을 준다. 복사가 새로 읽기보다 약 4배 빠르다(mathg-gen 68ff2aa 실측
// 0.053ms vs 0.241ms). 배포 React · CPU 8배에서 90걸음에 50ms 넘는 프레임이 선 19·조절점 14 였다(2026-09-18).
const recent = new Map<string, Document>();
/** 읽기 전용 — 돌려받은 문서를 고치면 같은 원문을 읽는 다른 곳이 깨진다. 고칠 때는 editableFigureDoc. */
export function readFigureSvg(svg: string): Document {
  let doc = recent.get(svg);
  if (doc) {
    recent.delete(svg);
    recent.set(svg, doc);
    return doc;
  }
  doc = parse(svg);
  recent.set(svg, doc);
  if (recent.size > 8) recent.delete(recent.keys().next().value!);
  return doc;
}
/** 고쳐도 되는 복사본 — 기억해 둔 문서를 통째로 복사한다. */
export const editableFigureDoc = (svg: string) =>
  readFigureSvg(svg).cloneNode(true) as Document;
const visibleFigureLabel = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.startsWith("$") && trimmed.endsWith("$")
    ? trimmed.slice(1, -1)
    : value;
};

// 원장님 2026-09-19 «도형 생성 시 사각형이 왜 생기나» — 도형 엔진 v2 는 캔버스 전체에 흰 바탕 rect 를 첫 도형으로
// 깐다(vendor/figure-engine/core/figure_scene.py:2906). 편집기가 그것을 1번 «사각형»으로 세어 네 모서리 조절점이
// 그림 바깥에 붙었고, fitFigureViewport 도 바탕을 경계로 재어 여백이 겹으로 들어갔다. 서버는 이제 투명으로 넘기지만
// 이미 만든 그림에는 남아 있어 여기서 걷어 낸다. 사용자가 일부러 그린 흰 가림막을 지우지 않도록 조건을 좁게 잡는다:
// 루트의 첫 그리는 자식 · x·y 없음 또는 0 · 흰 채움 · 선 없음 · style·transform 없음 · 원래 viewBox(0 0 W H)를 꼭 덮음.
const NON_RENDERING = new Set(
  "defs title desc clipPath mask marker pattern linearGradient radialGradient".split(
    " ",
  ),
);
const WHITE_FILLS = new Set(["#fff", "#ffffff", "white"]);
function engineBackgroundRect(root: Element) {
  const rect = [...root.children].find(
    (node) => !NON_RENDERING.has(node.localName),
  );
  if (rect?.localName !== "rect") return undefined;
  const view = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const at = (name: string) => Number(rect.getAttribute(name) ?? 0);
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-3;
  const stroke = rect.getAttribute("stroke")?.trim().toLowerCase();
  return view?.length === 4 &&
    view[0] === 0 &&
    view[1] === 0 &&
    at("x") === 0 &&
    at("y") === 0 &&
    same(at("width"), view[2]) &&
    same(at("height"), view[3]) &&
    WHITE_FILLS.has(rect.getAttribute("fill")?.trim().toLowerCase() ?? "") &&
    (stroke === undefined || stroke === "none") &&
    !rect.hasAttribute("style") &&
    !rect.hasAttribute("transform")
    ? rect
    : undefined;
}

// 원장님 2026-09-19 «각도가 자꾸 기울어지는데, 기울어지지 않게 해.» — 엔진은 각도 라벨의 바깥 <text> 에
// font-style="italic" 을 걸고 조각(<tspan>)마다 기울임을 따로 적는다(숫자·° 는 font-style="normal" —
// figure_scene.py:2867, label_markup.py). 편집기 조판은 바깥 표시만 보고 \mathit 으로 **숫자까지** 기울였다.
// 조각이 정자를 적어 둔 엔진 라벨(흰 테두리 paint-order 가 있는 각도·치수 라벨)이면 바깥 기울임을 걷는다 —
// 조판이 기본 규칙(한 글자 소문자·그리스 문자만 기울임, 숫자·단위·대문자는 정자)을 따른다.
// 걷을 때 조각의 font-style="normal" 도 지운다(바깥이 정자라 같은 뜻이다). 그러면 한 번 걷힌 라벨은 다시
// 이 조건에 안 걸려, 사용자가 «기울임» 단추로 켠 기울임은 저장·다시 열기를 지나도 그대로 남는다.
/**
 * 엔진 라벨의 정자 조각 — 바깥 `<text>` 가 기울임인데 조각이 `font-style="normal"` 을 적어 둔 것들. 없으면 빈 배열.
 *
 * 이 판정은 **조판기(`typesetFigureSvg`)도 같이 쓴다**(원장님 2026-09-21 «왜 서로 글씨체가 다르지?»). 전에는 규칙이
 * 편집기를 여는 길(`prepareFigureSvg`)에만 있어서, 편집기를 안 거친 도형은 검수 카드에서 «2 cm» 가 숫자까지 기울었다.
 */
export function engineUprightPieces(text: Element): Element[] {
  if (
    text.getAttribute("font-style") !== "italic" ||
    !text.hasAttribute("paint-order")
  )
    return [];
  return [...text.children].filter(
    (piece) =>
      piece.localName === "tspan" &&
      piece.getAttribute("font-style") === "normal",
  );
}

function uprightEngineAngleLabel(text: SVGElement) {
  const upright = engineUprightPieces(text);
  if (!upright.length) return;
  for (const piece of upright) piece.removeAttribute("font-style");
  text.setAttribute("font-style", "normal");
  // 이 수정 전에 저장된 초안은 prepare 가 style 에도 italic 을 옮겨 적어 두었다
  text.style.removeProperty("font-style");
}

export function prepareFigureSvg(source?: string) {
  const doc = parse(
    source ||
      `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360" width="480" height="360"></svg>`,
  );
  if (
    doc.documentElement.namespaceURI !== SVG_NS &&
    doc.documentElement.namespaceURI !== null
  )
    throw new Error("도형 SVG의 네임스페이스가 올바르지 않습니다.");
  for (const node of [...doc.querySelectorAll("*")]) {
    if (!ALLOWED.has(node.localName) || node.namespaceURI !== SVG_NS) {
      node.remove();
      continue;
    }
    for (const attr of [...node.attributes]) {
      if (
        (attr.name === "xmlns" && attr.value === SVG_NS) ||
        (attr.name === "xmlns:xlink" &&
          attr.value === "http://www.w3.org/1999/xlink")
      )
        continue;
      if (attr.name === "href" || attr.name === "xlink:href") {
        if (!/^#[\w.-]+$/.test(attr.value)) node.removeAttribute(attr.name);
        continue;
      }
      if (attr.name === "style") {
        const styles = (node as SVGElement).style;
        const declarations = [...styles].flatMap((property) => {
          const value = styles.getPropertyValue(property);
          return STYLE_PROPERTIES.has(property) && safeValue(value)
            ? [`${property}:${value}`]
            : [];
        });
        node.removeAttribute("style");
        if (declarations.length)
          node.setAttribute("style", declarations.join(";"));
        continue;
      }
      if (METADATA.test(attr.name)) continue;
      if (!ATTRIBUTES.has(attr.name) || !safeValue(attr.value))
        node.removeAttribute(attr.name);
    }
  }
  // Prevent imported fragment references from reaching unrelated elements in the host page.
  const ids = new Set(
    [...doc.querySelectorAll("[id]")].map((node) => node.getAttribute("id")),
  );
  for (const node of doc.querySelectorAll("*"))
    for (const attr of [...node.attributes]) {
      if (attr.name === "style") {
        const styles = (node as SVGElement).style;
        for (const property of [...styles]) {
          const reference = /^url\(\s*["']?#([\w.-]+)["']?\s*\)$/.exec(
            styles.getPropertyValue(property),
          )?.[1];
          if (reference && !ids.has(reference)) styles.removeProperty(property);
        }
      }
      const reference = attr.name.endsWith("href")
        ? attr.value.slice(1)
        : /^url\(\s*["']?#([\w.-]+)["']?\s*\)$/.exec(attr.value)?.[1];
      if (reference && !ids.has(reference)) node.removeAttribute(attr.name);
    }
  const root = doc.documentElement;
  // Invalid/nested/transformed metadata must never hide ordinary figure objects.
  for (const node of doc.querySelectorAll('[data-grid]')) {
    if (!isFigureGridLayer(node)) node.removeAttribute('data-grid');
  }
  // 번호를 매기기 전에, viewBox 를 채워 넣기 전에(원래 캔버스와 견준다)
  engineBackgroundRect(root)?.remove();
  root.setAttribute("xmlns", SVG_NS);
  const viewBox = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    !viewBox ||
    viewBox.length !== 4 ||
    !viewBox.every(Number.isFinite) ||
    viewBox[2] <= 0 ||
    viewBox[3] <= 0
  ) {
    const dimension = (name: string, fallback: number) => {
      const value = Number.parseFloat(root.getAttribute(name) ?? "");
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    root.setAttribute(
      "viewBox",
      `0 0 ${dimension("width", 480)} ${dimension("height", 360)}`,
    );
  }
  let index = 0;
  for (const node of doc.querySelectorAll(SHAPES)) {
    // `[data-grid]` — 모눈 배경 층(figureGrid.ts)은 요소가 아니다(math-figure-editor 추가).
    if (!node.closest("defs,clipPath,mask,marker,pattern,[data-grid]")) {
      node.setAttribute("data-object-id", `obj-${index++}`);
      // 번호는 요소에 붙은 값 — 틀리게 적힌 것은 지우고 아래 writeNumbers 가 새로 준다
      if (!validNumber(node.getAttribute(NUMBER_ATTR)))
        node.removeAttribute(NUMBER_ATTR);
      if (node.localName === "text") {
        const text = node as SVGElement;
        uprightEngineAngleLabel(text);
        for (const [property, fallback] of [
          ["font-style", "normal"],
          ["font-family", "Times New Roman, serif"],
          ["stroke", "none"],
          ["stroke-width", "0"],
        ]) {
          if (!text.style.getPropertyValue(property))
            text.style.setProperty(
              property,
              text.getAttribute(property) ?? fallback,
            );
        }
      }
    }
  }
  // 옛 그림(번호가 안 적힌 것)은 여기서 지금 차례대로 1·2·3 — 오늘 보이던 번호와 같다. 그 뒤로 고정.
  writeNumbers(doc);
  return serializeFigureSvg(doc);
}

/**
 * **요소 번호** — 원장님 2026-09-21 «순서를 바꿔도 요소 번호가 안바뀌게 고정시켜».
 *
 * 번호는 그리는 차례(DOM 차례)가 아니라 **요소에 붙은 값**(`data-n`)이다. 맨 앞으로·맨 뒤로를 해도 안 바뀐다.
 * 번호를 쓰는 자리가 여럿이라 모두 `figureNumbers` 한 함수를 읽는다 — 화면 번호표(`layoutFigureNumbers`) ·
 * 요소 목록(`FigureObjectList`) · 오른쪽 칸 제목 · AI 자료 목록(`describeFigureForEdit` 의 n) · AI 그림 번호표
 * (`figureEditSnapshot` — 번호표를 그대로 옮긴다) · AI 결과의 `target: n` 되짚기(`figureEditApply`·`figureShapeOps`).
 * 한 곳만 고치면 화면과 AI 가 다른 번호를 봐 AI 가 딴 요소를 고친다.
 *
 * - 옛 그림은 처음 열 때(`prepareFigureSvg`) 지금 차례대로 매긴다.
 * - 새 요소는 **마지막으로 준 번호 다음**. 마지막 번호는 루트 `data-n-last` 에 적어 두어 **지운 번호를 다시 안 쓴다**
 *   (맨 끝 15를 지우고 새로 그려도 16) — 다시 쓰면 원장님이 부르던 «요소 15»가 딴 것을 가리킨다. 빈 번호는 그대로 빈다.
 * - 같은 번호가 둘이면(붙여넣은 옛 원문 등) **앞(문서 차례)의 것**이 갖고 뒤의 것은 새 번호. 틀린 값도 새 번호.
 * - 번호를 아직 안 적은 요소(그리는 중·AI 가 막 더한 것)도 **같은 규칙으로 읽힌다** — 적기 전과 뒤가 같은 번호다.
 *   편집기는 한 걸음을 넘길 때마다(`commit`) `numberFigureObjects` 로 적는다.
 * - 편집 원문(저장의 `svg`)에만 싣는다. 지면·HWPX 로 나가는 그림(`dataUrl`)·내려받는 SVG 는 `withoutFigureNumbers`.
 */
export const NUMBER_ATTR = "data-n";
/** 루트 — 지금까지 준 가장 큰 번호. */
export const NUMBER_LAST_ATTR = "data-n-last";
const validNumber = (value: string | null) =>
  !!value && /^[1-9]\d{0,5}$/.test(value.trim());

function planNumbers(doc: Document) {
  const root = doc.documentElement;
  let last = validNumber(root.getAttribute(NUMBER_LAST_ATTR))
    ? Number(root.getAttribute(NUMBER_LAST_ATTR))
    : 0;
  const nodes = [...doc.querySelectorAll("[data-object-id]")];
  const numbers = new Map<string, number>();
  const taken = new Set<number>();
  const waiting: Element[] = [];
  for (const node of nodes) {
    const value = node.getAttribute(NUMBER_ATTR);
    const n = validNumber(value) ? Number(value) : NaN;
    if (Number.isNaN(n) || taken.has(n)) {
      waiting.push(node);
      continue;
    }
    taken.add(n);
    last = Math.max(last, n);
    numbers.set(node.getAttribute("data-object-id")!, n);
  }
  for (const node of waiting)
    numbers.set(node.getAttribute("data-object-id")!, ++last);
  return { nodes, numbers, last };
}

/** 요소 id → 번호. 번호를 쓰는 모든 자리가 이것 하나를 읽는다. */
export function figureNumbers(svg: string): Map<string, number> {
  return planNumbers(readFigureSvg(svg)).numbers;
}

/** 번호를 원문에 적는다 — 고친 것이 있으면 true. */
function writeNumbers(doc: Document) {
  const { nodes, numbers, last } = planNumbers(doc);
  let changed = false;
  for (const node of nodes) {
    const value = String(numbers.get(node.getAttribute("data-object-id")!));
    if (node.getAttribute(NUMBER_ATTR) === value) continue;
    node.setAttribute(NUMBER_ATTR, value);
    changed = true;
  }
  const root = doc.documentElement;
  if (last && root.getAttribute(NUMBER_LAST_ATTR) !== String(last)) {
    root.setAttribute(NUMBER_LAST_ATTR, String(last));
    changed = true;
  }
  return changed;
}

/** 번호가 안 적힌 요소에 번호를 적은 원문. 바꿀 것이 없으면 받은 원문 그대로(되돌리기 자리가 안 생긴다). */
export function numberFigureObjects(svg: string): string {
  const doc = editableFigureDoc(svg);
  return writeNumbers(doc) ? serializeFigureSvg(doc) : svg;
}

/**
 * 요소를 **번호 차례**로 — 요소 목록·묶음 차례(A·B·C 이름 매기기)가 이 차례를 쓴다. 그리는 차례(`figureObjects`)는
 * 맨 앞으로·맨 뒤로에 따라 바뀌지만 목록은 번호 차례라 그대로다.
 */
export function numberedFigureObjects(svg: string) {
  const numbers = figureNumbers(svg);
  return figureObjects(svg).sort(
    (a, b) => numbers.get(a.id)! - numbers.get(b.id)!,
  );
}

/** 번호 둘(`data-n`·루트 `data-n-last`)을 걷은 원문 — 지면·HWPX·내려받기·AI 다시 그리기로 나가는 그림. */
export const withoutFigureNumbers = (svg: string) =>
  svg.replace(/\sdata-n(?:-last)?="[^"]*"/g, "");

export function figureObjects(svg: string) {
  return [...readFigureSvg(svg).querySelectorAll("[data-object-id]")].map(
    (el) => ({
      id: el.getAttribute("data-object-id")!,
      type: el.localName,
      text: el.textContent ?? "",
      attrs: Object.fromEntries(
        [...el.attributes].map((a) => [a.name, a.value]),
      ),
    }),
  );
}

export function editFigureObject(
  svg: string,
  id: string,
  attrs: Record<string, string>,
  text?: string,
) {
  const doc = editableFigureDoc(svg);
  const el = [...doc.querySelectorAll("[data-object-id]")].find(
    (n) => n.getAttribute("data-object-id") === id,
  );
  if (!el) return svg;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === "") el.removeAttribute(key);
    else el.setAttribute(key, value);
    const styled = el as SVGElement;
    if (styled.style.getPropertyValue(key)) {
      if (value === "") styled.style.removeProperty(key);
      else styled.style.setProperty(key, value);
    }
  }
  if (text !== undefined && el.localName === "text") {
    el.textContent = visibleFigureLabel(text);
    el.setAttribute("data-mj", text);
  }
  return serializeFigureSvg(doc);
}

/**
 * 요소의 묶음을 정한다 — 요소마다 `data-group` 에 적어 원문에 남긴다(되돌리기·저장·다시 열기를 같이 탄다).
 * - 이름: 그 묶음으로(역할 묶음과 이름이 같으면 그 묶음에 합쳐 보인다 — 끌어서 옮기기)
 * - `""`: **묶음 밖**(해제 — 역할로도 다시 묶지 않는다)
 * - `null`: 표시를 지워 역할 어림으로 돌아간다
 */
export function setFigureGroup(
  svg: string,
  ids: readonly string[],
  name: string | null,
) {
  const doc = editableFigureDoc(svg);
  const wanted = new Set(ids);
  for (const node of doc.querySelectorAll("[data-object-id]"))
    if (wanted.has(node.getAttribute("data-object-id")!)) {
      if (name === null) node.removeAttribute("data-group");
      else node.setAttribute("data-group", name);
    }
  return serializeFigureSvg(doc);
}

/** 여러 요소에 같은 서식을 한 번에 — 묶음을 골라 공통 서식을 바꾼다(한 번 되돌리기로 돌아간다). */
export function editFigureObjects(
  svg: string,
  ids: readonly string[],
  attrs: Record<string, string>,
) {
  const doc = editableFigureDoc(svg);
  const wanted = new Set(ids);
  for (const el of doc.querySelectorAll("[data-object-id]")) {
    if (!wanted.has(el.getAttribute("data-object-id")!)) continue;
    for (const [key, value] of Object.entries(attrs)) {
      if (value === "") el.removeAttribute(key);
      else el.setAttribute(key, value);
      const styled = el as SVGElement;
      if (styled.style.getPropertyValue(key)) {
        if (value === "") styled.style.removeProperty(key);
        else styled.style.setProperty(key, value);
      }
    }
  }
  return serializeFigureSvg(doc);
}

export function removeFigureObject(svg: string, id: string) {
  const doc = editableFigureDoc(svg);
  [...doc.querySelectorAll("[data-object-id]")]
    .find((n) => n.getAttribute("data-object-id") === id)
    ?.remove();
  return serializeFigureSvg(doc);
}

/** 곡선 도구가 처음 휘는 정도 — 곡선 한가운데가 줄(현)에서 줄 길이의 이만큼 떨어진다. */
export const CURVE_BULGE = 0.12;
/**
 * 곡선 도구의 조절점 — 줄에 **수직으로**, 위쪽(세로 줄이면 왼쪽)으로 줄 길이의 12% 부풀게(원장님 2026-09-22 «치수선을
 * 만들려고하면, 자꾸 함수처럼 너무 과하게 곡선이 그려지는데»). 예전에는 늘 화면 위로 가로 길이의 절반만큼 올려
 * 가로 줄은 25% 로 부풀고, 비스듬한 줄은 한쪽으로 쏠리고, 세로 줄은 안 휘었다. 곡선의 한가운데는 조절점까지의 절반이다.
 */
function curveControl(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = Math.hypot(dx, dy);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  if (!length) return mid;
  let nx = dy / length,
    ny = -dx / length;
  if (ny > 0 || (ny === 0 && nx > 0)) {
    nx = -nx;
    ny = -ny;
  }
  const lift = 2 * CURVE_BULGE * length;
  const round = (v: number) => Math.round(v * 100) / 100;
  return { x: round(mid.x + nx * lift), y: round(mid.y + ny * lift) };
}

export function addFigureObject(
  svg: string,
  type: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  label = "A",
) {
  const doc = editableFigureDoc(svg);
  const tag = type === "arrow" ? "line" : type === "curve" ? "path" : type;
  const el = doc.createElementNS(SVG_NS, tag);
  const id = `obj-${crypto.randomUUID()}`;
  const set = (attrs: Record<string, string | number>) =>
    Object.entries(attrs).forEach(([key, value]) =>
      el.setAttribute(key, String(value)),
    );
  set({
    "data-object-id": id,
    stroke: "#111111",
    "stroke-width": 1.8,
    fill: "none",
  });
  if (type === "line" || type === "arrow")
    set({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
  if (type === "arrow") {
    const defs = doc.createElementNS(SVG_NS, "defs");
    const marker = doc.createElementNS(SVG_NS, "marker");
    Object.entries({
      id: `${id}-arrow`,
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "6",
      markerHeight: "6",
      orient: "auto-start-reverse",
    }).forEach(([key, value]) => marker.setAttribute(key, value));
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M0 0L10 5L0 10Z");
    path.setAttribute("fill", "#111111");
    marker.append(path);
    defs.append(marker);
    doc.documentElement.append(defs);
    set({ "marker-end": `url(#${id}-arrow)` });
  }
  if (type === "rect")
    set({
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      width: Math.max(1, Math.abs(to.x - from.x)),
      height: Math.max(1, Math.abs(to.y - from.y)),
    });
  if (type === "circle")
    set({
      cx: from.x,
      cy: from.y,
      r: Math.max(1, Math.hypot(to.x - from.x, to.y - from.y)),
    });
  if (type === "ellipse")
    set({
      cx: from.x,
      cy: from.y,
      rx: Math.max(1, Math.abs(to.x - from.x)),
      ry: Math.max(1, Math.abs(to.y - from.y)),
    });
  if (type === "curve") {
    const control = curveControl(from, to);
    set({
      d: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`,
    });
  }
  if (type === "text") {
    set({
      x: from.x,
      y: from.y,
      fill: "#111111",
      stroke: "none",
      "font-size": 18,
      "font-style": "normal",
      "font-family": "Times New Roman, serif",
      "data-mj": label,
    });
    el.textContent = visibleFigureLabel(label);
  }
  doc.documentElement.append(el);
  return { svg: serializeFigureSvg(doc), id };
}

export function cleanFigureForSave(svg: string) {
  const doc = parse(prepareFigureSvg(svg));
  for (const node of doc.querySelectorAll("[data-object-id]"))
    node.removeAttribute("data-object-id");
  return serializeFigureSvg(doc);
}

/** 실제 글꼴 메트릭으로 라벨까지 측정해 바깥 여백을 확보한다. */
export function fitFigureViewport(svg: string) {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;visibility:hidden;pointer-events:none";
  host.innerHTML = cleanFigureForSave(svg);
  document.body.append(host);
  try {
    const root = host.querySelector("svg")!;
    const bounds = root.getBBox?.();
    if (!bounds?.width || !bounds.height) return cleanFigureForSave(svg);
    const pad = Math.max(10, Math.max(bounds.width, bounds.height) * 0.04);
    root.setAttribute(
      "viewBox",
      `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + pad * 2} ${bounds.height + pad * 2}`,
    );
    root.setAttribute("width", String(bounds.width + pad * 2));
    root.setAttribute("height", String(bounds.height + pad * 2));
    return new XMLSerializer().serializeToString(root);
  } finally {
    host.remove();
  }
}
