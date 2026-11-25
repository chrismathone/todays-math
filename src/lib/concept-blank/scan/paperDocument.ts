import "server-only";
import {
  scanPaperArtifactSchema,
  type ScanPaperArtifact,
} from "@/contracts/conceptBlankScanIssued.contract";

/** Frozen font/CSS/HTML bytes only; reading/reprinting never launches Chromium. */
export function scanPaperDocument(
  artifactInput: ScanPaperArtifact,
  part?: "student" | "key",
) {
  const artifact = scanPaperArtifactSchema.parse(artifactInput);
  const pages = artifact.pages.filter((p) => !part || p.part === part);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>개념 백지</title><style>${artifact.css.replace(/<\/style/gi, "<\\/style")}</style></head><body>${pages.map((p) => p.html).join("")}</body></html>`;
}
