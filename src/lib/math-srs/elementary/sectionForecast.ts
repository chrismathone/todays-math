/**
 * 초등 진도판의 소단원 칸 (D-142) — 원장님 진도 계획 커서 순서 그대로.
 * 탐험 첫 화면(map 판)과 초등 문제은행 끝 화면(full 판)이 같이 부른다(«모든 화면 일치»).
 */
import {
  withGradeStarts,
  type ForecastItem,
} from "@/lib/math-explorers/journeyForecast";
import { COURSE_SECTIONS, getCourseSection } from "./catalog";

/** 칸 하나의 이름 — 제목은 소단원, 부제는 «초4 · 2학기 · 대단원». */
export function sectionLabel(sectionId: string) {
  const section = getCourseSection(sectionId);
  return section
    ? {
        title: section.title,
        subtitle: `초${section.grade} · ${section.semester}학기 · ${section.chapterTitle}`,
      }
    : { title: "수학 복습", subtitle: "초등 복습" };
}

/**
 * `fromSectionId` 부터(오늘 칸이 이미 그 소단원이면 `includeFrom` false 로 그 다음부터) 아직 안 배운 소단원을 `count` 칸.
 * 첫 칸은 복습으로 다시 배우는 날일 수 있어 배운 소단원이어도 남긴다(옛 full 판과 같다).
 */
export function sectionForecast(
  fromSectionId: string,
  completedSectionIds: readonly string[],
  count: number,
  includeFrom = true,
): ForecastItem[] {
  const first = COURSE_SECTIONS.findIndex(
    (section) => section.id === fromSectionId,
  );
  if (first < 0 || count <= 0) return [];
  const list = COURSE_SECTIONS.slice(first)
    .filter((section, index) =>
      index === 0 ? includeFrom : !completedSectionIds.includes(section.id),
    )
    .slice(0, count);
  return withGradeStarts(
    list.map((section) => ({
      grade: section.grade,
      ...sectionLabel(section.id),
    })),
    COURSE_SECTIONS[first].grade,
  );
}

/** 가운데 «소단원 N개 중 M번째» — 그 소단원이 든 대단원 안의 자리. */
export function sectionPosition(sectionId: string) {
  const section = getCourseSection(sectionId);
  if (!section) return null;
  const chapter = COURSE_SECTIONS.filter(
    (item) => item.chapterId === section.chapterId,
  );
  return {
    caption: `소단원 ${chapter.length}개 중`,
    ordinal: chapter.findIndex((item) => item.id === sectionId) + 1,
    title: section.chapterTitle,
    note: section.title,
  };
}
