# Hand & Foot Scorekeeper 3.3.1

Release preparation branch: `feature/v3.3`. Validate on staging before promoting to production.

## Games and Settings

The Games area keeps multiple named games on the same device. Start a new 2-, 4-, or 6-player game, then continue an earlier game with its names, rounds, unfinished scores, selected team, and scoring step intact. Games autosave; Save & return to Games also opens the collection. Rename any game and view completed games separately.

Play again is available from the finish dialog, a completed scoreboard, and completed game cards. It creates a separate game with the same player count, names/teams, and scoring method. Rounds, draft entries, completion flags, and going-out selection start fresh. The original game stays intact.

Remove moves a game into a collapsible Removed games section after confirmation. Restore returns its scores, drafts, and resume position to the library without replacing the current game. There is no automatic expiry or permanent-delete action. Removing the current game selects another visible game; if it was the only visible game, a blank game is created. Removed games are included in full-library backups. Older app versions may show removed games as ordinary saved games because they do not understand removal metadata.

Saving the deciding round opens a result dialog with the winner (or a final tie), ranked final scores, and View results, Play again, New game, and Back to Games actions. Completed games remain in the collection. Dismissing the dialog leaves the scoreboard visible; cancelling New game returns to the result dialog. A tied fourth round continues to the tiebreaker without announcing a finished game.

Settings offers System, Light, and Dark appearance. The selected Quiet Contrast design uses calm blue surfaces, cyan controls, and restrained cyan-to-magenta accents that connect the interface to the recovered H&F artwork. Settings also records when the last backup export started on this device; confirm the download was saved in Files or Downloads. Browser download initiation does not confirm a completed or retained file. Export history is device-local bookkeeping and is not imported from backups; failure to remember that date never prevents scoring or export.

## Hosting and releases

This is a static app with no install or build step. GitHub holds the code; one Cloudflare Pages project (`hand-and-foot-scorekeeper-test`) hosts production and previews.

- `main` → production: https://handandfoot.theburkeclann.com/
- `staging` → stable test site: https://handandfoottest.theburkeclann.com/
- Feature branches → Cloudflare branch preview addresses.

The test domain uses a proxied CNAME to `staging.hand-and-foot-scorekeeper-test.pages.dev`. Keep Cloudflare's production branch set to `main` with automatic deployments enabled. Merge feature changes into `staging`, test there, then promote the accepted release into `main`. A feature-branch push alone does not update the stable test domain.

GitHub Actions runs `node --test tests/*.test.mjs` on every push and pull request using Node 24. The workflow has read-only repository access and no deployment credentials. Cloudflare deployment runs independently; confirm the regression check is green before promoting a release.

GitHub Pages is the legacy production address. Games remain separate on each hostname; export from the old address and import at the new one when moving. Update bookmarks and home-screen installations after transferring saved games.

For local testing, serve this folder with an HTTP server, for example `python3 -m http.server 8766`, then open `http://localhost:8766/`.

## Saved data and backups

Games are stored locally in the browser, with no account or cross-device sync. A different browser, device, or domain has its own collection. Export a backup before changing devices or hosting domains.

Existing v3 game data stays under `hand-foot-scorekeeper-v3`. The full collection uses `hand-foot-scorekeeper-v32-games`, and device appearance uses `hand-foot-scorekeeper-v32-settings`. Earlier current-game data and v3.1 archives migrate into the new collection on first use. Earlier archives can restore the rounds they retained; they did not contain unfinished entries.

Export backup includes all games and unfinished scoring entries. JSON keeps the older `game`, `completedGames`, and `namePresets` fields and adds optional `gameLibrary`. Older game-only backups remain supported. Import adds games to the current collection; differing versions of a game are both retained. Identical games with matching IDs are not duplicated. Importing a visible game from an earlier backup restores its identical removed copy; importing a removed copy never hides a visible local game. Appearance remains a device setting.

Switching games, importing a backup, and reopening a saved round clear entry-undo history. Scores and drafts are preserved independently for each game.

Undo last entry restores the value before a continuous numeric-field edit, rather than stepping backward through each digit. Leaving the field or using another action starts a separate edit. Autosave still writes every keystroke, and plus/minus button taps remain individually undoable.

If stored data cannot be read, the original text is retained under the corresponding storage key plus `-recovery` (with a timestamp suffix when needed). The app displays a recovery notice. If preservation fails, saving pauses rather than overwriting unreadable data. Storage write failures are shown in the app; Export backup includes the current in-memory scores even when autosave has failed.

## App updates

The app checks its service worker when returning to the foreground. When a newer version is ready, the running app offers Update now and Later without replacing the scoring form or reloading automatically. Update now saves the current library and draft before reloading; if saving fails, the app stays open and asks for a backup. A deferred update remains available in Settings. Reloading clears entry-Undo history as before; saved scores and drafts remain.

Existing v3.3 installations need one ordinary reload/reopen to receive the update-notice feature. The feature then handles subsequent versions. A new install, matching worker version, or temporarily older controller does not show a misleading update prompt.

## Accessibility

Typography follows the browser's default text size. Layouts reflow with enlarged text, controls offer at least 44 × 44 CSS-pixel targets, and numeric fields retain readable input sizes. Related scoring controls have named groups and field descriptions; the round table has row/column headings and a caption. Navigation moves focus to the new screen heading, counter buttons retain focus across updates, and modal dialogs trap keyboard focus and return it when cancelled. Completed/removed sections remain expanded during dialog interactions. Real iPhone VoiceOver, text settings, and software-keyboard checks remain part of release acceptance.

Physical-device release acceptance is tracked in [TESTING.md](TESTING.md).

## Regression checks

Run `node --test tests/*.test.mjs` with a current Node.js installation. Tests cover house-rule scoring, 2/4/6-player round workflows, multi-game switching and drafts, migration, backup validation and merging, rollback on failed storage writes, corrupt-data recovery, input handling, appearance settings, rematches, recoverable removal, backup/import removal semantics, backup export history, save-before-update behavior, and service-worker caching/version messaging.

The favicon and PNG icons use the recovered H&F reference artwork with the surrounding white margin removed. `icon.svg` embeds the original raster artwork; it is not a vector trace.
