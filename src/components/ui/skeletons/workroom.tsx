import Link from "next/link";

import TodayMathMark from "@/components/brand/TodayMathMark";

import { Skeleton } from "../Skeleton";
import s from "../skeleton.module.css";
import { Status } from "./shared";

const SIGNUP = "/signup?callbackUrl=%2F";
const LOGIN = "/login?callbackUrl=%2F";

export function WorkroomHomeSkeleton() {
  return (
    <div aria-busy="true" className={s.workroom}>
      <Status label="작업실을 불러오는 중" />
      <aside aria-hidden="true" className={s.sidebar}>
        <div className={s.brand}>
          <TodayMathMark inverse size={36} />
          <span>
            오늘 수학
            <small>TEACHER’S WORKROOM</small>
          </span>
        </div>
        <div className={s.sidebarCta} />
        <div className={s.nav}>
          {Array.from({ length: 6 }, (_, index) => (
            <div className={s.navItem} key={index} />
          ))}
        </div>
        <div className={s.sideCard} />
        <div className={s.sideFoot} />
      </aside>
      <div className={s.main}>
        <header aria-hidden="true" className={s.topbar}>
          <div className={s.crumb}>
            <span>작업실</span>
            <span aria-hidden="true">›</span>
            <strong>오늘의 작업</strong>
          </div>
          <div className={`skeleton ${s.search}`} />
          <div className={s.topActions}>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-11" />
          </div>
        </header>
        <div className={s.home}>
          <div className={s.stack}>
            <section aria-hidden="true" className={s.card}>
              <div className={s.cardHead}>
                <span className="flex items-center gap-3">
                  <span className={s.icon} />
                  <span>
                    <Skeleton className="h-2.5 w-12" />
                    <Skeleton className="mt-2 h-4 w-48 max-w-full" />
                  </span>
                </span>
                <Skeleton className="h-7 w-16" />
              </div>
              <div className={`skeleton ${s.searchField}`} />
              <div className={s.grades}>
                {Array.from({ length: 2 }, (_, group) => (
                  <div className={s.gradeRow} key={group}>
                    <Skeleton className="h-4 w-8" />
                    {Array.from({ length: 4 }, (_, chip) => (
                      <div className={s.chip} key={chip} />
                    ))}
                  </div>
                ))}
              </div>
            </section>
            <section aria-hidden="true" className={s.import}>
              <div className={s.importMark} />
              <span>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="skeleton-quiet mt-3 h-3 w-56 max-w-full" />
              </span>
            </section>
            <section aria-hidden="true" className={s.card}>
              <Skeleton className="mb-3 h-4 w-24" />
              {Array.from({ length: 4 }, (_, index) => (
                <div className={s.recentRow} key={index}>
                  <Skeleton className="h-8 w-8" />
                  <span>
                    <Skeleton className="h-3 w-36 max-w-full" />
                    <Skeleton className="skeleton-quiet mt-2 h-2.5 w-24" />
                  </span>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </section>
          </div>
          <aside aria-hidden="true" className={s.stack}>
            <section className={s.card}>
              <Skeleton className="h-4 w-32" />
              <div className={s.draftPreview}>
                <div className={s.tinyPaper} />
                <span>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-3 h-5 w-40 max-w-full" />
                  <Skeleton className="mt-4 h-8 w-16" />
                </span>
              </div>
            </section>
            <p className={s.helpNote}>
              자료를 고르고 다듬어 학습지를 만듭니다.
            </p>
          </aside>
        </div>
      </div>
      <div aria-hidden="true" className={s.mobileNav}>
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

export function LandingSkeleton() {
  return (
    <div aria-busy="true" className={s.landing}>
      <Status label="소개 화면을 불러오는 중" />
      <header className={s.landingHeader}>
        <Link className={s.landingBrand} href="/" aria-label="오늘 수학 홈">
          <TodayMathMark size={35} />
          오늘 수학
        </Link>
        <nav aria-label="서비스 소개" className={s.landingNav}>
          <a href="#how-it-works">이용 방법</a>
          <a href="#our-workroom">우리의 작업실</a>
          <a href="#questions">자주 묻는 질문</a>
        </nav>
        <div className={s.landingActions}>
          <Link href={LOGIN}>로그인</Link>
          <Link className={s.landingCta} href={SIGNUP}>
            시작하기
          </Link>
        </div>
      </header>
      <main>
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <Skeleton className="h-3 w-40" />
            <h1>
              좋은 수업의 시작,
              <br />
              선생님의 작업실에서.
            </h1>
            <p>
              자료를 가져오고 다듬어 나만의 학습지를 만드는 수학 선생님의
              작업실입니다.
            </p>
          </div>
          <div aria-hidden="true" className={s.heroArt} />
        </section>
      </main>
    </div>
  );
}
