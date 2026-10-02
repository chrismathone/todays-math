/** Server rollout gate. Derived recommendations never add persisted SRS fields. */
export function mathPrerequisiteEnabled(): boolean {
  return process.env.MATH_PREREQ_CHECK === "on";
}
