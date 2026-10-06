"use client";
import { useEffect, useState } from "react";
import type { FadingConcept } from "@/lib/fading/concepts";
import type { FadingTrap } from "@/lib/fading/chips";
import type { FadingFigure } from "@/lib/fading/figures";
import { FadingSourceError } from "@/lib/fading/source";
import { FadingApp } from "@/components/fading/FadingApp";
import { FadingPreview } from "@/components/fading/FadingPreview";
import {
  FADING_DEV_SCENES,
  prepareFadingDev,
  type FadingDevOptions,
} from "@/components/fading/devFixtures";
import type { FadingSample } from "@/components/fading/devSamples";
import s from "@/components/fading/fading.module.css";

const labels = [
  "첫날",
  "평소",
  "오늘 다 끝냄",
  "밀림",
  "오래 쉼",
  "1단계",
  "2단계",
  "3단계",
  "4단계",
  "평가",
  "통계",
  "목록",
  "연결 끊김",
  "불러오는 중",
  "저장 실패",
  "409 뒤 맞추기",
  "위험 색 대조",
];
export function FadingDevClient({
  concepts,
  samples,
  bankSize,
  options,
  traps,
  figures,
}: {
  concepts: FadingConcept[];
  samples: FadingSample[];
  bankSize: number;
  options: FadingDevOptions;
  traps: Readonly<Record<string, readonly FadingTrap[]>>;
  figures: Readonly<Record<string, FadingFigure>>;
}) {
  const [prepared, setPrepared] = useState<Awaited<
    ReturnType<typeof prepareFadingDev>
  > | null>(null);
  const [preparationFailure, setPreparationFailure] = useState<string | null>(
    null,
  );
  useEffect(() => {
    let live = true;
    void prepareFadingDev(concepts, options, traps, figures)
      .then((result) => {
        if (live) setPrepared(result);
      })
      .catch((error) => {
        if (live)
          setPreparationFailure(
            error instanceof Error
              ? error.message
              : "로컬 화면을 준비하지 못했습니다.",
          );
      });
    return () => {
      live = false;
    };
  }, [concepts, options, traps, figures]);
  if (options.preview)
    return (
      <FadingPreview
        concepts={concepts}
        traps={traps}
        figures={figures}
        today="2026-10-06"
        cards={options.cards}
      />
    );
  const selected =
    samples.find((row) => row.id === options.conceptId) ?? samples[0]!;
  return (
    <div className={s.root}>
      <details
        style={{ padding: "0 16px", borderBottom: "1px solid #dce4f2" }}
        data-qa-controls="true"
      >
        <summary
          style={{
            minHeight: 44,
            lineHeight: "44px",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          화면 확인 · 저장되지 않음
        </summary>
        <div className={s.stack} style={{ marginTop: 12 }}>
          <p className={s.small}>
            은행 {bankSize}개에서 계산한 표본 {samples.length}개 ·{" "}
            {selected.reason}
          </p>
          <form action="/dev/fading" className={s.filters}>
            {options.cards && <input type="hidden" name="cards" value="1" />}
            <label className={s.left}>
              장면
              <select
                name="scene"
                className={s.select}
                defaultValue={options.scene}
              >
                {FADING_DEV_SCENES.map((scene, i) => (
                  <option value={scene} key={scene}>
                    {labels[i]}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.left}>
              표본
              <select
                name="concept"
                className={s.select}
                defaultValue={selected.id}
              >
                {samples.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.reason} · 표적 {row.targets}
                  </option>
                ))}
              </select>
            </label>
            <button className={s.primary} type="submit">
              열기
            </button>
          </form>
          <a
            className={s.secondary}
            href={
              options.cards
                ? "/dev/fading?scene=step1"
                : "/dev/fading?scene=step1&cards=1"
            }
          >
            {options.cards ? "기존 칩 풀이 확인" : "새 카드 풀이 확인"}
          </a>
          <a
            className={s.secondary}
            href={
              options.cards
                ? "/dev/fading?preview=1&cards=1"
                : "/dev/fading?preview=1"
            }
          >
            작업실 미리 보기 알맹이
          </a>
        </div>
      </details>
      <div
        data-qa-sample={selected.id}
        data-qa-reason={selected.reason}
        data-qa-samples={JSON.stringify(samples)}
        data-qa-ready={!!prepared}
      >
        {prepared ? (
          <FadingApp
            source={
              options.scene === "offline"
                ? {
                    ...prepared.source,
                    state: async () => {
                      throw new FadingSourceError(
                        "OFFLINE",
                        "연결되지 않았습니다. 다시 시도하세요.",
                        0,
                      );
                    },
                  }
                : options.scene === "loading"
                  ? { ...prepared.source, state: () => new Promise(() => {}) }
                  : prepared.source
            }
            initialState={
              ["offline", "loading"].includes(options.scene)
                ? undefined
                : prepared.state
            }
            initialTab={
              options.scene === "stats"
                ? "stats"
                : options.scene === "catalog"
                  ? "catalog"
                  : "home"
            }
            initialSession={
              options.scene.startsWith("step") ||
              ["rating", "save-error", "conflict"].includes(options.scene)
            }
          />
        ) : preparationFailure ? (
          <p role="alert" className={s.alert}>
            {preparationFailure}
          </p>
        ) : (
          <p role="status" style={{ padding: 24 }}>
            로컬 화면을 준비하는 중…
          </p>
        )}
      </div>
    </div>
  );
}
