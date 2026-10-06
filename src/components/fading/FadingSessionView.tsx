"use client";

import {
  FadingCardSessionScreen,
  type FadingSessionScreenProps,
} from "./FadingCardSessionScreen";
import { FadingSessionScreen } from "./FadingSessionScreen";

/** An opened session keeps its server-pinned protocol even if the rollout flag changes. */
export function FadingSessionView(props: FadingSessionScreenProps) {
  const mode = props.practice ? props.state.mode : props.state.session?.mode;
  return mode === "cards" ? (
    <FadingCardSessionScreen {...props} />
  ) : (
    <FadingSessionScreen {...props} />
  );
}
