import { notFound } from "next/navigation";
import { connection } from "next/server";
import { fadingCatalog } from "@/lib/fading/catalog";
import { selectFadingSamples } from "@/components/fading/devSamples";
import { buildTeacherWireFixture } from "@/components/fading/teacher/fixture";
import { TeacherHifiGallery } from "@/components/fading/teacher/TeacherHifiGallery";
import {
  TEACHER_HIFI_VARIANTS,
  type TeacherHifiVariant,
} from "@/components/fading/teacher/hifiVariants";
import type { TeacherFixtureState } from "@/components/fading/teacher/fixtureSource";
import { SrsWorkspaceDevClient } from "./SrsWorkspaceDevClient";

/** No API or DB: teacher summaries come from the Wire fixture; content is only for the local preview. */
export default async function FadingTeacherHifiPage({
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
  const value = (key: string) =>
    Array.isArray(params[key]) ? params[key][0] : params[key];
  const variant = value("variant");
  const only = TEACHER_HIFI_VARIANTS.includes(variant as TeacherHifiVariant)
    ? (variant as TeacherHifiVariant)
    : undefined;
  const catalog = fadingCatalog();
  const fixture = buildTeacherWireFixture(catalog);
  const product = value("product");
  if (product === "off" || product === "read" || product === "on")
    return <SrsWorkspaceDevClient fixture={fixture} gate={product} />;
  const { concepts, traps, figures } = selectFadingSamples(catalog);
  const initialClass =
    value("class") === undefined
      ? undefined
      : fixture.dashboard.classes[Number(value("class"))]?.id;
  const state = value("state");
  const initialState = [
    "loading",
    "empty",
    "failure",
    "closed",
    "forbidden",
  ].includes(state ?? "")
    ? (state as TeacherFixtureState)
    : "ready";
  return (
    <TeacherHifiGallery
      fixture={fixture}
      only={only}
      initialClass={initialClass}
      initialState={initialState}
      preview={{ concepts, today: fixture.dashboard.today, traps, figures }}
    />
  );
}
