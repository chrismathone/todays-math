import { notFound } from "next/navigation";
import { connection } from "next/server";
import { fadingCatalog } from "@/lib/fading/catalog";
import { selectFadingSamples } from "@/components/fading/devSamples";
import {
  FADING_DEV_SCENES,
  type FadingDevScene,
} from "@/components/fading/devFixtures";
import { FadingDevClient } from "./FadingDevClient";

export default async function FadingDevPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  )
    notFound();
  const params = await searchParams;
  const { samples, concepts, bankSize, traps, figures } =
    selectFadingSamples(fadingCatalog());
  const scene = FADING_DEV_SCENES.includes(params.scene as FadingDevScene)
    ? (params.scene as FadingDevScene)
    : "step2";
  const conceptId =
    typeof params.concept === "string" &&
    concepts.some((c) => c.id === params.concept)
      ? params.concept
      : samples[0]!.id;
  return (
    <FadingDevClient
      concepts={concepts}
      samples={samples}
      bankSize={bankSize}
      traps={traps}
      figures={figures}
      options={{
        scene,
        conceptId,
        preview: params.preview === "1",
        cards: params.cards === "1",
      }}
    />
  );
}
