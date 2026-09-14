import { version } from "mathjax-full/package.json";

// MathJax's source components/version.js falls back to eval('require') unless
// PACKAGE_VERSION exists. Supply the installed metadata before those modules
// evaluate, so the lazy client chunk works without Node globals or a CDN loader.
const runtime = globalThis as typeof globalThis & { PACKAGE_VERSION?: string };
runtime.PACKAGE_VERSION ??= version;
