/** Server/compiler source integration surface; no automatic active release, database read or write. */
export {
  assembleMathOntologySources,
  sealMathOntologySourcePayload,
} from "./assembler";
export { loadBundledMathOntologySources } from "./catalog";
export {
  loadMathOntologySourceBundle,
  encodeMathOntologySourceBundle,
  sourceBundleRelativePaths,
} from "./bundle";
export {
  toMathOntologySourceQuads,
  toMathOntologyAdminCensusQuads,
  sourceQuadsToNQuads,
  MATH_ONTOLOGY_SOURCE_VOCAB,
} from "./rdf";
export {
  EXPECTED_MATH_ONTOLOGY_ADAPTER_COVERAGE,
  mathOntologyAdminSourceCoverageRows,
  mathOntologyVisibleSourceCoverageRows,
} from "./registry";

export { MATH_ONTOLOGY_SOURCE_RELATION_POLICY } from "./relationMatrix";
export { readAuthorizedMathOntologySources } from "./authorized";

export { projectMathOntologyPublicSources } from "./publicProjection";
export {
  sourcePartitionKey,
  sourcePartitionManifestPath,
  loadSourcePartitionManifest,
  readSourcePartitionArtifact,
} from "./partitions";
export { loadBundledMathOntologySourcePartitions } from "./catalog";
