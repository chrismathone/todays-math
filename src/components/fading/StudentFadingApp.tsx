"use client";
import { useState } from "react";
import { createApiFadingSource } from "./apiSource";
import { FadingApp } from "./FadingApp";
export function StudentFadingApp() {
  const [source] = useState(createApiFadingSource);
  return <FadingApp source={source} />;
}
