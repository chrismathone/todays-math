import "server-only";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";
import {
  freshInsightV2Access,
  freshInsightV2Student,
} from "@/lib/math-insight/v2Access";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
export async function currentOntologyReadAccess(
  request: Request,
  studentId?: string,
) {
  const gate = await teacherGate(request);
  if (gate.response) return { response: gate.response, access: null };
  const current = await freshInsightV2Access(request, gate.account);
  if (!current)
    return {
      response: Response.json(
        { error: { code: "FORBIDDEN" } },
        { status: 403 },
      ),
      access: null,
    };
  let student = null,
    studentContext: unknown = null;
  if (studentId) {
    const url = new URL(request.url),
      scope = {
        ...(url.searchParams.get("classId")
          ? { classId: url.searchParams.get("classId")! }
          : {}),
        ...(url.searchParams.get("branchId")
          ? { branchId: url.searchParams.get("branchId")! }
          : {}),
      };
    const owned = await freshInsightV2Student(studentId, scope, current);
    if (owned.response) return { response: owned.response, access: null };
    student = owned.student!;
    studentContext = owned.context;
  }
  return {
    response: null,
    access: {
      current,
      student,
      stamp: ontologyDigest(
        canonicalOntologyJson({
          authorization: current.stamp,
          sessionVersion: current.sessionVersion,
          student: studentContext,
        }),
      ),
    },
  };
}
