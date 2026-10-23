import { handleOntologyOperations } from "@/lib/math-ontology/actions/production.server";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const runtime = "nodejs";
export const maxDuration = 300;
export const POST = withErrorLog("/api/math-ontology/publish/jobs", handleOntologyOperations);
