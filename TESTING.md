# Web release acceptance — 3.3.1

Use https://handandfoottest.theburkeclann.com/ for acceptance. Keep production on its approved version until these checks and live-game testing are complete. Export a backup before testing with valuable games.

Automated regression checks run in GitHub Actions on every push and pull request. Cloudflare deploys separately: a successful deployment is not proof that the test workflow passed.

## Completed development verification

The development report records browser simulations and automated tests separately from physical-device acceptance. It covers: an active six-player draft receiving an update notice without losing focus or Undo; Later and Settings-based updating; saving before reload; failed-save blocking; migration from the previous v3.3 release; a real backup download and import into a separate origin; and export-date persistence.

## Physical iPhone acceptance

Record iPhone model: __________  iOS version: __________  Date: __________

- [ ] **Installed app and updates:** Leave an unfinished round, close/reopen or reload the test app, and confirm Settings → About shows 3.3.1. Names, scores, selected team, and unfinished entries must survive. Existing v3.3 needs one reload to acquire the new updater. On a later deployment, Update now/Later should appear; Later must leave the game usable. Updating deliberately resets entry-Undo history, as any reload does.
- [ ] **Software keyboard:** Enter manual totals and calculated card counts; create/rename a game. Scroll with the keyboard open and confirm inputs and confirmation/cancellation controls remain reachable. Check the scoring selector and going-out controls in 2-, 4-, and 6-player layouts.
- [ ] **Larger text:** Increase Safari website text size and use larger device text where applicable. Check completed game cards, all three teams, Settings, and dialogs. Labels and buttons must remain readable/reachable without horizontal page scrolling. The round-history table may scroll horizontally.
- [ ] **VoiceOver:** Navigate the main sections, enter a score, identify field help and the going-out group, open/cancel a game dialog, and remove/restore a disposable game. Confirm focus stays within a modal, returns after cancellation, and reaches the restored game. This requires listening to VoiceOver on the device; a browser accessibility tree is not sufficient.
- [ ] **Backup and offline use:** Export, find the JSON file in Files/Downloads, and confirm Settings records the export time. Import into another test browser/device and check games/drafts; existing games must remain. Then load the installed app online, enable airplane mode, enter a draft, close/reopen, and verify it survives. Remove/restore a disposable test game offline.

## Live-game acceptance

- [ ] Complete a few ordinary games, including an interruption during scoring, returning to an earlier game, finishing, and starting a rematch. Record scoring/saving errors, confusing navigation, or awkward keyboard/layout behavior.

Notes and findings:

