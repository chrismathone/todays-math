"use client";

import { useEffect, useState } from "react";
import type { DevAiProvider } from "@/lib/dev-ai/contracts";
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
  const ai = useDevAi();
  const [now, setNow] = useState(0);
  const running = ai.activity?.state === "running";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  if (ai.status && !ai.status.enabled) return null;
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
        title={`개발용 AI · ${selected?.label ?? "연결 확인 중"}`}
        aria-label="개발용 AI 상태판 펼치기"
        data-running={running}
      >
        AI
      </button>
    );
  return (
    <section
      className={s.panel}
      aria-label="개발용 AI 상태판"
      data-dev-ai-panel
    >
      <div className={s.heading}>
        <strong>AI 작업 연결</strong>
        <span>DEV</span>
      </div>
      <p className={s.mode}>구독 CLI · API 키 미사용</p>
      <div className={s.controls}>
        <label className={s.provider}>
          <select
            aria-label="개발용 AI 도구"
            value={ai.provider}
            disabled={!ai.status || running}
            onChange={(event) =>
              ai.setProvider(event.target.value as DevAiProvider)
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
      {ai.activity && (
        <div
          className={s.activity}
          role="status"
          data-state={ai.activity.state}
        >
          <strong title={ai.activity.message}>{ai.activity.message}</strong>
          <span>{elapsed}초</span>
        </div>
      )}
    </section>
  );
}
