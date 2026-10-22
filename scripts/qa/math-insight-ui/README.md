# Teacher learning insight synthetic QA

This fixture uses the production CourseDashboard entry, Workroom stylesheet,
global tokens, Pretendard and KaTeX. All people, records and API responses are
synthetic and held in memory. It reads no environment files or real database and
must reject every request outside the fixture's explicit local routes.

The coordinator must grant the single browser/server lease before running the
verification script. The script owns one local Vite server and one Chromium
engine and closes both in `finally`.

Acceptance includes 390px and 1440px layouts; real font readiness; no document
overflow; labeled controls and visible keyboard focus; loading, empty, error,
unavailable and inconsistent responses; explicit AI requests only; retained
deterministic evidence after AI failure; and stale GET/POST protection when
student, class, branch or reload changes. These checks do not establish real
account authorization, production readiness or educational effectiveness.
