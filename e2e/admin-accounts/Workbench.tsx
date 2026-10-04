import { useState } from "react";
import { ClassTable } from "../../src/components/class/ClassTable";
import ConceptUnitTree from "../../src/components/unified/ConceptUnitTree";
import JourneyThemePicker from "../../src/components/math-srs/JourneyThemePicker";
import { hifiUnits } from "../../src/app/dev/concept-hifi/fixture";
import type { ClassEntity } from "../../src/contracts/class.contract";
import { DEFAULT_DIFFICULTY_RATIO } from "../../src/contracts/common.contract";

const classes: ClassEntity[] = [
  {
    name: "중등M 중2 JJPS",
    grade: "중2",
    owner: { name: "강예시", mine: true },
  },
  {
    name: "초등M 초5 JJ1A",
    grade: "초5",
    owner: { name: "김예시", mine: false },
  },
].map((row, i) => ({
  ...row,
  id: `30000000-0000-4000-8000-00000000000${i + 1}`,
  userId: "30000000-0000-4000-8000-000000000010",
  defaultProblemCount: 8,
  difficultyRatio: DEFAULT_DIFFICULTY_RATIO,
  createdAt: "2026-10-04T00:00:00.000Z",
  updatedAt: "2026-10-04T00:00:00.000Z",
}));

export default function Workbench() {
  const [classId, setClassId] = useState(classes[0].id);
  const [unitId, setUnitId] = useState<string | null>(null);
  return (
    <main className="grid min-w-0 gap-8 p-4 sm:p-6">
      <section aria-label="수업 관리 필터">
        <ClassTable
          classes={classes}
          selectedClassId={classId}
          onSelect={setClassId}
        />
      </section>
      <JourneyThemePicker />
      <ConceptUnitTree
        units={hifiUnits(true).units}
        selectedUnitId={unitId}
        onSelect={setUnitId}
      />
    </main>
  );
}
