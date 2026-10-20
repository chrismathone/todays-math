import React from "react";
import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import SpacingFixture from "@/app/dev/print-spacing/SpacingFixture";
createRoot(document.getElementById("root")!).render(<SpacingFixture />);
