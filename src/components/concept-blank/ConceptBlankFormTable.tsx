import { useId } from "react";
import {
  CONCEPT_BLANK_LEVELS,
  type ConceptBlankForm,
  type ConceptBlankLevel,
  type LevelCounts,
} from "@/contracts/conceptBlank.contract";
import s from "./concept-blank.module.css";

export type FormColumn = {
  form: ConceptBlankForm;
  letter: string;
  label: string;
  help: string;
  on: boolean;
  mode?: "auto" | "pick";
  available: boolean;
  reason: string | null;
  fields: {
    row: "main" | "extra";
    label: string;
    max: LevelCounts;
    value: LevelCounts;
  }[];
};

export default function ConceptBlankFormTable({
  columns,
  onToggle,
  onCount,
  onMode,
  onPick,
  pickStatus = "ready",
  onRetry,
}: {
  columns: FormColumn[];
  onToggle: (form: ConceptBlankForm) => void;
  onMode?: (
    form: ConceptBlankForm,
    mode: "auto" | "pick",
    opener: HTMLButtonElement,
  ) => void;
  onPick?: (form: ConceptBlankForm, opener: HTMLButtonElement) => void;
  pickStatus?:
    "ready" | "loading" | "error" | "document-loading" | "document-error";
  onRetry?: () => void;
  onCount: (
    form: ConceptBlankForm,
    row: "main" | "extra",
    level: ConceptBlankLevel,
    value: string,
  ) => void;
}) {
  const uid = useId();

  return (
    <section className={s.card} aria-label="형식과 난이도별 문항 수">
      <div className={s.cardHead}>
        <h2 className={s.cardTitle}>형식 · 문항 수</h2>
        <span className={s.tableHint}>입력 수 / 선택 가능한 수</span>
      </div>
      <div
        className={s.formTableScroll}
        tabIndex={0}
        role="region"
        aria-label="형식별 문항 수 표"
      >
        <table className={s.formTable}>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                난이도
              </th>
              {columns.map((column) => (
                <th
                  key={column.form}
                  scope={column.fields.length > 1 ? "colgroup" : "col"}
                  colSpan={column.fields.length}
                  data-on={column.on}
                >
                  <div className={s.tableColumnTitle}>
                    <span className={s.letter}>{column.letter}</span>
                    <h3>{column.label}</h3>
                    <button
                      type="button"
                      role="switch"
                      className={s.switch}
                      aria-label={`${column.label} 켜기`}
                      aria-checked={column.on}
                      aria-describedby={
                        column.reason
                          ? `${uid}-${column.form}-reason`
                          : undefined
                      }
                      disabled={!column.available}
                      onClick={() => onToggle(column.form)}
                    >
                      <span className={s.track} aria-hidden="true" />
                    </button>
                  </div>
                  {column.on && onMode && (
                    <div className={s.modeRow}>
                      <div
                        className={s.modeSegment}
                        role="group"
                        aria-label={`${column.label} 싣는 방법`}
                      >
                        {(["auto", "pick"] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={(column.mode ?? "auto") === mode}
                            onClick={(event) =>
                              onMode(column.form, mode, event.currentTarget)
                            }
                          >
                            {mode === "auto" ? "자동" : "직접"}
                          </button>
                        ))}
                      </div>
                      {column.mode === "pick" && (
                        <>
                          <button
                            type="button"
                            className={s.pickOpen}
                            aria-label={`${column.label} 문항 고르기`}
                            disabled={pickStatus !== "ready"}
                            aria-describedby={
                              pickStatus !== "ready"
                                ? `${uid}-${column.form}-bank`
                                : undefined
                            }
                            onClick={(event) =>
                              onPick?.(column.form, event.currentTarget)
                            }
                          >
                            문항 고르기
                          </button>
                          {pickStatus !== "ready" && (
                            <span
                              id={`${uid}-${column.form}-bank`}
                              className={s.pickStatus}
                              role="status"
                            >
                              {pickStatus === "error" ? (
                                <>
                                  은행을 불러오지 못했습니다 ·{" "}
                                  <button
                                    type="button"
                                    className={s.pickOpen}
                                    onClick={onRetry}
                                  >
                                    다시 시도
                                  </button>
                                </>
                              ) : pickStatus === "document-loading" ? (
                                "문서를 불러오는 중"
                              ) : pickStatus === "document-error" ? (
                                "문서를 불러오지 못했습니다"
                              ) : (
                                "은행을 불러오는 중"
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
            <tr className={s.tableSubheads}>
              {columns.flatMap((column) =>
                column.fields.map((field) => (
                  <th scope="col" key={`${column.form}-${field.row}`}>
                    {field.label}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {CONCEPT_BLANK_LEVELS.map((level) => (
              <tr key={level}>
                <th scope="row">{level}</th>
                {columns.flatMap((column) =>
                  column.fields.map((field) => (
                    <td
                      key={`${column.form}-${field.row}`}
                      data-on={column.on}
                      className={s.tableField}
                    >
                      <span className={s.levelField}>
                        {column.on && column.mode === "pick" ? (
                          <span
                            className={s.pickedCount}
                            aria-label={`${column.label} ${field.label} ${level} 고른 수`}
                          >
                            {field.value[level]}
                          </span>
                        ) : (
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={field.max[level]}
                            step={1}
                            value={field.value[level]}
                            disabled={!column.on || field.max[level] === 0}
                            aria-label={`${column.label} ${field.label} ${level}`}
                            onChange={(event) =>
                              onCount(
                                column.form,
                                field.row,
                                level,
                                event.target.value,
                              )
                            }
                          />
                        )}
                        <span className={s.levelMax}>/ {field.max[level]}</span>
                      </span>
                    </td>
                  )),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {columns.some((column) => column.reason) && (
        <div className={s.tableReasons}>
          {columns.map((column) =>
            column.reason ? (
              <p
                key={column.form}
                id={`${uid}-${column.form}-reason`}
                className={s.tableReason}
              >
                <strong>{column.letter}</strong>
                <span>{column.reason}</span>
              </p>
            ) : null,
          )}
        </div>
      )}
      <details className={s.formGuide}>
        <summary>형식별 안내</summary>
        <dl>
          {columns.map((column) => (
            <div key={column.form}>
              <dt>
                {column.letter} · {column.label}
              </dt>
              <dd>{column.help}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
