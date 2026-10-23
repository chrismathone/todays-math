import "server-only";
/** Server-only source ports. No action/write surface is exposed. */
export {
  readMathOntologyDatabaseSources,
  readMathOntologyDatabaseSourcesInTransaction,
  assertMathOntologySourceSnapshotTransaction,
} from "./database";
export type { MathOntologyDatabaseSourceSnapshot } from "./database";
export {
  authorizeMathOntologySourceRead,
  MathOntologySourceAccessDenied,
} from "./databaseAccess";
export type {
  MathOntologyDatabaseReadInput,
  MathOntologySourceTransaction,
} from "./databaseAccess";
export { readNativeDefinitionEvidenceInTransaction } from "./definitionEvidence";
