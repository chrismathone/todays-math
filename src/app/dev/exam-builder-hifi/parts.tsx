"use client";

import type { CSSProperties, ReactNode } from "react";

import eb from "@/components/exam-builder/ExamBuilder.module.css";
import { MathText } from "@/components/math/MathText";
import StudioStepBar from "@/components/unified/StudioStepBar";

import { SHEET, type Problem } from "./fixtures";
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
  overlay,
  children,
}: {
  label: string;
  height?: number;
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
                  className={item === "시험지 만들기" ? h.sideOn : undefined}
                >
                  {item}
                </li>
              ))}
            </ul>
          </nav>
          <div className={h.main} inert={overlay ? true : undefined}>
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
  overlay,
  children,
}: {
  label: string;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={h.frameBlock}>
      <p className={h.frameLabel}>{label}</p>
      <div className={h.phone} data-hifi-frame="phone">
        <div className={h.phoneMain} inert={overlay ? true : undefined}>
          <div className={h.phoneTop}>
            <b>오늘의 수학</b>
            <span className={h.grow} />
            <span className={h.account}>원장</span>
          </div>
          <div className={h.phonePage}>{children}</div>
          <div className={h.phoneNav}>
            <span>오늘</span>
            <span className={h.sideOn}>시험지</span>
            <span>내 시험지</span>
            <span>더 보기</span>
          </div>
        </div>
        {overlay && <div className={h.phoneScrim}>{overlay}</div>}
      </div>
    </div>
  );
}

/* ───────────── 제작기 — 실제 ExamBuilder CSS 그대로 ───────────── */

export function Builder({
  step,
  children,
}: {
  step: "scope" | "review";
  children: ReactNode;
}) {
  return (
    <section className={eb.root} aria-label="시험지 만들기(그림)">
      <StudioStepBar
        headerTitle="시험지 만들기"
        step="review"
        pickedCount={18}
        canCrop={false}
        canReview
        onStep={() => {}}
        stepNavigation={{
          label: "시험지 만들기 단계(그림)",
          items: [
            {
              id: "scope",
              label: "1 범위 설정",
              current: step === "scope",
              onSelect: () => {},
            },
            {
              id: "review",
              label: "2 문항 검토",
              current: step === "review",
              disabled: step === "scope",
              onSelect: () => {},
            },
            {
              id: "output",
              label: "3 양식 구성·출력",
              current: false,
              disabled: step === "scope",
              onSelect: () => {},
            },
          ],
        }}
      >
        {step === "review" && (
          <button type="button" className={eb.primary}>
            <span className={eb.longLabel}>다음: 양식 구성·출력 →</span>
            <span className={eb.shortLabel}>다음 단계 →</span>
          </button>
        )}
      </StudioStepBar>
      <div className={eb.layout}>{children}</div>
    </section>
  );
}

export function TitleBar({
  title = "중2 일차부등식 확인",
}: {
  title?: string;
}) {
  return (
    <div className={eb.toolbar}>
      <label>제목</label>
      <input value={title} readOnly aria-label="제목" />
    </div>
  );
}

/** 검토 칸 — 구성한 문항(배경). `swapped` 를 주면 07번 자리에 그 문항이 들어간다. */
export function ReviewColumn({
  swapped,
  onUndo,
}: {
  swapped?: Problem | null;
  onUndo?: () => void;
}) {
  return (
    <section className={eb.review} aria-label="문항 검토(그림)">
      <div className={eb.toolbar}>
        <div className={eb.reviewHeading}>
          <h2>
            구성한 문항 <span className={eb.badge}>18</span>
          </h2>
          <small>기본 6 · 응용 8 · 심화하 4 · 범위 3</small>
        </div>
        <div className={eb.actions}>
          <button type="button" className={eb.textButton} onClick={onUndo}>
            ↶ 되돌리기
          </button>
          <button type="button">+ 문항 추가</button>
        </div>
      </div>
      {swapped && (
        <p className={eb.notice} role="status">
          07번을 바꿨습니다 — 자리와 순서는 그대로입니다.
        </p>
      )}
      <section className={eb.panel}>
        <header className={eb.panelHeader}>
          <span className={eb.groupNumber}>3</span>
          <h3>일차부등식의 활용</h3>
          <small>3문항</small>
        </header>
        <div className={eb.questions}>
          {SHEET.map((q) => {
            const shown = q.no === "07" && swapped ? swapped : q;
            return (
              <article
                key={q.no}
                className={`${eb.question} ${q.no === "07" && swapped ? h.justSwapped : ""}`}
              >
                <div className={eb.questionTop}>
                  <strong className={eb.number}>{q.no}</strong>
                  <div className={eb.questionMain}>
                    <small>
                      {shown.scope} · {shown.tier} · {shown.format}
                    </small>
                    <div className={eb.questionBody}>
                      <ProblemBody q={shown} />
                    </div>
                  </div>
                </div>
                <div className={eb.actions}>
                  <button type="button">교체</button>
                  <button type="button" className={eb.danger}>
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

/* ───────────── 문항 그리기 — MathText(KaTeX) ───────────── */

export function ProblemBody({
  q,
  clamp,
  paper,
}: {
  q: Problem;
  /** 줄 수로 자른다(후보 줄) — 자른 줄은 [대조]로 다 본다 */
  clamp?: number;
  /** 시험지 지면 모양(명조) */
  paper?: boolean;
}) {
  return (
    <div
      className={`${h.problem} ${paper ? h.paper : ""}`}
      data-clamp={clamp}
      style={clamp ? ({ "--clamp": clamp } as CSSProperties) : undefined}
    >
      <MathText as="div" text={q.body} />
      {!clamp && q.choices && (
        <ol className={h.choices}>
          {q.choices.map((c, i) => (
            <li key={c}>
              <span className={h.choiceNo}>{"①②③④⑤"[i]}</span>
              <MathText text={c} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function Meta({ q, family }: { q: Problem; family?: boolean }) {
  return (
    <small className={h.meta}>
      {family && q.family ? `같은 문항류 ${q.family} · ` : ""}
      {q.tier} · {q.format} · {q.origin}
    </small>
  );
}

/* ───────────── 고르기 창(PickerDialog)의 그림 ───────────── */

/**
 * 공용 고르기 창(`src/components/picker-dialog/`)과 같은 머리 · 모서리 · 그림자다.
 * 시안 안에서 진짜 `<dialog>` 를 띄우면 화면 전체를 막아 버리므로 틀 안에 그렸다.
 * 머리에 단추가 둘(취소 · 적용)인 꼴은 그 창을 **넓혀야** 한다 — 지금은 단추 하나다.
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
