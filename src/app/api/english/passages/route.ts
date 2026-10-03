import { handleBankHttp } from "@/lib/english/bank/http";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const GET = withErrorLog("/api/english/passages", (request) =>
  handleBankHttp(request),
);
export const POST = withErrorLog("/api/english/passages", (request) =>
  handleBankHttp(request),
);
