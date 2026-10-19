"use client";

import { useState } from "react";
import {
  matchingStep,
  stepLadder,
  stepsSupported,
  QUESTION_FORMATS,
  type AppliedConditions,
} from "./conditionsPlan";
import s from "./ExamBuilder.module.css";

/** H2의 빠른 입력. 배분과 난이도 사다리는 기존 조건 계산기를 사용한다. */
export default function QuickConditions({
  value,
  total,
  ladder,
  recentDays,
  disabled,
  onChange,
}: {
  value: AppliedConditions;
  total: number;
  ladder: readonly string[];
  recentDays: number;
  disabled: boolean;
  onChange: (value: AppliedConditions) => void;
}) {
  const [manual, setManual] = useState(false);
  const count = value.total ?? total;
  const step = matchingStep(value.ladder, count, ladder);
  const number = (
    label: string,
    current: number | null,
    change: (next: number | null) => void,
  ) => (
    <label className={s.quickField}>
      {label}
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        inputMode="numeric"
        placeholder="–"
        disabled={disabled}
        value={current ?? ""}
        onChange={(event) =>
          change(
            event.target.value === ""
              ? null
              : Math.max(
                  0,
                  Math.min(100, Math.floor(Number(event.target.value) || 0)),
                ),
          )
        }
      />
    </label>
  );
  return (
    <div className={s.quickConditions}>
      <h3>이번 시험지의 조건</h3>
      {number("총 문항 수", value.total, (total) =>
        onChange({ ...value, total }),
      )}
      <small>비우면 범위별 수의 합으로 구성합니다.</small>
      <div className={s.quickPresets} aria-label="총 문항 수 빠른 선택">
        {[25, 50, 75, 100].map((total) => (
          <button
            type="button"
            key={total}
            disabled={disabled}
            aria-pressed={value.total === total}
            onClick={() => onChange({ ...value, total })}
          >
            {total}
          </button>
        ))}
      </div>
      <fieldset className={s.quickLadder} disabled={disabled}>
        <legend>
          난이도 <small>{step === null ? "직접" : `${step + 1}단계`}</small>
        </legend>
        {stepsSupported(ladder) && (
          <div className={s.quickSteps} aria-label="난이도 단계">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <button
                type="button"
                key={index}
                disabled={!count || count > 100}
                aria-pressed={step === index}
                onClick={() =>
                  onChange({
                    ...value,
                    ladder: stepLadder(index, count, ladder),
                  })
                }
              >
                {index + 1}단계
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={s.textButton}
          aria-expanded={manual}
          onClick={() => setManual(!manual)}
        >
          직접 · 난이도별 수 {manual ? "접기" : "펼치기"}
        </button>
        {manual && (
          <div className={s.quickNumbers}>
            {ladder.map((tier) => (
              <div key={tier}>
                {number(tier, value.ladder[tier], (next) =>
                  onChange({
                    ...value,
                    ladder: { ...value.ladder, [tier]: next },
                  }),
                )}
              </div>
            ))}
          </div>
        )}
      </fieldset>
      <details className={s.quickDisclosure}>
        <summary>
          형식별 수 <small>객관식 · 단답형 · 서술형</small>
        </summary>
        <div className={s.quickNumbers}>
          {QUESTION_FORMATS.map((format) => (
            <div key={format}>
              {number(format, value.formats[format], (next) =>
                onChange({
                  ...value,
                  formats: { ...value.formats, [format]: next },
                }),
              )}
            </div>
          ))}
        </div>
        <small>‘–’는 지정 없음 · 0은 내지 않음</small>
      </details>
      <label className={s.quickCheck}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={value.recent}
          onChange={(event) =>
            onChange({ ...value, recent: event.target.checked })
          }
        />
        최근 {recentDays}일 출제 빼기
      </label>
      <details className={s.quickDisclosure}>
        <summary>추가 선택</summary>
        <label className={s.quickCheck}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.mcFirst}
            onChange={(event) =>
              onChange({ ...value, mcFirst: event.target.checked })
            }
          />
          객관식을 앞에
        </label>
      </details>
    </div>
  );
}
