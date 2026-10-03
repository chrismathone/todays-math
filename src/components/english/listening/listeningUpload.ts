import type {
  ListeningMediaCompletion,
  ListeningMediaUploadReceipt,
} from "@/contracts/englishListeningMedia.contract";
import type { ListeningAudioRef } from "@/contracts/englishListening.contract";
import {
  LISTENING_API,
  listeningRequest,
  readListeningResponse,
  ListeningRequestError,
} from "./listeningClient";

export const MAX_LISTENING_UPLOAD_BYTES = 16 * 1024 * 1024;
const MAX_CHUNK_BYTES = 1024 * 1024;
async function sha256(bytes: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Hash allocation is capped at 16MiB; transmission holds only one <=1MiB chunk. */
export async function uploadListeningAudio(
  setId: string,
  file: File,
  signal: AbortSignal,
  onProgress: (message: string) => void,
): Promise<ListeningAudioRef> {
  if (
    !file.size ||
    file.size > MAX_LISTENING_UPLOAD_BYTES ||
    !/\.(mp3|wav)$/i.test(file.name)
  ) {
    throw new ListeningRequestError(
      "16MB 이하의 MP3 또는 WAV 파일을 선택하세요.",
      400,
      "file_limit",
    );
  }
  signal.throwIfAborted();
  onProgress("음원 파일을 확인하는 중입니다.");
  const expectedSha256 = await sha256(await file.arrayBuffer());
  signal.throwIfAborted();
  const base = `/sets/${encodeURIComponent(setId)}/media`;
  let receipt = await listeningRequest<ListeningMediaUploadReceipt>(
    base,
    signal,
    "POST",
    {
      totalBytes: file.size,
      mimeType: /\.mp3$/i.test(file.name) ? "audio/mpeg" : "audio/wav",
      expectedSha256,
    },
  );
  if (
    !Number.isInteger(receipt.chunkBytes) ||
    receipt.chunkBytes <= 0 ||
    !receipt.assetId ||
    receipt.receivedBytes !== 0
  ) {
    throw new ListeningRequestError(
      "음원 업로드 응답을 확인하지 못했습니다.",
      502,
      "invalid_upload_receipt",
    );
  }
  const assetPath = `${base}/${encodeURIComponent(receipt.assetId)}`;
  const chunkSize = Math.min(receipt.chunkBytes, MAX_CHUNK_BYTES);
  for (let offset = 0; offset < file.size;) {
    signal.throwIfAborted();
    const bytes = await file.slice(offset, offset + chunkSize).arrayBuffer();
    const query = new URLSearchParams({
      expectedRevision: String(receipt.revision),
      offset: String(offset),
      byteLength: String(bytes.byteLength),
      sha256: await sha256(bytes),
    });
    const response = await fetch(
      `${LISTENING_API}${assetPath}/chunks?${query}`,
      {
        method: "POST",
        signal,
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/octet-stream" },
        body: bytes,
      },
    );
    const next =
      await readListeningResponse<ListeningMediaUploadReceipt>(response);
    if (
      next.assetId !== receipt.assetId ||
      next.receivedBytes !== offset + bytes.byteLength ||
      next.revision <= receipt.revision
    ) {
      throw new ListeningRequestError(
        "음원 전송 결과를 확인하지 못했습니다. 다시 올려 주세요.",
        502,
        "invalid_upload_receipt",
      );
    }
    receipt = next;
    offset = next.receivedBytes;
    onProgress(`음원 올리는 중 · ${Math.round((offset / file.size) * 100)}%`);
  }
  onProgress("음원을 재생할 수 있는지 확인하는 중입니다.");
  const complete = await listeningRequest<ListeningMediaCompletion>(
    `${assetPath}/complete`,
    signal,
    "POST",
    { expectedRevision: receipt.revision },
  );
  if (
    complete.state !== "ready" ||
    !complete.publishable ||
    complete.assetId !== receipt.assetId ||
    !/^[a-f0-9]{64}$/.test(complete.sha256) ||
    !Number.isSafeInteger(complete.durationMs) ||
    complete.durationMs <= 0
  ) {
    throw new ListeningRequestError(
      "재생 가능한 음원을 만들지 못했습니다. 파일 형식과 10분 이내 길이를 확인해 주세요.",
      422,
      "audio_not_ready",
    );
  }
  return {
    assetId: complete.assetId,
    sha256: complete.sha256,
    durationMs: complete.durationMs,
  };
}
