import { PAPER_COLORS } from "./tokens";

type Rgb = readonly [number, number, number];

function rgb(color: string): Rgb | null {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return null;
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

function luminance(color: Rgb) {
  const linear = color.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function ratio(foreground: Rgb, background: Rgb) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Keep the selected fill, with readable small text inside colored badges. */
export function inkOnColor(background: string): string {
  const fill = rgb(background);
  if (!fill) return PAPER_COLORS.ink;
  return ratio([0, 0, 0], fill) >= ratio([255, 255, 255], fill)
    ? "#000000"
    : "#FFFFFF";
}

/** Selected accents remain decorative; information uses their nearest readable ink. */
export function readablePaperColor(
  color: string,
  background: string = PAPER_COLORS.paperWarm,
): string {
  const foreground = rgb(color);
  const paper = rgb(background) ?? rgb(PAPER_COLORS.paperWarm)!;
  if (!foreground) return PAPER_COLORS.ink;
  if (ratio(foreground, paper) >= 4.5) return color;
  const target = rgb(inkOnColor(background))!;
  const mix = (amount: number): Rgb => {
    const channel = (at: number) =>
      Math.round(foreground[at] + (target[at] - foreground[at]) * amount);
    return [channel(0), channel(1), channel(2)];
  };
  let lower = 0;
  let upper = 1;
  for (let step = 0; step < 12; step++) {
    const midpoint = (lower + upper) / 2;
    if (ratio(mix(midpoint), paper) >= 4.5) upper = midpoint;
    else lower = midpoint;
  }
  return (
    "#" +
    mix(upper)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")
  );
}
