import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
for (const s of COURSE_SECTIONS.filter(
  (s) => s.grade === 5 && s.semester === 2,
))
  console.log(s.id, s.chapterTitle, "|", s.title);
