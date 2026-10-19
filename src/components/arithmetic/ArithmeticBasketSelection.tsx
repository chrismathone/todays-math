"use client";

import { useState } from "react";
import s from "./ArithmeticWorkbench.module.css";

/** Selection follows basket row IDs, independently of counts and catalog filters. */
export function useArithmeticBasketSelection(ids: readonly string[]) {
  const key = JSON.stringify(ids);
  const [previousKey, setPreviousKey] = useState(key);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  // Forget removed rows before they can be added again under the same ID.
  if (previousKey !== key) {
    setPreviousKey(key);
    setChecked(new Set(ids.filter((id) => checked.has(id))));
  }
  return {
    checked,
    count: ids.filter((id) => checked.has(id)).length,
    toggle(id: string, value: boolean) {
      setChecked((current) => {
        const next = new Set(current);
        if (value) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    toggleAll(value: boolean) {
      setChecked(new Set(value ? ids : []));
    },
  };
}

export function ArithmeticBasketSelection({
  selection,
  total,
  disabled,
  onRemove,
}: {
  selection: ReturnType<typeof useArithmeticBasketSelection>;
  total: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <div className={s.basketActions}>
      <label className={s.basketCheck}>
        <input
          type="checkbox"
          aria-label="담은 유형 전체 선택"
          checked={total > 0 && selection.count === total}
          disabled={disabled || total === 0}
          ref={(node) => {
            if (node)
              node.indeterminate =
                selection.count > 0 && selection.count < total;
          }}
          onChange={(event) => selection.toggleAll(event.target.checked)}
        />
        전체 선택
      </label>
      <button
        type="button"
        aria-label="선택한 유형 빼기"
        disabled={disabled || selection.count === 0}
        onClick={onRemove}
      >
        선택 빼기 (<span aria-live="polite">{selection.count}</span>)
      </button>
    </div>
  );
}
