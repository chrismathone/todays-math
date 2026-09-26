"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { MathSrsJourney } from "@/contracts/mathSrsJourney.contract";
import type { MathSrsReplayKind } from "@/contracts/mathSrsReplay.contract";
import DailyJourneyBoard from "./DailyJourneyBoard";

const StudentReplayDialog = dynamic(() => import("./StudentReplayDialog"));

export default function StudentJourney({
  journey,
  kind,
  onNext,
  nextLabel,
  busy,
}: {
  journey: MathSrsJourney;
  kind: MathSrsReplayKind;
  onNext?: () => void;
  nextLabel?: string;
  busy?: boolean;
}) {
  const [day, setDay] = useState<MathSrsJourney["days"][number] | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <DailyJourneyBoard
        journey={journey}
        onNext={onNext}
        nextLabel={nextLabel}
        busy={busy}
        onReviewDay={(selected, button) => {
          opener.current = button;
          setDay(selected);
        }}
      />
      {day ? (
        <StudentReplayDialog
          key={`${kind}:${day.id}`}
          kind={kind}
          step={1}
          dayId={day.id}
          dayTitle={day.title}
          total={day.reviewCount}
          onClose={() => {
            setDay(null);
            opener.current?.focus({ preventScroll: true });
          }}
        />
      ) : null}
    </>
  );
}
