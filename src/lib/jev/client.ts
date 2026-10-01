import "server-only";

/**
 * Jev(`jev-latest`, TypeSafe 직접 HTTP) — 미리 정한 선택지에 확률을 매기는 모델.
 * 요청에는 글로 만든 상태와 물음만 싣는다. 이미지·API 키를 본문이나 로그에 싣지 않는다.
 *
 * 이 한 겹은 **절대 던지지 않는다.** 시한 초과·연결 실패·모양이 다른 응답은 전부 `null` 이고,
 * 부르는 쪽은 그때 지금 경로(Gemini·구독 CLI)로 그냥 떨어진다. 이 규칙이 새는 순간 제품이 지금보다 나빠진다.
 */

/** TypeSafe HTTP API의 모델 별칭. */
export const JEV_MODEL = "jev-latest";
const JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
/**
 * 기존 빠른 길의 1.5초 예산을 유지한다. 연결부터 응답 본문 읽기까지 이 시한 안에 끝내고 재시도하지 않는다.
 */
export const JEV_TIMEOUT_MS = 1500;
/** 한 물음에 실을 수 있는 선택지 수 — 넘으면 묻지 않는다. */
export const JEV_MAX_CHOICES = 255;
/**
 * state 글자 상한 — 모델 입력은 32,000토큰이다. 한글이 섞이면 1토큰이 1글자에 가까워지므로
 * 글자 수로 보수적으로 막는다(30,000자). 넘으면 묻지 않고 지금 경로로.
 */
export const JEV_MAX_STATE_CHARS = 30_000;

/** 고르게 할 물음 — 선택지 이름과 그 뜻. 뜻이 없으면 `null`. */
export interface JevChoiceQuestion {
  readonly type: "choice";
  readonly instructions: string;
  readonly criteria: Readonly<Record<string, string | null>>;
}
/** 고른 값과 보수적인 신뢰도: min(선택 확률, 답의 confidence). */
export interface JevAnswer {
  choice: string;
  confidence: number;
}

/**
 * 빠른 길을 켤 수 있는가 — 서버의 `TYPESAFE_API_KEY`만 사용한다(Gateway 키·OIDC는 사용하지 않는다).
 * 키가 없으면 **오류가 아니라** 조용히 꺼진다. `STUDIO_AI_JEV=off` 면 코드 없이 되돌린다
 * (`STUDIO_AI_FIGURE_VENDOR` 와 같은 결).
 *
 * 🔴 **시험 안에서는 «켜라»고 해야 켜진다**(`STUDIO_AI_JEV=on`). `vitest.config.mts:16` 이
 * `loadEnv` 로 `.env` 를 시험 환경에 통째로 주입하므로, 키를 가진 컴퓨터에서는 시험이
 * **진짜 API를 부른다**(절대 규칙 7 — 시험에서 유료 실호출 금지). 게다가 켜지면서 생기는
 * `await` 한 틱이 취소 신호가 도착하는 차례를 바꿔 기존 시험을 깨뜨렸다.
 * 워크트리에는 `.env` 가 없어 **main 에 병합한 뒤에야** 드러났다(2026-09-20).
 * 이 겹을 직접 재는 시험은 `env` 를 손수 넘기므로 영향을 받지 않는다.
 */
export function isJevEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const switched = env.STUDIO_AI_JEV?.trim().toLowerCase();
  if (switched === "off") return false;
  if (env.VITEST && switched !== "on") return false;
  return Boolean(env.TYPESAFE_API_KEY?.trim());
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** [0, 1] 안의 수만 확신으로 인정한다. */
const asProbability = (value: unknown) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1
    ? value
    : undefined;

/**
 * 답 하나가 이 물음의 선택지 안에서 나온 «고르기»인가.
 * 직접 API는 답에 `confidence`를 준다. 이는 전체 확률 분포의 집중도이며 선택 확률과 다르다.
 * 기존처럼 선택 확률과 confidence 중 낮은 값을 쓴다. 둘 중 하나라도 없거나 분포가 잘못되면 버린다.
 * SDK를 거치지 않으므로 모든 선택지의 확률을 직접 검증한다. 합의 반올림 오차만 허용하고 재정규화하지 않는다.
 */
function readAnswer(
  value: unknown,
  question: JevChoiceQuestion,
): JevAnswer | null {
  if (!isRecord(value)) return null;
  const answer = value;
  if (answer.type !== "choice" || typeof answer.choice !== "string")
    return null;
  if (!Object.prototype.hasOwnProperty.call(question.criteria, answer.choice))
    return null;
  const probabilities = answer.probabilities;
  const confidence = asProbability(answer.confidence);
  if (!isRecord(probabilities) || confidence === undefined) return null;
  const choices = Object.keys(question.criteria);
  if (Object.keys(probabilities).length !== choices.length) return null;
  const selected = asProbability(probabilities[answer.choice]);
  if (selected === undefined) return null;
  let total = 0;
  for (const choice of choices) {
    if (!Object.prototype.hasOwnProperty.call(probabilities, choice))
      return null;
    const probability = asProbability(probabilities[choice]);
    if (probability === undefined || probability > selected) return null;
    total += probability;
  }
  if (Math.abs(total - 1) > 0.01) return null;
  return {
    choice: answer.choice,
    confidence: Math.min(selected, confidence),
  };
}

/**
 * 한 요청에 물음을 묶어 병렬로 묻는다. 돌아오는 것은 물음마다 «고른 값 + 확률» 하나씩.
 * 하나라도 읽히지 않으면 전부 버린다(`null`) — 반쪽 답으로 명령을 조립하지 않는다.
 */
export async function askJev(input: {
  /** 하나의 공유 상태 — 우리는 JSON 글로 싣는다. 이미지는 싣지 않는다(Jev 는 못 본다). */
  state: string;
  questions: Record<string, JevChoiceQuestion>;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
}): Promise<Record<string, JevAnswer> | null> {
  const { state, questions, signal, env = process.env } = input;
  if (!isJevEnabled(env)) return null;
  if (signal?.aborted) return null;
  const ids = Object.keys(questions);
  if (!ids.length) return null;
  if (state.length > JEV_MAX_STATE_CHARS) return null;
  if (
    ids.some((id) => {
      const count = Object.keys(questions[id].criteria).length;
      return count === 0 || count > JEV_MAX_CHOICES;
    })
  )
    return null;

  const deadline = new AbortController();
  const stopped = new Promise<null>((resolve) => {
    deadline.signal.addEventListener("abort", () => resolve(null), {
      once: true,
    });
  });
  const stop = () => deadline.abort();
  signal?.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(stop, JEV_TIMEOUT_MS);
  try {
    const call = (async (): Promise<unknown> => {
      const response = await fetch(JEV_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TYPESAFE_API_KEY!.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: JEV_MODEL, state, questions }),
        signal: deadline.signal,
        redirect: "error",
        cache: "no-store",
      });
      if (!response.ok) {
        // 오류 본문·키는 읽거나 기록하지 않는다. 열린 응답 스트림도 중단한다.
        deadline.abort();
        return null;
      }
      return response.json();
    })();
    // fetch나 본문 읽기가 취소 신호를 무시해도 시한·사용자 취소는 즉시 null로 끝난다.
    const result = await Promise.race([call, stopped]);
    if (deadline.signal.aborted || !isRecord(result)) return null;
    const answers = result.answers;
    if (!isRecord(answers)) return null;
    const read: Record<string, JevAnswer> = {};
    for (const id of ids) {
      const answer = readAnswer(answers[id], questions[id]);
      if (!answer) return null;
      read[id] = answer;
    }
    return read;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}
