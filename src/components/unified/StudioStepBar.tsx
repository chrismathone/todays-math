"use client";

import type { ReactNode, Ref } from "react";
/*
 * 띠의 생김새는 StudioView.module.css 한 자리에서만 정한다 — 작업실과 시험지 화면이 같은 띠를
 * 쓰는데 규칙이 두 벌이면 한쪽만 고쳐져 갈린다(2026-09-21 `6ae7af45` 가 그 일을 한 번 겪었다).
 * 그래서 이 컴포넌트는 새 모듈을 만들지 않고 작업실 것을 그대로 가져다 쓴다.
 */
import styles from "./StudioView.module.css";

export type StudioStep = "upload" | "crop" | "review" | "export";

/** Optional navigation for callers that share output but own another workflow. */
export interface StudioStepNavigation {
  label: string;
  items: readonly {
    id: string;
    label: string;
    current: boolean;
    disabled?: boolean;
    onSelect: () => void;
  }[];
}

/**
 * 자료 제작 네 단계의 제목 줄 — 원장님 2026-09-21 «4단계 헤더 구성 일치화 시킬것.
 * 단계마다 헤더 구조가 바뀌는 치명적인 ux 고칠것» → 안 A 확정.
 *
 * 네 단계가 **똑같은 줄**을 쓴다: 「자료 제작」 + 단계 탭 넷 + 그 단계의 큰 단추(`children`).
 * 단계별 도구(파일·학년·쪽·문제·전체 작업·진행)는 이 줄이 아니라 **둘째 줄**에 선다.
 * 큰 제목·설명 줄·원형 체크 막대는 없앴다 — 탭 넷이 그 일을 한다.
 *
 * 탭이 눌리는 조건은 **«갈 수 있는가»** 하나다. 작업실(`StudioView`)은 제 상태를 아니까
 * 원본·자른 수로 막고, 시험지 화면(`WorksheetEditor`)은 작업실이 안 떠 있을 수 있어
 * 아는 만큼만 막는다(자른 수를 0 으로 받으면 그 탭은 흐리다 — 「원본 가져오기」로 들어가면
 * 작업실이 되살아나 다시 열린다).
 */
export default function StudioStepBar({
  step,
  cropCount,
  pickedCount,
  canCrop,
  canReview,
  canExport = true,
  canCompose,
  canStudio = true,
  onStep,
  barRef,
  children,
  headerTitle,
  stepNavigation,
}: {
  step: StudioStep;
  /**
   * 자른 문제 수 — 「OCR · 디지털화」 탭의 배지. **모르면 넘기지 않는다**(`undefined`):
   * 시험지 화면은 작업실이 안 떠 있으면 셈을 모르는데, 그때 0 을 적으면 «없다»는 거짓말이 된다.
   * 모르는 동안은 배지 없이 이름만 선다.
   */
  cropCount?: number;
  /** Actual worksheet count. It also gates composition unless canCompose supplies a pending-crop handoff. */
  pickedCount: number;
  /**
   * 갈 수 있나 — **배지가 아니라 이 값이 탭을 막는다.** 작업실은 제 상태를 아니까 원본·자른 수로
   * 정하고, 시험지 화면은 «자료 제작을 쓸 수 있는 계정인가»로 정한다(작업실이 제 상태를 되살린다).
   * 셈으로 막으면 시험지 화면에서 검수로 돌아가는 길이 «셈을 모른다»는 이유로 막힌다.
   */
  canCrop: boolean;
  canReview: boolean;
  canExport?: boolean;
  /** Extraction may add pending crops on entry while the badge keeps the current picked count. */
  canCompose?: boolean;
  /**
   * 이 계정이 자료 제작을 쓸 수 있나. 못 쓰면 앞 세 탭을 **아예 세우지 않는다** —
   * 갈 수 없는 자리를 흐리게 세우면 «여기까지 하면 열린다»는 거짓말이 된다.
   * 왼쪽 메뉴가 못 쓰는 메뉴를 감추는 것과 같은 규칙이다(`WORKSPACE_MENUS`).
   */
  canStudio?: boolean;
  onStep: (next: StudioStep) => void;
  barRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
  headerTitle?: string;
  stepNavigation?: StudioStepNavigation;
}) {
  return (
    <div
      ref={barRef}
      className={`${styles.editorBar}${stepNavigation ? ` ${styles.customSteps}` : ""}`}
      data-studio-band
    >
      <div className={styles.editorTabs}>
        <h1>
          {headerTitle ?? (step === "export" ? "시험지 만들기" : "문제 추출")}
        </h1>
        {stepNavigation ? (
          <nav className={styles.stepTabs} aria-label={stepNavigation.label}>
            {stepNavigation.items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={item.current ? "step" : undefined}
                aria-pressed={item.current}
                disabled={item.disabled}
                onClick={item.onSelect}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : (
          <nav className={styles.stepTabs} aria-label="제작 단계 이동">
            {canStudio && (
              <>
                <button
                  type="button"
                  aria-pressed={step === "upload" || step === "crop"}
                  onClick={() => onStep("upload")}
                >
                  1 범위 설정
                </button>
                <button
                  type="button"
                  aria-pressed={step === "review"}
                  disabled={!canReview}
                  onClick={() => onStep("review")}
                >
                  2 문항 검토{" "}
                  {typeof cropCount === "number" && <b>{cropCount}</b>}
                </button>
              </>
            )}
            <button
              type="button"
              aria-pressed={step === "export"}
              disabled={!canExport || !(canCompose ?? pickedCount > 0)}
              onClick={() => onStep("export")}
            >
              3 양식 구성·출력 <b>{pickedCount}</b>
            </button>
          </nav>
        )}
      </div>
      {!stepNavigation &&
        canStudio &&
        (step === "upload" || step === "crop") && (
          <nav className={styles.stepTabs} aria-label="원본 범위 작업">
            <button
              type="button"
              aria-pressed={step === "upload"}
              onClick={() => onStep("upload")}
            >
              원본 가져오기
            </button>
            <button
              type="button"
              aria-pressed={step === "crop"}
              disabled={!canCrop}
              onClick={() => onStep("crop")}
            >
              문제&amp;도형 잘라내기
            </button>
          </nav>
        )}
      {children && <div className={styles.editorTools}>{children}</div>}
    </div>
  );
}
