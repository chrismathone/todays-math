"use client";

import { useEffect, useState } from "react";
import type { StudioAiProvider, StudioAiMode } from "@/lib/dev-ai/contracts";
import { useDevAi } from "./useDevAi";
import Icon from "./WorkspaceIcon";
import s from "./DevAiStatusPanel.module.css";

const STATUS_LABELS = {
  ready: "연결 확인",
  unverified: "실행 확인 전",
  "login-required": "로그인 필요",
  "not-installed": "설치 필요",
  unsupported: "연결 미지원",
  error: "연결 오류",
};
export default function DevAiStatusPanel({
  collapsed,
  onExpand,
}: {
  collapsed: boolean;
  onExpand: () => void;
}) {
  if (process.env.NODE_ENV === "production") return null;
  return <DevAiStatusPanelContent collapsed={collapsed} onExpand={onExpand} />;
}

function DevAiStatusPanelContent({
  collapsed,
  onExpand,
}: {
  collapsed: boolean;
  onExpand: () => void;
}) {
  const ai = useDevAi();
  const [now, setNow] = useState(0);
  const running = ai.activeCount > 0;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const selected = ai.status?.providers.find((item) => item.id === ai.provider);
  const elapsed = ai.activity
    ? Math.max(
        0,
        Math.floor(
          ((ai.activity.finishedAt ?? now) - ai.activity.startedAt) / 1000,
        ),
      )
    : 0;
  if (collapsed)
    return (
      <button
        className={s.collapsed}
        onClick={onExpand}
        title={`AI · ${selected?.label ?? "연결 확인 중"}${running ? ` · ${ai.activeCount}개 진행 중` : ""}`}
        aria-label="AI 상태판 펼치기"
        data-running={running}
      >
        AI
      </button>
    );
  return (
    <section className={s.panel} aria-label="AI 상태판" data-dev-ai-panel>
      <div className={s.heading}>
        <strong>AI 작업 연결</strong>
        <span>{ai.mode === "model-api" ? "API" : "CLI"}</span>
      </div>
      {ai.canChooseMode ? (
        <label className={s.provider}>
          <select
            aria-label="AI 연결 방식"
            value={ai.mode}
            disabled={running}
            onChange={(event) => ai.setMode(event.target.value as StudioAiMode)}
          >
            <option value="subscription-cli">구독 CLI</option>
            <option value="model-api">서버 모델 API</option>
          </select>
        </label>
      ) : (
        <p className={s.mode}>
          {ai.mode === "model-api"
            ? "서버 모델 API"
            : "구독 CLI · API 키 미사용"}
        </p>
      )}
      <div className={s.controls}>
        <label className={s.provider}>
          <select
            aria-label={
              ai.mode === "subscription-cli" ? "개발용 AI 도구" : "AI 도구"
            }
            value={ai.provider}
            disabled={!ai.status || running}
            onChange={(event) =>
              ai.setProvider(event.target.value as StudioAiProvider)
            }
          >
            {ai.status?.providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
            {!ai.status && <option value="codex">연결 확인 중…</option>}
          </select>
        </label>
        <button
          className={s.refresh}
          disabled={ai.checking && !running}
          onClick={() => (running ? ai.cancel() : void ai.refresh())}
          aria-label={running ? "AI 작업 취소" : "연결 다시 확인"}
          title={running ? "AI 작업 취소" : "연결 다시 확인"}
        >
          <Icon name={running ? "close" : "undo"} size={17} />
        </button>
      </div>
      {/* 원장님 2026-09-18 — 구독 CLI 모델. «CLI 설정»은 원장님 CLI 설정의 모델(서버가 넘긴다). */}
      {ai.mode === "subscription-cli" && selected?.models?.length ? (
        <label className={s.provider}>
          <select
            aria-label="AI 모델"
            title={ai.model || `CLI 설정 (${selected.defaultModel ?? "기본"})`}
            value={ai.model}
            disabled={running}
            onChange={(event) => ai.setModel(event.target.value)}
          >
            <option value="">
              {`CLI 설정 (${selected.defaultModel ?? "기본"})`}
            </option>
            {selected.models.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div
        className={s.connection}
        data-ready={selected?.status === "ready"}
        title={ai.statusError || selected?.detail}
      >
        <span aria-hidden="true" />
        {ai.checking
          ? "로그인 상태 확인 중"
          : selected
            ? STATUS_LABELS[selected.status]
            : "연결 확인 필요"}
      </div>
      {ai.mode === "model-api" && selected?.detail && (
        <p className={s.mode}>{selected.detail}</p>
      )}
      {ai.activity && (
        <div
          className={s.activity}
          role="status"
          data-state={ai.activity.state}
        >
          <strong title={ai.activity.message}>
            {ai.activeCount > 1
              ? `AI 작업 ${ai.activeCount}개 진행 중`
              : ai.activity.message}
          </strong>
          <span>{elapsed}초</span>
        </div>
      )}
    </section>
  );
}
