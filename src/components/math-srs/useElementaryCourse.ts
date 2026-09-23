"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  COURSE_STORAGE_KEY,
  loadCourseStore,
  saveCourseStore,
} from "@/lib/math-srs/elementary/storage";
import { createCourseLearner } from "@/lib/math-srs/elementary/progress";
import type {
  CourseLearnerState,
  CourseStore,
} from "@/lib/math-srs/elementary/types";

const subscribe = () => () => {};
export function useElementaryCourse(learnerId: string) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [store, setStore] = useState<CourseStore>({ version: 1, learners: {} });
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const unsaved = useRef(false);
  if (hydrated && !ready) {
    const loaded = loadCourseStore();
    setStore(loaded.store);
    setWarning(loaded.warning);
    setReady(true);
  }
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== COURSE_STORAGE_KEY && event.key !== null) return;
      if (unsaved.current) return;
      const loaded = loadCourseStore();
      setStore(loaded.store);
      setWarning(loaded.warning);
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function persist(
    change: (current: CourseLearnerState) => CourseLearnerState,
  ) {
    try {
      const disk = loadCourseStore();
      const current = disk.warning || unsaved.current ? store : disk.store;
      const next = {
        ...current,
        learners: {
          ...current.learners,
          [learnerId]: change(
            current.learners[learnerId] ?? createCourseLearner(),
          ),
        },
      };
      const saved = saveCourseStore(next);
      unsaved.current = !saved.ok;
      setStore(next);
      setWarning(saved.warning);
      return true;
    } catch (error) {
      setWarning(
        error instanceof Error
          ? error.message
          : "기록을 저장하지 못했어요. 다시 시도해 주세요.",
      );
      return false;
    }
  }
  return {
    state: store.learners[learnerId] ?? createCourseLearner(),
    ready,
    warning,
    persist,
  };
}
