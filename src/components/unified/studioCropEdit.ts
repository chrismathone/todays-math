import type { StudioCrop } from "./studioHelpers";

/** Mirror the source editor: discard stale native content, retain its metadata. */
export function applyStudioCropEdit(
  crop: StudioCrop,
  patch: Partial<StudioCrop>,
): StudioCrop {
  const ocr = patch.ocr ?? crop.ocr;
  const bodyChanged =
    patch.content !== undefined && patch.content !== crop.content;
  return {
    ...crop,
    added: false,
    reviewed: false,
    ...patch,
    ...(bodyChanged
      ? {
          ocr: ocr
            ? {
                ...ocr,
                contentEdited: true,
                blocks: [],
                choiceGroups: [],
                subQuestions: [],
              }
            : undefined,
        }
      : {}),
    ...(patch.mode !== undefined ? { modeManual: true } : {}),
    revision: (crop.revision ?? 0) + 1,
  };
}
