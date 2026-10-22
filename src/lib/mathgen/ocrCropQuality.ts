/** Pixel evidence is a warning, never evidence of semantic source completeness.
 * Do not grow a model box: unassigned ink may be a neighboring question/key.
 */
export async function pageCropWarnings(
  imageDataUrl: string,
  boxes: { left: number; top: number; width: number; height: number }[],
): Promise<string[]> {
  const uncertain =
    "크롭의 원본 잉크 범위를 확인하지 못했습니다. 원본과 영역을 확인해 주세요.";
  try {
    const match =
      /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        imageDataUrl,
      );
    if (!match) return [uncertain];
    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(Buffer.from(match[1], "base64"), {
      limitInputPixels: 40_000_000,
    })
      .flatten({ background: "white" })
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const coverage = new Uint8Array(info.width * info.height);
    const ranges = boxes.map((box) => ({
      left: Math.floor((box.left * info.width) / 1000),
      right: Math.ceil(((box.left + box.width) * info.width) / 1000),
      top: Math.floor((box.top * info.height) / 1000),
      bottom: Math.ceil(((box.top + box.height) * info.height) / 1000),
    }));
    for (const box of ranges)
      for (let y = box.top; y < box.bottom; y++)
        for (let x = box.left; x < box.right; x++)
          coverage[y * info.width + x]++;
    let outside = false,
      overlap = false,
      edge = false;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        if (data[y * info.width + x] >= 128) continue;
        const count = coverage[y * info.width + x];
        if (!count) outside = true;
        if (count > 1) overlap = true;
      }
    for (const box of ranges)
      for (let y = box.top; y < box.bottom; y++)
        for (let x = box.left; x < box.right; x++)
          if (
            (x === box.left ||
              x === box.right - 1 ||
              y === box.top ||
              y === box.bottom - 1) &&
            data[y * info.width + x] < 128
          )
            edge = true;
    return [
      ...(edge
        ? [
            "크롭 경계에 원본 잉크가 닿아 있습니다. 잘린 글자·보기·답란이 없는지 확인해 주세요.",
          ]
        : []),
      ...(outside
        ? [
            "크롭 밖에 원본 잉크가 남아 있습니다. 빠진 보기·인쇄된 답란인지 머리말·정답표인지 원본에서 확인해 주세요. 영역을 자동으로 넓히지 않았습니다.",
          ]
        : []),
      ...(overlap
        ? [
            "크롭들이 같은 원본 잉크를 포함합니다. 이웃 문항이 섞이지 않았는지 확인해 주세요.",
          ]
        : []),
      // Even full ink coverage cannot identify an answer key swallowed by one box.
      ...(boxes.length
        ? [
            "크롭은 자동 인식한 후보입니다. 각 영역에 해당 문항의 모든 보기·인쇄된 답란이 있고 이웃 문항·정답표가 없는지 원본에서 확인해 주세요.",
          ]
        : []),
    ];
  } catch {
    return [uncertain];
  }
}
