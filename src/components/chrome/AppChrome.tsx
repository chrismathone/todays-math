import Link from "next/link";

import { AccountBadge } from "@/components/chrome/AccountBadge";
import { formatMastheadDate } from "@/lib/main/pipeline";

/**
 * 상단 크롬 — **워드마크 분기** (D-39 확정).
 *
 * 워드마크 자리에 두 제품명을 나란히 둔다: `오늘의수학 │ 오늘의시험`.
 * 선택된 쪽은 검정 굵게 + `aria-current="page"`, 나머지는 회색이다.
 * 날짜·남은 작업·nav 는 **두 탭이 공유**한다(05 §8.7).
 *
 * ⚠️ 두 제품명 모두 링크로 둔다. 선택된 쪽도 링크인 이유:
 *   - 워드마크는 예부터 홈으로 가는 길이라 없애면 오히려 어포던스가 준다.
 *   - "여기 있음"은 색이 아니라 `aria-current` 로 알린다(색만으로 전달 금지, 05 §5).
 *   자기 자신으로 가는 링크는 실제로 이동하므로 D-30 이 막는 "눌러도 아무 일 없음"이 아니다.
 *
 * ⚠️ nav 에 '오늘의 시험' 항목을 넣지 않는다 — D-39 가 "nav 항목 추가"안을 무게감이
 *    약하다는 이유로 반려했다. 분기는 워드마크 자리에서만 일어난다.
 */
type Tab = "math" | "exam";

type AppChromeProps = {
  children: React.ReactNode;
  dateLabel?: string;
  remaining?: number;
  extraNav?: React.ReactNode;
  /** 현재 열려 있는 제품 탭. 기본은 '오늘의 수학'. */
  tab?: Tab;
  activeNav?: "main" | "classes" | "problems";
};

const WORDMARK = "text-[28.5px] font-black tracking-[-0.5px]";

export function AppChrome({
  children,
  dateLabel,
  remaining,
  extraNav,
  tab = "math",
  activeNav,
}: AppChromeProps) {
  const date = dateLabel ?? formatMastheadDate();

  return (
    <div className="app-chrome min-h-full bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-3 focus:text-[12.5px] focus:font-bold focus:text-white"
      >
        본문으로 건너뛰기
      </a>
      {/*
        좁은 창에서 **단어 중간에 줄이 바뀌던 것**을 없앤다 (UI-01, 2026-09-08 결정 · 안 A).
        고친 것은 둘이다 — 헤더가 **묶음 단위로** 접히게 하고(`flex-wrap` + `gap-y`),
        묶음마다 `shrink-0 whitespace-nowrap` 을 준다. 그러면 자리가 모자랄 때 묶음째
        아랫줄로 내려가고, 낱말이 세로로 쪼개지지 않는다.

        실측 (`/dev/chrome-check` — 메인과 같은 무게: `remaining` + `extraNav` + 이메일):

                    고치기 전            고친 뒤
          1440px    80px               80px
          1024px    123px · 「오늘의수학」이 86px(글꼴 29px)로 **세 줄**,
                            「문제은행」 두 줄                  115px · 쪼개짐 0
           900px    150px · 「문제은행」이 104px 로 **네 줄**     115px · 쪼개짐 0

        ⚠️ **「날짜를 짧게」는 재 보고 버렸다.** 축약해도 1024px 에서 두 줄 그대로였다 —
           넘치는 양이 그 몇 글자보다 크다. 아무것도 못 사는 손잡이는 넣지 않는다.
        ⚠️ 메뉴를 접는 안(C)은 1024px 에서 한 줄(80px)을 지키지만 **1440px 에서는 이 안과
           완전히 같고**, 좁을 때만 드롭다운과 클릭 한 번을 매번 요구한다. 35px 을 사려고
           새 상호작용을 만들지 않는다는 것이 결정의 근거다.
      */}
      <header className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b-[3px] border-ink px-[26px] pt-[19px] pb-[15px]">
        <span className="flex shrink-0 items-baseline whitespace-nowrap">
          <Link
            href="/"
            aria-current={tab === "math" ? "page" : undefined}
            className={`${WORDMARK} ${tab === "math" ? "text-ink" : "text-text-3"}`}
          >
            오늘의수학
          </Link>
          <span
            aria-hidden="true"
            className="mx-[7px] text-[28.5px] text-[#C2C2C0]"
          >
            │
          </span>
          <Link
            href="/exam"
            aria-current={tab === "exam" ? "page" : undefined}
            className={`${WORDMARK} ${tab === "exam" ? "text-ink" : "text-text-3"}`}
          >
            오늘의시험
          </Link>
        </span>
        <span className="shrink-0 whitespace-nowrap text-[16.5px] text-text-2 tabular-nums">
          {date}
        </span>
        {remaining !== undefined ? (
          <span
            className={`shrink-0 whitespace-nowrap text-[17.25px] font-black ${
              remaining > 0 ? "text-g-red-text" : "text-ink"
            }`}
          >
            {remaining > 0 ? `남은 작업 ${remaining}` : "오늘 완료"}
          </span>
        ) : null}
        <nav
          aria-label="주 메뉴"
          className="ml-auto flex shrink-0 items-center gap-5 whitespace-nowrap text-[17.25px] font-bold"
        >
          {extraNav}
          {(
            [
              ["main", "/", "메인"],
              ["classes", "/classes", "반"],
              ["problems", "/problems", "문제은행"],
            ] as const
          ).map(([key, href, label]) => (
            <Link
              key={key}
              href={href}
              aria-current={activeNav === key ? "page" : undefined}
              className={
                activeNav === key
                  ? "underline decoration-2 underline-offset-4"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
          <AccountBadge />
        </nav>
      </header>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
