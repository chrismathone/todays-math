import { useEffect, useId, type ReactNode } from "react";
import { FONT_PACKS } from "./fontPacks";
import { loadFontPreviews } from "./loadFonts";
import { CHOICE_LAYOUTS, COLORS, SPACING_PRESETS, TEMPLATES } from "./settings";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "./types";
import s from "../WorksheetEditor.module.css";
import {
  PRINT_META_FIELDS,
  PRINTED_META_FIELDS,
  PRINT_OMIT_REASON,
  type PrintMetaField,
} from "./templateFields";

/**
 * 고른 값이 지면에서 **무엇을 감수하는지** 한 줄로 알린다 — 값마다 다르다(D-08).
 * 「자동」·「5행」은 접힐 일이 없어 아무 말도 안 한다.
 */
const CHOICE_LAYOUT_NOTES: Partial<
  Record<PrintOptions["choiceLayout"], string>
> = {
  "2x3": "보기가 길어 3열에 안 들어가는 문항은 그 문항만 열을 줄입니다.",
  "3x2": "고른 열 수를 지킵니다. 보기가 길면 칸 안에서 두 줄이 됩니다.",
};
import panel from "./PrintOptionsPanel.module.css";

export interface PrintOptionsSlots {
  top?: ReactNode;
  metaTop?: ReactNode;
  afterTitle?: ReactNode;
}

export function PrintOptionsPanel({
  answersOnly = false,
  groupedArithmetic = false,
  title,
  setTitle,
  options,
  meta,
  onOptions,
  onMeta,
  slots,
}: {
  /**
   * 3단계 덧붙임의 꽂는 자리(2026-10-16 Hi-fi) — 설정 칸 맨 위(W6 내 양식) · 시험지 정보 맨 위(W8 태그) ·
   * 제목 칸 바로 아래(W7 추천). 없으면 지금 그대로다.
   */
  slots?: PrintOptionsSlots;
  answersOnly?: boolean;
  groupedArithmetic?: boolean;
  title: string;
  setTitle: (title: string) => void;
  options: PrintOptions;
  meta: PrintMeta;
  onOptions: (patch: Partial<PrintOptions>) => void;
  onMeta: (patch: Partial<PrintMeta>) => void;
}) {
  useEffect(loadFontPreviews, []);
  const fieldId = useId();
  const printedFields = PRINTED_META_FIELDS[options.template];
  const omittedNote = `이 양식에는 찍히지 않음 · ${PRINT_OMIT_REASON[options.template]}`;
  // Mathgen's nearest-preset selection also represents old custom spacing
  // values, while preserving the saved value until the user picks a preset.
  const spacingPreset = SPACING_PRESETS.reduce((closest, preset) =>
    Math.abs(options.spacing - preset[1]) <
    Math.abs(options.spacing - closest[1])
      ? preset
      : closest,
  );
  const field = (key: PrintMetaField, label: string, type = "text") => {
    const disabled = !printedFields.includes(key);
    const labelId = `${fieldId}-${key}-label`;
    const noteId = `${fieldId}-${key}-note`;
    const props = {
      value: meta[key] ?? "",
      disabled,
      "aria-labelledby": labelId,
      "aria-describedby": disabled ? noteId : undefined,
    };
    return (
      <label
        className={`${s.field} ${panel.metaField}`}
        key={key}
        data-omitted={disabled || undefined}
      >
        <span id={labelId}>{label}</span>
        {key === "conceptNote" ||
        key === "patternStrategy" ||
        key === "todayGoal" ? (
          <textarea
            {...props}
            rows={3}
            onChange={(e) => onMeta({ [key]: e.target.value })}
          />
        ) : (
          <input
            {...props}
            type={type}
            min={type === "number" ? 0 : undefined}
            onChange={(e) =>
              onMeta({
                [key]:
                  type === "number"
                    ? e.target.value === ""
                      ? undefined
                      : Number(e.target.value)
                    : e.target.value,
              })
            }
          />
        )}
        {disabled && <small id={noteId}>{omittedNote}</small>}
      </label>
    );
  };
  const toggle = (
    key:
      | "showDate"
      | "showChapter"
      | "showDifficulty"
      | "hideScores"
      | "columnDivider"
      | "showAnswers"
      | "quickAnswerOnly",
    label: string,
  ) => (
    <label className={s.checkField} key={key}>
      <input
        type="checkbox"
        checked={options[key]}
        disabled={key === "showDate" && !printedFields.includes("examDate")}
        aria-describedby={
          key === "showDate" && !printedFields.includes("examDate")
            ? `${fieldId}-date-note`
            : undefined
        }
        onChange={(e) => onOptions({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  return (
    <div
      className={`${s.settingsFields} ${panel.fields}`}
      onFocusCapture={(event) =>
        event.target.scrollIntoView?.({ block: "nearest", inline: "nearest" })
      }
    >
      {slots?.top}
      <p className={s.subtle}>
        설정은 미리보기와 인쇄 · PDF에 함께 적용됩니다.
      </p>
      <fieldset className={s.optionGroup}>
        <legend>템플릿</legend>
        <div className={s.templateGrid}>
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              aria-pressed={options.template === t.value}
              onClick={() => onOptions({ template: t.value })}
              title={t.hint}
            >
              <span>{t.label}</span>
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <details open className={s.metaDetails}>
        <summary>시험지 정보</summary>
        {slots?.metaTop}
        <label className={s.field}>
          제목
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              onMeta({ title: e.target.value });
            }}
            maxLength={80}
          />
        </label>
        {slots?.afterTitle}
        <div className={s.metaGrid}>
          {PRINT_META_FIELDS.slice(1).map(([key, label]) =>
            field(
              key,
              label,
              key === "examDate"
                ? "date"
                : key === "totalScore"
                  ? "number"
                  : "text",
            ),
          )}
        </div>
      </details>
      <fieldset className={s.optionGroup}>
        <legend>폰트</legend>
        <div className={`${s.choiceWrap} ${s.choiceGrid}`}>
          {FONT_PACKS.map((font) => (
            <button
              key={font.id}
              aria-pressed={options.fontPack === font.id}
              onClick={() => onOptions({ fontPack: font.id })}
              title={font.hint}
              style={{ fontFamily: font.serif }}
            >
              {font.label}
            </button>
          ))}
        </div>
        <p className={s.subtle}>본문 명조 + 헤더 고딕</p>
      </fieldset>
      <fieldset className={s.optionGroup}>
        <legend>강조 색상</legend>
        <div className={`${s.choiceWrap} ${s.colorGrid}`}>
          {[["기본 남색", DEFAULT_PRINT_OPTIONS.color], ...COLORS].map(
            ([label, color]) => (
              <button
                key={color}
                aria-label={label}
                aria-pressed={
                  options.color.toLowerCase() === color.toLowerCase()
                }
                className={s.colorChoice}
                onClick={() => onOptions({ color })}
              >
                <i style={{ background: color }} />
                {label}
              </button>
            ),
          )}
        </div>
      </fieldset>
      <fieldset className={s.optionGroup}>
        <legend>문제 배치</legend>
        <div className={`${s.choiceWrap} ${s.equalChoices}`}>
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              aria-pressed={options.columns === n}
              onClick={() => onOptions({ columns: n })}
            >
              {n}단
            </button>
          ))}
        </div>
        {options.columns === 2 ? (
          toggle("columnDivider", "단 사이 구분선")
        ) : (
          <label className={s.field}>
            오른쪽 풀이 공간
            <select
              value={options.solvingArea ?? "off"}
              onChange={(event) =>
                onOptions({
                  solvingArea: event.target
                    .value as PrintOptions["solvingArea"],
                })
              }
            >
              <option value="off">사용 안 함</option>
              <option value="blank">빈 공간</option>
              <option value="ruled">공책 줄</option>
              <option value="chalkboard">칠판</option>
            </select>
          </label>
        )}
      </fieldset>
      <label className={s.field}>
        쪽 여백
        <select
          value={options.marginPreset}
          onChange={(e) =>
            onOptions({
              marginPreset: e.target.value as PrintOptions["marginPreset"],
            })
          }
        >
          <option value="narrow">좁게 · 좌우 12mm</option>
          <option value="normal">보통 · 좌우 15mm</option>
          <option value="wide">넓게 · 좌우 22mm</option>
        </select>
      </label>
      <fieldset className={s.optionGroup}>
        <legend>세로 배치</legend>
        <div className={`${s.choiceWrap} ${s.equalChoices}`}>
          <button
            aria-pressed={options.layoutMode === "spacing"}
            onClick={() => onOptions({ layoutMode: "spacing" })}
          >
            여백 지정
          </button>
          <button
            aria-pressed={options.layoutMode === "count"}
            onClick={() => onOptions({ layoutMode: "count" })}
          >
            문항 수 지정
          </button>
        </div>
        {options.layoutMode === "spacing" ? (
          <div
            className={`${s.choiceWrap} ${s.equalChoices} ${s.spacingChoices}`}
          >
            {SPACING_PRESETS.map(([label, spacing]) => (
              <button
                key={spacing}
                aria-pressed={
                  !options.smartSpacing && spacingPreset[1] === spacing
                }
                onClick={() => onOptions({ spacing, smartSpacing: false })}
              >
                {label}
              </button>
            ))}
            <button
              aria-pressed={!!options.smartSpacing}
              onClick={() => onOptions({ smartSpacing: true, spacing: 16 })}
            >
              스마트
            </button>
          </div>
        ) : (
          <>
            <div className={`${s.choiceWrap} ${s.equalChoices}`}>
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  aria-pressed={options.problemsPerColumn === n}
                  onClick={() => onOptions({ problemsPerColumn: n })}
                >
                  1단당 {n}
                </button>
              ))}
            </div>
            <p className={s.subtle}>
              페이지당 최대 {options.problemsPerColumn * options.columns}문항 ·
              긴 문제는 다음 쪽에 배치합니다.
            </p>
          </>
        )}
      </fieldset>
      {/* 연산 연습지에는 보기(객관식)와 배점이 없다 — 그 설정은 보이지 않는다(원장님 2026-10-16). */}
      {!groupedArithmetic && (
        <fieldset className={s.optionGroup}>
          <legend>보기 번호 배치</legend>
          <div
            className={`${s.choiceWrap} ${s.equalChoices} ${s.spacingChoices}`}
          >
            {CHOICE_LAYOUTS.map(([value, label]) => (
              <button
                key={value}
                aria-pressed={options.choiceLayout === value}
                onClick={() => onOptions({ choiceLayout: value })}
              >
                {label}
              </button>
            ))}
          </div>
          {CHOICE_LAYOUT_NOTES[options.choiceLayout] && (
            <p className={s.subtle}>
              {CHOICE_LAYOUT_NOTES[options.choiceLayout]}
            </p>
          )}
        </fieldset>
      )}
      <fieldset className={s.optionGroup}>
        <legend>표시 옵션</legend>
        {toggle("showDate", "날짜 표시")}
        {!printedFields.includes("examDate") && (
          <p className={s.subtle} id={`${fieldId}-date-note`}>
            {omittedNote}
          </p>
        )}
        {!groupedArithmetic && toggle("showChapter", "문항 단원명")}
        {!groupedArithmetic && toggle("showDifficulty", "난이도 라벨")}
        {!groupedArithmetic && toggle("hideScores", "배점 숨기기")}
        {!groupedArithmetic && (
          <p className={s.subtle}>이미지에 포함된 배점은 그대로 남습니다.</p>
        )}
      </fieldset>
      <fieldset className={s.optionGroup}>
        <legend>{answersOnly ? "정답지" : "정답 · 해설"}</legend>
        {toggle(
          "showAnswers",
          answersOnly ? "정답지 포함" : "정답 · 해설지 포함",
        )}
        {options.showAnswers &&
          !answersOnly &&
          toggle("quickAnswerOnly", "빠른 정답만 (해설 생략)")}
      </fieldset>
      <button
        className={s.secondaryButton}
        onClick={() => onOptions({ ...DEFAULT_PRINT_OPTIONS })}
      >
        기본값으로 재설정
      </button>
    </div>
  );
}
