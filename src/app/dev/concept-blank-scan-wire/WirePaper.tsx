import { cloneElement, type ReactElement, type ReactNode } from "react";
import { conceptBlankPages } from "@/components/concept-blank/ConceptBlankPaper";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import type { PaperOption } from "./options";
import type { WireSample } from "./samples";
import s from "./scanWire.module.css";

const SCALE_VARS = ["--cb-paper-scale"];

/** 제품 조판이 만든 A4·본문·발·글자 코드를 유지하고, 시안의 QR만 머리에 추가한다. */
export function wirePaperPages(
  sample: WireSample,
  option: PaperOption,
  part: "student" | "key" = "student",
) {
  return conceptBlankPages({
    sheets: sample.sheets,
    view: part,
    code: sample.code,
  }).map((page, i) => {
    const sheet = page.props.children as ReactElement<{
      children: ReactNode[];
      "data-cb-page": number;
    }>;
    const [head, ...body] = sheet.props.children;
    const qr = sample.qr[part][i];
    const hasQr = part === "student" || option.keyQr;
    return cloneElement(page, {
      key: `${sample.id}-${part}-${i}`,
      className: `${page.props.className} ${s.wirePaper}`,
      children: cloneElement(
        sheet,
        {},
        hasQr ? (
          <div
            className={`${s.qrHead} ${s[option.layout]}`}
            data-first={sheet.props["data-cb-page"] === 1}
            style={{ ["--qr-size" as string]: `${option.mm}mm` }}
          >
            <div className={s.originalHead}>{head}</div>
            <div className={s.qrBlock}>
              {/* 인쇄할 data URL은 최적화·재샘플링하지 않는다. 제품 QR과 같은 M/4모듈 여백. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${part === "student" ? "학생지" : "채점표"} ${i + 1}쪽 QR`}
                src={qr.dataUrl}
                data-wire-qr=""
                data-url={qr.url}
                data-modules={qr.modules}
                width={(option.mm * 96) / 25.4}
                height={(option.mm * 96) / 25.4}
              />
              <span>
                {part === "student" ? "답안 촬영" : "채점표"} · {i + 1}/
                {sample.qr[part].length}
              </span>
            </div>
          </div>
        ) : (
          head
        ),
        ...body,
      ),
    });
  });
}

export function SampleStrip({
  sample,
  option,
  part = "student",
  captured,
}: {
  sample: WireSample;
  option: PaperOption;
  part?: "student" | "key";
  captured?: number[];
}) {
  const pages = wirePaperPages(sample, option, part);
  return (
    <PaperStrip
      label={`${sample.label} ${part === "student" ? "학생지" : "채점표"}`}
      hint={
        captured
          ? "찍은 쪽을 눌러 전체 지면 확인"
          : "옆으로 넘겨 보기 · 지면을 눌러 확대"
      }
      maxScale={captured ? 0.18 : 0.33}
      scaleVars={SCALE_VARS}
      pages={pages.flatMap((node, i) =>
        captured && !captured.includes(i)
          ? []
          : [
              {
                key: `${part}-${i}`,
                node,
                caption: `${i + 1}/${pages.length}쪽${captured ? " · 촬영됨" : ""}`,
                enlargeLabel: `${i + 1}쪽 전체 지면 확대`,
              },
            ],
      )}
    />
  );
}
