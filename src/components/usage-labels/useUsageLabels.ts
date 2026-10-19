"use client";

import { useEffect, useState } from "react";
import { uuidSchema } from "@/contracts/common.contract";
import {
  usageLabelsResponseSchema,
  type UsageLabelsResponse,
  type UsageArithmeticTypeRequest,
} from "@/contracts/usageLabels.contract";
import { arithmeticUsageTypeKey } from "@/lib/usageLabels/typeKey";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";

/** One request per visible batch; refreshes never write usage events. */
export function useUsageLabels({
  identity,
  problemIds = [],
  arithmeticTypes = [],
  arithmeticV2TypeIds = [],
  enabled = true,
  refreshKey = "",
}: {
  identity?: "question";
  problemIds?: string[];
  arithmeticTypes?: UsageArithmeticTypeRequest[];
  arithmeticV2TypeIds?: string[];
  enabled?: boolean;
  refreshKey?: string;
}) {
  const ids = [
    ...new Set(problemIds.filter((id) => uuidSchema.safeParse(id).success)),
  ].sort();
  const types = [
    ...new Map(
      arithmeticTypes.map((item) => [arithmeticUsageTypeKey(item), item]),
    ).entries(),
  ]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => item);
  const body = JSON.stringify({
    ...(identity ? { identity } : {}),
    problemIds: ids,
    arithmeticTypes: types,
    ...(arithmeticV2TypeIds.length
      ? { arithmeticV2TypeIds: [...new Set(arithmeticV2TypeIds)].sort() }
      : {}),
    period: "30d",
  });
  const endpoint = `${getStudioEndpoints().problems}/labels`;
  const key = `${endpoint}\n${refreshKey}\n${body}`;
  const [result, setResult] = useState<{
    key: string;
    data?: UsageLabelsResponse[];
    error?: boolean;
  }>();
  useEffect(() => {
    if (!enabled) return;
    const request = JSON.parse(body) as {
      identity?: "question";
      problemIds: string[];
      arithmeticTypes: UsageArithmeticTypeRequest[];
      arithmeticV2TypeIds?: string[];
      period: "30d";
    };
    if (
      !request.problemIds.length &&
      !request.arithmeticTypes.length &&
      !request.arithmeticV2TypeIds?.length
    )
      return;
    const controller = new AbortController();
    const batches = Math.ceil(
      Math.max(
        request.problemIds.length,
        request.arithmeticTypes.length,
        request.arithmeticV2TypeIds?.length ?? 0,
      ) / 100,
    );
    void Promise.all(
      Array.from({ length: batches }, async (_, index) => {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            period: request.period,
            ...(request.identity ? { identity: request.identity } : {}),
            problemIds: request.problemIds.slice(
              index * 100,
              (index + 1) * 100,
            ),
            arithmeticTypes: request.arithmeticTypes.slice(
              index * 100,
              (index + 1) * 100,
            ),
            ...(request.arithmeticV2TypeIds?.length
              ? {
                  arithmeticV2TypeIds: request.arithmeticV2TypeIds.slice(
                    index * 100,
                    (index + 1) * 100,
                  ),
                }
              : {}),
          }),
        });
        if (!response.ok) throw new Error("usage-labels-unavailable");
        return usageLabelsResponseSchema.parse(await response.json());
      }),
    )
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, error: true });
      });
    return () => controller.abort();
  }, [body, enabled, endpoint, key]);
  const current = enabled && result?.key === key ? result : undefined;
  const period = current?.data?.[0]?.period;
  return {
    problems: new Map(
      current?.data?.flatMap((batch) =>
        batch.problems.map((item) => [item.problemId, item] as const),
      ),
    ),
    arithmeticTypes: new Map(
      current?.data?.flatMap((batch) =>
        batch.arithmeticTypes.map((item) => [item.typeKey, item] as const),
      ),
    ),
    period,
    arithmeticV2Types: new Map(
      current?.data?.flatMap((batch) =>
        (batch.arithmeticV2Types ?? []).map(
          (item) => [item.typeId, item] as const,
        ),
      ),
    ),
    note: period
      ? `${period.note} 기준 ${new Date(period.to).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (한국 시간)`
      : undefined,
    unavailable: Boolean(
      current?.error ||
      current?.data?.some((batch) =>
        [
          ...batch.problems,
          ...batch.arithmeticTypes,
          ...(batch.arithmeticV2Types ?? []),
        ].some((item) => item.state === "unavailable"),
      ),
    ),
  };
}
