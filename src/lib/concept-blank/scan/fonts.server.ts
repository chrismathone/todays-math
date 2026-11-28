import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ScanPaperArtifact } from "@/contracts/conceptBlankScanIssued.contract";

const faces = /@font-face\s*\{[^}]*\}/g;
let cached:
  | {
      embedded: string;
      browser: string;
      math: string;
      fingerprint: string;
      legacyFingerprint: string;
    }
  | undefined;
function fonts() {
  if (cached) return cached;
  const root = process.cwd();
  const urls = new Map<string, string>();
  const source = (file: string, url: string) => {
    const bytes = readFileSync(
      path.join(/* turbopackIgnore: true */ root, file),
    );
    const base64 = `data:font/woff2;base64,${bytes.toString("base64")}`;
    const hash = createHash("sha256").update(bytes).digest("hex");
    urls.set(base64, `${url}?v=${hash}`);
    return base64;
  };
  const korean = (family: string, file: string) =>
    `@font-face{font-family:"${family}";font-style:normal;font-weight:100 900;font-display:block;src:url(${source(`public/fonts/${file}`, `/fonts/${file}`)}) format("woff2");}`;
  const kr = [
    korean("Noto Serif KR", "NotoSerifKR-subset.woff2"),
    korean("Pretendard", "PretendardVariable.woff2"),
  ];
  const math = readFileSync(
    path.join(
      /* turbopackIgnore: true */ root,
      "node_modules/katex/dist/katex.min.css",
    ),
    "utf8",
  );
  const katex = (math.match(faces) ?? []).map((face) =>
    face.replace(/src:([^;}]+);?/g, (declaration, sources: string) => {
      const font = /url\(fonts\/([^()]+\.woff2)\)/.exec(sources);
      if (!font) throw new Error("수식 글꼴 경로를 확인해야 합니다.");
      return `src:url(${source(`public/fonts/katex/${font[1]}`, `/fonts/katex/${font[1]}`)}) format("woff2");`;
    }),
  );
  const embedded = [...kr, ...katex].join("\n");
  const browser = embedded.replace(
    /data:font\/woff2;base64,[A-Za-z0-9+/=]+/g,
    (value) => {
      const url = urls.get(value);
      if (!url) throw new Error("지면 글꼴 주소를 확인해야 합니다.");
      return url;
    },
  );
  cached = {
    embedded,
    browser,
    math: math.replace(faces, ""),
    fingerprint: fontHash(embedded),
    legacyFingerprint: fontHash(
      [...kr, ...(math.match(faces) ?? [])].join("\n"),
    ),
  };
  return cached;
}
function fontHash(css: string) {
  // Ignore inter-face whitespace so immutable pre-split artifacts can be checked too.
  return createHash("sha256")
    .update((css.match(faces) ?? []).join("\n"))
    .digest("hex");
}
export const scanFontFingerprint = () => fonts().fingerprint;
export const scanFontCss = (mode: "embedded" | "browser") => fonts()[mode];
export const scanMathLayoutCss = () => fonts().math;

/** Verify legacy embedded faces before replacing them; never rewrite the stored artifact/hash.
 * A deployment changing font bytes must retain that font edition before reprinting old sheets. */
export function browserScanCss(artifact: ScanPaperArtifact) {
  const embedded = artifact.css.match(faces)?.join("\n");
  const fingerprint =
    artifact.fontFingerprint ?? (embedded ? fontHash(embedded) : undefined);
  if (
    fingerprint &&
    fingerprint !== scanFontFingerprint() &&
    !(
      artifact.fontFingerprint === undefined &&
      fingerprint === fonts().legacyFingerprint
    )
  )
    throw new Error("저장된 지면의 글꼴 판을 확인해야 합니다.");
  return `${fingerprint ? scanFontCss("browser") : ""}\n${artifact.css.replace(faces, "")}`;
}
