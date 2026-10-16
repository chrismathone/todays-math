"use client";

import { useState, type ReactNode } from "react";

import StudioStepBar from "@/components/unified/StudioStepBar";
import wr from "@/components/unified/Workroom.module.css";
import Icon from "@/components/unified/WorkspaceIcon";
import we from "@/components/unified/WorksheetEditor.module.css";
import { FONT_PACKS } from "@/components/unified/print/fontPacks";
import panel from "@/components/unified/print/PrintOptionsPanel.module.css";
import {
  CHOICE_LAYOUTS,
  COLORS,
  SPACING_PRESETS,
  TEMPLATES,
} from "@/components/unified/print/settings";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";

import { DEFAULT_DRAFT_TITLE, PROBLEMS, SHEET_META } from "./fixtures";
import h from "./hifi.module.css";

/* ───────────── 안 하나의 머리 — 이 안의 생각 / 대가 ───────────── */

export function Option({
  id,
  title,
  idea,
  cost,
  tools,
  children,
}: {
  id: string;
  title: string;
  idea: string;
  cost: string;
  /** 틀 밖 — 시안을 처음 상태로 돌리는 단추 따위 */
  tools?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={h.option} id={id} data-hifi-option={id}>
      <div className={h.optionText}>
        <h3 className={h.h3}>{title}</h3>
        <dl className={h.caption}>
          <dt>이 안의 생각</dt>
          <dd>{idea}</dd>
          <dt>대가</dt>
          <dd>{cost}</dd>
        </dl>
        {tools && <div className={h.tools}>{tools}</div>}
      </div>
      {children}
    </section>
  );
}

/* ───────────── 틀 — 1280(사이드바 240) · 390 ───────────── */

const MENU = [
  "오늘의 작업",
  "시험지 만들기",
  "연산대장",
  "문제 추출",
  "시험지 · 내보내기",
  "내 시험지",
  "교재 제작",
  "수업 · 학생 관리",
];

export function DesktopFrame({
  label,
  height = 900,
  active = "시험지 만들기",
  overlay,
  children,
}: {
  label: string;
  height?: number;
  active?: string;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={h.frameBlock}>
      <p className={h.frameLabel}>{label}</p>
      <div className={h.scrollX}>
        <div className={h.desktop} style={{ height }} data-hifi-frame="desktop">
          <nav className={h.side} aria-label="작업실 메뉴(그림)">
            <b className={h.brand}>오늘의 수학</b>
            <ul>
              {MENU.map((item) => (
                <li
                  key={item}
                  className={item === active ? h.sideOn : undefined}
                >
                  {item}
                </li>
              ))}
            </ul>
          </nav>
          <div
            className={`${wr.workspace} ${h.main}`}
            style={{ minHeight: 0 }}
            inert={overlay ? true : undefined}
          >
            <div className={h.topbar}>
              <span className={h.grow} />
              <span className={h.account}>원장 · 본점</span>
            </div>
            <div className={h.page}>{children}</div>
          </div>
          {overlay && <div className={h.scrim}>{overlay}</div>}
        </div>
      </div>
    </div>
  );
}

export function PhoneFrame({
  label,
  active = "시험지",
  overlay,
  children,
}: {
  label: string;
  active?: string;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={h.frameBlock}>
      <p className={h.frameLabel}>{label}</p>
      <div className={h.phone} data-hifi-frame="phone">
        <div
          className={`${wr.workspace} ${h.phoneMain}`}
          style={{ minHeight: 0 }}
          inert={overlay ? true : undefined}
        >
          <div className={h.phoneTop}>
            <b>오늘의 수학</b>
            <span className={h.grow} />
            <span className={h.account}>원장</span>
          </div>
          <div className={h.phonePage}>{children}</div>
          <div className={h.phoneNav}>
            {["오늘", "시험지", "내 시험지", "더 보기"].map((item) => (
              <span
                key={item}
                className={item === active ? h.sideOn : undefined}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        {overlay && <div className={h.phoneScrim}>{overlay}</div>}
      </div>
    </div>
  );
}

/* ───────────── 창의 그림 — 공용 고르기 창(PickerDialog)과 같은 머리 · 모서리 ───────────── */

/**
 * 시안 안에서 진짜 `<dialog>` 를 띄우면 화면 전체를 막아 버리므로 틀 안에 그렸다.
 * 머리 · 몸통 · 바닥 줄의 치수와 색은 `picker-dialog.module.css` 와 같다.
 */
export function MockDialog({
  title,
  width = 880,
  head,
  foot,
  children,
  phone,
}: {
  title: string;
  width?: number;
  head: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
  phone?: boolean;
}) {
  return (
    <div
      className={phone ? h.dlgPhone : h.dlg}
      style={phone ? undefined : { width }}
      role="dialog"
      aria-label={title}
    >
      <header className={h.dlgHead}>
        <h2>{title}</h2>
        <div className={h.dlgHeadActions}>{head}</div>
      </header>
      <div className={h.dlgBody}>{children}</div>
      {foot && <footer className={h.dlgFoot}>{foot}</footer>}
    </div>
  );
}

/* ───────────── 시험지 한 장의 상태 ───────────── */

export function useSheet(
  init: { options?: PrintOptions; meta?: PrintMeta; title?: string } = {},
) {
  const first = {
    options: init.options ?? { ...DEFAULT_PRINT_OPTIONS },
    meta: init.meta ?? { ...SHEET_META },
    title: init.title ?? DEFAULT_DRAFT_TITLE,
  };
  const [options, setOptions] = useState<PrintOptions>(first.options);
  const [meta, setMeta] = useState<PrintMeta>(first.meta);
  const [title, setTitle] = useState(first.title);
  return {
    options,
    meta,
    title,
    setOptions,
    setMeta,
    setTitle,
    patchOptions: (patch: Partial<PrintOptions>) =>
      setOptions((o) => ({ ...o, ...patch })),
    patchMeta: (patch: Partial<PrintMeta>) =>
      setMeta((m) => ({ ...m, ...patch })),
    reset() {
      setOptions(first.options);
      setMeta(first.meta);
      setTitle(first.title);
    },
  };
}
export type Sheet = ReturnType<typeof useSheet>;

/* ───────────── 3단계 — 실제 WorksheetEditor 의 CSS · 단계 띠 · 지면 렌더러 ───────────── */

const noop = () => {};

/** 미리보기 — 실제 `WorksheetPrint`(여섯 템플릿 · 측정 · 지면 띠)에 지어낸 다섯 문항. */
export function Preview({ sheet }: { sheet: Sheet }) {
  return (
    <WorksheetPrint
      selected={PROBLEMS}
      title={sheet.title}
      options={sheet.options}
      printMeta={sheet.meta}
      onReady={noop}
    />
  );
}

export function Step3({
  sheet,
  settings,
  notice,
  savedLabel = "내 시험지에 저장",
}: {
  sheet: Sheet;
  /** 서식 설정 탭의 내용 — 보통 `<SettingsPanel>` */
  settings: ReactNode;
  notice?: ReactNode;
  savedLabel?: string;
}) {
  const [tab, setTab] = useState<"settings" | "order">("settings");
  return (
    <main className={we.exportContent} style={{ padding: 0 }}>
      <StudioStepBar
        headerTitle="시험지 만들기"
        step="export"
        pickedCount={PROBLEMS.length}
        canCrop={false}
        canReview={false}
        canStudio={false}
        canExport
        onStep={noop}
        stepNavigation={{
          label: "시험지 만들기 단계 이동(그림)",
          items: [
            {
              id: "scope",
              label: "1 범위 설정",
              current: false,
              onSelect: noop,
            },
            {
              id: "review",
              label: "2 문항 검토",
              current: false,
              onSelect: noop,
            },
            {
              id: "output",
              label: "3 양식 구성·출력",
              current: true,
              onSelect: noop,
            },
          ],
        }}
      >
        <button type="button" className={we.secondaryButton}>
          <Icon name="save" size={18} /> {savedLabel}
        </button>
        <button type="button" className={we.primaryButton}>
          <Icon name="print" size={18} />
          인쇄 / PDF 저장
        </button>
        <button type="button" className={we.secondaryButton}>
          HWPX 내보내기
        </button>
        <button type="button" className={we.secondaryButton}>
          PDF 내려받기
        </button>
      </StudioStepBar>
      {notice}
      <div className={we.exportGrid}>
        <aside className={we.exportInspector} aria-label="시험지 설정(그림)">
          <div
            className={we.inspectorTabs}
            role="tablist"
            aria-label="시험지 편집 도구"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "settings"}
              onClick={() => setTab("settings")}
            >
              서식 설정
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "order"}
              onClick={() => setTab("order")}
            >
              문제 순서 · {PROBLEMS.length}
            </button>
          </div>
          {tab === "settings" ? (
            <div className={we.settingsPanel}>{settings}</div>
          ) : (
            <div className={we.orderPanel}>
              <div className={we.orderHeading}>
                <h3>문제 순서</h3>
                <span>{PROBLEMS.length}문항</span>
              </div>
              <ol className={we.orderList}>
                {PROBLEMS.map((p, i) => (
                  <li key={p.id}>
                    <span className={we.orderNumber}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{p.section}</strong>
                      <small>
                        {p.grade} · {p.difficulty}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className={we.bottomActions}>
            <button type="button" className={we.addMore}>
              <Icon name="plus" size={16} /> 문제 더 담기
            </button>
            <button type="button" className={we.secondaryButton}>
              <Icon name="save" size={18} /> 작업 파일 내보내기
            </button>
          </div>
        </aside>
        <Preview sheet={sheet} />
      </div>
    </main>
  );
}

/**
 * 서식 설정 탭 — `PrintOptionsPanel` 과 **같은 마크업 · 같은 CSS**(WorksheetEditor.module.css)를 다시 적었다.
 * 제품 코드를 고치지 않고 덧붙임을 꽂으려고, 꽂는 자리(top · templateHead · metaTop · titleField · afterTitle)만 열었다.
 * 모든 칸이 움직인다 — W6 에서 칸 하나를 바꾸면 «적용함»이 «직접 정함»으로 바뀐다.
 */
export function SettingsPanel({
  sheet,
  top,
  templateHead,
  metaTop,
  titleField,
  afterTitle,
  bottom,
}: {
  sheet: Sheet;
  top?: ReactNode;
  templateHead?: ReactNode;
  metaTop?: ReactNode;
  /** 제목 칸을 통째로 바꾼다(W7 4안 — 확인이 제목 칸에 붙는다). */
  titleField?: ReactNode;
  afterTitle?: ReactNode;
  bottom?: ReactNode;
}) {
  const { options, meta } = sheet;
  const onOptions = sheet.patchOptions;
  const onMeta = sheet.patchMeta;
  const spacingPreset = SPACING_PRESETS.reduce((closest, preset) =>
    Math.abs(options.spacing - preset[1]) <
    Math.abs(options.spacing - closest[1])
      ? preset
      : closest,
  );
  const field = (key: keyof PrintMeta, label: string, type = "text") => (
    <label className={we.field} key={key}>
      {label}
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        value={meta[key] ?? ""}
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
    </label>
  );
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
    <label className={we.checkField} key={key}>
      <input
        type="checkbox"
        checked={options[key]}
        onChange={(e) => onOptions({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  return (
    <div className={`${we.settingsFields} ${panel.fields}`}>
      {top}
      <p className={we.subtle}>
        설정은 미리보기와 인쇄 · PDF에 함께 적용됩니다.
      </p>
      <fieldset className={we.optionGroup}>
        <legend>템플릿</legend>
        {templateHead}
        <div className={we.templateGrid}>
          {TEMPLATES.map((t) => (
            <button
              type="button"
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
      <details open className={we.metaDetails}>
        <summary>시험지 정보</summary>
        {metaTop}
        {titleField ?? (
          <label className={we.field}>
            제목
            <input
              value={sheet.title}
              maxLength={80}
              onChange={(e) => {
                sheet.setTitle(e.target.value);
                onMeta({ title: e.target.value });
              }}
            />
          </label>
        )}
        {afterTitle}
        <div className={we.metaGrid}>
          {field("schoolName", "학교/기관명")}
          {field("grade", "학년")}
          {field("subject", "과목")}
          {field("semester", "학기")}
          {field("examDate", "시험일", "date")}
          {field("examDuration", "시험 시간")}
          {field("examiner", "출제자")}
          {field("totalScore", "총점", "number")}
          {options.template === "workbook" && (
            <>
              {field("academyName", "학원명")}
              {field("instructorName", "강사명")}
            </>
          )}
        </div>
        {options.template === "yuhyung" && (
          <>
            {field("patternName", "유형명")}
            {field("patternStrategy", "핵심 전략")}
          </>
        )}
        {options.template === "jaseup" && field("todayGoal", "오늘의 목표")}
      </details>
      <fieldset className={we.optionGroup}>
        <legend>폰트</legend>
        <div className={we.choiceWrap}>
          {FONT_PACKS.map((font) => (
            <button
              type="button"
              key={font.id}
              aria-pressed={options.fontPack === font.id}
              onClick={() => onOptions({ fontPack: font.id })}
              title={font.hint}
            >
              {font.label}
            </button>
          ))}
        </div>
        <p className={we.subtle}>본문 명조 + 헤더 고딕</p>
      </fieldset>
      <fieldset className={we.optionGroup}>
        <legend>강조 색상</legend>
        <div className={`${we.choiceWrap} ${we.colorGrid}`}>
          {[["기본 남색", DEFAULT_PRINT_OPTIONS.color], ...COLORS].map(
            ([label, color]) => (
              <button
                type="button"
                key={color}
                aria-label={label}
                aria-pressed={
                  options.color.toLowerCase() === color.toLowerCase()
                }
                className={we.colorChoice}
                onClick={() => onOptions({ color })}
              >
                <i style={{ background: color }} />
                {label}
              </button>
            ),
          )}
        </div>
      </fieldset>
      <fieldset className={we.optionGroup}>
        <legend>문제 배치</legend>
        <div className={`${we.choiceWrap} ${we.equalChoices}`}>
          {([1, 2] as const).map((n) => (
            <button
              type="button"
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
          <label className={we.field}>
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
      <label className={we.field}>
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
      <fieldset className={we.optionGroup}>
        <legend>세로 배치</legend>
        <div className={`${we.choiceWrap} ${we.equalChoices}`}>
          <button
            type="button"
            aria-pressed={options.layoutMode === "spacing"}
            onClick={() => onOptions({ layoutMode: "spacing" })}
          >
            여백 지정
          </button>
          <button
            type="button"
            aria-pressed={options.layoutMode === "count"}
            onClick={() => onOptions({ layoutMode: "count" })}
          >
            문항 수 지정
          </button>
        </div>
        {options.layoutMode === "spacing" ? (
          <div
            className={`${we.choiceWrap} ${we.equalChoices} ${we.spacingChoices}`}
          >
            {SPACING_PRESETS.map(([label, spacing]) => (
              <button
                type="button"
                key={spacing}
                aria-pressed={spacingPreset[1] === spacing}
                onClick={() => onOptions({ spacing })}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className={`${we.choiceWrap} ${we.equalChoices}`}>
            {[2, 3, 4].map((n) => (
              <button
                type="button"
                key={n}
                aria-pressed={options.problemsPerColumn === n}
                onClick={() => onOptions({ problemsPerColumn: n })}
              >
                1단당 {n}
              </button>
            ))}
          </div>
        )}
      </fieldset>
      <fieldset className={we.optionGroup}>
        <legend>보기 번호 배치</legend>
        <div
          className={`${we.choiceWrap} ${we.equalChoices} ${we.spacingChoices}`}
        >
          {CHOICE_LAYOUTS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={options.choiceLayout === value}
              onClick={() => onOptions({ choiceLayout: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={we.optionGroup}>
        <legend>표시 옵션</legend>
        {toggle("showDate", "날짜 표시")}
        {toggle("showChapter", "문항 단원명")}
        {toggle("showDifficulty", "난이도 라벨")}
        {toggle("hideScores", "배점 숨기기")}
      </fieldset>
      <fieldset className={we.optionGroup}>
        <legend>정답 · 해설</legend>
        {toggle("showAnswers", "정답 · 해설지 포함")}
        {options.showAnswers &&
          toggle("quickAnswerOnly", "빠른 정답만 (해설 생략)")}
      </fieldset>
      {bottom ?? (
        <button
          type="button"
          className={we.secondaryButton}
          onClick={() => onOptions({ ...DEFAULT_PRINT_OPTIONS })}
        >
          기본값으로 재설정
        </button>
      )}
    </div>
  );
}
