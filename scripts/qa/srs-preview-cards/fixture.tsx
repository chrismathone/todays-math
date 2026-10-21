import React from "react";
import { createRoot } from "react-dom/client";
import StudentCoursePreview from "@/components/math-srs/StudentCoursePreview";
import { previewCardFor } from "@/lib/math-srs/preview";
import {
  JOURNEY_THEMES,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./fixture.css";

const params = new URLSearchParams(location.search);
const card = previewCardFor(params.get("section") ?? "5-2-2-1");
const theme = params.get("theme") ?? "classic";
if (!card || !(theme in JOURNEY_THEMES))
  throw new Error("예습 검증 입력을 확인하세요.");
createRoot(document.getElementById("root")!).render(
  <main>
    <StudentCoursePreview
      card={card}
      journeyTheme={theme as JourneyThemeId}
      busy={false}
      onStart={() => {
        document.body.dataset.started = "true";
      }}
      onExit={() => {
        document.body.dataset.exited = "true";
      }}
    />
  </main>,
);
