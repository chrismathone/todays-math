import { handleBankHttp } from "@/lib/english/bank/http";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const POST = withErrorLog("/api/english/passages/import", (request) =>
  handleBankHttp(request, undefined, "import"),
);
