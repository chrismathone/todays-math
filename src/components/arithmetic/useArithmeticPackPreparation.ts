"use client";

import { useEffect, useState } from "react";
import {
  arithmeticPackReady,
  type PackRequest,
} from "@/lib/arithmetic-v2/presentation/packAssets";
import { prepareArithmeticPacks } from "@/lib/arithmetic-v2/presentation/preparePacks";

export function useArithmeticPackPreparation(
  requests: readonly PackRequest[],
  preview = false,
) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{
    requests: readonly PackRequest[];
    attempt: number;
    failed: boolean;
  }>();
  const ready = requests.every(arithmeticPackReady);
  useEffect(() => {
    if (ready) return;
    let active = true;
    const finish = (failed: boolean) => {
      if (active) setSettled({ requests, attempt, failed });
    };
    void prepareArithmeticPacks(requests, preview).then(
      () => finish(false),
      () => finish(true),
    );
    return () => {
      active = false;
    };
  }, [attempt, preview, ready, requests]);

  return {
    ready,
    failed:
      settled?.requests === requests &&
      settled.attempt === attempt &&
      settled.failed,
    retry: () => setAttempt((value) => value + 1),
  };
}
