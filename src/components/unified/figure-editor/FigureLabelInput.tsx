import { useLayoutEffect, useRef, useState } from "react";
import { hwpToLatex } from "@/lib/math/hwpEquation";
import { FIGURE_SYMBOL_GROUPS, figureSymbolInput } from "./figureSymbols";

// Local adapter for Mathgen's label editor. TeX metadata is unchanged; no MathLive assets are required.
// math-figure-editor: 벡터·선분·호 틀을 더했다(2026-10-21 — 벡터 그림을 손으로 고칠 방법이 없었다).
// todays-math 상류에는 아직 없는 세 줄이다.
const MATH_TEMPLATES = [
  ["분수", "\\frac{}{}"],
  ["제곱", "^{2}"],
  ["아래첨자", "_{}"],
  ["루트", "\\sqrt{}"],
  ["벡터", "\\vec{}"],
  ["선분", "\\overline{}"],
  ["호", "\\overparen{}"],
  ["π", "\\pi"],
  ["θ", "\\theta"],
] as const;
export const isFigureMathLabel = (value: string) =>
  value.trim().length >= 2 &&
  value.trim().startsWith("$") &&
  value.trim().endsWith("$");
const unwrap = (value: string) =>
  isFigureMathLabel(value) ? value.trim().slice(1, -1) : value;
/**
 * 수식 라벨의 한글(HWP) 수식 문법을 TeX 로 — 입력칸 확정(commit)과 **새 글자를 놓는 순간**이 같이 쓴다.
 * math-figure-editor(2026-10-21): 수식을 치고 Enter 없이 캔버스를 누르면, 입력칸이 바꾸기 전 값으로 글자가
 * 놓여 `root2` 가 그대로 남았다(상류 공통 결함). 그래서 놓는 쪽도 같은 변환을 거친다. 일반 글자는 그대로.
 */
export function hwpLabelToTex(value: string): string {
  if (!isFigureMathLabel(value)) return value;
  const result = hwpToLatex(unwrap(value));
  return result.changed ? `$${result.latex}$` : value;
}
export const figureLabelSummary = (value: string) =>
  unwrap(value).replace(/\\(?:left|right)\b/g, "");

export function FigureLabelInput({
  value,
  onChange,
  idPrefix,
  symbolGroup,
  onSymbolGroup,
}: {
  value: string;
  onChange: (value: string) => void;
  idPrefix: string;
  /** 특수문자 자판에서 연 무리 — 편집기가 들고 있어 다른 글자를 골라도 기억한다. */
  symbolGroup: string;
  onSymbolGroup: (name: string) => void;
}) {
  const group =
    FIGURE_SYMBOL_GROUPS.find((g) => g.name === symbolGroup) ??
    FIGURE_SYMBOL_GROUPS[0];
  const [mode, setMode] = useState<"text" | "math">(() =>
    isFigureMathLabel(value) ? "math" : "text",
  );
  const input = useRef<HTMLInputElement>(null);
  // math-figure-editor: 한글 수식 변환 경고(«중괄호 짝이 맞지 않습니다» 등) — 상류는 버렸다. 다시 치면 지운다.
  const [warning, setWarning] = useState<{ value: string; text: string } | null>(null);
  /** 자판·도구로 넣은 뒤 둘 커서 자리 — 그 값이 그려진 같은 커밋에서 놓는다(한 프레임 늦으면 그새 친 글자가 갈라진다). */
  const pendingCursor = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (pendingCursor.current === null) return;
    const cursor = pendingCursor.current;
    pendingCursor.current = null;
    input.current?.setSelectionRange(cursor, cursor);
  }, [value]);
  const update = (next: string) =>
    onChange(mode === "math" ? `$${next}$` : next);
  /**
   * 확정(Enter · 포커스 아웃) 때 한글(HWP) 수식 문법을 TeX 로 — `root2` → `\sqrt{2}` (트랙 8).
   * 역슬래시가 있으면(이미 TeX · 특수문자 자판의 `\angle ` 등) 그대로 둔다.
   */
  const commit = () => {
    if (mode !== "math") return;
    const result = hwpToLatex(unwrap(value));
    if (result.changed) update(result.latex);
    if (result.changed) setWarning(result.warnings.length
      ? { value: `$${result.latex}$`, text: result.warnings.join(" · ") }
      : null);
  };
  const insert = (latex: string) => {
    const plain = unwrap(value),
      start = input.current?.selectionStart ?? plain.length,
      end = input.current?.selectionEnd ?? start;
    pendingCursor.current =
      start + (latex.includes("{}") ? latex.indexOf("{}") + 1 : latex.length);
    update(plain.slice(0, start) + latex + plain.slice(end));
    input.current?.focus();
  };
  return (
    <div className="space-y-2" onKeyDown={(event) => event.stopPropagation()}>
      <div
        className="grid grid-cols-2 rounded-lg bg-side p-1"
        role="group"
        aria-label={`${idPrefix} 종류`}
      >
        {(["text", "math"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => {
              setWarning(null);
              setMode(option);
              onChange(
                option === "math" ? `$${unwrap(value)}$` : unwrap(value),
              );
            }}
            className={`rounded-md px-2 py-1.5 text-xs font-medium ${mode === option ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
          >
            {option === "text" ? "일반 글자" : "수식"}
          </button>
        ))}
      </div>
      <input
        ref={input}
        aria-label={mode === "math" ? `${idPrefix} 수식` : idPrefix}
        value={unwrap(value)}
        onChange={(event) => {
          setWarning(null);
          update(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) commit();
        }}
        onBlur={commit}
        className="w-full rounded-lg border border-control px-3 py-2 text-sm"
        placeholder={
          mode === "math" ? "예: x^2, \\frac{1}{2}" : "예: 점 A, 길이"
        }
        spellCheck={false}
      />
      {warning?.value === value && (
        <p role="status" className="text-xs leading-relaxed text-[var(--learn-warning)]">
          한글 수식을 TeX 로 바꿨습니다 — {warning.text}. 결과를 확인해 주세요.
        </p>
      )}
      {/* 특수문자 자판 — 휴대폰 자판의 기호 쪽처럼 무리 탭 + 문자 격자. 누르면 입력칸의 커서 자리에 넣는다
          (누를 때 입력칸 초점·선택을 뺏지 않는다). 모양은 «일반 글자 | 수식» 전환과 수식 도구 단추의 것. */}
      <div className="space-y-1.5">
        <div
          className="flex flex-wrap gap-0.5 rounded-lg bg-side p-1"
          role="group"
          aria-label={`${idPrefix} 특수문자 무리`}
        >
          {FIGURE_SYMBOL_GROUPS.map((option) => (
            <button
              key={option.name}
              type="button"
              aria-pressed={option.name === group.name}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSymbolGroup(option.name)}
              className={`rounded-md px-2 py-1.5 text-xs font-medium ${option.name === group.name ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
            >
              {option.name}
            </button>
          ))}
        </div>
        <div
          className="grid grid-cols-6 gap-1"
          role="group"
          aria-label={`${idPrefix} 특수문자`}
        >
          {group.symbols.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(figureSymbolInput(symbol, mode))}
              className="rounded border border-control bg-surface py-1 text-base leading-6"
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>
      {mode === "math" && (
        <>
          <div
            className="flex flex-wrap gap-1"
            role="toolbar"
            aria-label={`${idPrefix} 수식 도구`}
          >
            {MATH_TEMPLATES.map(([name, latex]) => (
              <button
                key={name}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(latex)}
                className="rounded border border-control bg-surface px-2 py-1 text-xs"
              >
                {name}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted">
            수식은 TeX로 입력하세요. 그림과 SVG 저장에 수식 모양으로 표시됩니다.
          </p>
        </>
      )}
    </div>
  );
}
