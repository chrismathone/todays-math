"use client";

import { useState, type FormEvent } from "react";
import s from "./profile.module.css";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (nextPassword !== confirmPassword) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, nextPassword }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result?.error?.message ?? "비밀번호를 변경하지 못했습니다.",
        );
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div role="status" className={s.passwordSuccess}>
        비밀번호를 변경했습니다. 다른 기기의 로그인도 종료됐습니다.{" "}
        <a href="/login">새 비밀번호로 다시 로그인</a>
      </div>
    );
  return (
    <form onSubmit={submit} className={s.passwordForm}>
      <label>
        현재 비밀번호
        <input
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </label>
      <label>
        새 비밀번호
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={nextPassword}
          onChange={(e) => setNextPassword(e.target.value)}
        />
      </label>
      <label>
        새 비밀번호 확인
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={s.passwordSubmit}>
        {busy ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}
