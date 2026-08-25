"use client";

import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import { ProblemCard } from "@/components/problem/ProblemCard";

import {
  CONTROL,
  SAMPLES,
  toCircledDigits,
  toEntity,
  type Sample,
} from "./fixtures";

/**
 * 「㉠ 목록을 ①~⑤ 로 바꿀까」를 **눈으로** 보고 정하는 자리 (D-80 남은 결정).
 *
 * 🔴 **같은 문제는 같은 뷰** — 여기서 그리는 것은 문제은행·미리보기·인쇄와 **같은
 *    `ProblemCard`** 다. 시안용으로 따로 그리면 「화면에서는 멀쩡한데 종이에서 다르다」가
 *    된다. 그래서 표식만 바꾼 두 벌을 **같은 컴포넌트**에 넣어 나란히 놓는다.
 *
 * 🔴 **실물을 그려 보고 내 말이 틀린 것을 알았다.** 처음에는 「㉠ 목록은 한 줄로 죽
 *    이어진다」고 적었는데, 오늘 아침 main 에 들어온 `hardBreaks`(홑 줄바꿈이 지면에서도
 *    줄바꿈이 된다)로 **줄은 이미 바뀐다.** 렌더된 HTML 을 세어 확인했다 —
 *    ㉠ 카드에 `<br>` 다섯, ① 카드에 `<br>` 없음(대신 보기 그리드).
 *
 * 남은 차이는 «줄바꿈»이 아니라 **«보기 목록 대접을 받는가»** 다:
 *   ㉠ (지금)   — 그냥 **본문 글줄**이다. 표식이 따로 서지 않아 보기가 길면 넘친 줄이
 *                표식 **아래로 파고든다**(내어쓰기 없음). 인쇄에서 두 단으로도 안 앉는다.
 *   ① (바꾸면) — **보기 목록**으로 그려진다. 표식이 제 자리에 서고 본문은 그 옆으로
 *                가지런히 내어쓰기되며, 보기가 짧으면 인쇄에서 **두 단**으로 앉는다.
 */

function Pair({ sample }: { sample: Sample }) {
  const now = toEntity(sample, sample.content, `${sample.problemCode}-now`);
  const next = toEntity(
    sample,
    toCircledDigits(sample.content),
    `${sample.problemCode}-next`,
  );
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-slate-900">
          {sample.title}
        </h2>
        <p className="font-mono text-xs text-slate-500">{sample.key}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-rose-700">
            지금 — ㉠ ㉡ ㉢ ㉣ ㉤ (본문 글줄)
          </p>
          <div style={{ maxWidth: PROBLEM_CARD_WIDTH }}>
            <ProblemCard problem={now} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-teal-700">
            바꾸면 — ① ② ③ ④ ⑤ (보기 목록)
          </p>
          <div style={{ maxWidth: PROBLEM_CARD_WIDTH }}>
            <ProblemCard problem={next} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function MarksClient() {
  const control = toEntity(CONTROL, CONTROL.content, "control");
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs tracking-widest text-slate-500 uppercase">
          dev · D-80 남은 결정
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          보기 표식을 ㉠ 에서 ① 로 바꿀까요
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-slate-600">
          보기 개수는 이제 세 유형 모두 <strong>다섯</strong>입니다. 남은 것은
          <strong> 모양</strong>입니다. 제품 렌더러는 개행 뒤에 ①~⑮ 또는{" "}
          <code className="rounded bg-slate-100 px-1">1.</code> 이 올 때만 그
          줄들을 <strong>보기 목록</strong>으로 대접합니다. ㉠~㉤ 로 쓴 목록은
          그냥 <strong>본문 글줄</strong>입니다.
        </p>
        <div className="max-w-prose rounded border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
          <strong>제가 먼저 적었던 말은 틀렸습니다.</strong> 「한 줄로 죽
          이어진다」고 보고드렸는데, 오늘 아침 들어온 지면 수리(홑 줄바꿈이
          지면에서도 줄바꿈이 된다) 덕분에 <strong>줄은 이미 바뀝니다.</strong>{" "}
          그려 놓고 세어 보고 알았습니다. 남은 차이는 아래 그대로입니다.
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-slate-600">
          아래는 <strong>엔진이 실제로 낸 본문</strong>을 문제은행·인쇄와{" "}
          <strong>같은 카드</strong>로 그린 것입니다. 왼쪽이 지금, 오른쪽이
          표식만 ①~⑤ 로 바꾼 것입니다. 본문은 한 글자도 안 건드렸습니다.
        </p>
      </header>

      {SAMPLES.map((s) => (
        <Pair key={s.key} sample={s} />
      ))}

      <section className="flex flex-col gap-3 border-t border-slate-200 pt-8">
        <h2 className="text-base font-semibold text-slate-900">
          대조군 — 이미 ①~⑤ 를 쓰는 유형
        </h2>
        <p className="max-w-prose text-sm text-slate-600">
          「바꾸면 이렇게 된다」의 실물 근거입니다. 같은 카드로 그렸습니다.
        </p>
        <div style={{ maxWidth: PROBLEM_CARD_WIDTH }}>
          <ProblemCard problem={control} />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          바꾸면 무엇이 달라지나 — 렌더된 화면에서 센 것
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
                <th className="py-1.5 pr-3 font-medium">지면 처리</th>
                <th className="py-1.5 pr-3 font-medium">지금 (㉠)</th>
                <th className="py-1.5 font-medium">바꾸면 (①)</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-b border-slate-200">
                <td className="py-1.5 pr-3">줄이 바뀌나</td>
                <td className="py-1.5 pr-3">바뀐다 (본문 줄바꿈)</td>
                <td className="py-1.5">바뀐다 (보기 목록)</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 pr-3">표식이 제 자리에 서나</td>
                <td className="py-1.5 pr-3">아니다 — 그냥 글자다</td>
                <td className="py-1.5">
                  <strong>선다</strong> — 넘친 줄이 표식 아래로 안 파고든다
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3">인쇄에서 두 단으로 앉나</td>
                <td className="py-1.5 pr-3">아니다</td>
                <td className="py-1.5">
                  <strong>보기가 짧으면 앉는다</strong> (지면이 덜 든다)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 text-sm leading-relaxed text-slate-700">
          <li>
            바뀌는 것은 <strong>표식 글자뿐</strong>입니다 — 발문·보기
            내용·정답· 해설은 그대로입니다.
          </li>
          <li>
            대상은 <strong>세 유형</strong>이고, 공유 DB 에서 지금 출제에 나가는
            해당 문항은 <strong>6건</strong>입니다.
          </li>
          <li>
            <strong>반대 이유 하나</strong>: ㉠ 은 「보기 상자」 관행이고 ① 은
            「객관식」 관행입니다. 이 셋은 정답이 <em>개수</em>인 문항이라 ① 을
            쓰면 객관식처럼 보일 수 있습니다.
          </li>
        </ul>
      </section>
    </main>
  );
}
