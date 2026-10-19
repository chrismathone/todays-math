"use client";

import { useEffect, useState } from "react";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import { WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { previewFetch } from "./previewData";
import type { EnglishListeningDocument } from "@/contracts/englishListening.contract";

// This development-only fixture never forwards API calls to a real account.
// Install before mounting the real workspace so its first effect is isolated too.
export default function Preview({
  listeningDocument,
}: {
  listeningDocument: EnglishListeningDocument;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const original = window.fetch;
    const isolated: typeof fetch = (input, init) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
        location.href,
      );
      return url.pathname.startsWith("/api/")
        ? previewFetch(url, init, listeningDocument)
        : original(input, init);
    };
    window.fetch = isolated;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
      if (window.fetch === isolated) window.fetch = original;
    };
  }, [listeningDocument]);
  if (!ready) return <p>화면 예시를 준비하고 있습니다.</p>;
  return (
    <UnifiedWorkspace
      initialData={{
        version: 2,
        countUnit: "question",
        queryKey: "workspace-authored-fixture",
        problems: [],
        total: 0,
        page: 1,
        pageSize: 12,
        grades: [],
        chapters: [],
      }}
      currentUser={{
        name: "미리보기 관리자",
        email: "preview@example.test",
        isAdmin: true,
        isSuperAdmin: true,
      }}
      storageScope="workspace-preview"
      allowedMenus={WORKSPACE_MENUS.map((menu) => menu.id)}
    />
  );
}
