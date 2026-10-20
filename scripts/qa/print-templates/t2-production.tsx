import React from "react";
import { createRoot } from "react-dom/client";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
} from "@/components/unified/print/types";
import { fixture, meta } from "./t2-specimen";
import "@/app/globals.css";
import "katex/dist/katex.min.css";

const query = new URLSearchParams(location.search);
const template = (query.get("template") || "jeongtong") as PrintTemplate;
const columns = Number(query.get("columns") || 1) as 1 | 2;
const options = {
  ...DEFAULT_PRINT_OPTIONS,
  template,
  columns,
  columnDivider: true,
  showAnswers: false,
};
Object.assign(window, { measurementFixture: { fixture, meta, options } });
createRoot(document.getElementById("root")!).render(
  <WorksheetPrint
    selected={fixture}
    title={meta.title}
    options={options}
    printMeta={meta}
    onReady={(ready) => {
      document.documentElement.dataset.ready = String(ready);
    }}
  />,
);
