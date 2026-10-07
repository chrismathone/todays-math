"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  STUDENT_OPTIONAL_MENUS,
  studentLearningMenuLabels,
  studentLearningMenusResponseSchema,
  type StudentLearningMenusPanel,
  type StudentOptionalMenu,
} from "@/contracts/studentLearningMenus.contract";
import s from "./StudentLearningMenuPanel.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "hidden" }
  | { status: "ready"; data: StudentLearningMenusPanel };

/** A new student gets a new state owner, including pending reads and saves. */
export function StudentLearningMenuPanel({ studentId }: { studentId: string }) {
  return <LearningMenuForm key={studentId} studentId={studentId} />;
}

function LearningMenuForm({ studentId }: { studentId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [enabled, setEnabled] = useState<StudentOptionalMenu[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  const savingRef = useRef(false);
  const url = `/api/students/${studentId}/learning-menus`;

  useEffect(() => {
    active.current = true;
    let alive = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        if ([401, 403, 404].includes(response.status)) {
          if (alive) setState({ status: "hidden" });
          return;
        }
        if (!response.ok) throw new Error("load failed");
        const { data } = studentLearningMenusResponseSchema.parse(
          await response.json(),
        );
        if (!alive) return;
        if (!data.canManage) {
          setState({ status: "hidden" });
          return;
        }
        setEnabled(data.enabled);
        setState({ status: "ready", data });
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
      active.current = false;
      controller.abort();
    };
  }, [url, attempt]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "ready" || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("save failed");
      const { data } = studentLearningMenusResponseSchema.parse(
        await response.json(),
      );
      if (!active.current) return;
      if (!data.canManage) throw new Error("permission changed");
      setEnabled(data.enabled);
      setState({ status: "ready", data });
      setSaved(true);
    } catch {
      if (active.current)
        setError("학습 메뉴를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      if (active.current) setSaving(false);
    }
  }

  if (state.status === "hidden") return null;
  const headingId = `student-learning-menus-${studentId}`;
  const dirty =
    state.status === "ready" &&
    (enabled.length !== state.data.enabled.length ||
      enabled.some((menu) => !state.data.enabled.includes(menu)));
  return (
    <section className={s.panel} aria-labelledby={headingId}>
      <h4 id={headingId} className={s.title}>
        학생 학습 메뉴
      </h4>
      <p className={s.note}>
        탐험과 도감은 기본으로 사용할 수 있습니다. 추가 메뉴는 이 학생에게만
        적용됩니다.
      </p>
      {state.status === "loading" ? (
        <p role="status" className={s.note}>
          학습 메뉴를 불러오는 중…
        </p>
      ) : state.status === "error" ? (
        <>
          <p role="alert" className={s.error}>
            학습 메뉴를 불러오지 못했습니다.
          </p>
          <button
            type="button"
            className={s.button}
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
          >
            다시 불러오기
          </button>
        </>
      ) : (
        <form onSubmit={save} aria-label="학생 학습 메뉴 설정">
          <fieldset className={s.options} disabled={saving}>
            <legend className={s.legend}>추가 메뉴</legend>
            {STUDENT_OPTIONAL_MENUS.map((menu) => (
              <label key={menu} className={s.option}>
                <input
                  type="checkbox"
                  checked={enabled.includes(menu)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setEnabled((previous) =>
                      checked
                        ? [...previous, menu]
                        : previous.filter((item) => item !== menu),
                    );
                    setSaved(false);
                    setError("");
                  }}
                />
                <span>{studentLearningMenuLabels[menu]}</span>
              </label>
            ))}
          </fieldset>
          <div className={s.actions}>
            <button
              type="submit"
              className={s.button}
              disabled={saving || !dirty}
            >
              {saving ? "저장 중…" : "학습 메뉴 저장"}
            </button>
            {saving ? (
              <p role="status" className={s.note}>
                변경 사항을 저장하는 중…
              </p>
            ) : null}
            {saved ? (
              <p role="status" className={s.note}>
                저장했습니다.
              </p>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className={s.error}>
              {error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
