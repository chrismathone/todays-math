import { createRequire, registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Optional Node 24 loader for normal Git hooks in a dependency-free worktree.
// Resolve only missing bare packages from an explicitly supplied install root.
// It does not alter packages, lockfiles, hooks, .env files, or filesystem links.
const dependencyRoot = process.env.GEOMETRY_TRIANGLES_DEPS;
if (dependencyRoot) {
  const requireDependency = createRequire(
    resolve(dependencyRoot, "package.json"),
  );
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (
          error.code !== "ERR_MODULE_NOT_FOUND" ||
          specifier.startsWith(".") ||
          specifier.includes(":") ||
          specifier.startsWith("/")
        )
          throw error;
        return nextResolve(
          pathToFileURL(requireDependency.resolve(specifier)).href,
          context,
        );
      }
    },
  });
}
