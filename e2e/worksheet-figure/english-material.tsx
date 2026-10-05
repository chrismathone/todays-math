import { createRoot } from "react-dom/client";
import EnglishPrepView from "../../src/components/english/EnglishPrepView";
import type { EnglishExam } from "../../src/contracts/english.contract";
import "../../src/app/globals.css";

const noop = () => {};
const exam: EnglishExam = {
  id: "71000000-0000-4000-8000-000000000001",
  school: "검수 학교",
  grade: "중3",
  title: "검수 시험",
  examDate: null,
  types: [],
  materialCount: 0,
  setCount: 0,
  reviewedCount: 0,
  createdAt: "2026-10-05T00:00:00.000Z",
  updatedAt: "2026-10-05T00:00:00.000Z",
};
createRoot(document.getElementById("root")!).render(
  <EnglishPrepView
    exam={exam}
    exams={[exam]}
    onSelectExam={noop}
    onNewExam={noop}
    materials={{ status: "ready", data: [] }}
    sets={{ status: "ready", data: [] }}
    onRetryMaterials={noop}
    onRetrySets={noop}
    onMaterialAdded={noop}
    onMaterialRemoved={noop}
    onExamChange={noop}
    onExamDeleted={noop}
    onOpenSet={noop}
    onNavigate={noop}
  />,
);
