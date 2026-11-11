"use client";

import { useEffect, useState } from "react";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import { WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { previewFetch } from "../workspace-alignment/previewData";
import { STUDIO_DEMO_SOURCE } from "@/lib/studio-demo/source";

/**
 * 시연 계정의 서버를 흉내 낸다 — 녹화본은 이 브라우저의 localStorage 에 둔다(다른 창 · 다음 날의 재생을 흉내).
 * 작업실 AI(`/api/dev/unified/ai`)만 실제로 보내고, 나머지 API 는 화면 예시(`previewFetch`)가 답한다.
 */
const STORAGE_KEY = "studio-demo-harness-recording";
const recording: { entries: unknown[]; saves: number } = {
  entries: [],
  saves: 0,
};

export default function Harness() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      recording.entries = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]",
      ) as unknown[];
    } catch {
      recording.entries = [];
    }
    const original = window.fetch;
    const isolated: typeof fetch = async (input, init) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
        location.href,
      );
      if (url.pathname === "/api/studio/demo") {
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body)) as { entries: unknown[] };
          recording.entries = body.entries;
          recording.saves += 1;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(body.entries));
          } catch {
            /* 확인 화면 — 저장소가 없으면 이 탭에서만 재생된다. */
          }
          return Response.json({ saved: body.entries.length });
        }
        return url.searchParams.get("sha256") === STUDIO_DEMO_SOURCE.sha256
          ? Response.json({ entries: recording.entries })
          : Response.json({ error: "없음" }, { status: 404 });
      }
      if (url.pathname === "/api/dev/unified/ai") return original(input, init);
      return url.pathname.startsWith("/api/")
        ? previewFetch(url, init)
        : original(input, init);
    };
    window.fetch = isolated;
    (window as unknown as { __studioDemo: typeof recording }).__studioDemo =
      recording;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
      if (window.fetch === isolated) window.fetch = original;
    };
  }, []);
  if (!ready) return <p>화면을 준비하고 있습니다.</p>;
  return (
    <UnifiedWorkspace
      initialData={{
        version: 2,
        countUnit: "question",
        queryKey: "studio-demo-harness",
        problems: [],
        total: 0,
        page: 1,
        pageSize: 12,
        grades: [],
        chapters: [],
      }}
      currentUser={{
        name: "시연 확인",
        email: "demo-harness@example.test",
        isAdmin: true,
        isSuperAdmin: true,
      }}
      storageScope="workspace-preview"
      allowedMenus={WORKSPACE_MENUS.map((menu) => menu.id)}
    />
  );
}
