/** Workspace callers retry only after the editor explicitly saves or discards. */
export function requestCourseNavigation(proceed: () => void): boolean {
  return window.dispatchEvent(
    new CustomEvent("course-srs-before-leave", {
      cancelable: true,
      detail: { proceed },
    }),
  );
}
