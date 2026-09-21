import type { StudioCrop } from "./studioHelpers";

/**
 * Mirror the source editor: discard stale native content, retain its metadata.
 *
 * 판 번호(`revision`)는 **내용을 바꾸는 고침**만 올린다 — 시험지의 담은 판과 견줘 «고친 뒤 반영 전»을
 * 가르는 값이다(`studioCart.ts`). 검수 완료·취소는 내용이 아니라 상태라 판을 그대로 둔다.
 * 전에는 어떤 고침이든 `added:false` 로 둬서 검수 완료만 눌러도 «담음»이 풀렸다(트랙 41 어긋남 3).
 */
export function applyStudioCropEdit(
  crop: StudioCrop,
  patch: Partial<StudioCrop>,
): StudioCrop {
  if (studioCropStatusOnly(patch)) return { ...crop, reviewed: patch.reviewed };
  const ocr = patch.ocr ?? crop.ocr;
  const bodyChanged =
    patch.content !== undefined && patch.content !== crop.content;
  return {
    ...crop,
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

/** 검수 완료·취소만 담은 고침인가 — 시험지에 실리는 내용은 그대로다. */
export function studioCropStatusOnly(patch: Partial<StudioCrop>) {
  const keys = Object.keys(patch);
  return keys.length > 0 && keys.every((key) => key === "reviewed");
}
