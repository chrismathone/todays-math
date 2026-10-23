import type {
  WorkbookAddress,
  WorkbookMetadata,
  WorkbookMark,
} from "@/contracts/commercialWorkbook.contract";

export function addressLabel(address: WorkbookAddress) {
  return [
    address.volume,
    address.section,
    `${address.page}쪽`,
    `${address.number}번`,
    address.subpart,
  ]
    .filter(Boolean)
    .join(" · ");
}
export function editionLabel(metadata: WorkbookMetadata) {
  return [
    metadata.publisher || "출판사 미기록",
    metadata.edition || "판본 미기록",
    metadata.grade,
  ]
    .filter(Boolean)
    .join(" · ");
}
export const markLabels: Record<WorkbookMark, string> = {
  correct: "정답",
  wrong: "오답",
  unattempted: "안 풀었음",
};
export function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "처리하지 못했습니다. 입력을 유지했으니 다시 시도해 주세요.";
}
export function isConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "STALE_REVISION"
  );
}
/** Keep the same request ID for an uncertain network retry of the same payload. */
export function requestIdentity() {
  let previous = "";
  let id = "";
  return (body: unknown) => {
    const next = JSON.stringify(body);
    if (next !== previous || !id) {
      previous = next;
      id = crypto.randomUUID();
    }
    return id;
  };
}
