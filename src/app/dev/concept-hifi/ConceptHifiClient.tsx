"use client";

/**
 * 개발용 시안 페이지의 몸 — 작업실(`UnifiedWorkspace`)을 그대로 띄우고 «오늘의 개념» 메뉴를 연다.
 * `/api/concept/**` 만 가로채 픽스처로 답한다. 쓰기는 하지 않는다(409 로 거절).
 *
 * 가로채기는 **첫 렌더 안에서** 건다 — 자식(ConceptView)의 effect 가 부모의 effect 보다 먼저
 * 돌기 때문에, effect 에서 걸면 첫 요청이 진짜 서버로 새어 나간다.
 */
import { useState } from "react";

import { ConceptVideoEmbedContext } from "@/components/unified/ConceptView";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";

import {
  hifiBoard,
  hifiUnitLectures,
  hifiUnits,
  type HifiOptions,
} from "./fixture";

const EMPTY_BANK = {
  problems: [],
  total: 0,
  page: 1,
  pageSize: 20,
  grades: [],
  chapters: [],
};

declare global {
  interface Window {
    __conceptHifiFetch?: typeof fetch;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFixtureFetch(options: HifiOptions) {
  const original = window.__conceptHifiFetch ?? window.fetch.bind(window);
  window.__conceptHifiFetch = original;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL
        ? String(input)
        : input.url,
      window.location.origin,
    );
    if (!url.pathname.startsWith("/api/concept")) return original(input, init);
    if ((init?.method ?? "GET") !== "GET")
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "시안 페이지에서는 저장하지 않습니다.",
          },
        },
        409,
      );
    if (url.pathname === "/api/concept")
      return json({ data: hifiBoard(options) });
    if (url.pathname === "/api/concept/units")
      return json({ data: hifiUnits(options.canEdit ?? true) });
    const unitId = url.searchParams.get("unitId");
    const data = unitId ? hifiUnitLectures(unitId) : null;
    return data
      ? json({ data })
      : json(
          { error: { code: "NOT_FOUND", message: "차시를 찾을 수 없습니다." } },
          404,
        );
  };
}

export function ConceptHifiClient({
  options,
  embed,
}: {
  options: HifiOptions;
  /** 가짜 영상 ID 라 기본은 끈다 — 끄면 영상 자리에 제목 판이 선다 */
  embed: boolean;
}) {
  // 메뉴는 주소의 `#concept` 이나 옆 메뉴 «오늘의 개념»으로 연다 — 렌더 중에 주소를 고치면
  // Next 라우터의 주소 동기화가 덮어써 홈으로 열린다(2026-09-15 실측).
  useState(() => {
    if (typeof window !== "undefined") installFixtureFetch(options);
    return true;
  });
  return (
    <ConceptVideoEmbedContext.Provider value={embed}>
      <UnifiedWorkspace
        initialData={EMPTY_BANK}
        allowedMenus={ALL_WORKSPACE_MENUS}
      />
    </ConceptVideoEmbedContext.Provider>
  );
}
