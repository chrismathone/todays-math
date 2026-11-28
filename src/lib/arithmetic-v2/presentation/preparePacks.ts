import {
  acceptArithmeticPack,
  arithmeticPackReady,
  ArithmeticPackUnavailable,
  arithmeticPromptPacks,
  packKey,
  type PackRequest,
} from "./packAssets";
import type { ArithmeticOutputSheet } from "@/lib/arithmeticOutput";

export function arithmeticSheetPacks(
  sheet: ArithmeticOutputSheet,
): PackRequest[] {
  return sheet.payloadVersion === 1
    ? []
    : [
        ...new Map(
          sheet.rounds.flatMap((round) =>
            round.items.flatMap(({ prompt, typeId }) =>
              arithmeticPromptPacks(prompt, typeId).map(
                (request) => [packKey(request), request] as const,
              ),
            ),
          ),
        ).values(),
      ];
}

const pending = new Map<string, Promise<void>>();

function preparePack(request: PackRequest, preview: boolean): Promise<void> {
  if (arithmeticPackReady(request)) return Promise.resolve();
  const endpoint = preview
    ? "/dev/arithmetic/packs"
    : "/api/arithmetic/v2/packs";
  const query = new URLSearchParams(request);
  const url = `${endpoint}?${query}`;
  const existing = pending.get(url);
  if (existing) return existing;
  const loading = fetch(url, {
    credentials: "same-origin",
    signal: AbortSignal.timeout(30_000),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.pack !== request.pack || result.family !== request.family)
        throw new Error("Unexpected arithmetic pack family");
      acceptArithmeticPack(request, result.data);
    })
    .catch((cause) => {
      throw new ArithmeticPackUnavailable(request.pack, request.family, cause);
    })
    .finally(() => pending.delete(url));
  pending.set(url, loading);
  return loading;
}

export async function prepareArithmeticPacks(
  requests: readonly PackRequest[],
  preview = false,
) {
  await Promise.all(requests.map((request) => preparePack(request, preview)));
}
