import type { PrintTemplateProps } from "./types";
import { LegacyPrintHeader } from "./LegacyPrintHeader";
import { T2PrintHeader } from "./T2PrintHeader";

type Props = Pick<
  PrintTemplateProps,
  "page" | "firstPage" | "round" | "totalProblems" | "meta" | "options"
>;

/** A/T2 first pages; unspecified continuation heads retain their current behavior. */
export function PrintHeader(props: Props) {
  return (props.firstPage ?? props.page === 1) ? (
    <T2PrintHeader {...props} />
  ) : (
    <LegacyPrintHeader {...props} />
  );
}
