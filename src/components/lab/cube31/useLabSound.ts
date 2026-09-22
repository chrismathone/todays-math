"use client";

import { useEffect, useRef, useState } from "react";

type Cue = "success" | "milestone" | "retry" | "advance";
const NOTES: Record<Cue, number[]> = {
  success: [523.25, 659.25, 783.99],
  milestone: [523.25, 659.25, 783.99, 1046.5],
  retry: [392],
  advance: [659.25],
};

/** Short, quiet synthesized cues; audio is only enabled by a learner gesture. */
export function useLabSound() {
  const [enabled, setEnabled] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const voices = useRef<Set<OscillatorNode>>(new Set());
  useEffect(() => {
    const activeVoices = voices.current;
    return () => {
      for (const voice of activeVoices) voice.stop();
      activeVoices.clear();
      void context.current?.close().catch(() => {});
      context.current = null;
    };
  }, []);

  function play(cue: Cue) {
    const audio = context.current;
    if (!enabled || !audio || audio.state !== "running") return;
    // Rapid Enter presses replace the previous cue instead of stacking sounds.
    for (const voice of voices.current) voice.stop();
    voices.current.clear();
    NOTES[cue].forEach((frequency, index) => {
      const start = audio.currentTime + index * 0.075;
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(0.055, start + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      oscillator.connect(envelope);
      envelope.connect(audio.destination);
      voices.current.add(oscillator);
      oscillator.onended = () => {
        voices.current.delete(oscillator);
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + 0.15);
    });
  }

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      for (const voice of voices.current) voice.stop();
      voices.current.clear();
      return;
    }
    if (!window.AudioContext) return;
    try {
      context.current ??= new AudioContext();
      await context.current.resume();
      setEnabled(context.current.state === "running");
    } catch {
      setEnabled(false);
    }
  }

  return { enabled, toggle, play };
}
