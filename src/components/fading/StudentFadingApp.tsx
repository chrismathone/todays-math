"use client";
import { useCallback, useMemo, useState } from "react";
import type { FadingSourceError } from "@/lib/fading/source";
import { createApiFadingRelearnSource } from "./apiRelearnSource";
import { createApiFadingSource } from "./apiSource";
import { FadingApp } from "./FadingApp";
import { useFadingRelearn } from "./useFadingRelearn";

/**
 * The standalone `/learn/fading` app, pinned to the student who opened it (D1): every request carries that id, and a
 * `STUDENT_CHANGED` reply (another student signed in on this device) closes the app instead of re-reading. The page mounts
 * this with `key={studentId}`, so a different student always gets fresh sources and state. The minute relearn queue (D5) is
 * wired the same way as inside the explorers.
 */
export function StudentFadingApp({ studentId }: { studentId: string }) {
  const [changed, setChanged] = useState(false);
  const source = useMemo(
    () => createApiFadingSource({ studentId }),
    [studentId],
  );
  const relearnSource = useMemo(
    () => createApiFadingRelearnSource({ studentId }),
    [studentId],
  );
  const onAccessFailure = useCallback((failure: FadingSourceError) => {
    if (failure.code === "STUDENT_CHANGED") setChanged(true);
  }, []);
  const relearn = useFadingRelearn(relearnSource, onAccessFailure);
  return (
    <FadingApp
      source={source}
      relearn={relearn}
      onAccessFailure={onAccessFailure}
      studentChanged={changed}
    />
  );
}
