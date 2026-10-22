"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MathfieldElement } from "mathlive";
import { FIGURE_MATH_TEMPLATES } from "./figureMathTemplates";

MathfieldElement.fontsDirectory = `${import.meta.env.BASE_URL}mathlive/fonts`;
MathfieldElement.soundsDirectory = null;

const labelLatex = (field: MathfieldElement) => field.getValue("latex")
  .replace(/\\placeholder(?:\[[^\]]*\])?\{([^{}]*)\}/g, "$1");
const focusField = (field: MathfieldElement) => {
  field.focus();
  field.shadowRoot?.querySelector<HTMLElement>('[part~="keyboard-sink"]')?.focus({ preventScroll: true });
};

export default function FigureMathEditor({ value, onChange, idPrefix }: {
  value: string; onChange: (latex: string) => void; idPrefix: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const change = useRef(onChange);
  const currentValue = useRef(value);
  const [category, setCategory] = useState(0);
  useLayoutEffect(() => { change.current = onChange; currentValue.current = value; }, [onChange, value]);
  useEffect(() => {
    const math = new MathfieldElement();
    math.setAttribute("aria-label", `${idPrefix} 수식편집기`);
    math.style.cssText = "display:block;width:100%;min-height:72px;padding:8px;font-size:22px;border:0;background:white;";
    let active = true;
    const input = () => {
      if (!active) return;
      const next = labelLatex(math);
      if (next !== currentValue.current) {
        currentValue.current = next;
        change.current(next);
      }
    };
    // MathLive delays input events. Flush before a subsequent tab/canvas click
    // so the last typed character is part of the applied diagram.
    const afterKey = () => queueMicrotask(input);
    const outside = (event: Event) => { if (!event.composedPath().includes(math)) input(); };
    math.addEventListener("input", input);
    math.addEventListener("change", input);
    math.addEventListener("blur", input);
    math.addEventListener("keydown", afterKey, true);
    math.addEventListener("compositionend", afterKey);
    document.addEventListener("pointerdown", outside, true);
    host.current?.append(math);
    math.mathVirtualKeyboardPolicy = "manual";
    math.menuItems = [];
    math.setValue(currentValue.current, { silenceNotifications: true });
    field.current = math;
    return () => {
      active = false;
      math.removeEventListener("input", input);
      math.removeEventListener("change", input);
      math.removeEventListener("blur", input);
      math.removeEventListener("keydown", afterKey, true);
      math.removeEventListener("compositionend", afterKey);
      document.removeEventListener("pointerdown", outside, true);
      math.remove();
      field.current = null;
    };
  }, [idPrefix]);
  useEffect(() => {
    if (field.current && labelLatex(field.current) !== value)
      field.current.setValue(value, { silenceNotifications: true });
  }, [value, idPrefix]);
  const insert = (latex: string) => {
    const math = field.current;
    if (!math) return;
    focusField(math);
    math.insert(latex, { selectionMode: "placeholder" });
    const next = labelLatex(math);
    currentValue.current = next;
    change.current(next);
  };
  return <div className="space-y-2">
    <style>{`math-field::part(menu-toggle),math-field::part(virtual-keyboard-toggle){display:none}`}</style>
    <div className="flex flex-wrap gap-1" role="group" aria-label={`${idPrefix} 수식 구조 무리`}>
      {FIGURE_MATH_TEMPLATES.map((group, index) => <button key={group.name} type="button" aria-pressed={category === index}
        onMouseDown={(e) => e.preventDefault()} onClick={() => setCategory(index)}
        className={`rounded border px-2 py-1 text-xs ${category === index ? "border-blue-500 bg-blue-50 text-blue-800" : "border-control bg-surface text-muted"}`}>{group.name}</button>)}
    </div>
    <div className="grid grid-cols-3 gap-1" role="toolbar" aria-label={`${idPrefix} 수식 구조`}>
      {FIGURE_MATH_TEMPLATES[category].items.map(([name, latex]) => <button type="button" key={name}
        onMouseDown={(e) => e.preventDefault()} onClick={() => insert(latex)}
        className="rounded border border-control bg-surface px-1 py-2 text-xs hover:bg-side">{name}</button>)}
    </div>
    <div ref={host} className="overflow-x-auto rounded-lg border border-blue-300 bg-white focus-within:ring-2 focus-within:ring-blue-200" />
    <div className="flex items-center gap-2 text-xs">
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { if (field.current) { focusField(field.current); field.current.executeCommand("moveToNextPlaceholder"); } }} className="rounded border border-control px-2 py-1">다음 칸</button>
      <span className="text-muted">칸을 눌러 입력하세요. 방향키로 칸 사이를 이동합니다.</span>
    </div>
  </div>;
}
