import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import {
  listeningSourceTranscriptsResponseSchema,
  listeningSourceTranscriptTimingQualitySchema,
  type ListeningSourceTranscriptSegment,
} from "@/contracts/englishListeningTranscript.contract";
import { ownedSet, type ListeningTx } from "./database";

/** Shared by lazy reads and bank EXISTS searches. Aliases s/g/a/t are server constants.
 * Both the current document and the durable verified completion must identify the same
 * whole original. Checking only the provider job or an asset ID would serve stale text.
 */
export function currentSourceTranscriptPredicate() {
  return Prisma.sql`
    s.deleted_at IS NULL
    AND t.set_id=s.id AND t.owner_id=s.owner_id
    AND a."setId"=s.id AND a."ownerId"=s.owner_id
    AND a."branchId" IS NOT DISTINCT FROM s.branch_id
    AND t.asset_id=a."assetId" AND a."assetId"::text=g->'audio'->>'assetId'
    AND a.state='ready' AND a.record->>'state'='ready'
    AND a.record->>'assetId'=a."assetId"::text
    AND a.record->>'setId'=s.id::text AND a.record->>'ownerId'=s.owner_id::text
    AND (a.record->>'branchId') IS NOT DISTINCT FROM s.branch_id::text
    AND NOT (a.record ? 'sourceClip')
    AND a.record->'completion'->>'state'='ready'
    AND a.record->'completion'->'publishable'='true'::jsonb
    AND jsonb_typeof(a.record->'completion'->'verifiedAt')='number'
    AND a.record->'completion'->>'assetId'=a."assetId"::text
    AND a.record->'completion'->>'setId'=s.id::text
    AND a.record->'completion'->>'ownerId'=s.owner_id::text
    AND (a.record->'completion'->>'branchId') IS NOT DISTINCT FROM s.branch_id::text
    AND t.source_audio_sha256=a.record->>'expectedSha256'
    AND t.source_audio_sha256=COALESCE(a.record->'completion'->>'originalSha256',a.record->>'expectedSha256')
    AND t.playback_sha256=a.record->'playback'->>'sha256'
    AND t.playback_sha256=a.record->'completion'->>'sha256'
    AND t.playback_sha256=g->'audio'->>'sha256'
    AND t.duration_ms::text=a.record->'completion'->>'durationMs'
    AND t.duration_ms::text=g->'audio'->>'durationMs'
    AND t.provider='assemblyai' AND t.review_status='ai_unreviewed'
  `;
}

const wordSchema = z.object({
  text: z.string().min(1),
  start: z.number().int(),
  end: z.number().int(),
});
type SourceWord = z.infer<typeof wordSchema>;
const validInterval = (word: SourceWord, durationMs: number) =>
  word.start >= 0 && word.start < word.end && word.end <= durationMs;
/** Only group unchanged contiguous provider words within the certified whole audio.
 * Invalid intervals split runs, without clamping, shifting, translation, or new speech.
 * The raw words in storage are never modified.
 */
export function sourceTranscriptSegments(
  rawWords: unknown,
  durationMs: number,
): ListeningSourceTranscriptSegment[] {
  const parsed = z.array(wordSchema).safeParse(rawWords);
  if (!parsed.success || !parsed.data.length) return [];
  const runs: SourceWord[][] = [];
  let run: SourceWord[] = [];
  for (const word of parsed.data) {
    if (!validInterval(word, durationMs)) {
      if (run.length) runs.push(run);
      run = [];
      continue;
    }
    // Out-of-order provider timing is not repaired or used as a seek target.
    if (run.length && word.start < run[run.length - 1].start) return [];
    run.push(word);
  }
  if (run.length) runs.push(run);
  const segments: ListeningSourceTranscriptSegment[] = [];
  for (const words of runs) {
    let startIndex = 0;
    const append = (endIndex: number) => {
      const paragraph = words.slice(startIndex, endIndex + 1);
      segments.push({
        startMs: paragraph[0].start,
        endMs: Math.max(...paragraph.map((word) => word.end)),
        text: paragraph.map((word) => word.text).join(" "),
      });
      startIndex = endIndex + 1;
    };
    for (let index = 0; index < words.length; index++) {
      const count = index - startIndex + 1;
      const word = words[index];
      const next = words[index + 1];
      if (
        !next ||
        count >= 70 ||
        word.end - words[startIndex].start >= 30000 ||
        next.start - word.end >= 1500 ||
        (count >= 25 && /[.!?。！？]$/.test(word.text))
      )
        append(index);
    }
  }
  return segments;
}

export async function sourceTranscripts(
  tx: ListeningTx,
  account: AccountAccess,
  setId: string,
) {
  // Identical ownership and branch scope to compose-source; never use published/student access.
  const source = await ownedSet(tx, account, setId);
  const rows = await tx.$queryRaw<
    {
      id: string;
      asset_id: string;
      profile: string;
      display_text: string;
      timing_quality: unknown;
      duration_ms: number;
      generated_at: Date;
      words: unknown;
    }[]
  >(Prisma.sql`
    SELECT DISTINCT ON (t.asset_id,t.profile)
      t.id,t.asset_id,t.profile,t.display_text,t.timing_quality,t.duration_ms,t.generated_at,t.words
    FROM english_listening_set s
    CROSS JOIN LATERAL jsonb_array_elements(s.document->'groups') g
    JOIN english_listening_media_asset a ON a."assetId"::text=g->'audio'->>'assetId'
    JOIN english_listening_source_transcript t ON t.asset_id=a."assetId" AND t.set_id=s.id
    WHERE s.id=${setId}::uuid AND s.owner_id=${source.owner_id}::uuid
      AND s.branch_id IS NOT DISTINCT FROM ${source.branch_id}::uuid
      AND ${currentSourceTranscriptPredicate()}
    ORDER BY t.asset_id,t.profile,t.generated_at DESC,t.id DESC
  `);
  return listeningSourceTranscriptsResponseSchema.parse({
    setId,
    items: rows.map((row) => {
      const quality = listeningSourceTranscriptTimingQualitySchema.safeParse(
        row.timing_quality,
      );
      const parsedWords = z.array(wordSchema).safeParse(row.words);
      const excludedWordCount = parsedWords.success
        ? parsedWords.data.filter(
            (word) => !validInterval(word, row.duration_ms),
          ).length
        : 0;
      const durationMatched = quality.success && quality.data.durationMatched;
      return {
        id: row.id,
        assetId: row.asset_id,
        profile: row.profile,
        origin: "ai_transcription",
        reviewStatus: "ai_unreviewed",
        text: row.display_text,
        durationMs: row.duration_ms,
        generatedAt: row.generated_at.toISOString(),
        excludedWordCount,
        timingReviewNeeded:
          !durationMatched || excludedWordCount > 0 || !parsedWords.success,
        segments: durationMatched
          ? sourceTranscriptSegments(row.words, row.duration_ms)
          : [],
      };
    }),
  });
}
