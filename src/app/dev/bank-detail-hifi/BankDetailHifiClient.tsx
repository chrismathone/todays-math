"use client";

import { useState } from "react";

import { MathText } from "@/components/math/MathText";
import { REVIEW_STATUS_LABEL, SOURCE_LABEL } from "@/components/problem/labels";
import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import { Button } from "@/components/ui/Button";
import { BADGE_CHIP } from "@/components/unified/BankView";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import type { BankProblem } from "@/components/unified/types";
import { provenanceBadges } from "@/lib/problem/provenance";

import { LENGTH_SAMPLES, type LengthKey } from "./fixtures";

/**
 * 문제은행 **전체 상세 모달** Hi-fi 시안 5안 (D-07, 05 §0-3 ② Hi-fi 단계).
 *
 * 구조는 Wire 단계에서 원장님이 고르신 **Ⓑ 전체 상세 모달**로 고정이고, 여기서 갈리는
 * 것은 **시각 디테일뿐**이다(색·타이포·형태·밀도).
 *
 * 지켜야 하는 확정 사항:
 *  · §8.3 H5 「스위스 계기판」 — 뉴트럴 그레이 + 단일 강조색, 강한 그리드, 직각, **장식 0**
 *  · §2.2 기능색은 **의미로만** — 난이도·유형은 무채색, **검수 상태만** 색(면색 아니라 글자색)
 *  · §2.2.1 컴포넌트는 **hex 를 직접 쓰지 않는다** — 토큰 클래스만
 *  · §3.2 굵기 3단(400/700/900), 숫자는 tabular-nums
 *  · §8.6 단추는 `ui/Button` 의 네 갈래(primary·ink·secondary·ghost), 최소 44×44
 *
 * 픽스처는 **이 폴더의 `./fixtures`** 를 쓴다 — 풀이 길이(짧은·중간·긴)가 이 단계의
 * 축이라 Wire 것과 목적이 다르다. 길이는 지어내지 않고 실제 문제은행에서 떠 왔다.
 */

/** Wire 와 같은 갈래 넷. 자리 규칙도 같다: 담기가 맨 앞, 검수는 왼쪽(판단)·변형은 작업. */
function Actions({ problem }: { problem: BankProblem }) {
  const [picked, setPicked] = useState(false);
  return (
    <>
      <Button
        variant={picked ? "ink" : "primary"}
        aria-pressed={picked}
        onClick={() => setPicked((value) => !value)}
      >
        {picked ? "담기 완료" : "문제 담기"}
      </Button>
      <Button variant="secondary">변형</Button>
      {problem.reviewStatus === "pending" ? (
        <>
          <Button variant="ghost">승인</Button>
          <Button variant="ghost">반려</Button>
        </>
      ) : null}
    </>
  );
}

/** 검수 상태만 기능색을 쓴다 — 승인=끝난 단계, 대기=입력 대기, 반려=경고(§2.2). */
const REVIEW_TONE: Record<string, string> = {
  approved: "text-g-green",
  pending: "text-g-yellow-text",
  rejected: "text-g-red-text",
};

function Badges({ problem }: { problem: BankProblem }) {
  return (
    <span className="flex flex-none flex-wrap gap-1">
      {provenanceBadges({
        ...problem,
        source: problem.source ?? "",
        questionType: problem.questionTypeRaw,
      }).map((badge) => (
        <abbr
          key={badge.axis}
          title={badge.name}
          className={`${BADGE_CHIP} ${badge.className}`}
        >
          {badge.text}
        </abbr>
      ))}
    </span>
  );
}

const MICRO = "text-[10.5px] font-extrabold tracking-[1.2px]";

function Meta({ problem }: { problem: BankProblem }) {
  return (
    <dl className="m-0 grid gap-2 border border-divider p-4">
      {[
        ["소단원", problem.section || "미지정"],
        [
          "출처",
          problem.sourceLabel ||
            SOURCE_LABEL[problem.source as keyof typeof SOURCE_LABEL] ||
            "문제은행",
        ],
        ["문제 번호", problem.problemCode || problem.id],
        [
          "검수",
          REVIEW_STATUS_LABEL[
            problem.reviewStatus as keyof typeof REVIEW_STATUS_LABEL
          ] || "미정",
        ],
      ].map(([term, value]) => (
        <div key={term} className="flex gap-4">
          <dt className={`${MICRO} flex-none basis-16 pt-[3px] text-text-2`}>
            {term}
          </dt>
          <dd
            className={`m-0 min-w-0 text-[12.5px] font-bold tabular-nums ${
              term === "검수"
                ? REVIEW_TONE[problem.reviewStatus ?? ""] || "text-ink"
                : "text-ink"
            }`}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AnswerAndSolution({ problem }: { problem: BankProblem }) {
  return (
    <>
      <div className="mt-4 flex items-baseline gap-4 border-l-[5px] border-g-blue bg-side px-4 py-3">
        <span className={`${MICRO} flex-none text-g-blue`}>정답</span>
        <MathText text={problem.answer || "등록된 정답이 없습니다."} />
      </div>
      <h3 className={`${MICRO} mt-5 mb-2 text-text-2`}>풀이</h3>
      <div className="text-[12.5px] leading-[1.8] text-ink">
        <MathText
          as="div"
          text={problem.solution || "등록된 풀이가 없습니다."}
        />
      </div>
    </>
  );
}

type Skin = "rule" | "inset" | "twoCol" | "gauge" | "stickyFoot";

/**
 * 다섯 안이 **똑같은 알맹이**를 담는다 — 갈리는 것은 머리·배치·동작 줄의 **모양**뿐이다.
 * 내용을 안마다 달리 두면 무엇 때문에 좋아 보였는지 알 수 없게 된다.
 */
function DetailModal({
  problem,
  skin,
  onClose,
}: {
  problem: BankProblem;
  skin: Skin;
  onClose: () => void;
}) {
  const twoCol = skin === "twoCol";
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <dialog
        open
        role="dialog"
        aria-modal="true"
        aria-label="문제 상세"
        className={`relative m-0 flex max-h-[86vh] w-full flex-col overflow-hidden border border-divider bg-surface p-0 text-ink ${
          twoCol ? "max-w-[980px]" : "max-w-[640px]"
        }`}
      >
        {/* 머리 — 안마다 갈리는 자리 ①②④ */}
        <header
          className={`flex flex-none flex-wrap items-center gap-3 px-6 py-4 ${
            skin === "rule"
              ? "border-b border-ink"
              : skin === "inset"
                ? "border-b border-divider border-l-[5px] border-l-g-blue"
                : "border-b border-divider"
          }`}
        >
          {skin === "gauge" ? (
            <span className="text-[26px] font-black tabular-nums leading-none">
              01
            </span>
          ) : null}
          <Badges problem={problem} />
          <span className="text-[12.5px] font-bold tabular-nums">
            {problem.problemCode}
          </span>
          <span className={`${MICRO} text-text-2`}>{problem.grade}</span>
          <span className={`${MICRO} text-text-2`}>{problem.chapter}</span>
          <span className={`${MICRO} text-text-2`}>{problem.difficulty}</span>
          <span
            className={`${MICRO} ${REVIEW_TONE[problem.reviewStatus ?? ""] || "text-text-2"}`}
          >
            {REVIEW_STATUS_LABEL[
              problem.reviewStatus as keyof typeof REVIEW_STATUS_LABEL
            ] || ""}
          </span>
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            닫기
          </Button>
        </header>

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${
            twoCol ? "grid grid-cols-[auto_minmax(0,1fr)] gap-8" : ""
          }`}
        >
          <div
            className="min-w-0 text-[12.5px] leading-[1.8]"
            style={twoCol ? { width: PROBLEM_CARD_WIDTH } : undefined}
          >
            <UnifiedProblem problem={problem} />
          </div>
          <div className="min-w-0">
            {twoCol ? null : <div className="mt-5" />}
            <Meta problem={problem} />
            <AnswerAndSolution problem={problem} />
          </div>
        </div>

        {/* 동작 줄 — ⑤ 는 본문이 길어도 늘 보이게 바닥에 붙인다 */}
        <footer
          className={`flex flex-none flex-wrap items-center gap-2 px-6 py-4 ${
            skin === "stickyFoot"
              ? "border-t border-ink bg-side"
              : "border-t border-divider"
          }`}
        >
          <Actions problem={problem} />
        </footer>
      </dialog>
    </div>
  );
}

const VARIANTS: { no: string; skin: Skin; title: string; note: string }[] = [
  {
    no: "①",
    skin: "rule",
    title: "3px 룰 머리 · 면색 0",
    note: "면을 쓰지 않고 1px 잉크 룰로만 머리를 가른다. §2.1 「배경과 같으므로 경계는 테두리가 만든다」를 그대로 따른 가장 조용한 안.",
  },
  {
    no: "②",
    skin: "inset",
    title: "좌측 Blue 인셋 5px",
    note: "§8.4 의 hot 카드 문법(좌측 블루 인셋 5px)을 모달 머리에 옮겼다. 「지금 보고 있는 것」이 Blue 로 표시된다.",
  },
  {
    no: "③",
    skin: "twoCol",
    title: "2열 — 문제 | 정보·정답·풀이",
    note: "문제를 지면 한 단 폭으로 고정하고 오른쪽에 나머지를 둔다. 스크롤이 가장 짧지만 창이 넓어야 한다.",
  },
  {
    no: "④",
    skin: "gauge",
    title: "큰 순번 계기판 머리",
    note: "§3.2 Big Number(26/900, tabular)를 머리에 세워 카드 목록과 같은 문법으로 읽히게 한다.",
  },
  {
    no: "⑤",
    skin: "stickyFoot",
    title: "바닥 고정 동작 줄",
    note: "풀이가 길어도 담기·변형·승인/반려가 항상 보인다. 동작 줄에 면(`--side`)을 줘 본문과 가른다.",
  },
];

export function BankDetailHifiClient() {
  const [open, setOpen] = useState<Skin | null>(null);
  /**
   * 풀이 길이가 이 다섯 안을 가르는 축이다 (원장님 2026-09-14) — ③ 2열과 ⑤ 바닥 고정은
   * **긴 풀이에서만** 값이 드러난다. 짧은 것만 보고 고르면 고른 뒤에 뒤집힌다.
   */
  const [length, setLength] = useState<LengthKey>("long");
  /**
   * 그림 유무는 **길이와 다른 축**이다 (원장님 2026-09-14 「그림있을때 없을때 모두
   * 해봐」). 섞어 두면 ③ 이 좋아 보인 것이 길이 때문인지 그림 때문인지 못 가른다.
   */
  const [figure, setFigure] = useState(true);
  /** 검수 대기면 승인·반려가 더 서서 동작 줄이 가장 붐빈다 — ⑤ 를 볼 때 필요하다. */
  const [pending, setPending] = useState(false);
  const sample = LENGTH_SAMPLES.find((item) => item.key === length)!;
  const base = figure ? sample.withFigure : sample.problem;
  const problem = pending ? { ...base, reviewStatus: "pending" } : base;

  return (
    <main className="mx-auto max-w-[860px] px-8 py-6 text-ink">
      <h1 className="text-[15px] font-black">
        문제은행 상세 모달 — Hi-fi 시안 5안 (D-07)
      </h1>
      <p className="mt-2 text-[12.5px] leading-[1.7] text-text-2">
        구조는 Wire 에서 고르신{" "}
        <strong className="text-ink">Ⓑ 전체 상세 모달</strong>로 고정입니다.
        여기서 갈리는 것은 <strong className="text-ink">시각 디테일뿐</strong>
        입니다 — 다섯 안 모두 같은 알맹이(문제 · 정보 · 정답 · 풀이 · 동작 넷)를
        담습니다. 색은 전부 <strong className="text-ink">토큰</strong>이고
        단추는 <code>ui/Button</code> 의 네 갈래를 그대로 씁니다.
      </p>
      <p className="mt-2 text-[12.5px] leading-[1.7] text-text-2">
        배지는 이번에 되살린{" "}
        <strong className="text-ink">출처·그림·형식 3축</strong>
        입니다. 첫 문항은 기출이라 <code>[기]</code>, 둘째는 초등 엔진이라{" "}
        <code>[초]</code> 가 섭니다. 검수 상태만 기능색을 쓰고 난이도·유형은
        무채색입니다 (§2.2).
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2 border border-divider px-5 py-4">
        <span className={`${MICRO} flex-none text-text-2`}>풀이 길이</span>
        {LENGTH_SAMPLES.map((item) => (
          <Button
            key={item.key}
            variant={item.key === length ? "ink" : "secondary"}
            aria-pressed={item.key === length}
            onClick={() => setLength(item.key)}
          >
            {item.label}{" "}
            {(figure ? item.figChars : item.chars).toLocaleString("ko-KR")}자
          </Button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border border-divider px-5 py-4">
        <span className={`${MICRO} flex-none text-text-2`}>그림</span>
        <Button
          variant={figure ? "ink" : "secondary"}
          aria-pressed={figure}
          onClick={() => setFigure(true)}
        >
          있음
        </Button>
        <Button
          variant={figure ? "secondary" : "ink"}
          aria-pressed={!figure}
          onClick={() => setFigure(false)}
        >
          없음
        </Button>
        {figure ? (
          <span className="text-[11.5px] text-text-2">{sample.figNote}</span>
        ) : null}
        <Button
          variant={pending ? "ink" : "secondary"}
          className="ml-auto"
          aria-pressed={pending}
          onClick={() => setPending((value) => !value)}
        >
          검수 대기로 보기
        </Button>
      </div>
      <p className="mt-2 text-[11.5px] leading-[1.7] text-text-3">
        길이도 그림도{" "}
        <strong className="text-ink">실제 문제은행에서 떠 온 것</strong>
        입니다. 그림 없음은 103 · 292 · 1,028자, 그림 있음은 79 · 242 ·
        1,028자입니다 —{" "}
        <strong className="text-ink">짧은·중간의 그림 판은 다른 문항</strong>
        이라 길이가 조금 다릅니다(그 길이대에서 그림이 붙은 실물을 골랐고,
        맞추려고 지어내지 않았습니다).{" "}
        <strong className="text-ink">긴 것만 같은 문항</strong>에 원본 스캔을
        붙인 것이라 그림 유무만 놓고 견주는 순수 비교가 됩니다. 「검수 대기로
        보기」를 켜면 승인·반려가 더 서서 동작 줄이 가장 붐빕니다.
      </p>

      <ol className="mt-6 grid gap-3">
        {VARIANTS.map(({ no, skin, title, note }) => (
          <li key={skin} className="grid gap-2 border border-divider px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[15px] font-black tabular-nums">{no}</span>
              <span className="text-[12.5px] font-bold">{title}</span>
              <Button
                variant="secondary"
                className="ml-auto"
                onClick={() => setOpen(skin)}
              >
                열어 보기
              </Button>
            </div>
            <p className="m-0 text-[11.5px] leading-[1.7] text-text-2">
              {note}
            </p>
          </li>
        ))}
      </ol>

      {open ? (
        <DetailModal
          problem={problem}
          skin={open}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </main>
  );
}
