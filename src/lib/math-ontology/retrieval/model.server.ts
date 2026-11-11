import {
  ontologyGroundingJsonSchema,
  type OntologyModelJsonSchema,
} from "./modelSchemas";
import "server-only";
import { ontologyModelConfig } from "./config.server";
import { insightMaxOutputTokens } from "@/lib/math-insight/config";
import { maskInsightQuery } from "@/lib/math-insight/inference";
import { runModelApi, type ModelApiReceipt } from "@/lib/studio-ai/api";
import {
  composeOntologySelection,
  ontologySelectionPrompt,
  type OntologyModelPacket,
} from "./modelSelection";
import { ontologyDigest } from "../compiler/canonical";
export async function requestOntologyCompletion(
  prompt: string,
  signal: AbortSignal,
  jsonSchema?: OntologyModelJsonSchema,
) {
  const config = ontologyModelConfig();
  if (!config) throw new Error("MODEL_NOT_CONFIGURED");
  let receipt: Readonly<ModelApiReceipt> | undefined;
  const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(20000)]);
  const raw = await runModelApi({
    ...config,
    ...(jsonSchema ? { jsonSchema } : {}),
    prompt,
    signal: boundedSignal,
    // Claude 는 생각이 출력 한도를 같이 쓴다 — 생각 몫을 얹는다(`insightMaxOutputTokens`).
    maxOutputTokens: insightMaxOutputTokens(config.vendor, 1600),
    singleAttempt: true,
    suppressUpstreamDetails: true,
    onReceipt: (value) => {
      receipt = value;
    },
  });
  boundedSignal.throwIfAborted();
  if (!receipt || receipt.responseTextHash !== ontologyDigest(raw))
    throw new Error("MODEL_RECEIPT_MISSING");
  return { raw, receipt };
}
/** Synchronous receipt capture; durable sealing is explicitly awaited by caller. */
export async function requestOntologyModelSelection(input: {
  packet: OntologyModelPacket;
  question: string;
  knownIdentities: readonly string[];
  signal: AbortSignal;
  stillCurrent: () => Promise<"current" | "stale" | "forbidden">;
}) {
  const prompt = ontologySelectionPrompt(
    input.packet,
    maskInsightQuery(input.question, input.knownIdentities),
  );
  const completion = await requestOntologyCompletion(
    prompt,
    input.signal,
    ontologyGroundingJsonSchema,
  );
  const latest = await input.stillCurrent();
  if (latest !== "current")
    throw new Error(
      latest === "forbidden"
        ? "MODEL_AUTHORIZATION_REVOKED"
        : "MODEL_SNAPSHOT_STALE",
    );
  return {
    result: composeOntologySelection(completion.raw, input.packet),
    receipt: {
      ...completion.receipt,
      modelCalled: true as const,
      packetId: input.packet.packetId,
      promptHash: ontologyDigest(prompt),
      singleAttempt: true,
    },
    providerReceipt: completion.receipt,
  };
}
