# Actual React fixture — B + H3

Run from the worktree root, **only by the root-owned server lease**:

```sh
node node_modules/vite/bin/vite.js --config scripts/qa/ontology-full-operations/ui/vite.config.mts
```

The server binds `127.0.0.1:4318` with strict port. Root records its PID and stops it after review. No server was started by this worker while preparing these files.

Open `http://127.0.0.1:4318/?case=normal`. This runs the final `OntologyWorkspace` React component, shared header, textarea and PickerDialog with the actual Workroom stylesheet, global palette and local Pretendard font. The shell now uses the exact production WorkspaceNavigation component and Workroom sidebar/main/topbar/content classes, including all eleven visible Math menus. Only account data and non-ontology panels are synthetic; clicking every menu is available without API calls. The active mobile menu scrolls into the horizontal strip without moving the document. All displayed students, source facts, counts, AI preparations and receipts are synthetic. There is no API, model or DB call.

The collapsed tool outside the product selects normal, empty, error-retry, delay, forbidden, stale, lost-result, relation and publication. Reset remounts the component and clears fixture counters. At 390 and 1440, test typing, selecting a student, source coverage, three evidence steps, details, concrete diff, one confirmation, duplicate clicks, delayed navigation/context changes, back, permission failure, stale draft, retry and lost-result recovery. The lost-result case counts one write even when result retrieval repeats confirmation.

For the mobile-shell regression, inspect 390 / 768 / 1440: every navigation target is at least 44px, labels fit, eleven menus remain reachable by touch/keyboard, a deep-linked active last menu is visible, and document scrollWidth never exceeds clientWidth. Horizontal overflow belongs only to the bottom nav. Desktop side navigation, student pages and print remain unchanged. Root must verify these dimensions in an actual browser; jsdom does not prove layout.
