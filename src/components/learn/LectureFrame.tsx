import type { ReactNode } from "react";

import s from "./learn.module.css";

/**
 * 강의 칸의 그림 — **종이 판서 바탕에 제목**(원장님 판 `ConceptUnitPanel` 의 영상 자리와 같은 모양, 브리프 §1.1).
 * 유튜브 썸네일을 끌어오지 않는다(학교 망에서 막히고, 추적 쿠키 없이 그릴 수 있다).
 * 재생 화면에서는 이 판 위에 재생기가 올라앉는다(`children`).
 */
export function LectureFrame({
  title,
  mini = false,
  children,
}: {
  title: string;
  mini?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={mini ? `${s.frame} ${s.frameMini}` : s.frame}>
      <div className={s.frameIn} aria-hidden="true">
        <span className={s.frameTitle}>{title}</span>
      </div>
      {children}
    </div>
  );
}
