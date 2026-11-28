import { z } from "zod";
import { notFoundError, validationError } from "@/lib/apiResponse";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { fadingReadable } from "@/lib/fading/enabled";
import { createWorkspaceFadingPreview } from "@/lib/fading/workspacePreview";
import { noStore } from "@/lib/learn/accountRoutes";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";

export const GET = withErrorLog(
  "/api/math-srs/fading/preview",
  async (request: Request) => {
    if (!fadingReadable()) return noStore(notFoundError("주소"));
    const access = await teacherGate(request);
    if (access.response) return noStore(access.response);
    const today = z.iso
      .date()
      .safeParse(new URL(request.url).searchParams.get("today"));
    if (!today.success) return noStore(validationError(today.error));
    // This local preview uses shared content and does not read a branch, roster,
    // student record, or stored session.
    return noStore(Response.json(createWorkspaceFadingPreview(today.data)));
  },
);
