import { typesetFigureSvg } from "../../unified/figure-editor/figureTypeset";

const prepared = new Map<string, Promise<string>>();

/**
 * 본문에서 떼어 온 인라인 SVG 는 **남이 쓴 글자**다(OCR · AI 출력 · 사용자가 친 글). 그대로 `innerHTML` 에
 * 넣으면 `<image onerror=…>` 한 줄로 이 화면에서 스크립트가 돈다(2026-10-07 검수). 그리는 두 자리
 * (`SourceFigureSvg` · `paintSourceFigure`)가 아래 두 함수를 지난다.
 *
 * 두 겹이다.
 *  ⑴ **글자로 가른다**(`SUSPECT_MARKUP`) — DOM 이 없는 서버 렌더와 첫 그림이 쓴다. 넓게 잡는다:
 *     걸려도 잃는 것은 한 박자뿐이다(효과가 ⑵의 살균본을 곧 그린다).
 *  ⑵ **브라우저가 읽은 대로 걷는다**(`<template>` — 그 안에서는 아무것도 실행 · 적재되지 않는다) —
 *     실행되는 요소 · `on*` 속성 · 위험한 주소만 걷고 도형은 그대로 둔다.
 *
 * 🔴 ⑴에 안 걸린 글자는 **한 글자도 안 바꾼다** — 엔진 · 편집기가 그린 그림은 전과 똑같이 그려진다.
 */
const SUSPECT_MARKUP = [
  // 실행되거나 바깥 문서를 싣는 요소 · 주소를 바꾸는 움직임
  /<\s*(?:script|foreignObject|iframe|embed|object|link|meta|base|form|button|input|textarea|select|animate\w*|set|a|math|template|noscript)[\s>/]/i,
  // 이벤트 속성 — 이름 앞은 공백 · 빗금 · 앞 속성의 닫는 따옴표일 수 있다
  /[\s"'/]on[a-z]+\s*=/i,
  // 주소 속성에 엔티티 — `jav&#x09;ascript:` 처럼 가릴 수 있다
  /(?:href|src|action|data|values|to|from|by)\s*=\s*(?:"[^"]*&|'[^']*&|[^\s"'>]*&)/i,
  /<!|<\?/,
];
/** 공백 · 제어문자를 걷고 본다 — 브라우저는 주소 안의 탭 · 줄바꿈을 지운다. */
const SUSPECT_COMPACT = /(?:java|vb)script:|data:(?!image\/)|srcdoc/i;

function suspect(source: string): boolean {
  return (
    SUSPECT_MARKUP.some((pattern) => pattern.test(source)) ||
    SUSPECT_COMPACT.test(source.replace(/[\s\u0000-\u001f]/g, ""))
  );
}

/** 첫 그림(서버 렌더 포함)에 실을 글자 — 의심스러우면 비운다. 효과가 살균본을 곧 그린다. */
export function firstPaintFigureMarkup(source: string): string {
  return suspect(source) ? "" : source;
}

const BLOCKED_ELEMENTS = new Set([
  "script",
  "iframe",
  "embed",
  "object",
  "link",
  "meta",
  "base",
  "form",
  "button",
  "input",
  "textarea",
  "select",
  "set",
  "template",
  "noscript",
]);
const URL_ATTRIBUTES = new Set([
  "href",
  "xlink:href",
  "src",
  "action",
  "formaction",
  "data",
  "poster",
]);

/** 안쪽 조각(#id) · 스킴 없는 주소 · http(s) · `data:image/` 만 남긴다. `use` 는 안쪽 조각만. */
function safeUrl(element: string, value: string): boolean {
  const url = value.replace(/[\s\u0000-\u001f]/g, "");
  if (url.startsWith("#")) return true;
  if (element === "use") return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
  if (!scheme) return !url.startsWith("//");
  if (scheme === "http" || scheme === "https") return true;
  return scheme === "data" && /^data:image\//i.test(url);
}

/**
 * `innerHTML` 에 넣어도 되는 글자. 깨끗한 글자는 그대로 돌려주고, 의심스러운 글자만 브라우저의 파서로 읽어
 * 실행되는 것을 걷는다. DOM 이 없으면(서버) 첫 그림과 같은 판정이다.
 */
export function sanitizeSourceFigure(source: string): string {
  if (!suspect(source)) return source;
  if (typeof document === "undefined") return "";
  const template = document.createElement("template");
  template.innerHTML = source;
  for (const node of [...template.content.querySelectorAll("*")]) {
    const name = node.localName.toLowerCase();
    if (BLOCKED_ELEMENTS.has(name) || name.startsWith("animate")) {
      node.remove();
      continue;
    }
    for (const attribute of [...node.attributes]) {
      const attributeName = attribute.name.toLowerCase();
      if (
        attributeName.startsWith("on") ||
        attributeName === "srcdoc" ||
        (URL_ATTRIBUTES.has(attributeName) && !safeUrl(name, attribute.value))
      )
        node.removeAttribute(attribute.name);
    }
  }
  return template.innerHTML;
}

/** Keep the source viewport and aspect ratio; cap the painted frame, not its row. */
export function sourceFigureWidth(source: string): number {
  const root = source.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const attribute = (name: string) =>
    root.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  const length = (value: string | undefined) =>
    value && /^\d+(?:\.\d+)?(?:px)?$/.test(value) ? parseFloat(value) : 0;
  const viewBox = attribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const intrinsicWidth = length(attribute("width"));
  const intrinsicHeight = length(attribute("height"));
  const ratio = viewBox?.[2] && viewBox[3] ? viewBox[2] / viewBox[3] : 1;
  const width =
    intrinsicWidth ||
    (intrinsicHeight ? intrinsicHeight * ratio : viewBox?.[2]) ||
    360;
  const height =
    intrinsicHeight ||
    (intrinsicWidth ? intrinsicWidth / ratio : viewBox?.[3]) ||
    width;
  return width > 0 && height > 0 && Number.isFinite(width / height)
    ? Math.min(width, 360, (360 * width) / height)
    : 360;
}

/** Shared by React previews and TipTap node views; stale redraws cannot repaint. */
export function paintSourceFigure(
  element: HTMLElement,
  source: string,
): () => void {
  let active = true;
  element.innerHTML = sanitizeSourceFigure(source);
  element.style.setProperty(
    "--source-figure-width",
    `${sourceFigureWidth(source)}px`,
  );
  if (/<text\b/i.test(source)) {
    let pending = prepared.get(source);
    if (!pending) {
      // Preserve the viewport/object positions and let the shared label placer
      // handle anchors, baselines, transforms, CJK fallback and existing paths.
      pending = typesetFigureSvg(source, true);
      if (prepared.size >= 100) prepared.delete(prepared.keys().next().value!);
      prepared.set(source, pending);
      void pending.catch(() => prepared.delete(source));
    }
    void pending
      .then((rendered) => {
        if (active) element.innerHTML = sanitizeSourceFigure(rendered);
      })
      .catch(() => {
        /* Keep the source drawing if label preparation fails. */
      });
  }
  return () => {
    active = false;
  };
}
