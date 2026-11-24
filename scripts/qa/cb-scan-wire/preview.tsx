import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "../../../src/app/globals.css";
import "../../../e2e/concept-blank-paper/harness.css";
import { ScanWire } from "../../../src/app/dev/concept-blank-scan-wire/ScanWire";
import { loadWireSamples } from "../../../src/app/dev/concept-blank-scan-wire/samples";
import { wirePaperPages } from "../../../src/app/dev/concept-blank-scan-wire/WirePaper";
import { PAPER_OPTIONS } from "../../../src/app/dev/concept-blank-scan-wire/options";

// UI만 로컬에서 표시한다. 제품 라우트의 인증은 별도의 가드 시험으로 검증한다.
document.body.style.padding = "0";
document.documentElement.style.setProperty(
  "--font-pretendard",
  "cb-harness-pretendard",
);
const samples = await loadWireSamples();
const params = new URLSearchParams(location.search);
const proof = PAPER_OPTIONS.find((option) => option.id === params.get("proof"));
const sample =
  samples.find((item) => item.id === params.get("sample")) ?? samples[1];
createRoot(document.getElementById("root")!).render(
  proof ? (
    <>
      {wirePaperPages(sample, proof)}
      {wirePaperPages(sample, proof, "key")}
    </>
  ) : (
    <ScanWire samples={samples} />
  ),
);
