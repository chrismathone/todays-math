import "server-only";
import { db } from "@/lib/db";
import { verifyOntologyArtifact } from "../runtime/artifact";
import { createOntologyStageStore } from "./staging";
import {
  ontologyFailure,
  ontologyJsonBody,
  ontologyResponse,
} from "../actions/http";

export async function handleOntologyStage(request: Request) {
  if (request.method !== "POST")
    return ontologyResponse(405, { error: { code: "METHOD_NOT_ALLOWED" } });
  const signature = request.headers.get("x-ontology-stage-signature");
  if (!signature || !/^[a-f0-9]{64}$/.test(signature))
    return ontologyResponse(403, { error: { code: "FORBIDDEN" } });
  if (process.env.MATH_ONTOLOGY_OPERATIONS !== "on") return ontologyResponse(503, { error: { code: "ONTOLOGY_OPERATIONS_UNAVAILABLE" } });
  const key = (process.env.MATH_ONTOLOGY_ENGINE_SECRET || process.env.ONTOLOGY_ENGINE_SECRET || process.env.STUDIO_ENGINE_SECRET || process.env.AUTH_SECRET);
  if (!key || key.length < 32)
    return ontologyResponse(503, {
      error: { code: "ONTOLOGY_STAGE_UNAVAILABLE" },
    });
  let body: unknown;
  try {
    body = await ontologyJsonBody(request, 750000);
  } catch {
    return ontologyResponse(400, { error: { code: "VALIDATION_ERROR" } });
  }
  try {
    const store = createOntologyStageStore({
      db,
      key,
      verifyArtifact: async (artifact) =>
        verifyOntologyArtifact(artifact, artifact.identity),
    });
    return ontologyResponse(200, { data: await store.accept(body, signature) });
  } catch (error) {
    return ontologyFailure(error);
  }
}
