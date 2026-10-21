import React from "react";
import { createRoot } from "react-dom/client";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import StudentCourseSrs from "@/components/math-srs/StudentCourseSrs";
import type { JourneyThemeId } from "@/lib/math-explorers/journeyThemes";
import "@/app/globals.css";
import "katex/dist/katex.min.css";
import "./fixture.css";
const theme = (new URLSearchParams(location.search).get("theme") ??
  "sea") as JourneyThemeId;
const noop = () => {};
createRoot(document.getElementById("root")!).render(
  <StudentAppShell student={{ name: "로컬 검수" }} preview>
    <StudentCourseSrs
      journeyTheme={theme}
      expedition={{ onExit: noop, onComplete: noop }}
    />
  </StudentAppShell>,
);
