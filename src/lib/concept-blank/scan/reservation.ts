import "server-only";
import sharp from "sharp";
import { STUDIO_AI_IMAGE_BUDGET } from "@/lib/studio-ai/limits";
import { scanTokenCostNanoUsd, type ScanPricedModel } from "./usage";

export const SCAN_MAX_OUTPUT_TOKENS = 16_000;
// Policy allowance for the single-user-message envelope/control tokens. No tools,
// system prompt, history, schema, URL/file images or provider fallback are sent.
export const SCAN_FRAMING_TOKENS = 1024;

/** 2026-11-25 official rule: ceil(width/28) * ceil(height/28) visual tokens.
 * https://platform.claude.com/docs/en/build-with-claude/vision#resolution-and-token-cost
 * https://platform.claude.com/docs/en/build-with-claude/vision-coordinates#how-claude-resizes-and-pads-images
 * Use the decoded dimensions of the EXACT uploaded bytes, including patch padding.
 * We deliberately do not take the provider's downsize discount: downsizing can only
 * reduce this bound. Text uses UTF-8 bytes (at least one byte/token), not a measured
 * mean or chars/4. Any new input block/adapter expansion must update this bound.
 */
export async function scanReservation(
  model: ScanPricedModel,
  request: { prompt: string; imageDataUrl?: string },
) {
  if (typeof request.prompt !== "string")
    throw new RangeError("글의 사용량 상계를 구할 수 없습니다.");
  const textBytes = Buffer.byteLength(request.prompt, "utf8");
  let imageTokens = 0;
  let image: { width: number; height: number } | undefined;
  if (request.imageDataUrl !== undefined) {
    if (request.imageDataUrl.length > STUDIO_AI_IMAGE_BUDGET)
      throw new RangeError("사진의 사용량 상계를 구할 수 없습니다.");
    const match =
      /^data:image\/(png|jpeg|webp);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(
        request.imageDataUrl,
      );
    if (!match?.[2])
      throw new RangeError("사진의 사용량 상계를 구할 수 없습니다.");
    const meta = await sharp(Buffer.from(match[2], "base64"), {
      limitInputPixels: 16_000_000,
    }).metadata();
    if (
      !meta.width ||
      !meta.height ||
      meta.format !== match[1] ||
      (meta.pages ?? 1) !== 1
    )
      throw new RangeError("사진의 사용량 상계를 구할 수 없습니다.");
    image = { width: meta.width, height: meta.height };
    imageTokens = Math.ceil(meta.width / 28) * Math.ceil(meta.height / 28);
  }
  const inputTokens = textBytes + imageTokens + SCAN_FRAMING_TOKENS;
  if (
    !Number.isSafeInteger(inputTokens) ||
    inputTokens + SCAN_MAX_OUTPUT_TOKENS > 1_000_000
  )
    throw new RangeError("요청의 사용량 상계를 구할 수 없습니다.");
  return {
    textBytes,
    imageTokens,
    framingTokens: SCAN_FRAMING_TOKENS,
    image,
    inputTokens,
    outputTokens: SCAN_MAX_OUTPUT_TOKENS,
    reservedNanoUsd: scanTokenCostNanoUsd(model, {
      inputTokens,
      outputTokens: SCAN_MAX_OUTPUT_TOKENS,
      cachedInputTokens: 0,
      cacheCreationInputTokens: 0,
    }),
  };
}
