"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isLabPath } from "@/lib/labPath";
type EventRow = {
  id: string;
  action: "click" | "change" | "submit" | "navigate" | "print";
  label: string;
  path: string;
};

/** Records actions and field labels only. Never reads input values or form payloads. */
export default function ActivityReporter({ userId }: { userId: string }) {
  const pathname = usePathname();
  useEffect(() => {
    window.dispatchEvent(new Event("account:navigate"));
  }, [pathname]);
  useEffect(() => {
    const queue: EventRow[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sending = false;
    let stopped = false;
    const flush = async () => {
      if (sending || !queue.length || stopped) return;
      sending = true;
      const events = queue.slice(0, 50);
      try {
        const result = await fetch("/api/account/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerId: userId, events }),
          keepalive: true,
        });
        if (result.ok) queue.splice(0, events.length);
        else if (result.status === 401 || result.status === 403) {
          queue.length = 0;
          stopped = true;
        }
      } catch {
        /* Retain unsent actions for retry while this page is open. */
      } finally {
        sending = false;
        if (queue.length && !stopped)
          timer = setTimeout(() => void flush(), 2000);
      }
    };
    const add = (action: EventRow["action"], label: string) => {
      // 수학 랩실의 일은 기록하지 않는다 — 관문과 같은 판정(D-135 ⑼). 행의 path 와 같은 주소로
      // 가리므로 랩실에 들어가기 전 화면의 기록은 그대로 보낸다.
      if (isLabPath(window.location.pathname)) return;
      queue.push({
        id: crypto.randomUUID(),
        action,
        label: label.replace(/\s+/g, " ").trim().slice(0, 100),
        path: window.location.pathname + window.location.hash.slice(0, 150),
      });
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), 600);
    };
    const click = (event: MouseEvent) => {
      const element =
        event.target instanceof Element
          ? event.target.closest('button,a,[role="button"]')
          : null;
      if (element)
        add(
          "click",
          element.getAttribute("aria-label") ||
            element.getAttribute("data-audit-action") ||
            element.textContent ||
            "버튼",
        );
    };
    const change = (event: Event) => {
      const element = event.target;
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      )
        add(
          "change",
          element.getAttribute("aria-label") ||
            element.labels?.[0]?.textContent ||
            element.name ||
            "입력 항목",
        );
    };
    const submit = () => add("submit", "양식 제출");
    const navigate = () => add("navigate", "화면 이동");
    const print = () => add("print", "인쇄");
    const hide = () => {
      clearTimeout(timer);
      for (let offset = 0; offset < queue.length; offset += 50)
        navigator.sendBeacon?.(
          "/api/account/activity",
          new Blob(
            [
              JSON.stringify({
                ownerId: userId,
                events: queue.slice(offset, offset + 50),
              }),
            ],
            { type: "application/json" },
          ),
        );
    };
    add("navigate", "화면 열기");
    document.addEventListener("click", click, true);
    document.addEventListener("change", change, true);
    document.addEventListener("submit", submit, true);
    window.addEventListener("hashchange", navigate);
    window.addEventListener("popstate", navigate);
    window.addEventListener("account:navigate", navigate);
    window.addEventListener("beforeprint", print);
    window.addEventListener("pagehide", hide);
    return () => {
      hide();
      stopped = true;
      document.removeEventListener("click", click, true);
      document.removeEventListener("change", change, true);
      document.removeEventListener("submit", submit, true);
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("popstate", navigate);
      window.removeEventListener("account:navigate", navigate);
      window.removeEventListener("beforeprint", print);
      window.removeEventListener("pagehide", hide);
    };
  }, [userId]);
  return null;
}
