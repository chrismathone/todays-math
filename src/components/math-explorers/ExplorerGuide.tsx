"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GUIDE_IDS, type GuideId } from "@/contracts/mathSrsGuide.contract";
import { getGuide, saveGuide } from "@/components/math-srs/guideApi";
import b from "./explorer-study-book.module.css";

const names: Record<GuideId, string> = {
  "peer-recorder": "또래 기록가",
  marten: "담비",
  "paper-swallow": "종이 제비",
  "bookmark-spirit": "책갈피 정령",
  "wood-friend": "나무 조각 친구",
};
type GuideContext = {
  id: GuideId | null;
  picking: boolean;
  open: () => void;
  choose: (id: GuideId) => Promise<void>;
  saving: boolean;
};
const Guide = createContext<GuideContext | null>(null);
export const useExplorerGuide = () => useContext(Guide);

/** Lifetime is the student app visit, including a failed save and study round trips. */
export function ExplorerGuideProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [id, setId] = useState<GuideId | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const chosen = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void getGuide().then((result) => {
      if (!active || chosen.current || !result.ok) return;
      setId(result.data?.id ?? null);
      setPicking(result.data === null);
    });
    return () => {
      active = false;
    };
  }, [enabled]);
  async function choose(choice: GuideId) {
    if (pending.current) return;
    pending.current = true;
    chosen.current = true;
    setSaving(true);
    setId(choice);
    setPicking(false);
    if (enabled) await saveGuide(choice);
    setSaving(false);
    pending.current = false;
  }
  return (
    <Guide.Provider
      value={{ id, picking, saving, open: () => setPicking(true), choose }}
    >
      {children}
    </Guide.Provider>
  );
}

export function GuidePicker() {
  const guide = useExplorerGuide();
  const [selected, setSelected] = useState<GuideId | null>(guide?.id ?? null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, []);
  if (!guide) return null;
  return (
    <div className={b.study}>
      <h1 ref={title} tabIndex={-1}>
        함께할 길잡이를 골라요
      </h1>
      <div className={b.guideChoices} aria-label="길잡이 고르기">
        {GUIDE_IDS.map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={selected === id}
            disabled={guide.saving}
            onClick={() => setSelected(id)}
          >
            <img
              src={`/lab/guides/${id}/guide.webp`}
              width={100}
              height={100}
              alt=""
            />
            <span>{names[id]}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className={b.start}
        disabled={!selected || guide.saving}
        onClick={() => {
          if (selected) void guide.choose(selected);
        }}
      >
        {guide.saving ? "함께할 준비 중…" : "이 친구와 시작"}
      </button>
    </div>
  );
}

export function GuideArt() {
  const guide = useExplorerGuide();
  if (!guide) return <div className={b.guideArt}>길잡이</div>;
  return (
    <button
      type="button"
      className={b.guideArt}
      onClick={guide.open}
      aria-label={
        guide.id ? `길잡이 바꾸기: ${names[guide.id]}` : "길잡이 고르기"
      }
    >
      {guide.id ? (
        <img
          src={`/lab/guides/${guide.id}/guide.webp`}
          alt={names[guide.id]}
          width={100}
          height={76}
        />
      ) : (
        "길잡이 고르기"
      )}
    </button>
  );
}

export function GuideReward() {
  const guide = useExplorerGuide();
  if (!guide?.id)
    return <div className={b.reward}>오늘의 한 장을 채웠어요</div>;
  return (
    <div className={b.guideEnding}>
      <img
        src={`/lab/guides/${guide.id}/done.webp`}
        alt={`${names[guide.id]}의 축하`}
        width={100}
        height={76}
      />
      <div className={b.reward}>
        <img
          src={`/lab/guides/${guide.id}/reward.webp`}
          alt={`${names[guide.id]}의 보상`}
          width={126}
          height={126}
        />
      </div>
      <p>오늘의 한 장을 채웠어요</p>
    </div>
  );
}
