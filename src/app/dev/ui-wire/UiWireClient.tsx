"use client";

import { useState } from "react";

import { DIFFICULTY_LADDER } from "@/contracts/difficulty";

/**
 * UI-01 · UI-04 · UI-05 · UI-06 **와이어 4안씩** (D-07 1단계).
 *
 * 이 화면은 «고르기 위한» 물건이다. 색·그림자·둥근 모서리를 쓰지 않는다 —
 * 와이어에서 그것을 넣으면 원장님이 **구조가 아니라 꾸밈**을 보고 고르시게 된다.
 * 확정 뒤 Hi-fi 단계에서 05 §2.1 토큰으로 입힌다.
 *
 * ⚠️ D-30 — 누르는 것만 손가락 커서. 시안 상자는 장식이므로 `<div onClick>` 을 안 쓴다.
 */

type ClassRow = { id: string; name: string; grade: string };
type TestRow = {
  id: string;
  testType: string;
  status: string;
  testDate: string;
  className: string;
  problemCount: number;
};
type UnitRow = { id: string; grade: string; chapter: string; section: string };

type Props = {
  classes: ClassRow[];
  tests: TestRow[];
  units: UnitRow[];
  unitCount: number;
  longestUnit: { grade: string; chapter: string; section: string } | null;
};

const FRAME = "border border-divider bg-white";
const CAPTION = "text-[11.5px] text-text-2 leading-relaxed";
const PICK = "text-[12.5px] font-bold text-ink";

/** 와이어의 «칸» — 실제 컨트롤이 아니므로 커서·hover 를 주지 않는다(D-30). */
function Slot({
  label,
  wide,
  value,
}: {
  label: string;
  wide?: boolean;
  value?: string;
}) {
  return (
    <span
      className={`inline-flex h-8 items-center border border-control px-2 text-[12.5px] text-text-2 ${
        wide ? "flex-1" : ""
      }`}
    >
      {value ?? label}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold tracking-[0.5px] text-text-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function Case({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={PICK}>
        {id}. {title}
      </h3>
      <p className={CAPTION}>{note}</p>
      <div className={`${FRAME} overflow-x-auto p-3`}>{children}</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const WIDTHS = [1440, 1024, 390] as const;

/** 헤더 와이어 — 실제 폭 안에서 그려야 «단어가 쪼개지는지»가 보인다. */
function HeaderWire({
  variant,
  width,
  remaining,
}: {
  variant: "A" | "B" | "C" | "D";
  width: number;
  remaining: number;
}) {
  const wordmark =
    variant === "D" && width < 1200
      ? "text-[22px] font-black tracking-[-0.5px]"
      : "text-[28.5px] font-black tracking-[-0.5px]";
  /**
   * ⚠️ **실제 문자열이어야 한다.** 처음엔 「2026년 9월 7일 일요일」로 그렸는데
   *    제품(`formatMastheadDate`)은 **`2026-09-07 일`** 을 낸다 — 시안이 더 길었다.
   *    폭을 재는 시안에서 문자열 길이를 지어내면 그 측정은 제품의 것이 아니다.
   *
   * 🔴 그리고 **A 의 「날짜 축약」은 버렸다.** 축약해도 1024px 에서 두 줄(115px)이
   *    그대로였다 — 넘치는 양이 그 몇 글자보다 크다. 아무것도 못 사는 손잡이를
   *    시안에 남기면 다음 사람이 그것을 «해결책»으로 읽는다. A 가 실제로 하는 일은
   *    **「묶음 단위로 접히고 단어는 절대 안 쪼갠다」 하나뿐**이다.
   */
  const date = "2026-09-07 일";

  const mark = (
    <span className="flex shrink-0 items-baseline whitespace-nowrap">
      <span className={wordmark}>오늘 수학</span>
      <span aria-hidden className="mx-[7px] text-[28.5px] text-divider">
        │
      </span>
      <span className={`${wordmark} text-text-3`}>오늘의시험</span>
    </span>
  );
  const status = (
    <>
      <span className="shrink-0 whitespace-nowrap text-[16.5px] text-text-2 tabular-nums">
        {date}
      </span>
      <span className="shrink-0 whitespace-nowrap text-[17.25px] font-black">
        남은 작업 {remaining}
      </span>
    </>
  );
  /**
   * 🔴 **계정 묶음은 실제 헤더와 같은 무게여야 한다.**
   * 처음에 12.5px 「원장님」으로 그렸다가 `AccountBadge` 를 열어 보니 실제는
   * **17.25px 구분선 + 15px 이메일 + 로그아웃**이었다. 그 차이만큼 시안이 가벼웠고,
   * 그 가벼운 헤더에서 잰 「1024px 에 80px」은 **실제 헤더의 값이 아니었다.**
   * (2026-08-19 에 적어 둔 「시안을 작은 픽스처로 세우면 실화면에서 깨진다」와 같은 자리.)
   * 이메일은 길이만 맞춘 표본이다 — 개인 주소를 저장소에 심지 않는다.
   */
  const account = (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
      <span aria-hidden className="text-[17.25px] text-divider">
        │
      </span>
      <span className="text-[15px] text-text-2">wonjang@todaysmath.kr</span>
      <span className="border border-control px-2 py-0.5 text-[12.5px]">
        로그아웃
      </span>
    </span>
  );
  /** 메인 화면이 헤더에 더 붙이는 버튼(`MainScreen` 의 `extraNav`). 이것도 폭을 먹는다. */
  const extraNav = (
    <span className="shrink-0 whitespace-nowrap bg-ink px-2.5 py-0.5 text-[15.75px] font-extrabold text-bg">
      전체 표 ⇄
    </span>
  );
  const nav = (
    <nav className="flex shrink-0 items-center gap-5 whitespace-nowrap text-[17.25px] font-bold">
      {extraNav}
      <span>메인</span>
      <span>반</span>
      <span>문제은행</span>
    </nav>
  );

  if (variant === "B") {
    return (
      <header className="border-b-[3px] border-ink px-[26px] pt-[19px] pb-[15px]">
        <div className="flex items-baseline justify-between gap-6">
          {mark}
          {account}
        </div>
        <div className="mt-2 flex items-center gap-6">
          {status}
          <span className="ml-auto">{nav}</span>
        </div>
      </header>
    );
  }

  if (variant === "C" && width < 1200) {
    return (
      <header className="flex items-baseline gap-6 border-b-[3px] border-ink px-[26px] pt-[19px] pb-[15px]">
        {mark}
        {status}
        <span className="ml-auto flex items-center gap-4">
          <span className="whitespace-nowrap border border-control px-2 py-1 text-[14px] font-bold">
            메뉴 ▾
          </span>
          {account}
        </span>
      </header>
    );
  }

  return (
    <header className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b-[3px] border-ink px-[26px] pt-[19px] pb-[15px]">
      {mark}
      {status}
      <span className="ml-auto flex items-center gap-4">
        {nav}
        {account}
      </span>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function UiWireClient({
  classes,
  tests,
  units,
  unitCount,
  longestUnit,
}: Props) {
  const [width, setWidth] = useState<number>(1024);
  /** 검수 머리말이 **세 상태**를 다 감당하는지 눌러 보게 한다(§ UI-06). */
  const [headStatus, setHeadStatus] = useState<string>("confirmed");
  /** 학생별 출제 — 반 이름만으로는 안 갈리는 경우를 켜 본다. */
  const [headStudent, setHeadStudent] = useState<boolean>(false);

  const longestClass =
    classes.reduce<ClassRow | null>(
      (a, b) => (!a || b.name.length > a.name.length ? b : a),
      null,
    ) ?? null;
  const sample = tests[0] ?? null;
  const rangeLine = longestUnit
    ? `${longestUnit.grade} ${longestUnit.chapter} · ${longestUnit.section}`
    : "—";

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-10 bg-canvas px-6 py-8 text-ink">
      <header className="flex flex-col gap-2 border-b-[3px] border-ink pb-4">
        <h1 className="text-[22px] font-black">
          디자인 리뷰 후속 · 와이어 4안 (D-07 1단계)
        </h1>
        <p className={CAPTION}>
          UI-01 헤더 접힘 · UI-04 출제 설정 폼 · UI-05 타입 스케일 · UI-06 검수
          머리말. 각 항목에서 한 안을 고르시면 그것만 Hi-fi 4안으로 만듭니다.
          여기서는 색과 꾸밈을 빼고 구조만 그립니다.
        </p>
        <p className={CAPTION}>
          실데이터 — 반 {classes.length}개(가장 긴 이름 「
          {longestClass?.name ?? "—"}」) · 시험 {tests.length}건 · 소단원{" "}
          {unitCount}개(가장 긴 이름 「{rangeLine}」).
        </p>
        <p className="text-[11.5px] font-bold text-g-red-text">
          UI-04 는 §8.6 S-04 「전폭 폼」 확정을, UI-05 는 §3.2 크기 확정을
          바꾸자는 제안입니다. B~D 안을 고르시면 그 확정을 뒤집는 결정이 됩니다.
        </p>
      </header>

      {/* ── UI-01 ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline gap-4">
          <h2 className="text-[17px] font-black">
            UI-01. 좁은 창에서 헤더가 무너진다
          </h2>
          <span className={CAPTION}>
            1024px 에서 헤더 높이가 80 → 123px 이 되고 단어 중간에서 줄이
            바뀐다.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-bold">창 폭</span>
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              aria-pressed={width === w}
              className={`border px-3 py-1 text-[12.5px] ${
                width === w
                  ? "border-ink bg-ink text-white"
                  : "border-control bg-white"
              }`}
            >
              {w}px
            </button>
          ))}
          <span className={CAPTION}>
            390px 는 참고 항목입니다(지원 범위 미정).
          </span>
        </div>

        {(
          [
            [
              "A",
              "묶음 단위로 접는다 (단어는 안 쪼갠다)",
              "가장 작은 변경이자 결함을 직접 없애는 안. 워드마크·날짜·메뉴·계정을 각각 nowrap 묶음으로 두고 헤더가 줄바꿈하게 한다. 1024px 에서 두 줄(115px)이 되지만 넘침 0 · 숨는 것 0 이고, 새 상호작용이 없다. ⚠️ 「날짜 축약」은 재 보고 버렸다 — 축약해도 두 줄 그대로였다.",
            ],
            [
              "B",
              "두 줄 고정 · 위는 이름과 계정, 아래는 상태와 메뉴",
              "폭과 무관하게 늘 두 줄이다. 어느 폭에서도 묶음이 안 깨지지만 1440px 에서도 헤더가 높아진다.",
            ],
            [
              "C",
              "좁아지면 메뉴를 하나로 접는다",
              "메뉴 세 개를 「메뉴 ▾」로 접는다. 계정은 접지 않는다(§8.8). 한 번 더 눌러야 이동한다.",
            ],
            [
              "D",
              "좁아지면 워드마크를 줄인다",
              "28.5px → 22px. 구조를 안 건드리는 대신 제품 정체성이 가장 강한 요소를 줄인다.",
            ],
          ] as const
        ).map(([id, title, note]) => (
          <Case key={id} id={id} title={title} note={note}>
            <div style={{ width }} className="border border-divider bg-white">
              <HeaderWire variant={id} width={width} remaining={3} />
              <div className="px-[26px] py-4 text-[12.5px] text-text-2">
                (본문 자리)
              </div>
            </div>
          </Case>
        ))}
      </section>

      {/* ── UI-04 ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline gap-4">
          <h2 className="text-[17px] font-black">
            UI-04. 출제 설정의 폼 폭과 구획
          </h2>
          <span className={CAPTION}>
            1440px 에서 반·학생 칸이 각각 1376px. 난이도는 4열에서 4+2 로
            나뉜다.
          </span>
        </div>

        <Case
          id="A"
          title="지금 그대로 · 구획 제목만 넣는다"
          note="§8.6 S-04 「전폭 폼」 확정을 지킨다. 폭은 안 건드리고 「출제 대상 / 시험 구성 / 난이도 배분」 제목만 세운다. 뒤집는 결정이 아니다."
        >
          <div className="flex flex-col gap-4">
            {[
              ["출제 대상", ["반", "학생"]],
              ["시험 구성", ["유형", "시행일", "문항 수"]],
            ].map(([group, fields]) => (
              <div key={group as string} className="flex flex-col gap-2">
                <span className="text-[11.5px] font-black">
                  {group as string}
                </span>
                {(fields as string[]).map((f) => (
                  <Field key={f} label={f}>
                    <Slot label={`${f} 선택`} wide />
                  </Field>
                ))}
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-black">난이도 배분</span>
              <div className="grid grid-cols-4 gap-2">
                {DIFFICULTY_LADDER.map((d) => (
                  <Field key={d} label={d}>
                    <Slot label="0" />
                  </Field>
                ))}
              </div>
            </div>
          </div>
        </Case>

        <Case
          id="A+"
          title="전폭 유지 · 난이도만 한 줄 · 배분 합계 상시"
          note="🔴 처음 시안에 **빠져 있던 선택지**다. 「전폭 폼」 확정은 짧은 필드의 배치까지 못 박은 것이 아니므로, 폭을 그대로 두고도 난이도 6갈래를 한 줄에 놓을 수 있다. 지금은 4열 그리드라 심화하가 첫 줄 끝, 심화중·심화상이 다음 줄로 갈린다 — 합계가 맞아도 «어디에 얼마를 줬나»를 두 줄에서 찾아야 한다. 확정을 뒤집지 않는다."
        >
          <div className="flex flex-col gap-4">
            {[
              ["출제 대상", ["반", "학생"]],
              ["시험 구성", ["유형", "시행일", "문항 수"]],
            ].map(([group, fields]) => (
              <div key={group as string} className="flex flex-col gap-2">
                <span className="text-[11.5px] font-black">
                  {group as string}
                </span>
                {(fields as string[]).map((f) => (
                  <Field key={f} label={f}>
                    <Slot label={`${f} 선택`} wide />
                  </Field>
                ))}
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-black">난이도 배분</span>
              <div className="grid grid-cols-6 gap-2">
                {DIFFICULTY_LADDER.map((d) => (
                  <Field key={d} label={d}>
                    <Slot label="0 문항" />
                  </Field>
                ))}
              </div>
              <span className="text-[11.5px] text-text-2">
                배분 합계 8 / 총 8문항
              </span>
            </div>
          </div>
        </Case>

        <Case
          id="B"
          title="최대 폭 + 세 구획 (리뷰 제안)"
          note="폼에 최대 폭(720px)을 주고 짧은 값끼리 한 줄에 둔다. 난이도는 한 줄에 다 놓아 「하나의 배분 체계」로 보이게 한다. 🔴 S-04 확정을 뒤집는다."
        >
          <div className="flex max-w-[720px] flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] font-black">출제 대상</span>
              <div className="flex gap-2">
                <Field label="반">
                  <Slot label={longestClass?.name ?? "반 선택"} />
                </Field>
                <Field label="학생">
                  <Slot label="반 전체" />
                </Field>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] font-black">시험 구성</span>
              <div className="flex gap-2">
                <Field label="유형">
                  <Slot label="일일테스트" />
                </Field>
                <Field label="시행일">
                  <Slot label="2026-09-07" />
                </Field>
                <Field label="문항 수">
                  <Slot label="8" />
                </Field>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] font-black">난이도 배분</span>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_LADDER.map((d) => (
                  <Field key={d} label={d}>
                    <Slot label="0 문항" />
                  </Field>
                ))}
              </div>
              <span className="text-[11.5px] text-text-2">
                배분 합계 8 / 총 8문항
              </span>
            </div>
            <span className="border border-ink px-4 py-2 text-center text-[12.5px] font-bold">
              출제
            </span>
          </div>
        </Case>

        <Case
          id="C"
          title="왼쪽 설정 · 오른쪽 요약 (2열)"
          note="넓은 화면을 요약으로 쓴다. 배분 합계·범위·문항 수가 항상 오른쪽에 보이므로 제출 전에 견줄 수 있다. 좁아지면 요약이 폼 아래로 내려간다."
        >
          <div className="flex gap-6">
            <div className="flex max-w-[520px] flex-1 flex-col gap-3">
              {["반", "학생", "유형", "시행일", "문항 수"].map((f) => (
                <Field key={f} label={f}>
                  <Slot label={`${f} 선택`} wide />
                </Field>
              ))}
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTY_LADDER.map((d) => (
                  <Field key={d} label={d}>
                    <Slot label="0" />
                  </Field>
                ))}
              </div>
            </div>
            <aside className="w-[260px] shrink-0 border-l border-divider pl-4 text-[12.5px]">
              <div className="mb-2 text-[11.5px] font-black">요약</div>
              <dl className="flex flex-col gap-1 text-text-2">
                <div>대상 · {longestClass?.name ?? "—"} 전체</div>
                <div>범위 · {rangeLine}</div>
                <div>문항 · 8</div>
                <div className="font-bold text-ink">배분 합계 8 / 8</div>
              </dl>
            </aside>
          </div>
        </Case>

        <Case
          id="D"
          title="단계형 · 대상 → 구성 → 배분"
          note="한 번에 한 구획만 연다. 처음 쓰는 사람에게는 가장 쉽지만, 매일 같은 설정을 반복하는 원장님께는 누르는 횟수가 는다."
        >
          <div className="flex max-w-[720px] flex-col gap-2">
            <div className="border border-ink p-3">
              <div className="mb-2 text-[11.5px] font-black">
                1. 출제 대상{" "}
                <span className="font-normal text-text-2">(열림)</span>
              </div>
              <div className="flex gap-2">
                <Field label="반">
                  <Slot label={longestClass?.name ?? "반 선택"} />
                </Field>
                <Field label="학생">
                  <Slot label="반 전체" />
                </Field>
              </div>
            </div>
            <div className="border border-divider p-3 text-[12.5px] text-text-2">
              2. 시험 구성 — 일일테스트 · 2026-09-07 · 8문항
            </div>
            <div className="border border-divider p-3 text-[12.5px] text-text-2">
              3. 난이도 배분 — 합계 8 / 8
            </div>
          </div>
        </Case>
      </section>

      {/* ── UI-05 ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline gap-4">
          <h2 className="text-[17px] font-black">UI-05. 화면 글자 크기 위계</h2>
          <span className={CAPTION}>
            공통 메뉴 17.25px 가 페이지 제목 15px 보다 크다. 라벨은 10px.
          </span>
        </div>
        <p className="text-[11.5px] text-g-red-text">
          §3.2 는 Body 12.5px 를 확정했고 §6.1 체크리스트는 「화면 본문 최소
          14px」이라 적혀 있습니다. 둘이 어긋납니다 — 어느 쪽을 기준으로
          삼을지가 이 항목의 결정입니다.
        </p>

        {(
          [
            [
              "A",
              "지금 그대로 · 문서만 정정",
              "§3.2 를 기준으로 두고 §6.1 의 14px 줄을 「미갱신 기록」으로 표시한다. 화면은 한 픽셀도 안 바뀐다.",
              { title: 15, label: 10, body: 12.5, meta: 9.5 },
            ],
            [
              "B",
              "라벨만 키운다",
              "10 → 12px. 가장 작은 글자만 손대므로 배치가 거의 안 밀린다. 제목과 메뉴의 역전은 그대로 남는다.",
              { title: 15, label: 12, body: 12.5, meta: 11 },
            ],
            [
              "C",
              "제목을 키운다",
              "15 → 20px. 메뉴(17.25px)보다 페이지 제목이 커진다. 본문·라벨은 그대로라 표 밀림이 없다.",
              { title: 20, label: 10, body: 12.5, meta: 9.5 },
            ],
            [
              "D",
              "본문까지 올린다 (§6.1 기준)",
              "본문 14px · 라벨 12px · 제목 20px. 🔴 §3.2 확정을 뒤집고 표·시험지 미리보기의 줄 수가 달라진다.",
              { title: 20, label: 12, body: 14, meta: 11.5 },
            ],
          ] as const
        ).map(([id, title, note, s]) => (
          <Case key={id} id={id} title={title} note={note}>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-4 border-b border-divider pb-2">
                <span className="text-[28.5px] font-black">오늘 수학</span>
                <span className="text-[17.25px] font-bold">메인</span>
                <span className="text-[17.25px] font-bold">반 관리</span>
              </div>
              <div style={{ fontSize: s.title }} className="font-black">
                출제 설정
              </div>
              <div
                style={{ fontSize: s.label }}
                className="font-bold tracking-[0.5px] text-text-2"
              >
                반
              </div>
              <div style={{ fontSize: s.body }}>
                {longestClass?.name ?? "중2 목요일반"}
              </div>
              <div style={{ fontSize: s.meta }} className="text-text-2">
                이번 주 출제 3회 · 무수정 사용 2회
              </div>
            </div>
          </Case>
        ))}
      </section>

      {/* ── UI-06 ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline gap-4">
          <h2 className="text-[17px] font-black">UI-06. 검수 머리말</h2>
          <span className={CAPTION}>
            지금은 「검수」와 「8문항」뿐이다. 반·유형·시행일·상태가 없다.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-bold">상태</span>
          {(
            [
              ["draft", "초안"],
              ["confirmed", "확정됨"],
              ["confirming", "확정 처리 중"],
            ] as const
          ).map(([v, t]) => (
            <button
              key={v}
              type="button"
              onClick={() => setHeadStatus(v)}
              aria-pressed={headStatus === v}
              className={`border px-3 py-1 text-[12.5px] ${
                headStatus === v
                  ? "border-ink bg-ink text-white"
                  : "border-control bg-white"
              }`}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHeadStudent((v) => !v)}
            aria-pressed={headStudent}
            className={`border px-3 py-1 text-[12.5px] ${
              headStudent
                ? "border-ink bg-ink text-white"
                : "border-control bg-white"
            }`}
          >
            학생별 시험
          </button>
        </div>

        <p className={CAPTION}>
          반 이름은 이미 API 가 싣고 있습니다(2026-09-07 커밋). 남은 것은
          모양뿐입니다.
          {sample
            ? ` 아래는 실제 시험 한 건입니다 — ${sample.className} · ${
                sample.testType === "daily" ? "일일테스트" : "확인테스트"
              } · ${sample.testDate} · ${sample.problemCount}문항 · ${sample.status}.`
            : " (표시할 시험이 없어 예시 값으로 그립니다.)"}
        </p>

        {(
          [
            [
              "A",
              "한 줄 요약",
              "가장 짧다. 반·유형·시행일·문항 수·상태를 가운뎃점으로 잇는다. 상태가 문장 끝이라 눈에 덜 띈다.",
            ],
            [
              "B",
              "제목 + 메타 줄",
              "반 이름을 제목으로 올리고 나머지를 아래 한 줄에 둔다. 여러 반을 연속으로 볼 때 식별이 가장 빠르다.",
            ],
            [
              "C",
              "왼쪽 제목 · 오른쪽 상태",
              "상태와 다음 행동(인쇄)을 오른쪽에 묶는다. 「왜 확정이 비활성인가」를 상태 옆에 적는다.",
            ],
            [
              "D",
              "네 칸 표",
              "반·유형·시행일·문항 수를 라벨과 함께 표로. 가장 명확하지만 세로를 가장 많이 먹는다.",
            ],
          ] as const
        ).map(([id, title, note]) => (
          <Case key={id} id={id} title={title} note={note}>
            <ReviewHead
              variant={id}
              className={sample?.className ?? "중2 목요일반"}
              studentName={headStudent ? "김서연" : null}
              testType={
                sample?.testType === "review" ? "확인테스트" : "일일테스트"
              }
              testDate={sample?.testDate ?? "2026-09-07"}
              count={sample?.problemCount ?? 8}
              status={headStatus}
            />
          </Case>
        ))}
      </section>

      <footer className={CAPTION}>
        읽기만 하는 화면입니다. 데이터를 바꾸지 않습니다. 단원 {unitCount}개 중
        표본 {units.length}개를 읽었습니다.
      </footer>
    </div>
  );
}

/**
 * 🔴 **「확정」이 비활성인 사유는 셋이다** — `TestReview.tsx:89` 가
 *    `disabled={!draft || confirming}` 이다. 곧 «이미 확정됨»뿐 아니라
 *    **«처리 중»**에도 비활성이다. 처음 시안은 초안 여부만 보고 두 문장을 냈고,
 *    그러면 처리 중에 눌리지 않는 이유는 여전히 답하지 못한다.
 */
const STATUS_TEXT: Record<string, string> = {
  draft: "초안",
  confirmed: "확정됨",
  printed: "인쇄함",
  confirming: "확정 처리 중",
};

function ReviewHead({
  variant,
  className,
  studentName,
  testType,
  testDate,
  count,
  status,
}: {
  variant: "A" | "B" | "C" | "D";
  className: string;
  studentName?: string | null;
  testType: string;
  testDate: string;
  count: number;
  status: string;
}) {
  const label = STATUS_TEXT[status] ?? status;
  const why =
    status === "confirming"
      ? "확정을 처리하는 중입니다."
      : status === "draft"
        ? "확정하면 문항을 바꿀 수 없습니다."
        : "확정된 시험은 문항을 바꿀 수 없습니다.";
  /**
   * 🔴 **학생별 출제가 있다**(`GenerateSetup` 의 학생 선택). 같은 반·같은 날·같은
   *    유형의 학생별 시험을 연속으로 검수하면 **반 이름만으로는 안 갈린다.**
   *    처음 시안에 이 칸이 없었다.
   */
  const who = studentName ? `${className} · ${studentName}` : className;

  if (variant === "A")
    return (
      <div className="border-b border-ink pb-2 text-[13px]">
        {who} · {testType} · {testDate} · {count}문항 · {label}
      </div>
    );

  if (variant === "B")
    return (
      <div className="border-b border-ink pb-2">
        <div className="text-[17px] font-black">{who}</div>
        <div className="mt-1 text-[11.5px] text-text-2">
          {testType} · {testDate} · {count}문항 · {label}
        </div>
      </div>
    );

  if (variant === "C")
    return (
      <div className="flex items-end justify-between border-b border-ink pb-2">
        <div>
          <div className="text-[17px] font-black">{who}</div>
          <div className="mt-1 text-[11.5px] text-text-2">
            {testType} · {testDate} · {count}문항
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12.5px] font-bold">{label}</div>
          <div className="text-[11.5px] text-text-2">{why}</div>
        </div>
      </div>
    );

  return (
    <dl className="grid grid-cols-4 border-b border-ink pb-2 text-[12.5px]">
      {[
        ["반 · 학생", who],
        ["유형", testType],
        ["시행일", testDate],
        ["문항", `${count}문항 · ${label}`],
      ].map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5">
          <dt className="text-[10px] font-bold tracking-[0.5px] text-text-2">
            {k}
          </dt>
          <dd className="font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
