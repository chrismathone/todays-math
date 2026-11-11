"use client";

import { useEffect } from "react";
import { useDevAi } from "./useDevAi";
import {
  createStudioDemoSession,
  sha256OfFile,
  studioDemoKeys,
} from "./studioDemo";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import {
  STUDIO_DEMO_SOURCE,
  STUDIO_DEMO_SPEED,
} from "@/lib/studio-demo/source";
import {
  StudioDemoRecordingSchema,
  type StudioDemoEntry,
} from "@/contracts/studioDemo.contract";

/**
 * 문제 추출 시연을 켜고 끈다(원장님 2026-11-11 «로그인해서 문제 추출 탭 들어가면 자동으로 이어지게» ·
 * «시연 PDF 일 때만»). 원본 목록에 시연 PDF(크기 → 지문)가 있으면 서버에 녹화본을 묻는다 — 시연 계정이 아니면
 * 서버가 404 라 아무 일도 없다. 녹화본을 받으면 AI 요청을 녹화본으로 답하고, 없는 요청은 실제로 보내 덧붙여
 * 저장한다. 시연 PDF 가 빠지면 가로채기를 걷는다. 화면에는 아무것도 더하지 않는다 — 진짜와 같아야 한다.
 */
export function useStudioDemo(
  sources: readonly { kind: string; original?: File }[],
  {
    source = STUDIO_DEMO_SOURCE,
    saveDelay = 1500,
  }: { source?: { bytes: number; sha256: string }; saveDelay?: number } = {},
) {
  const { setInterceptor } = useDevAi();
  const file = sources.find(
    (item) => item.kind === "pdf" && item.original?.size === source.bytes,
  )?.original;
  useEffect(() => {
    if (!file) return;
    let closed = false;
    let pending: StudioDemoEntry[] | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const endpoint = getStudioEndpoints().demo;
    const save = () => {
      timer = undefined;
      if (!pending) return;
      const entries = pending;
      pending = null;
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha256: source.sha256, entries }),
      }).catch(() => {});
    };
    void (async () => {
      const sha256 = await sha256OfFile(file).catch(() => "");
      if (closed || sha256 !== source.sha256) return;
      const response = await fetch(`${endpoint}?sha256=${sha256}`, {
        cache: "no-store",
      }).catch(() => null);
      if (closed || !response?.ok) return;
      const recording = StudioDemoRecordingSchema.safeParse(
        await response.json().catch(() => null),
      );
      if (closed || !recording.success) return;
      const session = createStudioDemoSession({
        entries: recording.data.entries,
        speed: STUDIO_DEMO_SPEED,
        keysOf: studioDemoKeys,
        onRecord: (entries) => {
          pending = entries;
          clearTimeout(timer);
          timer = setTimeout(save, saveDelay);
        },
      });
      setInterceptor(session.intercept);
    })();
    return () => {
      closed = true;
      setInterceptor(null);
      if (timer) {
        clearTimeout(timer);
        save();
      }
    };
  }, [file, source.sha256, saveDelay, setInterceptor]);
}
