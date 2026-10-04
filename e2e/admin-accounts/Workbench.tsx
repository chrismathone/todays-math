import { useState } from "react";
import { ClassTable } from "../../src/components/class/ClassTable";
import ConceptUnitTree from "../../src/components/unified/ConceptUnitTree";
import JourneyThemePicker from "../../src/components/math-srs/JourneyThemePicker";
import { hifiUnits } from "../../src/app/dev/concept-hifi/fixture";
import { classes } from "./workbenchFixtures";

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
