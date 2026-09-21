"use client";

import { useState, useSyncExternalStore } from "react";

import { emptySave, loadSave } from "@/lib/lab/progress";
import type { LabSave } from "@/lib/lab/types";

function subscribeNever() {
  return () => {};
}

/**
 * 실험실 진도(localStorage)를 읽는다. 서버 그림과 수화 첫 그림은 빈 기록이고,
 * 브라우저에서는 저장본으로 바뀐다.
 *
 * 예전에는 `useEffect(() => setSave(loadSave()), [])` 였는데 ESLint
 * `react-hooks/set-state-in-effect` 가 막는다. 수화가 끝났는지는 로그인 폼과 같은 수법
 * (`useSyncExternalStore` 의 서버/브라우저 값 차이)으로 알고, 끝난 첫 렌더에서 한 번만
 * 저장본을 state 에 넣는다(렌더 중 조건부 setState — React 가 허용하는 «이전 렌더 정보 저장» 꼴).
 * 이후 기록은 지금처럼 각 화면이 `setSave` 로 들고 있는다.
 */
export function useLabSave() {
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const [save, setSave] = useState<LabSave>(emptySave);
  const [ready, setReady] = useState(false);
  if (hydrated && !ready) {
    setReady(true);
    setSave(loadSave());
  }
  return { save, setSave, ready };
}
