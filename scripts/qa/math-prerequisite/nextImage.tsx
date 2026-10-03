import type { ImgHTMLAttributes } from "react";
export default function Image(
  props: ImgHTMLAttributes<HTMLImageElement> & {
    unoptimized?: boolean;
    priority?: boolean;
  },
) {
  const { unoptimized, priority, ...image } = props;
  void unoptimized;
  void priority;
  // eslint-disable-next-line @next/next/no-img-element -- isolated browser fixture only
  return <img {...image} alt={image.alt ?? ""} />;
}
