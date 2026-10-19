/**
 * 오늘의 영어 — 세트 인쇄 페이지 `/english/sets/{id}/print?view=student|teacher` (D-148 · 25 §5).
 * 학생용은 묶음으로 갈라 하나씩 뽑는다(D-151 · 25 §12.11) — `&bundle=2` 는 처음 고를 묶음, `&merge=1` 은 변형 문항을 합친 채로.
 *
 * 서버 컴포넌트 · **크롬 없음** — `EnglishPrintClient` 하나만 그린다(작업실 CSS 의 `@page { margin: 14mm }` 이
 * 같은 창에 실리면 지면 여백이 뒤바뀐다 — 보고서 english-print §5). 관문은 `accountRouteAccess.ts` 가
 * `/english` → `english-library` 메뉴로 잠그고 페이지에서도 다시 확인한다.
 *
 * 세션 없음 → `/login` · 세트 없음·부모 시험 범위 밖 → 404(`requireOwnedEnglishExam` — 지점 관리자는 지점 전체,
 * 강사는 자기 것 · D-130). 크롬 없는 지면이라 403 화면이 따로 없다 — 범위 밖도 «없다»로 답한다.
 * 학원 이름은 시험 주인의 지점 이름, 지점이 없으면 «오늘의수학»(리드 결정 2026-09-30).
 */
import { notFound, redirect } from "next/navigation";

import {
  EnglishPrintClient,
  parseEnglishPrintBundle,
  parseEnglishPrintMerge,
  parseEnglishPrintView,
} from "@/components/english/print/EnglishPrintClient";
import { idParamSchema } from "@/contracts/common.contract";
import type { EnglishExam } from "@/contracts/english.contract";
import { db } from "@/lib/db";
import { serializeEnglishSet } from "@/lib/english/serialize";
import { requireOwnedEnglishExam } from "@/lib/ownership";
import { getSessionUser } from "@/lib/session";
import { englishRouteAllowed } from "@/lib/accountRouteAccess";

export const metadata = { title: "오늘 영어 · 인쇄" };

/** 지점이 없는 계정(독립 운영)의 지면 머리 학원 이름 — 수학 지면(`TestPrint.tsx`)과 같은 글자 */
export const ENGLISH_PRINT_DEFAULT_ACADEMY = "오늘 수학";

type EnglishSetPrintPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    view?: string | string[];
    bundle?: string | string[];
    merge?: string | string[];
  }>;
};

export default async function EnglishSetPrintPage({
  params,
  searchParams,
}: EnglishSetPrintPageProps) {
  const [session, routeParams, query] = await Promise.all([
    getSessionUser(),
    params,
    searchParams,
  ]);
  if (!session) redirect("/login");
  if (
    !englishRouteAllowed(
      session.menus ?? [],
      "GET",
      `/english/sets/${routeParams.id}/print`,
    )
  )
    notFound();

  const parsed = idParamSchema.safeParse(routeParams);
  if (!parsed.success) notFound();

  const set = await db.englishQuestionSet.findUnique({
    where: { id: parsed.data.id },
  });
  if (!set) notFound();

  // 소유는 부모 시험의 범위로 판정한다(25 §2) — 없음도 범위 밖도 404
  const owned = await requireOwnedEnglishExam(session, set.examId);
  if (!owned.ok) notFound();
  const exam = owned.data;

  const branch = exam.branchId
    ? await db.branch.findUnique({
        where: { id: exam.branchId },
        select: { name: true },
      })
    : null;

  return (
    <EnglishPrintClient
      academyName={branch?.name ?? ENGLISH_PRINT_DEFAULT_ACADEMY}
      exam={{
        school: exam.school,
        // DB CHECK 가 계약 `ENGLISH_GRADES` 안으로 잠근다(`serializeEnglishExam` 과 같은 읽기)
        grade: exam.grade as EnglishExam["grade"],
        title: exam.title,
      }}
      initialBundle={parseEnglishPrintBundle(query.bundle)}
      initialMerged={parseEnglishPrintMerge(query.merge)}
      initialView={parseEnglishPrintView(query.view)}
      set={serializeEnglishSet(set)}
    />
  );
}
