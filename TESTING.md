# Web release acceptance — 3.3.2

Use https://handandfoottest.theburkeclann.com/ for acceptance. Keep production on its approved version until these checks and live-game testing are complete. Export a backup before testing with valuable games.

Automated regression checks run in GitHub Actions on every push and pull request. Cloudflare deploys separately: a successful deployment is not proof that the test workflow passed.

## Completed development verification

The development report records browser simulations and automated tests separately from physical-device acceptance. It covers: an active six-player draft receiving an update notice without losing focus or Undo; Later and Settings-based updating; saving before reload; failed-save blocking; migration from the previous v3.3 release; a real backup download and import into a separate origin; and export-date persistence.

## Design refinement verification

The 3.3.2 design pass keeps Quiet Contrast and the scoring workflow. It consolidates the stylesheet, strengthens form boundaries and selected states, simplifies Rules and Settings, and replaces utility glyphs with consistent SVG icons. The 123 automated regression checks pass; text and control contrast were checked against the light and dark color tokens.

Fresh browser screenshots and responsive visual acceptance are still pending: the development session blocked browser launches and local preview servers. The browser simulations described above apply to the prior 3.3.1 revision, not this visual pass.

- [ ] **Visual review:** Check Games (including completed and removed games), Reference, calculated and manual Score, round review, Scoreboard, Rules, Settings, and result/new-game dialogs. Cover light and dark themes at narrow phone, tablet, and desktop widths. Include six-player games, long names, negative scores, and enlarged text. Confirm field focus, counter taps, Undo, search, and dialogs behave as before.

## Icon refinement verification

The original installation PNGs are retained. The header and favicon now use a compact path-based SVG; 16px/32px PNG favicon fallbacks and a separate opaque maskable export were added. Games uses stacked score sheets, and the Scoreboard bars have slightly more visual weight.

Standalone SVG/PNG previews were rendered with Sharp and visually inspected at 16, 32, 44, and 64px, including navigation glyphs at 22px in both theme colors. A circular-mask preview was inspected. The maskable foreground's maximum radius is approximately 185px, within the 204.8px guaranteed safe radius at 512px. These are asset-rendering checks, not browser or physical-device acceptance.

- [ ] **Browser and installed icons:** Check favicon appearance, the 44px header logo, and all navigation glyphs in light/dark themes. Install a fresh test shortcut and check the icon silhouette and padding; confirm the mark remains visible under the platform's mask. Existing installed shortcuts may retain older icons.

## Physical iPhone acceptance

Record iPhone model: __________  iOS version: __________  Date: __________

- [ ] **Installed app and updates:** Leave an unfinished round, close/reopen or reload the test app, and confirm Settings → About shows 3.3.2. Names, scores, selected team, and unfinished entries must survive. Existing v3.3 needs one reload to acquire the new updater. On a later deployment, Update now/Later should appear; Later must leave the game usable. Updating deliberately resets entry-Undo history, as any reload does.
- [ ] **Software keyboard:** Enter manual totals and calculated card counts; create/rename a game. Scroll with the keyboard open and confirm inputs and confirmation/cancellation controls remain reachable. Check the scoring selector and going-out controls in 2-, 4-, and 6-player layouts.
- [ ] **Larger text:** Increase Safari website text size and use larger device text where applicable. Check completed game cards, all three teams, Settings, and dialogs. Labels and buttons must remain readable/reachable without horizontal page scrolling. The round-history table may scroll horizontally.
- [ ] **VoiceOver:** Navigate the main sections, enter a score, identify field help and the going-out group, open/cancel a game dialog, and remove/restore a disposable game. Confirm focus stays within a modal, returns after cancellation, and reaches the restored game. This requires listening to VoiceOver on the device; a browser accessibility tree is not sufficient.
- [ ] **Backup and offline use:** Export, find the JSON file in Files/Downloads, and confirm Settings records the export time. Import into another test browser/device and check games/drafts; existing games must remain. Then load the installed app online, enable airplane mode, enter a draft, close/reopen, and verify it survives. Remove/restore a disposable test game offline.

## Live-game acceptance

- [ ] Complete a few ordinary games, including an interruption during scoring, returning to an earlier game, finishing, and starting a rematch. Record scoring/saving errors, confusing navigation, or awkward keyboard/layout behavior.

Notes and findings:

