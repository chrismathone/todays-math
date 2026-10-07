import s from "./fading.module.css";

export function FadingSentencePager({
  index,
  count,
  onChange,
  disabled = false,
  advanceAction = false,
  forwardDisabled = false,
}: {
  index: number;
  count: number;
  onChange: (index: number) => void;
  disabled?: boolean;
  advanceAction?: boolean;
  forwardDisabled?: boolean;
}) {
  return (
    <nav className={s.singleCardPager} aria-label="개념 문장 이동">
      <button
        type="button"
        className={s.secondary}
        disabled={disabled || index === 0}
        onClick={() => onChange(index - 1)}
      >
        이전 문장
      </button>
      <span className={s.singleCardCount} aria-live="polite" aria-atomic="true">
        문장 {index + 1} / {count}
      </span>
      <button
        type="button"
        className={s.secondary}
        disabled={disabled || forwardDisabled || index === count - 1}
        data-fading-action={
          advanceAction && index < count - 1 ? "true" : undefined
        }
        onClick={() => onChange(index + 1)}
      >
        다음 문장
      </button>
    </nav>
  );
}
