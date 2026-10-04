import { createRoot } from "react-dom/client";
import StudentMathExplorers from "../../../src/components/math-explorers/StudentMathExplorers";
import { StudentMobileNav } from "../../../src/components/learn/StudentMobileNav";
import learn from "../../../src/components/learn/learn.module.css";
import "../../../src/app/globals.css";
import "katex/dist/katex.min.css";

// The real student component, with the same mobile navigation as the Next QA route.
// mobile-explorers-qa.mjs intercepts every API with its in-memory product engines.
createRoot(document.getElementById("root")!).render(
  <div className={learn.page}>
    <StudentMathExplorers />
    <StudentMobileNav previewPath="/learn/math-explorers" />
  </div>,
);
