/**
 * 글자 칸의 특수문자 자판 — 원장님 2026-09-19 «자주 쓰이는 특수문자들은 기본적으로 몇 개 나열해 놓고 클릭해서
 * 입력» · «일반 글자에서도 입력 가능한 모든 것. 대신 카테고리를 묶어서 선택하게 (모바일 키보드 자판처럼)».
 * 무리·문자·수식 대응은 **여기서만** 정한다(시험이 못 박는다).
 */
export interface FigureSymbolGroup {
  name: string;
  symbols: readonly string[];
}

const chars = (list: string) => list.split(" ");

export const FIGURE_SYMBOL_GROUPS: readonly FigureSymbolGroup[] = [
  { name: "기하", symbols: chars("° ∠ △ ⊥ ∥ ≡ ⌒ ′ ″ ∽ ▱ ⊙") },
  {
    name: "그리스",
    symbols: chars("π θ α β γ δ ε λ μ ρ σ τ φ ω Δ Σ Π Φ Ω"),
  },
  {
    name: "연산",
    symbols: chars("× ÷ ± ∓ · √ ∛ ∫ ≤ ≥ ≦ ≧ ≠ ≒ ≈ ∝ < >"),
  },
  {
    name: "집합",
    symbols: chars("∈ ∉ ∋ ⊂ ⊄ ⊃ ⊆ ⊇ ∪ ∩ ∅ ∴ ∵ ∀ ∃ ⇒ ⇔ ∼"),
  },
  { name: "화살표", symbols: chars("→ ← ↑ ↓ ↔ ⇒ ⇐ ⇔ ↗ ↘ ↖ ↙") },
  {
    name: "첨자",
    symbols: chars("¹ ² ³ ⁴ ⁿ ₁ ₂ ₃ ₄ ₙ ½ ⅓ ¼ ⅔ ¾"),
  },
  {
    name: "단위",
    symbols: chars("㎜ ㎝ ㎞ ㎠ ㎡ ㎢ ㎤ ㎥ ㎖ ㎗ ℓ ㎘ ㏄ ㎎ ㎏ ℃ %"),
  },
  {
    name: "원문자",
    symbols: chars(
      "① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ ㉠ ㉡ ㉢ ㉣ ㉤ ㉥ ㈎ ㈏ ㈐ ㈑ 「 」 《 》 【 】 ※",
    ),
  },
  {
    name: "기타",
    symbols: chars("□ ■ ○ ● ◇ ◆ △ ▲ ☆ ★ ∞ ⋯ …"),
  },
];

/**
 * 수식 탭에서 넣는 명령 — 같은 뜻의 TeX. 여기 없는 문자는 원문자 그대로 넣는다.
 * 낱말 명령은 빈칸으로 끝낸다(뒤에 글자를 이어 쳐도 `\angleABC` 처럼 붙지 않게).
 * `{}` 가 든 명령은 넣은 뒤 커서가 첫 `{}` 안에 선다(수식 도구와 같다).
 */
export const FIGURE_SYMBOL_TEX: Readonly<Record<string, string>> = {
  // 기하
  "°": "^{\\circ}",
  "∠": "\\angle ",
  "△": "\\triangle ",
  "⊥": "\\perp ",
  "∥": "\\parallel ",
  "≡": "\\equiv ",
  "⌒": "\\frown ",
  "′": "'",
  "″": "''",
  "∽": "\\backsim ",
  "⊙": "\\odot ",
  // 그리스
  π: "\\pi ",
  θ: "\\theta ",
  α: "\\alpha ",
  β: "\\beta ",
  γ: "\\gamma ",
  δ: "\\delta ",
  ε: "\\varepsilon ",
  λ: "\\lambda ",
  μ: "\\mu ",
  ρ: "\\rho ",
  σ: "\\sigma ",
  τ: "\\tau ",
  φ: "\\varphi ",
  ω: "\\omega ",
  Δ: "\\Delta ",
  Σ: "\\Sigma ",
  Π: "\\Pi ",
  Φ: "\\Phi ",
  Ω: "\\Omega ",
  // 연산·비교
  "×": "\\times ",
  "÷": "\\div ",
  "±": "\\pm ",
  "∓": "\\mp ",
  "·": "\\cdot ",
  "√": "\\sqrt{}",
  "∛": "\\sqrt[3]{}",
  "∫": "\\int ",
  "≤": "\\le ",
  "≥": "\\ge ",
  "≦": "\\leqq ",
  "≧": "\\geqq ",
  "≠": "\\ne ",
  "≒": "\\fallingdotseq ",
  "≈": "\\approx ",
  "∝": "\\propto ",
  // 집합·논리
  "∈": "\\in ",
  "∉": "\\notin ",
  "∋": "\\ni ",
  "⊂": "\\subset ",
  "⊄": "\\not\\subset ",
  "⊃": "\\supset ",
  "⊆": "\\subseteq ",
  "⊇": "\\supseteq ",
  "∪": "\\cup ",
  "∩": "\\cap ",
  "∅": "\\varnothing ",
  "∴": "\\therefore ",
  "∵": "\\because ",
  "∀": "\\forall ",
  "∃": "\\exists ",
  "∼": "\\sim ",
  // 화살표
  "→": "\\rightarrow ",
  "←": "\\leftarrow ",
  "↑": "\\uparrow ",
  "↓": "\\downarrow ",
  "↔": "\\leftrightarrow ",
  "⇒": "\\Rightarrow ",
  "⇐": "\\Leftarrow ",
  "⇔": "\\Leftrightarrow ",
  "↗": "\\nearrow ",
  "↘": "\\searrow ",
  "↖": "\\nwarrow ",
  "↙": "\\swarrow ",
  // 첨자·분수
  "¹": "^{1}",
  "²": "^{2}",
  "³": "^{3}",
  "⁴": "^{4}",
  ⁿ: "^{n}",
  "₁": "_{1}",
  "₂": "_{2}",
  "₃": "_{3}",
  "₄": "_{4}",
  ₙ: "_{n}",
  "½": "\\frac{1}{2}",
  "⅓": "\\frac{1}{3}",
  "¼": "\\frac{1}{4}",
  "⅔": "\\frac{2}{3}",
  "¾": "\\frac{3}{4}",
  // 단위
  "㎜": "\\mathrm{mm}",
  "㎝": "\\mathrm{cm}",
  "㎞": "\\mathrm{km}",
  "㎠": "\\mathrm{cm}^{2}",
  "㎡": "\\mathrm{m}^{2}",
  "㎢": "\\mathrm{km}^{2}",
  "㎤": "\\mathrm{cm}^{3}",
  "㎥": "\\mathrm{m}^{3}",
  "㎖": "\\mathrm{mL}",
  "㎗": "\\mathrm{dL}",
  ℓ: "\\ell ",
  "㎘": "\\mathrm{kL}",
  "㏄": "\\mathrm{cc}",
  "㎎": "\\mathrm{mg}",
  "㎏": "\\mathrm{kg}",
  "℃": "{}^{\\circ}\\mathrm{C}",
  "%": "\\%",
  // 도형·기타
  "□": "\\square ",
  "■": "\\blacksquare ",
  "○": "\\bigcirc ",
  "◇": "\\Diamond ",
  "▲": "\\blacktriangle ",
  "★": "\\bigstar ",
  "∞": "\\infty ",
  "⋯": "\\cdots ",
  "…": "\\ldots ",
};

/** 누른 문자가 입력칸에 들어갈 모양 — 일반 글자는 문자 그대로, 수식은 대응 명령(없으면 문자 그대로). */
export const figureSymbolInput = (symbol: string, mode: "text" | "math") =>
  mode === "math" ? (FIGURE_SYMBOL_TEX[symbol] ?? symbol) : symbol;
