import { useRef, useState } from "react";

// Local adapter for Mathgen's label editor. TeX metadata is unchanged; no MathLive assets are required.
const MATH_TEMPLATES = [
  ["분수", "\\frac{}{}"],
  ["제곱", "^{2}"],
  ["아래첨자", "_{}"],
  ["루트", "\\sqrt{}"],
  ["π", "\\pi"],
  ["θ", "\\theta"],
] as const;
export const isFigureMathLabel = (value: string) =>
  value.trim().length >= 2 &&
  value.trim().startsWith("$") &&
  value.trim().endsWith("$");
const unwrap = (value: string) =>
  isFigureMathLabel(value) ? value.trim().slice(1, -1) : value;
export const figureLabelSummary = (value: string) =>
  unwrap(value).replace(/\\(?:left|right)\b/g, "");

export function FigureLabelInput({
  value,
  onChange,
  idPrefix,
}: {
  value: string;
  onChange: (value: string) => void;
  idPrefix: string;
}) {
  const [mode, setMode] = useState<"text" | "math">(() =>
    isFigureMathLabel(value) ? "math" : "text",
  );
  const input = useRef<HTMLInputElement>(null);
  const update = (next: string) =>
    onChange(mode === "math" ? `$${next}$` : next);
  const insert = (latex: string) => {
    const plain = unwrap(value),
      start = input.current?.selectionStart ?? plain.length,
      end = input.current?.selectionEnd ?? start;
    update(plain.slice(0, start) + latex + plain.slice(end));
    input.current?.focus();
    requestAnimationFrame(() => {
      const cursor =
        start + (latex.includes("{}") ? latex.indexOf("{}") + 1 : latex.length);
      input.current?.setSelectionRange(cursor, cursor);
    });
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
        onChange={(event) => update(event.target.value)}
        className="w-full rounded-lg border border-control px-3 py-2 text-sm"
        placeholder={
          mode === "math" ? "예: x^2, \\frac{1}{2}" : "예: 점 A, 길이"
        }
        spellCheck={false}
      />
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
