// Reuse the explicitly named installed toolchain; no installs, links or env files.
import { createRequire, registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
const root =
  process.argv[2] && existsSync(resolve(process.argv[2], "node_modules"))
    ? process.argv[2]
    : "C:/Creative/testautocreator";
const requireTools = createRequire(resolve(root, "package.json"));
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        !["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"].includes(error.code) ||
        specifier.startsWith(".") ||
        specifier.includes(":") ||
        specifier.startsWith("/")
      )
        throw error;
      return nextResolve(
        pathToFileURL(requireTools.resolve(specifier)).href,
        context,
      );
    }
  },
});
