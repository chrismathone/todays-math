"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import { scanIssueResponseSchema } from "@/contracts/conceptBlankScanIssued.contract";
import PrintNow from "./paper/PrintNow";
import s from "./issuePrint.module.css";

/** Issue with POST, then replace the print URL with the immutable ID. A failed issue keeps the old paper. */
export default function IssuePrint({
  selection,
  view,
  autoPrint,
  children,
}: {
  selection: ConceptBlankSelection;
  view: "student" | "key" | "both";
  autoPrint: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pending = useRef<Promise<string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!pending.current)
      pending.current = (async () => {
        // Keep request retry identity; the server also reuses the same content/font edition across tabs.
        const current = new URL(window.location.href);
        let requestId = current.searchParams.get("issueRequest");
        if (
          !requestId ||
          !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
            requestId,
          )
        ) {
          requestId = crypto.randomUUID();
          current.searchParams.set("issueRequest", requestId);
          window.history.replaceState(window.history.state, "", current);
        }
        const response = await fetch("/api/concept-blank/scan/issued", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, selection }),
        }).catch(() => {
          throw new Error(
            "발행 서버에 연결하지 못했습니다. 연결 상태를 확인해 주세요.",
          );
        });
        const body: unknown = await response.json().catch(() => {
          throw new Error(
            `발행 서버의 응답을 읽지 못했습니다(${response.status}). 잠시 뒤 다시 발행해 주세요.`,
          );
        });
        if (!response.ok) {
          const message = (body as { error?: { message?: unknown } })?.error
            ?.message;
          throw new Error(
            typeof message === "string"
              ? message
              : "발행 정보를 저장하지 못했습니다.",
          );
        }
        const parsed = scanIssueResponseSchema.safeParse(body);
        if (!parsed.success)
          throw new Error(
            "발행 정보의 형식을 확인하지 못했습니다. 다시 발행해 주세요.",
          );
        return parsed.data.data.id;
      })();
    void pending.current
      .then((id) => {
        if (alive)
          router.replace(
            `/concept-blank/print?p=${id}&view=${view}${autoPrint ? "&print=1" : ""}`,
          );
      })
      .catch((cause: unknown) => {
        if (alive)
          setError(
            `QR 없이 인쇄됨 · ${cause instanceof Error ? cause.message : "발행 정보를 준비하지 못했습니다."}`,
          );
      });
    // Do not abort an accepted issue when the tab leaves; its request ID can recover the saved artifact.
    return () => {
      alive = false;
    };
  }, [selection, view, autoPrint, router]);
  return (
    <>
      <p className={s.notice} role={error ? "alert" : "status"}>
        {error ?? "사진 채점용 QR을 준비하고 있습니다."}
      </p>
      {children}
      {error && autoPrint ? <PrintNow /> : null}
    </>
  );
}
