import { notFound } from "next/navigation";
import { connection } from "next/server";
import { fadingCatalog } from "@/lib/fading/catalog";
import { buildTeacherWireFixture } from "@/components/fading/teacher/fixture";
import { TeacherWireGallery } from "@/components/fading/teacher/TeacherWireGallery";
import {
  TEACHER_WIRE_VARIANTS,
  type TeacherWireVariant,
} from "@/components/fading/teacher/wireKey";

/** 교사 구조 선택용. API·DB를 호출하지 않고, 이름·상태로 줄인 표본만 클라이언트에 보낸다. */
export default async function FadingTeacherWirePage({
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
  const only = TEACHER_WIRE_VARIANTS.includes(variant as TeacherWireVariant)
    ? (variant as TeacherWireVariant)
    : undefined;
  const fixture = buildTeacherWireFixture(fadingCatalog());
  const classIndex = Number(value("class"));
  const initialClass =
    value("class") === undefined
      ? undefined
      : fixture.dashboard.classes[classIndex]?.id;
  return (
    <TeacherWireGallery
      fixture={fixture}
      only={only}
      initialClass={initialClass}
    />
  );
}
