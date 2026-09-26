"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";

import {
  EYWA_LINK_API_PATH,
  EYWA_LINK_BUTTONS,
  EYWA_LINK_TITLE,
  type EywaLinkRequest,
} from "@/contracts/eywaLink.contract";
import styles from "./auth.module.css";

/** AuthForm 의 연결 실패 문구와 같다 */
const NETWORK_ERROR = "연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.";
const ACTIONS = ["link", "dismiss"] as const;

/**
 * eywa 연결 확인 (D-139 ⑹) — 로그인 화면과 같은 틀·글꼴·버튼(`auth.module.css`)만 쓴다. 새 스타일 없음.
 * 문구(제목·본문·버튼)는 원장님 확정 — `src/contracts/eywaLink.contract.ts`.
 * 누르면 `POST /api/account/eywa-link` 하나 · 끝나면 첫 화면으로. 거절되면 서버 문구를 경고 줄에 보이고 머문다.
 */
export function EywaLinkConfirm({ body }: { body: string }) {
  const router = useRouter();
  const [sending, setSending] = useState<EywaLinkRequest["action"] | null>(
    null,
  );
  const [alert, setAlert] = useState("");
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);
  // 하이드레이션 전에는 누를 수 없다 — AuthForm 과 같다
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  async function send(action: EywaLinkRequest["action"]) {
    if (!hydrated || busy.current) return;
    busy.current = true;
    setSending(action);
    setAlert("");
    let succeeded = false;
    try {
      const res = await fetch(EYWA_LINK_API_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action } satisfies EywaLinkRequest),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: { message?: unknown };
        } | null;
        const message = payload?.error?.message;
        setAlert(typeof message === "string" ? message : NETWORK_ERROR);
        return;
      }
      router.push("/");
      router.refresh();
      succeeded = true;
      setLeaving(true);
    } catch {
      setAlert(NETWORK_ERROR);
    } finally {
      if (!succeeded) {
        busy.current = false;
        setSending(null);
      }
    }
  }

  return (
    <div className={styles.form} aria-busy={sending !== null}>
      <div className={styles.formIntro}>
        <h1>{EYWA_LINK_TITLE}</h1>
        <p>{body}</p>
      </div>
      {alert ? (
        <p role="alert" className={styles.alert}>
          {alert}
        </p>
      ) : null}
      {ACTIONS.map((action) => (
        <button
          key={action}
          type="button"
          className={styles.submit}
          disabled={!hydrated || sending !== null || leaving}
          onClick={() => void send(action)}
        >
          <span>{EYWA_LINK_BUTTONS[action]}</span>
          <span aria-hidden="true">{sending === action ? "···" : "↗"}</span>
        </button>
      ))}
    </div>
  );
}

function subscribeNever() {
  return () => {};
}
