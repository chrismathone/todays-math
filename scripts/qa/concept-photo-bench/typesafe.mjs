/** Direct TypeSafe HTTP transport: https://docs.typesafe.ai/api */
export async function evaluateTypeSafe({
  apiKey,
  model = "jev-latest",
  state,
  questions,
  signal = AbortSignal.timeout(30000),
  fetchImpl = globalThis.fetch,
}) {
  if (!apiKey?.trim()) throw new Error("TYPESAFE_API_KEY is missing");
  const response = await fetchImpl("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, state, questions }),
    signal,
    redirect: "error",
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    /* Error handling below never prints raw bodies. */
  }
  if (!response.ok) {
    const detail =
      data?.error?.message ??
      data?.message ??
      data?.detail ??
      "Request rejected";
    const safeDetail = (
      typeof detail === "string" ? detail : JSON.stringify(detail)
    )
      .replaceAll(apiKey, "[REDACTED]")
      .slice(0, 600);
    const error = new Error(`TypeSafe HTTP ${response.status}: ${safeDetail}`);
    error.status = response.status;
    throw error;
  }
  if (!data || typeof data.model !== "string" || !data.answers || !data.usage)
    throw new Error("TypeSafe returned an incomplete response");
  // This benchmark uses Choice only. Preserve raw probabilities; never renormalize.
  for (const [id, question] of Object.entries(questions)) {
    const answer = data.answers[id];
    const keys = Object.keys(question.criteria);
    if (
      question.type !== "choice" ||
      answer?.type !== "choice" ||
      !keys.includes(answer.choice)
    )
      throw new Error(`Invalid TypeSafe Choice: ${id}`);
    if (
      typeof answer.confidence !== "number" ||
      !Number.isFinite(answer.confidence) ||
      answer.confidence < 0 ||
      answer.confidence > 1
    )
      throw new Error(`Invalid TypeSafe confidence: ${id}`);
    const probabilities = keys.map((k) => answer.probabilities?.[k]);
    if (
      probabilities.some(
        (p) => typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1,
      ) ||
      Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) > 0.01
    )
      throw new Error(`Invalid TypeSafe probabilities: ${id}`);
  }
  if (
    !Number.isInteger(data.usage.input_tokens) ||
    data.usage.input_tokens < 0 ||
    !Number.isInteger(data.usage.output_tokens) ||
    data.usage.output_tokens < 0
  )
    throw new Error("Invalid TypeSafe token usage");
  return {
    model: data.model,
    answers: data.answers,
    usage: {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      raw: data.usage,
    },
    providerMetadata: {
      typesafe: {
        requestedModel: model,
        responseModel: data.model,
        requestId: response.headers.get("x-request-id"),
      },
    },
  };
}
