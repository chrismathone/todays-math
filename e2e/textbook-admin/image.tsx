import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  unoptimized?: boolean;
  priority?: boolean;
};

// No Next image optimizer in this static fixture: render the plain element.
export default function Image({ unoptimized, priority, ...rest }: Props) {
  void unoptimized;
  void priority;
  // This file is the next/image stand-in; callers pass their own alt.
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...rest} />;
}
