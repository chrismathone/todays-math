/** Read-only config validation; never prints secrets and never creates DB bindings. */
import { parseBindingConfigs } from "../../src/lib/eywa/sync-contract";
const configs = parseBindingConfigs(process.env.EYWA_SYNC_BINDINGS_JSON);
console.log(
  JSON.stringify(
    {
      configured: configs.length,
      bindings: configs.map(
        ({
          bindingId,
          tenantId,
          targetBranchId,
          sourceBaseUrl,
          targetBaseUrl,
          keyId,
        }) => ({
          bindingId,
          tenantId,
          targetBranchId,
          sourceBaseUrl,
          targetBaseUrl,
          keyId,
        }),
      ),
      note: "Configuration validated only; register shadow bindings in the target management screen after fixture verification.",
    },
    null,
    2,
  ),
);
