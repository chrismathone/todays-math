import "server-only";
import { insightModelConfig } from "@/lib/math-insight/config";
import { maskInsightQuery } from "@/lib/math-insight/inference";
import { runModelApi } from "@/lib/studio-ai/api";
import {
  composeOntologySelection,
  ontologySelectionPrompt,
  type OntologyModelPacket,
} from "./modelSelection";
import { ontologyDigest } from "../compiler/canonical";
/** Existing provider stack; no default mutation, fallback, tool access or repair loop. */
export async function requestOntologyModelSelection(input: {
  packet: OntologyModelPacket;
  question: string;
  knownIdentities: readonly string[];
  signal: AbortSignal;
  stillCurrent: () => Promise<"current" | "stale" | "forbidden">;
}) {
  const config = insightModelConfig();
  if (!config) throw new Error("MODEL_NOT_CONFIGURED");
  const masked = maskInsightQuery(input.question, input.knownIdentities),
    prompt = ontologySelectionPrompt(input.packet, masked);
  const signal = AbortSignal.any([input.signal, AbortSignal.timeout(20000)]);
  const raw = await runModelApi({
    ...config,
    prompt,
    signal,
    maxOutputTokens: 900,
    singleAttempt: true,
    suppressUpstreamDetails: true,
  });
  signal.throwIfAborted();
  const latest = await input.stillCurrent();
  if (latest !== "current")
    throw new Error(
      latest === "forbidden"
        ? "MODEL_AUTHORIZATION_REVOKED"
        : "MODEL_SNAPSHOT_STALE",
    );
  return {
    result: composeOntologySelection(raw, input.packet),
    receipt: {
      requestedProvider: config.vendor,
      requestedModel: config.model,
      reportedModel: null,
      usage: null,
      metadataStatus: "existing-transport-returns-text-only",
      packetId: input.packet.packetId,
      promptHash: ontologyDigest(prompt),
      responseHash: ontologyDigest(raw),
      singleAttempt: true,
    },
  };
}
