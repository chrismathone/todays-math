import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import StudentMathExplorers from "../../../src/components/math-explorers/StudentMathExplorers";
import { StudentMobileNav } from "../../../src/components/learn/StudentMobileNav";
import { LearningMotionScope } from "../../../src/components/math-srs/LearningMotion";
import { isJourneyThemeId } from "../../../src/lib/math-explorers/journeyThemes";
import learn from "../../../src/components/learn/learn.module.css";
import "../../../src/app/globals.css";
import "katex/dist/katex.min.css";

const MobilePractice = lazy(
  () =>
    import("../../../src/app/dev/mobile-practice-qa/MobilePracticeQaClient"),
);
const Journey = lazy(
  () => import("../../../src/app/dev/daily-journey-qa/DailyJourneyQaClient"),
);
const MiddlePractice = lazy(async () => {
  const { StudentMathSrs } =
    await import("../../../src/components/math-srs/StudentMathSrs");
  return { default: StudentMathSrs };
});

function Fixture() {
  const query = new URLSearchParams(location.search);
  let content = <StudentMathExplorers />;
  let previewPath = "/learn/math-explorers";
  if (location.pathname === "/dev/mobile-practice-qa") {
    content = (
      <LearningMotionScope>
        <MobilePractice kind={query.get("kind") ?? "choice"} />
      </LearningMotionScope>
    );
    previewPath = "/learn/math-srs";
  } else if (location.pathname === "/dev/mobile-middle-review-qa") {
    content = (
      <LearningMotionScope>
        <MiddlePractice />
      </LearningMotionScope>
    );
    previewPath = "/learn/math-srs/algebra";
  } else if (location.pathname === "/dev/daily-journey-qa") {
    const theme = query.get("theme");
    const rawDays = Number(query.get("days") ?? 3);
    const days = Number.isFinite(rawDays)
      ? Math.min(60, Math.max(0, Math.floor(rawDays)))
      : 3;
    const rawSet = query.get("set");
    content = (
      <LearningMotionScope>
        <Journey
          days={days}
          set={rawSet === "elementary" || rawSet === "all" ? rawSet : "middle"}
          variant={query.get("variant") === "map" ? "map" : "full"}
          part={
            [1, 2, 3, 4].includes(Number(query.get("part")))
              ? Number(query.get("part"))
              : 0
          }
          theme={isJourneyThemeId(theme) ? theme : "classic"}
        />
      </LearningMotionScope>
    );
    previewPath = "/learn/math-srs";
  }
  return (
    <div className={learn.page}>
      <Suspense fallback={<p role="status">검증 화면을 불러오고 있어요.</p>}>
        {content}
      </Suspense>
      <StudentMobileNav previewPath={previewPath} />
    </div>
  );
}

// Real student components and existing QA fixtures; no live API or database.
createRoot(document.getElementById("root")!).render(<Fixture />);
