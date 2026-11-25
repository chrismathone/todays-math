import "server-only";
import { after } from "next/server";
import { scanRuntime } from "./runtime.server";
import { createScanHttpHandlers } from "./httpHandlers";

export const scanHandlers = createScanHttpHandlers({
  runtime: scanRuntime,
  schedule: after,
});
