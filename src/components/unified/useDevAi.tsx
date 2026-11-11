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
import { aiImageDataUrl } from "./aiImageDataUrl";
import {
  AI_IMAGE_BUDGET,
  aiImageReducedWarning,
  fitAiImageDataUrl,
  type AiImageFit,
} from "./aiImageBudget";
import { readAiJson } from "./aiResponse";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";

/**
 * AI 요청이 나가는 한 자리를 가로챈다 — 문제 추출 시연(원장님 2026-11-11)이 녹화본으로 답할 때 쓴다.
 * `payload` 는 서버로 갈 본문 그대로, `forward` 는 그 본문을 실제로 보낸다.
 */
export type StudioAiInterceptor = (
  payload: Omit<DevAiRequest, "provider"> & { provider: StudioAiProvider },
  forward: () => Promise<Response>,
  signal: AbortSignal,
) => Promise<Response>;

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
  /** 구독 CLI 모델 — "" 는 «CLI 설정»(서버가 원장님 CLI 설정의 모델을 넘긴다). */
  model: string;
  setModel: (model: string) => void;
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
  /** 비우면(null) 전과 같이 바로 보낸다. */
  setInterceptor: (interceptor: StudioAiInterceptor | null) => void;
}
const Context = createContext<DevAiContextValue>({
  status: null,
  statusError: "",
  checking: false,
  provider: "codex",
  setProvider: () => {},
  model: "",
  setModel: () => {},
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
  setInterceptor: () => {},
});
export const useDevAi = () => useContext(Context);
const STORAGE_KEY = "today-math-dev-ai-provider";
const MODEL_STORAGE_KEY = "today-math-dev-ai-model";

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
  // 도구마다 고른 모델(원장님 2026-09-18). 목록에 없는 값은 «CLI 설정»으로 읽는다.
  const [modelChoices, setModelChoices] = useState<Record<string, string>>({});
  const models =
    mode === "subscription-cli"
      ? status?.providers.find((item) => item.id === provider)?.models
      : undefined;
  const model = models?.includes(modelChoices[provider] ?? "")
    ? modelChoices[provider]
    : "";
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
  const interceptor = useRef<StudioAiInterceptor | null>(null);
  const setInterceptor = useCallback((next: StudioAiInterceptor | null) => {
    interceptor.current = next;
  }, []);
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
  const setModel = useCallback(
    (next: string) => {
      if (activeRequests.current.size) return;
      setModelChoices((current) => ({ ...current, [provider]: next }));
      try {
        const key = `${MODEL_STORAGE_KEY}-${provider}`;
        if (next) localStorage.setItem(key, next);
        else localStorage.removeItem(key);
      } catch {
        /* Browser storage is optional. */
      }
    },
    [provider],
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
      // 로그인 화면·게이트웨이 오류는 JSON 이 아니다 — 파서 오류 대신 이 문장을 보인다(트랙 39)
      const next = (await readAiJson(response).catch(() => {
        throw new Error("개발용 AI 연결 상태를 확인하지 못했습니다.");
      })) as unknown as DevAiStatus;
      if (controller.signal.aborted) return;
      setStatusError("");
      setStatus(next);
      if (!getStudioEndpoints().productionBuild)
        try {
          const saved: Record<string, string> = {};
          for (const item of next.providers) {
            const value = localStorage.getItem(
              `${MODEL_STORAGE_KEY}-${item.id}`,
            );
            if (value && item.models?.includes(value)) saved[item.id] = value;
          }
          setModelChoices(saved);
        } catch {
          /* Browser storage is optional. */
        }
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
      if (!enabled) throw new Error("문제 추출 메뉴를 사용할 권한이 없습니다.");
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
                : request.action === "figure-edit"
                  ? "도형 고치는 중"
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
        // 되살린 작업의 그림은 blob: 이다 — 서버는 data: 만 받는다(aiImageDataUrl.ts). blob: 일 때만 기다린다 —
        // 늘 await 하면 모든 요청이 한 박자 늦게 나가 «요청이 곧바로 나간다»는 대기열 시험 8건이 깨졌다.
        const original = request.imageDataUrl?.startsWith("blob:")
          ? await aiImageDataUrl(request.imageDataUrl, controller.signal)
          : request.imageDataUrl;
        // 운영은 본문 4.5MB 를 넘으면 플랫폼이 413 을 낸다 — 예산을 넘는 그림만 다시 인코딩한다(aiImageBudget.ts).
        // 예산 안이면 기다리지 않는다 — 위 blob: 과 같은 까닭(요청이 곧바로 나가야 한다).
        let image: AiImageFit | undefined =
          original === undefined
            ? undefined
            : original.length <= AI_IMAGE_BUDGET
              ? { dataUrl: original }
              : await fitAiImageDataUrl(original, undefined, controller.signal);
        const send = () => {
          // 모델은 구독 CLI 에서 고른 때만 — 비우면 서버가 원장님 CLI 설정을 쓴다
          const payload = {
            ...request,
            imageDataUrl: image?.dataUrl,
            provider,
            ...(model ? { model } : {}),
          };
          const forward = () =>
            fetch(endpoint(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
          const hook = interceptor.current;
          return hook ? hook(payload, forward, controller.signal) : forward();
        };
        let response = await send();
        if (response.status === 413 && original !== undefined && image) {
          // 예산 안인데도 잘렸다 — 실제 천장이 더 낮다. 절반 예산으로 한 번만 더 보낸다.
          setActivities((previous) => ({
            ...previous,
            activities: previous.activities.map((item) =>
              item.id === id
                ? { ...item, message: "그림을 줄여 다시 보내는 중" }
                : item,
            ),
          }));
          image = await fitAiImageDataUrl(
            original,
            Math.floor(image.dataUrl.length / 2),
            controller.signal,
          );
          response = await send();
        }
        const body = (await readAiJson(response)) as unknown as DevAiResponse;
        if (controller.signal.aborted)
          throw new DOMException("작업 취소", "AbortError");
        if (image?.reducedTo && Array.isArray(body.result?.warnings))
          body.result.warnings = [
            ...body.result.warnings,
            aiImageReducedWarning(image.reducedTo),
          ];
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
                  : request.action === "figure-edit"
                    ? "도형 고치기 완료"
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
        return body;
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
    [provider, model, status, endpoint, mode, enabled],
  );
  const value = useMemo(
    () => ({
      status,
      statusError,
      checking,
      provider,
      setProvider,
      model,
      setModel,
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
      setInterceptor,
    }),
    [
      status,
      statusError,
      checking,
      provider,
      setProvider,
      model,
      setModel,
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
      setInterceptor,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
