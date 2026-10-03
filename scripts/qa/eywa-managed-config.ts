/** Read-only config validation; never prints secrets and never creates DB bindings. */
import {
  parseAutomaticConfigs,
  parseBindingConfigs,
} from "../../src/lib/eywa/sync-contract";
const configs = parseBindingConfigs(process.env.EYWA_SYNC_BINDINGS_JSON);
const automatic = parseAutomaticConfigs(process.env.EYWA_SYNC_AUTO_JSON);
console.log(
  JSON.stringify(
    {
      configured: configs.length,
      automaticInstallations: automatic.map(
        ({ sourceBaseUrl, targetBaseUrl, keyId }) => ({
          sourceBaseUrl,
          targetBaseUrl,
          keyId,
        }),
      ),
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
      note: automatic.length
        ? "Configuration validated only; automatic source ON provisions branches after migrations and deployment."
        : "Configuration validated only; explicit mappings require reviewed shadow registration.",
    },
    null,
    2,
  ),
);
