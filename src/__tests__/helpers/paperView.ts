/**
 * 렌더된 지면(HTML)에서 **사람 눈에 보이는 것**을 읽는다 — 후보정 시험의 판정 도우미.
 *
 * 문자열(전처리 결과)만 보면 초록인데 지면이 깨진 일이 이 저장소에 여러 번 있었다
 * (교훈 «KaTeX 가 초록이라고 지면이 멀쩡한 게 아니다»). 그래서 전처리 문자열이 아니라
 * **실제 렌더 결과**의 DOM 을 걷는다.
 *
 *  - `visible` — 조판된 수식(`.katex`)을 ` ⟦⟧ ` 로 접은 **수식 밖 글자**. 여기에 `\명령`·`$` 가
 *    보이면 날 글자가 샌 것이다.
 *  - `formulas` — 조판된 수식마다 KaTeX 가 적어 둔 원 TeX(annotation).
 *  - `errors` — 붉은 KaTeX(`.katex-error` 또는 `color:#cc0000`). 조판이 안 선 원문 노출이다.
 *  - `hangul` — 지면에 보이는 한글 글자 수(수식 안 `\text{}` 포함). 원문보다 적으면 삼켜진 것이다.
 *
 * 판정 규칙은 조사 재현기(`ocr-audit/code/pipeline.mts` 의 `judge`)와 같다 — 조사와 시험이
 * 다른 자로 재면 «고쳤다»가 거짓말이 된다.
 */
export interface PaperView {
  visible: string;
  formulas: string[];
  errors: number;
  mathRaw: number;
  hangul: number;
  /** 가운데 정렬 표시식(`.katex-display`) 수 */
  displays: number;
}

const HANGUL = /[가-힣]/g;

export function readPaper(root: ParentNode): PaperView {
  let visible = "";
  let shown = "";
  const formulas: string[] = [];
  let errors = 0;
  let mathRaw = 0;
  let displays = 0;

  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      visible += node.textContent ?? "";
      shown += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== 1) {
      node.childNodes.forEach(walk);
      return;
    }
    const el = node as Element;
    if (el.classList.contains("katex-error")) {
      errors += 1;
      visible += el.textContent ?? "";
      shown += el.textContent ?? "";
      return;
    }
    if (el.classList.contains("math-raw")) {
      mathRaw += 1;
      shown += el.textContent ?? "";
      visible += " ⟦raw⟧ ";
      return;
    }
    if (el.classList.contains("katex-display")) displays += 1;
    if (el.classList.contains("katex")) {
      formulas.push(el.querySelector("annotation")?.textContent ?? "");
      const html = el.querySelector(".katex-html");
      if (html) {
        if (html.querySelector('[style*="cc0000"]')) errors += 1;
        shown += html.textContent ?? "";
      }
      visible += " ⟦⟧ ";
      return;
    }
    el.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);

  return {
    visible: visible.replace(/\s+/g, " ").trim(),
    formulas,
    errors,
    mathRaw,
    hangul: shown.match(HANGUL)?.length ?? 0,
    displays,
  };
}

/** HTML 문자열(문자열 경로 `renderMathHtml` 등)을 읽는다. */
export function readPaperHtml(html: string): PaperView {
  const box = document.createElement("div");
  box.innerHTML = html;
  return readPaper(box);
}

/**
 * 보이는 글자 속 날 LaTeX — `\명령` · `\(` `\[` `\{` · 외톨이 역슬래시 · `$` 뭉치.
 * 재현기의 `LEAK` 와 같은 식이다.
 */
export const LEAK = /\\[A-Za-z]+|\\[()[\]{}]|\\(?![A-Za-z()[\]{}])|\$+/g;

export const leaksOf = (view: PaperView): string[] =>
  view.visible.match(LEAK) ?? [];

export const hangulOf = (text: string): number =>
  text.match(HANGUL)?.length ?? 0;
