import { createRoot } from "react-dom/client";
import { useState } from "react";
import StudentCourseSrs from "../../../src/components/math-srs/StudentCourseSrs";
import CourseDashboard from "../../../src/components/math-srs/CourseDashboard";
import "../../../src/app/globals.css";
import "katex/dist/katex.min.css";

function Fixture() {
  const [completed, setCompleted] = useState(false);
  const key = new URLSearchParams(location.search).get("student") ?? "A";
  if (key === "teacher") return <CourseDashboard />;
  if (completed)
    return <p role="status">검증 학생 {key}의 오늘 학습을 마쳤어요.</p>;
  return (
    <StudentCourseSrs
      expedition={{
        onExit: () =>
          location.assign(new URL("/?student=teacher", location.href).href),
        onComplete: () => setCompleted(true),
      }}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
