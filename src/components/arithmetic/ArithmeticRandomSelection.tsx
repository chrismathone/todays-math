import { useState } from "react";
import s from "./ArithmeticWorkbench.module.css";

export function ArithmeticRandomSelection({
  available,
  disabled,
  onSelect,
}: {
  available: number;
  disabled: boolean;
  onSelect: (count: number) => void;
}) {
  const [count, setCount] = useState(3);
  return (
    <div className={s.randomSelection}>
      <label>
        무작위 유형 수
        <input
          type="number"
          min={1}
          max={100}
          value={count}
          disabled={disabled}
          onChange={(event) => setCount(Number(event.target.value))}
        />
      </label>
      <button
        type="button"
        disabled={
          disabled ||
          available === 0 ||
          !Number.isInteger(count) ||
          count < 1 ||
          count > 100
        }
        onClick={() => onSelect(count)}
      >
        무작위로 담기
      </button>
      <span>현재 검색 결과 중 담지 않은 {available}개 · 총 100문항 이내</span>
      <small>
        카드를 누른 채 드래그하면 여러 유형을 한 번에 선택하거나 해제할 수
        있습니다.
      </small>
    </div>
  );
}
