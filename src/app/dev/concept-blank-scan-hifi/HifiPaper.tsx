import { cloneElement, type ReactElement, type ReactNode } from "react";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import { wirePaperPages } from "../concept-blank-scan-wire/WirePaper";
import { PAPER_OPTIONS } from "../concept-blank-scan-wire/options";
import type { WireSample } from "../concept-blank-scan-wire/samples";
import s from "./scanHifi.module.css";

/** 합의 P1에 본문 밖 표식만 추가한 시안. 발행 ID는 제품 연결 단계에서 서버가 만든다. */
export function hifiPaperPages(
  sample: WireSample,
  part: "student" | "key" = "student",
) {
  return wirePaperPages(sample, PAPER_OPTIONS[0], part).map((page) => {
    const sheet = page.props.children as ReactElement<{ children: ReactNode }>;
    return cloneElement(page, {
      className: `${page.props.className} ${s.markedPaper}`,
      children: cloneElement(
        sheet,
        {},
        sheet.props.children,
        <span
          className={s.registration}
          data-cb-registration="tl"
          aria-hidden="true"
        />,
        <span
          className={s.registration}
          data-cb-registration="tr"
          aria-hidden="true"
        />,
        <span
          className={s.registration}
          data-cb-registration="br"
          aria-hidden="true"
        />,
        <span
          className={s.registration}
          data-cb-registration="bl"
          aria-hidden="true"
        />,
      ),
    });
  });
}

export function HifiPaperStrip({
  sample,
  part = "student",
  captured,
}: {
  sample: WireSample;
  part?: "student" | "key";
  captured?: number[];
}) {
  return (
    <PaperStrip
      hint="옆으로 넘겨 보기 · 지면을 누르면 확대"
      label={
        captured
          ? "찍은 쪽"
          : `${sample.label} · ${part === "student" ? "학생지" : "채점표"}`
      }
      maxScale={captured ? 0.18 : 0.35}
      scaleVars={["--cb-paper-scale"]}
      pages={hifiPaperPages(sample, part).flatMap((node, i) =>
        captured && !captured.includes(i)
          ? []
          : [
              {
                key: `${part}-${i}`,
                node,
                caption: `${i + 1}쪽`,
                enlargeLabel: `${i + 1}쪽 확대`,
              },
            ],
      )}
    />
  );
}
