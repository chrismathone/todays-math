import { fadingSafeLabel } from "@/lib/fading/cards";
import { studentCurriculumName } from "./labels";
import type { FadingTarget } from "@/lib/fading/concepts";
/** Only safe display names, never a hidden title's identifier. */
export function studentSessionLocation(
  section: string,
  targets: readonly Pick<FadingTarget, "text">[] = [],
) {
  return section
    .split("::")
    .flatMap((part) => {
      const name = studentCurriculumName(part);
      return name &&
        !/^(?:\d+(?:[-.]\d+)*|상|중|하|개념\s*\d+(?:\/\d+)?)$/.test(name) &&
        fadingSafeLabel(name, targets)
        ? [name]
        : [];
    })
    .join(" · ");
}
