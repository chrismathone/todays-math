import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import {
  STUDIO_DEMO_FINGERPRINT_SIDE,
  type StudioDemoEntry,
} from "@/contracts/studioDemo.contract";

/**
 * 문제 추출 시연 — AI 응답 녹화본의 재생기(원장님 2026-11-11 «실제로 분석하지 않고 시연용으로 속도 조절해서
 * 마치 진짜 분석하는 것처럼»). 화면은 진짜와 같은 길을 걷고, 나가는 AI 요청 하나만 여기서 갈린다.
 *   ① 녹화본에 같은 요청이 있으면 그때의 응답을 «실제 걸린 시간 × speed» 뒤에 돌려준다 — 서버로 안 보낸다.
 *   ② 없으면 실제로 보내고, 성공한 응답을 걸린 시간과 함께 녹화본에 덧붙인다(첫 시연이 곧 녹화다).
 * 요청에는 «몇 쪽 · 몇 번»이 없다 — 보낸 그림의 지문(글자 그대로 + 16×16 회색조)과 글의 지문으로 맞춘다.
 */
export type StudioDemoPayload = Pick<DevAiRequest, "action"> &
  Partial<Pick<DevAiRequest, "imageDataUrl" | "content" | "grade">>;

export interface StudioDemoKeys {
  image?: string;
  fingerprint?: number[];
  aspect?: number;
  content?: string;
}

/** 지문(0~255) 평균 차이가 이 값 이하면 같은 그림으로 본다 — 기기마다 다르게 그려진 글자 번짐을 넘는 값. */
export const STUDIO_DEMO_MATCH_LIMIT = 12;
/** 가로세로 비가 이 비율보다 더 다르면 다른 그림이다(잘린 칸 모양). */
const ASPECT_TOLERANCE = 0.08;

const abortError = () => new DOMException("작업 취소", "AbortError");

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** 같은 요청이면 0, 가까우면 지문 차이, 다른 요청이면 null. */
function distance(entry: StudioDemoEntry, keys: StudioDemoKeys) {
  if (entry.content !== keys.content) return null;
  if (entry.image && entry.image === keys.image) return 0;
  if (!entry.fingerprint || !keys.fingerprint)
    return entry.image || keys.image ? null : 0;
  if (
    entry.aspect &&
    keys.aspect &&
    Math.abs(entry.aspect - keys.aspect) / Math.max(entry.aspect, keys.aspect) >
      ASPECT_TOLERANCE
  )
    return null;
  let sum = 0;
  for (let index = 0; index < entry.fingerprint.length; index++)
    sum += Math.abs(entry.fingerprint[index] - (keys.fingerprint[index] ?? 0));
  const mean = sum / entry.fingerprint.length;
  return mean <= STUDIO_DEMO_MATCH_LIMIT ? mean : null;
}

export function createStudioDemoSession({
  entries: initial,
  speed,
  keysOf,
  onRecord,
  sleep = wait,
  now = () => performance.now(),
}: {
  entries: StudioDemoEntry[];
  speed: number;
  keysOf: (payload: StudioDemoPayload) => Promise<StudioDemoKeys>;
  onRecord?: (entries: StudioDemoEntry[]) => void;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
}) {
  const entries = [...initial];
  const used = new Set<number>();

  /** 아직 안 쓴 칸 가운데 가장 가까운 것 — 비슷한 두 문제가 한 칸을 나눠 갖지 않게. 다시 보낸 같은 요청만 쓴 칸을 다시 쓴다. */
  function pick(action: StudioDemoPayload["action"], keys: StudioDemoKeys) {
    let best: { index: number; score: number } | null = null;
    let repeat: number | null = null;
    entries.forEach((entry, index) => {
      if (entry.action !== action) return;
      const score = distance(entry, keys);
      if (score === null) return;
      if (used.has(index)) {
        if (score === 0 && repeat === null) repeat = index;
        return;
      }
      if (!best || score < best.score) best = { index, score };
    });
    return (best as { index: number } | null)?.index ?? repeat;
  }

  async function intercept(
    payload: StudioDemoPayload,
    forward: () => Promise<Response>,
    signal: AbortSignal,
  ) {
    let keys: StudioDemoKeys;
    try {
      keys = await keysOf(payload);
    } catch {
      return forward();
    }
    const index = pick(payload.action, keys);
    if (index !== null) {
      used.add(index);
      const entry = entries[index];
      await sleep(Math.round(entry.ms * speed), signal);
      return Response.json(entry.body);
    }
    const startedAt = now();
    const response = await forward();
    if (!response.ok) return response;
    const body: unknown = await response
      .clone()
      .json()
      .catch(() => null);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      entries.push({
        action: payload.action,
        ...keys,
        ms: Math.max(0, Math.round(now() - startedAt)),
        body: body as Record<string, unknown>,
      });
      used.add(entries.length - 1);
      onRecord?.([...entries]);
    }
    return response;
  }

  return { intercept, entries: () => [...entries] };
}

async function sha256Hex(data: BufferSource) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export const sha256OfText = (text: string) =>
  sha256Hex(new TextEncoder().encode(text));
export const sha256OfFile = async (file: Blob) =>
  sha256Hex(await file.arrayBuffer());

/**
 * 그림 지문 — 64×64 로 부드럽게 줄인 뒤 4×4 칸씩 평균 낸 16×16 회색조. 한 번에 16×16 으로 줄이면
 * 글자 줄이 깜빡이듯 걸려(에일리어싱) 같은 그림도 기기마다 지문이 크게 달라진다.
 */
async function fingerprintOf(dataUrl: string) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const side = STUDIO_DEMO_FINGERPRINT_SIDE;
  const big = side * 4;
  const canvas = document.createElement("canvas");
  canvas.width = big;
  canvas.height = big;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, big, big);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, big, big);
  const { data } = context.getImageData(0, 0, big, big);
  const fingerprint: number[] = [];
  for (let row = 0; row < side; row++)
    for (let column = 0; column < side; column++) {
      let sum = 0;
      for (let y = row * 4; y < row * 4 + 4; y++)
        for (let x = column * 4; x < column * 4 + 4; x++) {
          const at = (y * big + x) * 4;
          sum += 0.299 * data[at] + 0.587 * data[at + 1] + 0.114 * data[at + 2];
        }
      fingerprint.push(Math.round(sum / 16));
    }
  return {
    fingerprint,
    aspect: image.naturalWidth / Math.max(1, image.naturalHeight),
  };
}

/** 브라우저에서 요청 하나의 열쇠를 만든다. */
export async function studioDemoKeys(
  payload: StudioDemoPayload,
): Promise<StudioDemoKeys> {
  const keys: StudioDemoKeys = {};
  if (payload.content?.trim())
    keys.content = await sha256OfText(payload.content);
  if (payload.imageDataUrl) {
    keys.image = await sha256OfText(payload.imageDataUrl);
    Object.assign(keys, await fingerprintOf(payload.imageDataUrl));
  }
  return keys;
}
