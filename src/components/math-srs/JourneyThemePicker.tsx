"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import {
  JOURNEY_THEME_IDS,
  JOURNEY_THEMES,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";
import s from "./journey-theme-picker.module.css";
import { Button } from "@/components/ui/Button";

const THEME_URL = "/api/admin/journey-theme";

type Reply =
  { ok: true; theme: JourneyThemeId } | { ok: false; message: string };

/** @param fallback 서버가 사유 없이 실패했을 때의 문구 — 읽기와 저장이 다르다. */
async function call(fallback: string, init?: RequestInit): Promise<Reply> {
  try {
    const response = await fetch(THEME_URL, { cache: "no-store", ...init });
    const json = await response.json().catch(() => null);
    const { journeyThemeResponseSchema } =
      await import("@/contracts/journeyTheme.contract");
    if (!response.ok)
      return { ok: false, message: json?.error?.message ?? fallback };
    return {
      ok: true,
      theme: journeyThemeResponseSchema.parse(json).data.theme,
    };
  } catch {
    return {
      ok: false,
      message:
        init?.method === "PUT"
          ? "적용 결과를 확인하지 못했습니다. 현재 설정을 다시 조회해 주세요."
          : "연결을 확인한 뒤 다시 시도해 주세요.",
    };
  }
}

/** 화살표·Home·End — 초점을 옮길 자리. 그 밖의 키는 null. */
function nextIndex(key: string, index: number): number | null {
  const last = JOURNEY_THEME_IDS.length - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return index === last ? 0 : index + 1;
    case "ArrowLeft":
    case "ArrowUp":
      return index === 0 ? last : index - 1;
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

/**
 * 관리자 «학습 관리» — 서비스 전체 진도판 테마를 미리 고른 뒤 명시적으로 적용한다.
 *
 * 키보드: radiogroup 은 탭 정지 하나(초점 있는 판, 없으면 고른 판). 화살표·Home·End 는 **초점만** 옮긴다 —
 * Space·Enter 는 미리 볼 테마를 고르며, 적용 버튼만 설정을 저장한다.
 * 저장 중에는 단추를 `disabled` 로 만들지 않는다 — 초점 있는 단추가 disabled 가 되면 초점이 body 로 떨어진다.
 * 대신 `aria-busy` 를 켜고 두 번째 누름은 손잡이에서 막는다.
 */
export default function JourneyThemePicker() {
  /** 서버에 있는 값. 아직 안 읽었거나 못 읽었으면 null. */
  const [saved, setSaved] = useState<JourneyThemeId | null>(null);
  /** 미리 보는 판 — 적용 실패와 조회 재시도에도 선택을 유지한다. */
  const [chosen, setChosen] = useState<JourneyThemeId | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const [readAttempt, setReadAttempt] = useState(0);
  /** 묶음 안에서 초점이 있는 자리 — 밖으로 나가면 null(탭 정지는 고른 판으로). */
  const [focused, setFocused] = useState<number | null>(null);
  const [note, setNote] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const options = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let live = true;
    void call("진도판 테마를 불러오지 못했습니다.").then((result) => {
      if (!live) return;
      if (result.ok) {
        setSaved(result.theme);
        setChosen((previous) => previous ?? result.theme);
        setNote(null);
      } else setNote({ error: true, text: result.message });
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [readAttempt]);

  function choose(theme: JourneyThemeId) {
    if (loading || writing.current || theme === chosen) return;
    setChosen(theme);
    setNote((previous) => (saved === null ? previous : null));
  }

  async function apply() {
    if (
      loading ||
      writing.current ||
      !chosen ||
      saved === null ||
      chosen === saved
    )
      return;
    writing.current = true;
    setBusy(true);
    setNote(null);
    const result = await call("진도판 테마를 저장하지 못했습니다.", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: chosen }),
    });
    setBusy(false);
    writing.current = false;
    if (result.ok) {
      setSaved(result.theme);
      setChosen(result.theme);
      setNote({
        error: false,
        text: "저장했습니다. 학생 화면은 새로 열 때 바뀝니다.",
      });
    } else {
      setNote({ error: true, text: result.message });
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextIndex(event.key, index);
    if (next === null) return;
    event.preventDefault();
    setFocused(next);
    options.current[next]?.focus();
  }

  function onGroupBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null))
      setFocused(null);
  }

  const tabStop =
    focused ??
    Math.max(0, JOURNEY_THEME_IDS.indexOf(chosen ?? JOURNEY_THEME_IDS[0]));

  return (
    <section className={s.root} aria-labelledby="journey-theme-heading">
      <h2 id="journey-theme-heading" className={s.heading}>
        진도판 테마
      </h2>
      <p className={s.lead}>
        서비스의 모든 학생 진도판에 같이 적용됩니다. 테마를 고른 뒤 적용 버튼을
        눌러 저장해 주세요.
      </p>
      <div
        className={s.options}
        role="radiogroup"
        aria-label="진도판 테마"
        aria-busy={loading || busy || undefined}
        onBlur={onGroupBlur}
      >
        {JOURNEY_THEME_IDS.map((id, index) => {
          const theme = JOURNEY_THEMES[id];
          const checked = chosen === id;
          return (
            <button
              key={id}
              ref={(el) => {
                options.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={index === tabStop ? 0 : -1}
              className={s.option}
              data-checked={checked || undefined}
              disabled={loading}
              onClick={() => void choose(id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              onFocus={() => setFocused(index)}
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
                {theme.name}{" "}
                <small>{theme.boardImage ? theme.rider : "지금 판"}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-text-2">
          {chosen
            ? `미리보기: ${JOURNEY_THEMES[chosen].name}`
            : loading
              ? "테마를 불러오는 중…"
              : "미리 볼 테마를 선택해 주세요."}
          {saved ? ` · 현재 적용: ${JOURNEY_THEMES[saved].name}` : ""}
        </p>
        <Button
          onClick={() => {
            void apply();
          }}
          disabled={loading || !chosen || saved === null}
          aria-disabled={busy || chosen === saved || undefined}
        >
          {busy ? "적용 중…" : "전체 학생에게 적용"}
        </Button>
        {note?.error ? (
          <Button
            variant="secondary"
            disabled={busy || loading}
            onClick={() => {
              setLoading(true);
              setReadAttempt((value) => value + 1);
            }}
          >
            현재 설정 다시 조회
          </Button>
        ) : null}
      </div>
      {/* 살아 있는 영역은 늘 지면에 둔다 — 글과 함께 끼워 넣으면 화면 읽기기가 놓친다. */}
      <p className={s.saved} role="status">
        {note && !note.error ? note.text : null}
      </p>
      <p className={s.error} role="alert">
        {note?.error ? note.text : null}
      </p>
    </section>
  );
}
