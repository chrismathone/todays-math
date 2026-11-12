# Independent adversarial review

2026-11-12 · Codex dispatched reviewer · base/HEAD `f45cb88dd073ab731b463f2b174dab1ab357f676` · working-tree implementation reviewed without editing it.

**Result: one actionable introduced finding remains (P2). Zero actionable introduced findings is false.** The review is complete; fixing and verifying the finding belongs to the implementation owner.

## Finding

### P2 — Full-card selection intercepts the excluded page's retry button

- **Introduced location:** `src/components/paper-strip/editable-paper-strip.module.css:91–100`, particularly the full-card `inset: 0` and `z-index: 1` at lines 93–94; the new button is rendered by `src/components/paper-strip/EditablePaperStrip.tsx:117–132`.
- **Interacting existing rule:** `editable-paper-strip.module.css:145–148` puts excluded `.visual` content inside an opacity/filter stacking context. Giving its descendant retry button `z-index: 2` at lines 133–137 cannot lift that button above the sibling full-card selection layer.
- **Effect:** an enabled, visible “다시 시도” inside an excluded thumbnail receives no pointer click. The selection button receives it instead. Keyboard activation and restoring the page are workarounds, so this is P2 rather than a complete editor blocker.

Reproduction in the supplied hermetic browser at 1920×1080:

1. In Studio 쪽 순서, exclude the ready `source-a.pdf` original page 1 using its independent minus button.
2. Exercise its existing image-error path. For a deterministic, local reproduction, dispatch `new Event("error")` on that card's `<img>`; this invokes the production `onError` handler and does not replace components or server data. A preview load failure after exclusion reaches the same state.
3. Click the center of that card's visible “다시 시도” with actual mouse down/up.
4. The retry click listener remains at **0**, and focus lands on `source-a.pdf 원본 1쪽 선택`. `document.elementFromPoint` at the retry center returns that selection button, not retry.
5. Restore the same page without changing the failed preview. The same center now resolves to retry; actual mouse down/up increments the listener to **1** and rerenders its PDF preview.

Measured retry rectangle: x=339.953125, y=307.265625, width=77.734375, height=44; the covered click was at (379,329). Evidence: [hit test and actual click results](review-evidence/excluded-retry-hit.json), [unmodified screenshot](review-evidence/excluded-retry-covered.png).

**Introduced-versus-existing basis:** base `f45cb88dd` already faded/filtered excluded visuals, but its small selection button occupied the upper toolbar rather than covering the retry area. This change adds the sibling covering layer. The existing opacity rule alone did not block the retry center. Keep retry in a layer that can receive pointer input above selection, including excluded cards; lifting a descendant within the faded stacking context is insufficient.

## Evidence and test claims challenged

- The README's statement that retry remains an independent operation needs qualification until the finding is fixed. Existing tests at `src/__tests__/components/StudioPageOrder.test.tsx:144–170` use a non-excluded failed card and `fireEvent.click(retry)`. That bypasses browser hit testing and cannot detect this failure. Add a browser-level excluded+failed-card pointer check; an equivalent direct event dispatch would still give false confidence.
- The new whole-card test verifies attributes and handlers in jsdom, not the CSS hit area. I independently used actual mouse movement/down/up from the middle of `source-b.pdf` original page 1 to before `source-a.pdf` original page 1. The order changed across files, selection stayed on the dragged original, and no dialog opened. A subsequent ordinary click selected a different original correctly. Undo restored the prior order.
- Native Space and Enter selected the focused card. With another card selected, focusing original page 4 and pressing Alt+→ moved original page 4, retained its button focus, and updated its preview; Alt+← restored the original order. [Independent interaction record](review-evidence/native-interactions.json).
- The owner's `11 files / 281 tests` claim matches its saved log. My rerun was deliberately narrower: **4 files / 73 tests passed**, including StudioPageOrder, editable and ordinary PaperStrip, and StudioView page-order integration. That passing result coexists with the pointer failure above. [Independent test log](review-evidence/focused-tests.log).
- The H2 count of 9,111 Hangul words is 3,037 words examined in each of three viewport scenes, as the JSON shows; it is not 9,111 unique content items. The README already limits this claim appropriately.

## Responsive and identity review

I remeasured the existing 12-card fixture at 1920×1080, 2560×1440, 1280×800, 1050×800, 768×1024, 760×900, 390×844, 320×740, and 1920×600, allowing resize/scroll animation frames to settle before measurements. No document horizontal overflow was observed. At the three larger two-column sizes, the aside ended 16px above the viewport bottom. The smaller widths used one column and document scrolling; the final keyboard hint was reachable above the mobile navigation. The short wide screen retained the 560px editor minimum and document scrolling. [Independent measurements](review-evidence/responsive-measurements.json).

I also checked the collapsed sidebar at 1920×1080, 1280×800 and 1050×800: no document horizontal overflow, 16px bottom clearance in the two-column cases, and the expected one-column switch at 1050. [Collapsed-sidebar measurements](review-evidence/collapsed-measurements.json). I restored the expanded sidebar afterward. I inspected the supplied 1920, 2560 and mobile-detail captures visually. These support the measured layout claims; the documented 2560 capture/DPR limitation is not treated as a product defect. No additional introduced height/overflow finding was established.

Original-page captions, the image's “원본 이미지”, source ordinals, and stable `sourceId+page` keys match the code and browser fixture. The duplicate-filename/repeated-page regression test passed and verifies ordinal disambiguation after reorder/exclusion. I did not upload another duplicate file for a second native-browser duplicate test. Exclusion/restore remained separately clickable during the retry reproduction; restoring did not change original identity.

## Existing H2 entry

The recorded route is accurate: **오늘 수학 → 개념 백지 → 단원 고르기 → 학년/단원 선택 → 선택 완료 → 형식 켜기 → 직접**, followed by **문항 고르기** for subsequent entry. H2 is an existing picker rather than a separate step tab.

In the same browser I entered 개념 백지, reopened its unit dialog, verified the existing selected 초5 unit and accepted 선택 완료, then changed the enabled B form from 직접 to 자동 and back to 직접. This immediately opened `B 개념 질문 — 문항 고르기` at 1200×850; Escape returned focus to 직접. Its subsequent 문항 고르기 button reopened the same picker, and Escape returned focus to that opener. Source `ConceptBlankView.tsx:722–725, 1396–1406` confirms the same wiring and is unchanged by this diff. [Independent entry evidence](review-evidence/h2-entry-actions.json). I reused the preselected unit/form rather than claiming a fresh first-time selection run.

## Checks and limits

- Read AGENTS.md, DESIGN.md, the menu map, the working-tree diff, relevant current/base sources, affected tests, README, interaction/measurement JSON and representative screenshots.
- Ran the focused Vitest invocation once, sequentially, with `--maxWorkers=3`; ran `git diff --check` successfully. Did not rerun full suites, builds, type-check or lint; the latter claims remain the owner's recorded checks.
- Used only the supplied server and browser page `beb95458-f1d2-4192-aa10-52636a6de1be`. Browser mutations were local fixture interactions and an image-error event; no account/DB write, credentials inspection, environment-file change, dependency generation/install, commit or push occurred. The server's hermetic configuration is supplied context, not a credentials audit by this reviewer.
- No real touch-device drag, second browser engine, browser zoom, maximized authenticated shell, fresh authenticated production session, physical print, or production deployment was tested. Native drag cancellation/external-drop/IME/busy cases were inspected in source and the passing focused tests, not all repeated with real input.
- The fixture's existing “미리보기에서는 저장하거나 제작하지 않습니다” notice is intentional supplied behavior, not an introduced saving regression. Existing H2 layout and previously accepted Studio density choices were not redesigned or counted as new defects.
- Only this report and evidence under `scratch/studio-polish/review/` were written. The browser was returned to Studio page order; implementation files remain untouched by this reviewer.

## Resolution recheck — 2026-11-12

**Final status: the P2 finding above is resolved; zero actionable introduced findings remain in the reviewed scope.** This final status supersedes the initial open-finding count while preserving its reproduction and evidence.

The implementation owner added `z-index: 2` and `pointer-events: none` to `.thumbnail` at `src/components/paper-strip/editable-paper-strip.module.css:56–57`. The existing `.visual button { pointer-events: auto }` lets retry receive input above selection even inside the excluded opacity/filter context. I inspected that CSS change and the owner's `excluded-retry-fixed.json`, then independently repeated the failure with the same hermetic server and pinned browser page.

- At **1920×1080 and 390×844**, kept original page 1 excluded and dispatched the same image-error event to its thumbnail. In each case, `elementFromPoint` at the visible retry center returned the enabled retry button. Actual mouse down/up invoked its independently attached listener **exactly once**, the PDF thumbnail reappeared, and the page remained excluded. This closes the original reproduction without restoring the page first. [Independent retry results and action trace](review-evidence/retry-fixed-independent.json), [1920 failure-state capture](review-evidence/retry-fixed-independent-1920.png), [390 failure-state capture](review-evidence/retry-fixed-independent-390.png).
- At **1920×1080**, the centers of two ready page images still hit their native selection buttons and reported `draggable: true`. An actual body click selected `source-b.pdf` original page 1 without a dialog. Actual mouse movement/down/up from that image's center dragged it before `source-a.pdf` original page 1 across files, preserving selection; undo restored the previous order.
- Actual pointer clicks on the independent caption **되살리기** and **빼기** buttons each changed only the intended original's exclusion state. Their centers hit their own buttons rather than selection. The final order and exclusion flags matched the state at the start of this recheck. [Independent body, drag and control results](review-evidence/fixed-body-controls-independent.json).

`git diff --check` passed. This targeted CSS recheck did not rerun Vitest, full suites, builds, type-check or lint; the earlier four-file/73-test result remains historical evidence from the initial review. Prior environment and coverage limits still apply, including no real touch-device drag or second browser engine. I edited only this report and my evidence directory, left the implementation untouched, and returned the browser to 1920×1080 Studio page order.
