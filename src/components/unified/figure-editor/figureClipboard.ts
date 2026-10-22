import {
  editableFigureDoc,
  NUMBER_ATTR,
  NUMBER_LAST_ATTR,
  prepareFigureSvg,
  serializeFigureSvg,
  SVG_NS,
} from "./figureSvgEditing";

export const FIGURE_CLIPBOARD_TYPE = "application/x-mathgen-figure";
// Keep editable SVG in this page's memory; only an opaque key reaches the OS.
let internalClipboard: { token: string; source: string } | null = null;
export function storeFigureClipboard(source: string): string {
  const token = crypto.randomUUID();
  internalClipboard = { token, source };
  return token;
}
export function readFigureClipboard(token: string): string | null {
  return internalClipboard?.token === token ? internalClipboard.source : null;
}
const parse = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");

/** 선택한 요소와 조상 변환·스타일·화살표 정의를 함께 보존한다. */
export function copyFigureSelection(svg: string, ids: string[]): string | null {
  if (!ids.length) return null;
  const doc = parse(svg),
    selected = new Set(ids);
  for (const node of doc.querySelectorAll("[data-object-id]")) {
    if (!selected.has(node.getAttribute("data-object-id")!)) node.remove();
  }
  if (!doc.querySelector("[data-object-id]")) return null;
  doc.documentElement.setAttribute("data-mathgen-clipboard", "1");
  return serializeFigureSvg(doc);
}

export function pasteFigureSelection(svg: string, source: string, offset = 12) {
  const doc = parse(svg),
    incoming = parse(prepareFigureSvg(source));
  const root = incoming.documentElement;
  const nodes = [...root.querySelectorAll("[data-object-id]")];
  if (!nodes.length) return null;
  // 반복 붙여넣기나 서로 다른 그림 사이에서도 marker/clipPath ID가 충돌하지 않게 한다.
  const prefix = `paste-${crypto.randomUUID()}-`,
    references = new Map<string, string>();
  for (const node of [root, ...root.querySelectorAll("[id]")]) {
    const id = node.getAttribute("id");
    if (id) {
      references.set(id, prefix + id);
      node.setAttribute("id", prefix + id);
    }
  }
  for (const node of [root, ...root.querySelectorAll("*")]) {
    for (const attr of [...node.attributes]) {
      let value = attr.value.replace(
        /url\(\s*["']?#([^\s"')]+)["']?\s*\)/g,
        (full, id) =>
          references.has(id) ? `url(#${references.get(id)})` : full,
      );
      if (
        /href$/i.test(attr.name) &&
        value.startsWith("#") &&
        references.has(value.slice(1))
      )
        value = `#${references.get(value.slice(1))}`;
      if (value !== attr.value) node.setAttribute(attr.name, value);
    }
  }
  // 면이 따라가는 선의 열쇠(id) — 같이 붙여넣은 선이면 새 이름으로, 하나라도 없으면 따라가지 않는 면으로
  // (옛 열쇠를 두면 붙여넣은 면이 원래 그림의 선을 따라간다).
  for (const node of root.querySelectorAll("[data-face]")) {
    const keys = (node.getAttribute("data-face") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    if (!keys.length) continue;
    const renamed = keys.map((key) => references.get(key));
    if (renamed.every(Boolean))
      node.setAttribute("data-face", renamed.join(" "));
    else {
      node.setAttribute("data-face", "");
      node.removeAttribute("data-face-seed");
    }
  }
  const ids = nodes.map((node) => {
    const id = `obj-${crypto.randomUUID()}`;
    node.setAttribute("data-object-id", id);
    // 붙여넣은 것은 새 요소 — 원래 요소의 번호를 들고 오지 않는다(편집기가 마지막 번호 다음을 준다)
    node.removeAttribute(NUMBER_ATTR);
    return id;
  });
  const translated = doc.createElementNS(SVG_NS, "g");
  translated.setAttribute("transform", `translate(${offset} ${offset})`);
  const group = doc.createElementNS(SVG_NS, "g");
  for (const attr of [...root.attributes]) {
    if (
      ![
        "xmlns",
        "xmlns:xlink",
        "viewBox",
        "width",
        "height",
        "x",
        "y",
        "data-mathgen-clipboard",
        NUMBER_LAST_ATTR,
      ].includes(attr.name)
    )
      group.setAttribute(attr.name, attr.value);
  }
  for (const child of [...root.childNodes])
    group.append(doc.importNode(child, true));
  translated.append(group);
  doc.documentElement.append(translated);
  return { svg: serializeFigureSvg(doc), ids };
}

/** 여러 요소의 변경도 실행 취소 한 번으로 되돌릴 수 있도록 한 SVG로 만든다. */
export function transformFigureSelection(
  svg: string,
  updates: { id: string; transform: string }[],
) {
  // 여럿을 끄는 걸음마다 부른다 — 기억해 둔 문서의 복사본을 고친다(읽기 전용 원본은 건드리지 않는다).
  const doc = editableFigureDoc(svg),
    transforms = new Map(updates.map((item) => [item.id, item.transform]));
  for (const node of doc.querySelectorAll("[data-object-id]")) {
    const value = transforms.get(node.getAttribute("data-object-id")!);
    if (value !== undefined) node.setAttribute("transform", value);
  }
  return serializeFigureSvg(doc);
}

export function removeFigureSelection(svg: string, ids: string[]) {
  const doc = parse(svg),
    selected = new Set(ids);
  for (const node of doc.querySelectorAll("[data-object-id]"))
    if (selected.has(node.getAttribute("data-object-id")!)) node.remove();
  return serializeFigureSvg(doc);
}
