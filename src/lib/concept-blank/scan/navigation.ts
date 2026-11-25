import { z } from "zod";

export type ScanDestination = {
  p: string;
  page: number;
  part: "student" | "key";
  submission?: string;
};
export function parseScanDestination(
  params: URLSearchParams,
): ScanDestination | null {
  const keys = [...params.keys()];
  if (
    keys.some((key) => !["p", "page", "part", "submission"].includes(key)) ||
    new Set(keys).size !== keys.length
  )
    return null;
  const id = z.uuid().safeParse(params.get("p")),
    page = params.get("page") ?? "1",
    part = params.get("part") ?? "student",
    submission = params.get("submission");
  if (
    !id.success ||
    !/^\d{1,4}$/.test(page) ||
    Number(page) < 1 ||
    Number(page) > 2000 ||
    (part !== "student" && part !== "key") ||
    (submission !== null && !z.uuid().safeParse(submission).success)
  )
    return null;
  return {
    p: id.data,
    page: Number(page),
    part,
    ...(submission ? { submission } : {}),
  };
}
export function scanDestination(value: ScanDestination) {
  const params = new URLSearchParams({
    p: value.p,
    page: String(value.page),
    part: value.part,
  });
  if (value.submission) params.set("submission", value.submission);
  return `/concept-blank/scan?${params}`;
}
