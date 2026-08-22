"use client";

import { useState } from "react";

/**
 * 문항별 메모 — 기존 검수 API(`POST /api/problems/{id}/review`)를 그대로 쓴다.
 * verdict 는 `unsure`(판단 보류) 고정 — 이 목록은 이미 출제 제외 상태라
 * `pass`/`defect` 의 부수효과(reviewStatus 승격·신고 생성)가 필요 없다.
 * 로그인 세션 쿠키가 그대로 실려 가므로 원장님이 앱에 로그인돼 있으면 된다.
 */
export function NoteForm({ problemId }: { problemId: string }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function submit() {
    if (!note.trim()) return;
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/problems/${problemId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict: "unsure", note: note.trim() }),
      });
      if (res.status === 401) {
        setStatus("error");
        setErrorMsg("로그인이 필요합니다 — 앱에 로그인한 뒤 다시 시도하세요.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setStatus("error");
        setErrorMsg(body?.error?.message ?? `저장 실패 (${res.status})`);
        return;
      }
      setStatus("saved");
      setNote("");
    } catch {
      setStatus("error");
      setErrorMsg("네트워크 오류로 저장하지 못했습니다.");
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        placeholder="메모 입력 (예: HWP 원본 확인함 — 복구 가능 / 그대로 폐기)"
        rows={2}
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontSize: 13,
          padding: "6px 8px",
          border: "1px solid #ccc",
          borderRadius: 6,
          fontFamily: "inherit",
          resize: "vertical",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 6,
        }}
      >
        <button
          onClick={submit}
          disabled={status === "saving" || !note.trim()}
          style={{
            fontSize: 13,
            padding: "4px 12px",
            borderRadius: 6,
            border: "1px solid #1a56db",
            background: status === "saving" ? "#eee" : "#1a56db",
            color: status === "saving" ? "#999" : "#fff",
            cursor: status === "saving" || !note.trim() ? "default" : "pointer",
          }}
          type="button"
        >
          {status === "saving" ? "저장 중…" : "메모 저장"}
        </button>
        {status === "saved" ? (
          <span style={{ fontSize: 12, color: "#1a7f37" }}>저장됨</span>
        ) : null}
        {status === "error" ? (
          <span style={{ fontSize: 12, color: "#b3261e" }}>{errorMsg}</span>
        ) : null}
      </div>
    </div>
  );
}
