import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";

/** Exam practice follows the five output menus authorized for this feature.
 * The shared textbook output policy remains separate. Legacy export grants none. */
export const EXAM_STUDY_OUTPUT_MENUS = [
  "bank",
  "arithmetic",
  "studio",
  "library",
  "conceptBlank",
] as const satisfies readonly WorkspaceMenu[];

export function canUseExamStudy(menus: readonly WorkspaceMenu[]): boolean {
  return EXAM_STUDY_OUTPUT_MENUS.some((menu) => menus.includes(menu));
}
