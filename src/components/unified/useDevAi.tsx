"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEV_AI_PROVIDERS,
  type DevAiAction,
  type DevAiProvider,
  type DevAiRequest,
  type DevAiResponse,
  type DevAiStatus,
} from "@/lib/dev-ai/contracts";

export interface DevAiActivity {
  id: number;
  action: DevAiAction;
  provider: DevAiProvider;
  state: "running" | "complete" | "error" | "cancelled";
  startedAt: number;
  finishedAt?: number;
  message: string;
}
interface DevAiContextValue {
  status: DevAiStatus | null;
  statusError: string;
  checking: boolean;
  provider: DevAiProvider;
  setProvider: (provider: DevAiProvider) => void;
  activity: DevAiActivity | null;
  /** Unsettled requests, including requests waiting for a server CLI slot. */
  activities: DevAiActivity[];
  activeCount: number;
  refresh: () => Promise<void>;
  run: (
    request: Omit<DevAiRequest, "provider">,
    signal?: AbortSignal,
  ) => Promise<DevAiResponse>;
  cancel: () => void;
}
const Context = createContext<DevAiContextValue>({
  status: null,
  statusError: "",
  checking: false,
  provider: "codex",
  setProvider: () => {},
  activity: null,
  activities: [],
  activeCount: 0,
  refresh: async () => {},
  run: async () => {
    throw new Error("개발용 AI 연결을 확인해 주세요.");
  },
  cancel: () => {},
});
export const useDevAi = () => useContext(Context);
const STORAGE_KEY = "today-math-dev-ai-provider";

export function DevAiProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DevAiStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [checking, setChecking] = useState(true);
  const [provider, updateProvider] = useState<DevAiProvider>("codex");
  const [{ activities, lastActivity }, setActivities] = useState<{
    activities: DevAiActivity[];
    lastActivity: DevAiActivity | null;
  }>({ activities: [], lastActivity: null });
  const activity = activities[0] ?? lastActivity;
  const activeCount = activities.length;
  const choiceMade = useRef(false);
  const statusRequest = useRef<AbortController | null>(null);
  const activeRequests = useRef(new Map<number, AbortController>());
  const nextRequestId = useRef(0);

  const setProvider = useCallback((next: DevAiProvider) => {
    if (activeRequests.current.size) return;
    choiceMade.current = true;
    updateProvider(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Browser storage is optional. */
    }
  }, []);
  const loadStatus = useCallback(async () => {
    statusRequest.current?.abort();
    const controller = new AbortController();
    statusRequest.current = controller;
    try {
      const response = await fetch("/api/dev/unified/ai", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error("개발용 AI 연결 상태를 확인하지 못했습니다.");
      const next: DevAiStatus = await response.json();
      if (controller.signal.aborted) return;
      setStatusError("");
      setStatus(next);
      if (!choiceMade.current && !activeRequests.current.size) {
        let initial = next.defaultProvider;
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (DEV_AI_PROVIDERS.includes(saved as DevAiProvider)) {
            initial = saved as DevAiProvider;
            choiceMade.current = true;
          }
        } catch {
          /* Browser storage is optional. */
        }
        updateProvider(initial);
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setStatusError(
          error instanceof Error ? error.message : "AI 연결 확인 실패",
        );
    } finally {
      if (statusRequest.current === controller) {
        statusRequest.current = null;
        setChecking(false);
      }
    }
  }, []);
  const refresh = useCallback(async () => {
    setChecking(true);
    await loadStatus();
  }, [loadStatus]);
  useEffect(() => {
    const requests = activeRequests.current;
    // Synchronize the external CLI status snapshot; normal state writes follow awaited I/O.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
    return () => {
      statusRequest.current?.abort();
      for (const controller of requests.values()) controller.abort();
    };
  }, [loadStatus]);
  const cancel = useCallback(() => {
    for (const controller of activeRequests.current.values())
      controller.abort();
  }, []);
  const run = useCallback(
    async (
      request: Omit<DevAiRequest, "provider">,
      signal?: AbortSignal,
    ): Promise<DevAiResponse> => {
      if (signal?.aborted) throw new DOMException("작업 취소", "AbortError");
      if (!status?.enabled) throw new Error("개발용 AI 연결을 확인해 주세요.");
      const selected = status.providers.find((item) => item.id === provider);
      if (!selected || !["ready", "unverified"].includes(selected.status))
        throw new Error(selected?.detail || "이 도구를 사용할 수 없습니다.");
      const controller = new AbortController();
      const id = ++nextRequestId.current;
      activeRequests.current.set(id, controller);
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      const startedAt = Date.now();
      const base = { id, action: request.action, provider, startedAt };
      const running: DevAiActivity = {
        ...base,
        state: "running",
        message:
          request.action === "solution"
            ? "해설 생성 중"
            : request.action === "figures"
              ? "도형 인식 중"
              : "문제 인식 중",
      };
      setActivities((previous) => ({
        ...previous,
        activities: [...previous.activities, running],
      }));
      const settle = (finished: DevAiActivity) => {
        setActivities((previous) => ({
          activities: previous.activities.filter((item) => item.id !== id),
          lastActivity: finished,
        }));
      };
      try {
        const response = await fetch("/api/dev/unified/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, provider }),
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "AI 처리에 실패했습니다.",
          );
        if (controller.signal.aborted)
          throw new DOMException("작업 취소", "AbortError");
        settle({
          ...base,
          state: "complete",
          finishedAt: Date.now(),
          message:
            request.action === "solution"
              ? "해설 생성 완료"
              : request.action === "figures"
                ? "도형 인식 완료"
                : "문제 인식 완료",
        });
        setStatus(
          (previous) =>
            previous && {
              ...previous,
              providers: previous.providers.map((item) =>
                item.id === provider
                  ? { ...item, status: "ready", detail: "구독 CLI 응답 확인" }
                  : item,
              ),
            },
        );
        return body as DevAiResponse;
      } catch (error) {
        const cancelled = controller.signal.aborted;
        settle({
          ...base,
          state: cancelled ? "cancelled" : "error",
          finishedAt: Date.now(),
          message: cancelled
            ? "작업 취소됨"
            : error instanceof Error
              ? error.message
              : "AI 처리 실패",
        });
        if (cancelled) throw new DOMException("작업 취소", "AbortError");
        throw error;
      } finally {
        signal?.removeEventListener("abort", abort);
        activeRequests.current.delete(id);
      }
    },
    [provider, status],
  );
  const value = useMemo(
    () => ({
      status,
      statusError,
      checking,
      provider,
      setProvider,
      activity,
      activities,
      activeCount,
      refresh,
      run,
      cancel,
    }),
    [
      status,
      statusError,
      checking,
      provider,
      setProvider,
      activity,
      activities,
      activeCount,
      refresh,
      run,
      cancel,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
