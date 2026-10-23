import "server-only";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { sourceEntityIri } from "../ids";
import {
  sourceByteDigest,
  freezeSourceValue,
  canonicalSourceJson,
} from "./canonical";
import {
  authorizeMathOntologyNativeSourceRead,
  type MathOntologyDatabaseReadInput,
  type MathOntologySourceTransaction,
} from "./databaseAccess";
import {
  sourcePartitionKey,
  readSourcePartitionArtifact,
  type MathOntologySourcePartitionManifest,
} from "./partitions";
const definitions = new Map(CONCEPT_BLANK_BANK.concepts.map((c) => [c.id, c]));
const MAX_ITEMS = 6,
  MAX_BYTES = 24 * 1024;
/** Native general definitions only. Assessment questions, examples/answers, imported originals and student text are excluded by construction. */
export async function readNativeDefinitionEvidenceInTransaction(
  tx: MathOntologySourceTransaction,
  input: Pick<
    MathOntologyDatabaseReadInput,
    "actor" | "graphVersion" | "now" | "authorizationNow"
  >,
  nativeIds: readonly string[],
  release: {
    manifest: MathOntologySourcePartitionManifest;
    read: (path: string) => Uint8Array;
  },
) {
  if (
    nativeIds.length > MAX_ITEMS ||
    new Set(nativeIds).size !== nativeIds.length ||
    Buffer.byteLength(JSON.stringify(nativeIds)) > 4096
  )
    throw new Error(
      "Definition evidence request exceeds bounded source policy",
    );
  await authorizeMathOntologyNativeSourceRead(tx, input);
  const packets = [],
    unknownIds = [];
  for (const nativeId of nativeIds) {
    const current = definitions.get(nativeId);
    if (!current) {
      unknownIds.push(nativeId);
      continue;
    }
    const stableIri = sourceEntityIri({
      namespace: "bank-definition",
      scope: "global",
      nativeId,
    });
    const key = sourcePartitionKey("bank-definition", stableIri);
    const descriptor = release.manifest.partitions.find((p) => p.key === key);
    if (!descriptor) throw new Error("Approved definition shard missing");
    const shard = JSON.parse(
      readSourcePartitionArtifact(
        release.read,
        release.manifest,
        descriptor.projection,
      ).toString("utf8"),
    ) as {
      projectionHash: string;
      primaryEntityIris: string[];
      entities: {
        namespace: string;
        scope: string;
        nativeId: string;
        stableIri: string;
        iri: string;
        sourceVersion: string;
        sourceProjectionHash: string;
        distribution: string;
        sourceProvenance: string;
        metadata: { definitionTextHash?: string };
        labels?: { value: string; sourceField: string }[];
        origin: unknown;
      }[];
    };
    if (shard.projectionHash !== release.manifest.projectionHash)
      throw new Error("Definition shard release mismatch");
    const record = shard.entities.find(
      (e) =>
        e.namespace === "bank-definition" &&
        e.scope === "global" &&
        e.nativeId === nativeId &&
        e.stableIri === stableIri &&
        shard.primaryEntityIris.includes(e.iri),
    );
    if (
      !record ||
      record.distribution !== "native-metadata" ||
      record.sourceProvenance !== "native-source" ||
      record.metadata.definitionTextHash !==
        sourceByteDigest(current.definition) ||
      !record.labels?.some(
        (l) => l.sourceField === "term" && l.value === current.term,
      )
    )
      throw new Error(
        "Current definition text differs from approved native source revision",
      );
    packets.push({
      namespace: "bank-definition",
      nativeId,
      stableIri,
      sourceVersionIri: record.iri,
      sourceVersion: record.sourceVersion,
      sourceProjectionHash: record.sourceProjectionHash,
      term: current.term,
      definition: current.definition,
      definitionTextHash: sourceByteDigest(current.definition),
      origin: record.origin,
      scope: "teacher-server-evidence-only",
      authority: "native-authored-definition-not-official-alignment",
    });
  }
  const result = {
    format: "native-definition-evidence-1",
    projectionHash: release.manifest.projectionHash,
    graphVersion: input.graphVersion,
    maxItems: MAX_ITEMS,
    maxBytes: MAX_BYTES,
    packets,
    unknownIds,
  };
  if (Buffer.byteLength(canonicalSourceJson(result)) > MAX_BYTES)
    throw new Error("Definition evidence byte limit exceeded");
  await authorizeMathOntologyNativeSourceRead(tx, input);
  return freezeSourceValue(result);
}
