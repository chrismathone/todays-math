import React from "react";
import { createRoot } from "react-dom/client";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import { fixture, meta } from "./t2-specimen";
import "@/app/globals.css";
import "katex/dist/katex.min.css";

// Consensus 2026-10-20 Q1: one unbreakable answer `terms` long, in a short sheet.
const terms = Number(new URLSearchParams(location.search).get("terms") || 30);
const wide = `$\\left(${Array.from({ length: terms }, (_, i) => i + 11).join("+")}\\right)$`;
const selected = fixture
  .slice(0, 5)
  .map((problem, i) => (i === 2 ? { ...problem, answer: wide } : problem));
const options = {
  ...DEFAULT_PRINT_OPTIONS,
  template: "jeongtong" as const,
  columns: 1 as const,
  showAnswers: true,
  quickAnswerOnly: true,
};
createRoot(document.getElementById("root")!).render(
  <WorksheetPrint
    selected={selected}
    title={meta.title}
    options={options}
    printMeta={meta}
    onReady={(ready) => {
      document.documentElement.dataset.ready = String(ready);
    }}
  />,
);
