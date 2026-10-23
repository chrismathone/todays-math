import { WORKBOOK_ERROR_STATUS, type WorkbookErrorCode } from "@/contracts/commercialWorkbook.contract";
export class CommercialWorkbookError extends Error {
  readonly status: number;
  constructor(readonly code: WorkbookErrorCode, message: string, readonly details?: unknown) {
    super(message); this.name = "CommercialWorkbookError";
    this.status = WORKBOOK_ERROR_STATUS[code];
  }
}
export function fail(code: WorkbookErrorCode, message: string): never {
  throw new CommercialWorkbookError(code, message);
}
