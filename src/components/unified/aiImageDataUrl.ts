/**
 * AI 요청의 그림은 `data:image/(png|jpeg|webp);base64,` 여야 한다(`DevAiRequestSchema` — dev 다리·운영 `/api/studio/ai` 공통).
 * 계정에 저장한 작업을 되살리면 그림이 브라우저 안의 `blob:` 주소가 된다(`privateCloudClient.materialize`) —
 * 그대로 보내면 서버가 400 을 낸다(2026-09-18 «디지털화 전체»의 도형 다시 그리기가 전부 실패). 보내기 직전에 바꾼다.
 * 계정 저장소는 png·jpeg·webp 만 받으므로(`lib/privateAssets.ts`) 되살린 그림은 바이트 그대로 옮기면 된다.
 */
const SENDABLE = /^image\/(?:png|jpeg|webp)$/;

export async function aiImageDataUrl(
  url: string | undefined,
  signal?: AbortSignal,
): Promise<string | undefined> {
  if (!url?.startsWith("blob:")) return url;
  const blob = await (await fetch(url, { signal })).blob();
  if (!SENDABLE.test(blob.type))
    throw new Error(
      "원본 그림 형식을 읽지 못했습니다. 문제를 다시 잘라 주세요.",
    );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type};base64,${btoa(binary)}`;
}
