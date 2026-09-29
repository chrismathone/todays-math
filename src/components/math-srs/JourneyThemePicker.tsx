"use client";

import { useEffect, useState } from "react";
import {
  JOURNEY_THEME_IDS,
  JOURNEY_THEMES,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";
import s from "./journey-theme-picker.module.css";

const THEME_URL = "/api/admin/journey-theme";

async function call(
  init?: RequestInit,
): Promise<{ ok: true; theme: JourneyThemeId } | { ok: false; message: string }> {
  try {
    const response = await fetch(THEME_URL, { cache: "no-store", ...init });
    const json = await response.json().catch(() => null);
    const { journeyThemeResponseSchema } = await import(
      "@/contracts/journeyTheme.contract"
    );
    if (!response.ok)
      return {
        ok: false,
        message: json?.error?.message ?? "진도판 테마를 저장하지 못했습니다.",
      };
    return { ok: true, theme: journeyThemeResponseSchema.parse(json).data.theme };
  } catch {
    return { ok: false, message: "연결을 확인한 뒤 다시 시도해 주세요." };
  }
}

/** 관리자 «학습 관리» — 진도판 테마(학원 전체 한 벌, 원장님 2026-09-30). 누르면 바로 저장한다. */
export default function JourneyThemePicker() {
  const [saved, setSaved] = useState<JourneyThemeId | null>(null);
  const [chosen, setChosen] = useState<JourneyThemeId | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    let live = true;
    void call().then((result) => {
      if (!live) return;
      if (result.ok) {
        setSaved(result.theme);
        setChosen(result.theme);
      } else setNote({ error: true, text: result.message });
    });
    return () => {
      live = false;
    };
  }, []);

  async function choose(theme: JourneyThemeId) {
    if (busy || theme === chosen) return;
    setChosen(theme);
    setBusy(true);
    setNote(null);
    const result = await call({
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme }),
    });
    setBusy(false);
    if (result.ok) {
      setSaved(result.theme);
      setChosen(result.theme);
      setNote({
        error: false,
        text: "저장했습니다. 학생 화면은 새로 열 때 바뀝니다.",
      });
    } else {
      setChosen(saved);
      setNote({ error: true, text: result.message });
    }
  }

  return (
    <section className={s.root} aria-labelledby="journey-theme-heading">
      <h2 id="journey-theme-heading" className={s.heading}>
        진도판 테마
      </h2>
      <p className={s.lead}>학원의 모든 학생 진도판에 같이 적용됩니다.</p>
      <div className={s.options} role="radiogroup" aria-label="진도판 테마">
        {JOURNEY_THEME_IDS.map((id) => {
          const theme = JOURNEY_THEMES[id];
          const checked = chosen === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={checked}
              className={s.option}
              data-checked={checked || undefined}
              disabled={busy || chosen === null}
              onClick={() => void choose(id)}
            >
              <span className={s.thumb} data-theme={id} aria-hidden="true">
                {theme.boardImage ? (
                  <img src={theme.boardImage} alt="" loading="lazy" />
                ) : (
                  <span className={s.classic}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <span key={i} />
                    ))}
                  </span>
                )}
              </span>
              <span className={s.name}>
                {theme.name}
                <small>{theme.boardImage ? theme.rider : "지금 판"}</small>
              </span>
            </button>
          );
        })}
      </div>
      {note ? (
        <p
          className={note.error ? s.error : s.saved}
          role={note.error ? "alert" : "status"}
        >
          {note.text}
        </p>
      ) : null}
    </section>
  );
}
