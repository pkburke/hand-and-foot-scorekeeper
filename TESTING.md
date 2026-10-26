# Web release acceptance — 3.3.3

Use https://handandfoottest.theburkeclann.com/ for acceptance. Confirm Settings → About shows **3.3.3** before recording results. Keep production on its approved version until device checks and live-game testing are complete. Export important games before testing and close or reload older app windows; previous versions do not participate in the new writer protection.

GitHub Actions runs regression checks separately from Cloudflare deployment. A deployed page is not proof that CI passed. Local results below describe development verification; confirm the deployed revision separately.

## Completed development verification

- [x] **134 automated checks:** scoring, 2/4/6-player workflows, saved-game lifecycle, corruption recovery, backup merging/rollback, update protection, and eleven new save-safety cases.
- [x] **Concurrent-window safety in Chromium:** a secondary current-version window cannot erase a newly created game or a newer score. Its draft stays exportable. Closing the writer and reloading resumes the latest collection. Unsaved changes prompt before browser reload.
- [x] **Save-error recovery in Chromium:** a simulated storage failure exposes Export backup and Try saving while preserving the focused input. The notice remains visible farther down the form; successful retry saves the draft and clears it.
- [x] **Layout matrix in Chromium:** 96 screen/theme/width/text-size combinations have no horizontal page overflow: Games, Reference, Score, Scoreboard, Rules, and Settings; 320/390/768/1440px; light/dark; ordinary and 200% root text. This is not Safari page zoom or physical-device text scaling.
- [x] **Result dialog:** narrow/enlarged text opens on the visible winner heading; names and totals remain readable; forward/backward keyboard wrapping works.
- [x] **Offline and transfer:** actual service-worker install, cold offline reload, new offline scores surviving another reload, navigation-preserved Undo, real backup download, and import into a fresh isolated browser context.
- [x] **Icon assets:** compact vector header/favicon, dedicated 16px/32px fallbacks, and separate opaque maskable export. Standalone previews and safe-zone measurements passed; installed-device appearance remains below.

## Physical iPhone acceptance

Record iPhone model: __________  iOS version: __________  Date: __________

- [ ] **Installed app and updates:** Confirm 3.3.3. Leave an unfinished round, close/reopen or reload, and check names, scores, selected team, and unfinished entries. On a later deployment, check Update now/Later and Settings-based updating. Deliberate reload resets entry-Undo history. Check the installed icon's silhouette/padding; an existing shortcut may retain older artwork.
- [ ] **Software keyboard:** Enter manual totals and calculated counts, create/rename a game, and scroll with the keyboard open. Check that fields and confirmation/cancellation controls remain reachable in 2/4/6-player games.
- [ ] **Larger text:** Increase Safari website text size and device text where applicable. Check the header, three-team cards, Settings, save-recovery notice, and result/new-game dialogs. The winner should be visible when the result opens. Labels and actions must stay readable without horizontal page scrolling; the round table may scroll horizontally.
- [ ] **VoiceOver:** Navigate main sections, identify field help and the going-out group, enter scores, open/cancel dialogs, and remove/restore a disposable game. Confirm focus stays in modals, returns after cancellation, and reaches the restored game. Listen on the actual device; browser semantics do not establish this result.
- [ ] **Backup and offline use:** Export and find the JSON in Files/Downloads. Check the export date, import into another test browser/device, and verify existing games are kept. Load online, enable airplane mode, enter a draft, close/reopen, and confirm it survives. Remove/restore a disposable game offline.
- [ ] **Multiple windows:** In the same browser/site collection, open a second window/tab. Check that its paused-save notice appears and that it cannot overwrite the first window's games. Export any test entries made in the paused window, close the writer, and reload to use the latest collection. Browser/PWA storage containers may be separate; do not assume they share a collection.

## Live-game acceptance

- [ ] Complete a few ordinary games, including interruption during scoring, returning to an earlier game, finishing, and rematch. Record scoring/saving errors, confusing navigation, keyboard/layout friction, and any unexpected paused-save notice.

Notes and findings:

