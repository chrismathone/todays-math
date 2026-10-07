import { notFound } from "next/navigation";

import { devPageVisible } from "@/lib/devPageAccess";

import { CANDIDATES, glyphPxAt, readSamples } from "./samples";
import type { GlyphPayload, GlyphSample } from "./samples";

/**
 * **그림 속 글자가 종이에서 본문보다 작은가** — 실물 비교 지면 (D-07 확정용).
 *
 * ## 왜 종이인가
 *
 * 화면으로는 못 정한다. 2026-08-19 에 범위 UI 를 ASCII 로 골랐다가 원장님이 실물
 * html 을 보시고 **다른 안으로 바꾸셨다.** 크기는 특히 그렇다 — 「12.5px 보다 작다」는
 * 숫자이고, 「읽히나」는 종이에서만 답이 나온다. 그래서 **인쇄하시라고** 만든다
 * (절대 규칙 6).
 *
 * ## 무엇을 물어보나
 *
 * 갈래가 실제로 내는 그림 중 **글자가 있는 70종** 가운데 **35종**이 지면에서
 * 본문(12.5px)보다 작은 글자로 나간다. 가장 나쁜 것이 **7.62px** — 본문의 61% 다.
 *
 * 원인이 둘이다:
 *   ㉠ `wide` 등급이 화면 360px 인데 지면은 70mm 다. 이 저장소의 배율(3.75px/mm)로는
 *      96mm 여야 한다 — **지면에서만 27% 작아진다.**
 *   ㉡ 그림 자체가 작은 글자를 쓴다(`clocks` 는 viewBox 252 에 8단위). 폭을 키워도
 *      한계가 있다.
 *
 * ⚠️ **이 지면이 정할 수 있는 것은 ㉠ 뿐이다.** ㉡ 은 그리는 쪽(파이썬 엔진)을
 *    고쳐야 하고, 그건 이 화면에서 못 보여 드린다. 그래서 후보 넷은 전부
 *    **「얼마나 크게 싣는가」**만 바꾼다.
 *
 * ## 🔴 원장이 없으면 **적고 멈춘다**
 *
 * 표본이 없으면 화면을 그리지 않는다 — 빈 화면을 「문제 없음」으로 읽으면 안 된다.
 */
export const dynamic = "force-dynamic";

const cellMm = (mm: number) => ({ width: `${mm}mm`, maxWidth: "100%" });

function Row({ s, p }: { s: GlyphSample; p: GlyphPayload }) {
  return (
    <section className="break-inside-avoid border-b border-neutral-300 py-5">
      <h3 className="mb-1 text-[13px] font-bold">
        {s.grade} {s.section} · {s.kind}
        <span className="ml-2 font-normal text-neutral-600">
          viewBox {s.viewBox} · 글자 {s.fontUnits}단위 · 등급 {s.size}
        </span>
      </h3>

      {/* 본문 글자 — 그림 바로 옆에 둔다. 이것이 견줄 상대다. */}
      <p className="mb-3 text-[12.5px] leading-[1.55]">
        본문은 이 크기입니다(12.5px). 아래 그림 속 숫자·이름이 이 글자보다
        작으면 학생이 종이에서 못 읽습니다. 견주실 것은 <b>이 문장의 글자</b>
        입니다.
      </p>

      <div className="flex flex-wrap items-start gap-6">
        {CANDIDATES.map((c) => {
          const mm = c.mmFor(s, p);
          const px = glyphPxAt(s, mm, p.pxPerMm);
          const short = px < p.bodyPx;
          return (
            <figure key={c.id} className="break-inside-avoid">
              <figcaption className="mb-1 text-[11px]">
                <b>{c.label}</b>
                <span className="ml-1 text-neutral-600">
                  {mm}mm · 글자 {px.toFixed(2)}px
                </span>
                <span className={short ? "ml-1 font-bold" : "ml-1"}>
                  {short ? "◀ 본문보다 작다" : "✓"}
                </span>
              </figcaption>
              <div
                style={cellMm(mm)}
                className="[&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: s.svg }}
              />
            </figure>
          );
        })}
      </div>
    </section>
  );
}

export default async function Page() {
  // 프록시가 `/dev/` 를 공개로 둔다 — production 에서는 **로그인한 원장에게만** 연다
  // (`src/lib/devPageAccess.ts`). 실물 비교 지면이라 인쇄하시는 컴퓨터에서도 보여야 한다.
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  const p = readSamples();

  if (!p) {
    return (
      <main className="mx-auto max-w-[900px] p-8">
        <h1 className="text-lg font-bold">그림 글자 크기 — 표본이 없습니다</h1>
        <p className="mt-3 text-[13px]">
          먼저 <code>python scripts/qa/pick-glyph-size-samples.py</code> 를
          돌리십시오.
          <b> 빈 화면을 「문제 없음」으로 읽으면 안 됩니다.</b>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[210mm] p-8 print:p-0">
      <h1 className="text-lg font-bold">
        그림 속 글자가 종이에서 본문보다 작은가 — 실물 비교
      </h1>

      <p className="mt-2 text-[13px] leading-[1.6]">
        갈래가 실제로 내는 그림 <b>{p.drawn}장</b> 중 글자가 있는 것이{" "}
        <b>{p.withText}종</b>이고, 그 가운데 <b>{p.belowBody}종</b>이 지면에서
        본문(
        {p.bodyPx}px)보다 작은 글자로 나갑니다. 아래는{" "}
        <b>나쁜 것 12 + 멀쩡한 것 4</b>
        입니다 — 멀쩡한 것을 같이 둔 것은 「전부 이렇구나」로 읽히지 않게 하려는
        것입니다. 잰 날: {p.measuredOn}.
      </p>

      <p className="mt-2 text-[13px] leading-[1.6]">
        <b>인쇄해서 보십시오.</b> 화면 배율로는 판단이 어긋납니다. 각 줄에 본문
        문장이 같이 있으니,{" "}
        <b>그 문장의 글자와 그림 속 숫자를 눈으로 견주시면</b> 됩니다.
      </p>

      <ul className="mt-3 space-y-1 text-[12px] leading-[1.5]">
        {CANDIDATES.map((c) => (
          <li key={c.id}>
            <b>{c.label}</b> — {c.note}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[12px] leading-[1.5] text-neutral-700">
        ⚠️ 후보 넷은 전부 <b>「얼마나 크게 싣는가」</b>만 바꿉니다. 그림 자체의
        글자를 키우는 것은 그리는 쪽(엔진)을 고치는 일이라 이 화면에서 보여 드릴
        수 없습니다. 폭으로 못 메우는 자리가 남으면 그때 따로 여쭙겠습니다.
      </p>

      <div className="mt-6">
        {p.samples.map((s) => (
          <Row key={`${s.grade}${s.section}${s.kind}`} s={s} p={p} />
        ))}
      </div>
    </main>
  );
}
