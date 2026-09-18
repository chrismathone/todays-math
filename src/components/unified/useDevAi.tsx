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
  type DevAiAction,
  type StudioAiProvider,
  type StudioAiMode,
  type DevAiRequest,
  type DevAiResponse,
  type DevAiStatus,
} from "@/lib/dev-ai/contracts";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";

export interface DevAiActivity {
  id: number;
  action: DevAiAction;
  provider: StudioAiProvider;
  state: "running" | "complete" | "error" | "cancelled";
  startedAt: number;
  finishedAt?: number;
  message: string;
}
interface DevAiContextValue {
  status: DevAiStatus | null;
  statusError: string;
  checking: boolean;
  provider: StudioAiProvider;
  setProvider: (provider: StudioAiProvider) => void;
  mode: StudioAiMode;
  canChooseMode: boolean;
  setMode: (mode: StudioAiMode) => void;
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
  /** Owners stop queued work synchronously before in-flight calls are aborted. */
  subscribeCancel: (listener: () => void) => () => void;
}
const Context = createContext<DevAiContextValue>({
  status: null,
  statusError: "",
  checking: false,
  provider: "codex",
  setProvider: () => {},
  mode: "subscription-cli",
  canChooseMode: false,
  setMode: () => {},
  activity: null,
  activities: [],
  activeCount: 0,
  refresh: async () => {},
  run: async () => {
    throw new Error("개발용 AI 연결을 확인해 주세요.");
  },
  cancel: () => {},
  subscribeCancel: () => () => {},
});
export const useDevAi = () => useContext(Context);
const STORAGE_KEY = "today-math-dev-ai-provider";

export function DevAiProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [status, setStatus] = useState<DevAiStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [checking, setChecking] = useState(true);
  const [provider, updateProvider] = useState<StudioAiProvider>(
    process.env.NODE_ENV === "production" ? "auto" : "codex",
  );
  const [preferredMode, updateMode] = useState<StudioAiMode>(
    process.env.NODE_ENV === "production" ? "model-api" : "subscription-cli",
  );
  const mode = status?.mode ?? preferredMode;
  const canChooseMode = !checking && !getStudioEndpoints().production;
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
  const cancelListeners = useRef(new Set<() => void>());
  const subscribeCancel = useCallback((listener: () => void) => {
    cancelListeners.current.add(listener);
    return () => {
      cancelListeners.current.delete(listener);
    };
  }, []);

  const setProvider = useCallback(
    (next: StudioAiProvider) => {
      if (activeRequests.current.size) return;
      choiceMade.current = true;
      updateProvider(next);
      try {
        localStorage.setItem(`${STORAGE_KEY}-${mode}`, next);
      } catch {
        /* Browser storage is optional. */
      }
    },
    [mode],
  );
  const setMode = useCallback((next: StudioAiMode) => {
    if (activeRequests.current.size || getStudioEndpoints().production) return;
    statusRequest.current?.abort();
    choiceMade.current = false;
    setStatus(null);
    setChecking(true);
    updateProvider(next === "model-api" ? "auto" : "codex");
    updateMode(next);
  }, []);
  const endpoint = useCallback(() => {
    const endpoints = getStudioEndpoints();
    return endpoints.production || preferredMode === "subscription-cli"
      ? endpoints.ai
      : `${endpoints.ai}?mode=model-api`;
  }, [preferredMode]);
  const loadStatus = useCallback(async () => {
    statusRequest.current?.abort();
    if (!enabled) {
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    statusRequest.current = controller;
    try {
      const response = await fetch(endpoint(), {
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
        // 운영 빌드는 모델 고르기가 없다(원장님 2026-09-18 — 자동 고정). 예전에 저장한 고르기를
        // 복원하면 바꿀 길 없이 그 모델에 묶인다 — 개발 모드(고르기가 있는 기존 칸)에서만 복원한다.
        if (!getStudioEndpoints().productionBuild)
          try {
            const saved =
              localStorage.getItem(`${STORAGE_KEY}-${next.mode}`) ??
              (next.mode === "subscription-cli"
                ? localStorage.getItem(STORAGE_KEY)
                : null);
            if (next.providers.some((item) => item.id === saved)) {
              initial = saved as StudioAiProvider;
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
  }, [endpoint, enabled]);
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
    for (const listener of cancelListeners.current) listener();
    for (const controller of activeRequests.current.values())
      controller.abort();
  }, []);
  const run = useCallback(
    async (
      request: Omit<DevAiRequest, "provider">,
      signal?: AbortSignal,
    ): Promise<DevAiResponse> => {
      if (signal?.aborted) throw new DOMException("작업 취소", "AbortError");
      if (!enabled) throw new Error("자료 제작 메뉴를 사용할 권한이 없습니다.");
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
              : request.action === "figure-redraw"
                ? "도형 다시 그리는 중"
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
        const response = await fetch(endpoint(), {
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
                : request.action === "figure-redraw"
                  ? "도형 그리기 완료"
                  : "문제 인식 완료",
        });
        setStatus(
          (previous) =>
            previous && {
              ...previous,
              providers: previous.providers.map((item) =>
                item.id === provider
                  ? {
                      ...item,
                      status: "ready",
                      detail:
                        mode === "model-api"
                          ? "모델 API 응답 확인"
                          : "구독 CLI 응답 확인",
                    }
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
    [provider, status, endpoint, mode, enabled],
  );
  const value = useMemo(
    () => ({
      status,
      statusError,
      checking,
      provider,
      setProvider,
      mode,
      canChooseMode,
      setMode,
      activity,
      activities,
      activeCount,
      refresh,
      run,
      cancel,
      subscribeCancel,
    }),
    [
      status,
      statusError,
      checking,
      provider,
      setProvider,
      mode,
      canChooseMode,
      setMode,
      activity,
      activities,
      activeCount,
      refresh,
      run,
      cancel,
      subscribeCancel,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
