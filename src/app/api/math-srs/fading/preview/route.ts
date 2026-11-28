import { z } from "zod";
import { notFoundError, validationError } from "@/lib/apiResponse";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { fadingReadable } from "@/lib/fading/enabled";
import {
  createWorkspaceFadingPreviewShard,
  FADING_PREVIEW_SHARDS,
} from "@/lib/fading/workspacePreview";
import { noStore } from "@/lib/learn/accountRoutes";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";

export const GET = withErrorLog(
  "/api/math-srs/fading/preview",
  async (request: Request) => {
    if (!fadingReadable()) return noStore(notFoundError("주소"));
    const access = await teacherGate(request);
    if (access.response) return noStore(access.response);
    const params = new URL(request.url).searchParams;
    const query = z
      .object({
        today: z.iso.date(),
        shard: z.coerce
          .number()
          .int()
          .min(0)
          .max(FADING_PREVIEW_SHARDS - 1),
      })
      .safeParse({
        today: params.get("today"),
        shard: params.get("shard") ?? undefined,
      });
    if (!query.success) return noStore(validationError(query.error));
    // This local preview uses shared content and does not read a branch, roster,
    // student record, or stored session.
    // One response would exceed the 4.5 MiB function limit — see workspacePreview.ts.
    return noStore(
      Response.json(
        createWorkspaceFadingPreviewShard(query.data.today, query.data.shard),
      ),
    );
  },
);
