import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "../../../src/app/globals.css";
import "../../../e2e/concept-blank-paper/harness.css";
import ScanApp from "../../../src/components/concept-blank/scan/ScanApp";
import { parseScanDestination } from "../../../src/lib/concept-blank/scan/navigation";

document.body.style.padding = "0";
document.documentElement.style.setProperty(
  "--font-pretendard",
  "cb-harness-pretendard",
);
const destination = parseScanDestination(new URLSearchParams(location.search));
if (!destination)
  throw new Error("A real locally issued QR destination is required");
createRoot(document.getElementById("root")!).render(
  <ScanApp destination={destination} />,
);
