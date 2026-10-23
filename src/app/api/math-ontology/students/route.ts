import { handleOntologyOperations } from "@/lib/math-ontology/actions/production.server";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = withErrorLog("/api/math-ontology/students", handleOntologyOperations);
