import {
  parseScanDestination,
  scanDestination,
} from "@/lib/concept-blank/scan/navigation";

/** Only explicitly allowed student destinations survive login. */
export function normalizeStudentReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length > 500) return "/learn";
  if (/^\/q\/[A-Za-z0-9_-]{16,100}$/.test(value)) return value;
  if (value.startsWith("/concept-blank/scan?") && !value.includes("#")) {
    const parsed = parseScanDestination(
      new URLSearchParams(value.slice(value.indexOf("?") + 1)),
    );
    if (parsed) return scanDestination(parsed);
  }
  if (
    /^\/learn\/textbook\/[a-f0-9-]{36}\/concepts\/[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(
      value,
    )
  )
    return value;
  return "/learn";
}

export function studentPasswordHref(value: unknown): string {
  const returnTo = normalizeStudentReturnTo(value);
  return returnTo === "/learn"
    ? "/learn/password"
    : `/learn/password?${new URLSearchParams({ returnTo })}`;
}

export function studentLoginHref(value: unknown): string {
  const returnTo = normalizeStudentReturnTo(value);
  return returnTo === "/learn"
    ? "/learn/login"
    : `/learn/login?${new URLSearchParams({ returnTo })}`;
}

export function studentLoginDestination(
  value: unknown,
  mustChangePassword: boolean,
): string {
  return mustChangePassword
    ? studentPasswordHref(value)
    : normalizeStudentReturnTo(value);
}
