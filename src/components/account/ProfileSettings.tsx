"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import s from "./profile.module.css";

export default function ProfileSettings({
  initialName,
}: {
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    setMessage("");
    setError("");
    if (!nextName || nextName.length > 50) {
      setError("이름은 1~50자로 입력해 주세요.");
      return;
    }
    if (busy || nextName === savedName) return;
    setBusy(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result?.error?.message ?? "이름을 저장하지 못했습니다.",
        );
      setName(result.data.name);
      setSavedName(result.data.name);
      setMessage("이름을 저장했습니다.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={s.profileForm}>
      <label htmlFor="profile-name">이름</label>
      <div className={s.profileFields}>
        <input
          id="profile-name"
          name="name"
          autoComplete="name"
          required
          maxLength={50}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit" disabled={busy || name.trim() === savedName}>
          {busy ? "저장 중…" : "이름 저장"}
        </button>
      </div>
      {message && (
        <p role="status" className={s.success}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
    </form>
  );
}
