import "server-only";

/**
 * Jev(`typesafe-ai/jev`, Vercel AI Gateway) 한 겹 — **글을 짓지 않고 미리 정한 선택지에 확률을 매기는** 모델.
 * 리드 2026-09-20 실측: 명령 고르기 21/23(세 회차 결정적) · 명령+기준점+대상요소 11/12 · 중앙 0.4~0.6초
 * (지금 Gemini 경로는 4~7초) · 한 건 0.07원 · 입력 32,000토큰 · 출력 0 · **이미지 입력 없음**.
 *
 * 이 한 겹은 **절대 던지지 않는다.** 시한 초과·연결 실패·모양이 다른 응답은 전부 `null` 이고,
 * 부르는 쪽은 그때 지금 경로(Gemini·구독 CLI)로 그냥 떨어진다. 이 규칙이 새는 순간 제품이 지금보다 나빠진다.
 */

/** 게이트웨이 모델 이름 — 문자열 모델 ID 는 기본 제공자(AI Gateway)가 푼다. */
export const JEV_MODEL = "typesafe-ai/jev";
/**
 * 시한 — 같은 입력이라도 **12번에 한 번꼴로 30~67초**가 걸리는 게이트웨이 딸꾹질이 실측됐다(리드 2026-09-20).
 * 시한이 없으면 그 한 번이 «지금보다 느려지는» 자리가 된다. 중앙값 0.4~0.6초의 세 배에 여유를 둔 값.
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
/** 고른 값과 그 값의 확률. 확률을 안 주면 0 — 문턱에 걸려 떨어지도록. */
export interface JevAnswer {
  choice: string;
  confidence: number;
}

/**
 * 빠른 길을 켤 수 있는가 — 운영은 Vercel OIDC, 로컬은 `AI_GATEWAY_API_KEY`.
 * 둘 다 없으면 **오류가 아니라** 조용히 꺼진다. `STUDIO_AI_JEV=off` 면 코드 없이 되돌린다
 * (`STUDIO_AI_FIGURE_VENDOR` 와 같은 결).
 *
 * 🔴 **시험 안에서는 «켜라»고 해야 켜진다**(`STUDIO_AI_JEV=on`). `vitest.config.mts:16` 이
 * `loadEnv` 로 `.env` 를 시험 환경에 통째로 주입하므로, 키를 가진 컴퓨터에서는 시험이
 * **진짜 게이트웨이를 부른다**(절대 규칙 7 — 시험에서 유료 실호출 금지). 게다가 켜지면서 생기는
 * `await` 한 틱이 취소 신호가 도착하는 차례를 바꿔 기존 시험을 깨뜨렸다.
 * 워크트리에는 `.env` 가 없어 **main 에 병합한 뒤에야** 드러났다(2026-09-20).
 * 이 겹을 직접 재는 시험은 `env` 를 손수 넘기므로 영향을 받지 않는다.
 */
export function isJevEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const switched = env.STUDIO_AI_JEV?.trim().toLowerCase();
  if (switched === "off") return false;
  if (env.VITEST && switched !== "on") return false;
  return Boolean(
    env.AI_GATEWAY_API_KEY?.trim() || env.VERCEL_OIDC_TOKEN?.trim(),
  );
}

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
 * 확신은 두 군데서 올 수 있다 — 답의 `probabilities[고른 값]`, 그리고
 * `providerMetadata.typesafe.confidence[물음 id]`(리드의 실측 스크립트가 읽은 자리, 문턱 0.9 의 눈금이 나온 곳).
 * 둘 다 오면 **낮은 쪽**을 쓴다: 문턱을 느슨하게 만들어 틀린 답을 통과시키느니 빠른 길을 덜 타는 쪽이 낫다.
 * 어느 쪽도 없으면 0 이고, 그러면 문턱에 걸려 지금 경로로 떨어진다.
 */
function readAnswer(
  value: unknown,
  question: JevChoiceQuestion,
  metaConfidence: unknown,
): JevAnswer | null {
  if (!value || typeof value !== "object") return null;
  const answer = value as {
    type?: unknown;
    choice?: unknown;
    probabilities?: unknown;
  };
  if (answer.type !== "choice" || typeof answer.choice !== "string")
    return null;
  if (!Object.prototype.hasOwnProperty.call(question.criteria, answer.choice))
    return null;
  const probabilities = answer.probabilities;
  const found = [
    asProbability(
      probabilities && typeof probabilities === "object"
        ? (probabilities as Record<string, unknown>)[answer.choice]
        : undefined,
    ),
    asProbability(metaConfidence),
  ].filter((value): value is number => value !== undefined);
  return {
    choice: answer.choice,
    confidence: found.length ? Math.min(...found) : 0,
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
    ids.some(
      (id) => Object.keys(questions[id].criteria).length > JEV_MAX_CHOICES,
    )
  )
    return null;

  const deadline = new AbortController();
  const stop = () => deadline.abort();
  signal?.addEventListener("abort", stop, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // 키가 없을 때 `ai` 를 아예 안 읽도록 여기서 불러온다.
    const { experimental_evaluate: evaluate } = await import("ai");
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        deadline.abort();
        resolve(null);
      }, JEV_TIMEOUT_MS);
    });
    const call = Promise.resolve(
      evaluate({
        model: JEV_MODEL,
        state,
        questions,
        // 재시도는 시한을 넘긴다 — 한 번만 묻고, 안 되면 지금 경로로.
        maxRetries: 0,
        abortSignal: deadline.signal,
        // 우리 문항이 상대편에 남지 않게 한다 — 빠지면 부르지 않는 것만 못하다.
        providerOptions: { gateway: { zeroDataRetention: true } },
      }),
    ).catch(() => null);
    const result = await Promise.race([call, timeout]);
    const answers = (result as { answers?: unknown } | null)?.answers;
    if (!answers || typeof answers !== "object") return null;
    const confidence = (
      result as {
        providerMetadata?: Record<string, Record<string, unknown>>;
      } | null
    )?.providerMetadata?.typesafe?.confidence as
      Record<string, unknown> | undefined;
    const read: Record<string, JevAnswer> = {};
    for (const id of ids) {
      const answer = readAnswer(
        (answers as Record<string, unknown>)[id],
        questions[id],
        confidence && typeof confidence === "object"
          ? confidence[id]
          : undefined,
      );
      if (!answer) return null;
      read[id] = answer;
    }
    return read;
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}
