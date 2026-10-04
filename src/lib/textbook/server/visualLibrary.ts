import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  textbookAssetSchema,
  type AssetRef,
} from "@/contracts/textbookExchange.contract";
import { readImageDimensions } from "@/lib/printImageDimensions";
import { assertAssetMime } from "../assets";
import {
  resolveTextbookCast,
  type TextbookCharacter,
  type TextbookCastSelection,
} from "../characters";
import { sha256 } from "../hash.server";
import { getRestStory, type RestStory, type RestStoryId } from "../restStories";
import type { FrozenAsset } from "../snapshotFromProblem";
import {
  IMAGE_ASSET_MAX_BYTES,
  linkEditionAssets,
  putAsset,
  type AssetKind,
} from "./blobs";
import { invalid } from "./errors";
import { assetPackagePath } from "./exchange";
import type { TextbookSql } from "./sql";

export interface FrozenTextbookCharacter extends TextbookCharacter {
  speakerId: string;
  portraitAssetId: string;
}

export interface FrozenTextbookVisualLibrary {
  assets: AssetRef[];
  cast: {
    teacher: FrozenTextbookCharacter;
    student1: FrozenTextbookCharacter;
    student2: FrozenTextbookCharacter;
  };
  stories: Partial<
    Record<RestStoryId, { story: RestStory; imageAssetId: string }>
  >;
}

export interface FreezeTextbookVisualLibraryInput {
  userId: string;
  editionId: string;
  cast?: Partial<TextbookCastSelection>;
  storyIds?: readonly RestStoryId[];
}

/** Server dependency for tests/packaged deployments; callers cannot provide arbitrary source paths. */
export type TextbookVisualAssetLoader = (
  allowlistedSrc: string,
) => Promise<Uint8Array>;

async function readBundledVisualAsset(src: string): Promise<Uint8Array> {
  return new Uint8Array(
    await readFile(path.join(process.cwd(), "public", src.slice(1))),
  );
}

/**
 * Use the enclosing book-creation transaction: blobs, ownership handles, edition links and manuscript
 * then commit or roll back together. All files are validated before the first SQL write.
 * The content ID describes the untouched original PNG, not a cropped expression or public URL.
 */
export async function freezeTextbookVisualLibrary(
  tx: TextbookSql,
  input: FreezeTextbookVisualLibraryInput,
  loadAsset: TextbookVisualAssetLoader = readBundledVisualAsset,
): Promise<FrozenTextbookVisualLibrary> {
  let cast;
  try {
    cast = resolveTextbookCast(input.cast);
  } catch {
    throw invalid("교재 등장인물 선택이 올바르지 않습니다.");
  }
  const stories = [...new Set(input.storyIds ?? [])].map((id) => {
    const story = getRestStory(id);
    if (!story) throw invalid("쉬어가기 이야기 선택이 올바르지 않습니다.");
    return story;
  });
  const identities = [
    ...new Map(
      Object.values(cast).map((character) => [character.id, character]),
    ).values(),
  ];
  const sources = [
    ...identities.map((character) => ({
      id: character.id,
      src: character.src,
      kind: "portrait" as const,
    })),
    ...stories.map((story) => ({
      id: story.id,
      src: story.imageSrc,
      kind: "image" as const,
    })),
  ];
  const frozen: {
    id: string;
    kind: AssetKind;
    asset: FrozenAsset;
    ref: AssetRef;
  }[] = [];
  for (const source of sources) {
    let bytes: Uint8Array;
    try {
      // Own a copy so a loader cannot mutate bytes between hashing and storage.
      bytes = new Uint8Array(await loadAsset(source.src));
    } catch {
      throw invalid(`교재 기본 그림을 읽을 수 없습니다: ${source.id}`);
    }
    if (bytes.byteLength < 33 || bytes.byteLength > IMAGE_ASSET_MAX_BYTES)
      throw invalid(`교재 기본 그림의 크기가 올바르지 않습니다: ${source.id}`);
    try {
      assertAssetMime(bytes, "image/png");
    } catch {
      throw invalid(`교재 기본 그림은 PNG여야 합니다: ${source.id}`);
    }
    const dimensions = readImageDimensions(Buffer.from(bytes));
    if (
      !dimensions ||
      (source.kind === "portrait" &&
        (dimensions.width !== dimensions.height || dimensions.width < 2))
    )
      throw invalid(`교재 기본 그림의 치수가 올바르지 않습니다: ${source.id}`);
    const assetId = sha256(bytes);
    const ref = textbookAssetSchema.parse({
      assetId,
      packagePath: assetPackagePath(assetId, "image/png"),
      sha256: assetId,
      mimeType: "image/png",
      widthPx: dimensions.width,
      heightPx: dimensions.height,
    });
    frozen.push({
      id: source.id,
      kind: source.kind,
      ref,
      asset: {
        assetId,
        mimeType: "image/png",
        name: source.src.split("/").at(-1)!,
        widthPx: dimensions.width,
        heightPx: dimensions.height,
        bytes,
      },
    });
  }
  const byIdentity = new Map(frozen.map((entry) => [entry.id, entry]));
  const uniqueAssets = [
    ...new Map(frozen.map((entry) => [entry.asset.assetId, entry])).values(),
  ];
  for (const entry of uniqueAssets)
    await putAsset(tx, input.userId, entry.asset, entry.kind);
  await linkEditionAssets(
    tx,
    input.editionId,
    input.userId,
    uniqueAssets.map((entry) => entry.asset.assetId),
  );
  const character = (selected: TextbookCharacter): FrozenTextbookCharacter => ({
    ...selected,
    speakerId: `tb-portrait-${selected.id}`,
    portraitAssetId: byIdentity.get(selected.id)!.asset.assetId,
  });
  return {
    assets: uniqueAssets.map((entry) => entry.ref),
    cast: {
      teacher: character(cast.teacher),
      student1: character(cast.student1),
      student2: character(cast.student2),
    },
    stories: Object.fromEntries(
      stories.map((story) => [
        story.id,
        { story, imageAssetId: byIdentity.get(story.id)!.asset.assetId },
      ]),
    ),
  };
}
