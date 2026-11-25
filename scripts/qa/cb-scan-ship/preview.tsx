import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "../../../src/app/globals.css";
import "../../../e2e/concept-blank-paper/harness.css";
import { ScanHifi } from "../../../src/app/dev/concept-blank-scan-hifi/ScanHifi";
import {
  HIFI_OPTIONS,
  HIFI_SCREENS,
} from "../../../src/app/dev/concept-blank-scan-hifi/options";
import { withHifiQrs } from "../../../src/app/dev/concept-blank-scan-hifi/samples";
import { hifiPaperPages } from "../../../src/app/dev/concept-blank-scan-hifi/HifiPaper";
import { loadWireSamples } from "../../../src/app/dev/concept-blank-scan-wire/samples";

document.body.style.padding = "0";
document.documentElement.style.setProperty(
  "--font-pretendard",
  "cb-harness-pretendard",
);
const samples = await withHifiQrs(await loadWireSamples());
const params = new URLSearchParams(location.search);
const sample = samples.find((s) => s.id === params.get("sample")) ?? samples[1];
createRoot(document.getElementById("root")!).render(
  params.has("proof") ? (
    <>
      {hifiPaperPages(sample)}
      {hifiPaperPages(sample, "key")}
    </>
  ) : (
    <ScanHifi
      samples={samples}
      initialOption={
        HIFI_OPTIONS.find((o) => o.id === params.get("option"))?.id
      }
      initialScreen={
        HIFI_SCREENS.find(([id]) => id === params.get("screen"))?.[0]
      }
    />
  ),
);
