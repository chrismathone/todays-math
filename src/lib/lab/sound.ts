let audioContext: AudioContext | null = null;

export function playHit(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
    const t = audioContext.currentTime;
    [440, 660].forEach((freq, i) => {
      const o = audioContext!.createOscillator();
      const g = audioContext!.createGain();
      o.frequency.value = freq;
      o.connect(g);
      g.connect(audioContext!.destination);
      g.gain.setValueAtTime(0.0001, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.05, t + i * 0.05 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.12);
      o.start(t + i * 0.05);
      o.stop(t + i * 0.05 + 0.13);
    });
  } catch {
    /* sound is optional */
  }
}
