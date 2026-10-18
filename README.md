# Hand & Foot Scorekeeper 3.2 — Development preview

Branch: `feature/v3.2`. Test this branch before promoting it to production.

## Games and Settings

The Games area keeps multiple named games on the same device. Start a new 2-, 4-, or 6-player game, then continue an earlier game with its names, rounds, unfinished scores, selected team, and scoring step intact. Games autosave; Save & return to Games also opens the collection. Rename any game and view completed games separately.

Saving the deciding round opens a result dialog with the winner (or a final tie), ranked final scores, and View results, New game, and Back to Games actions. Completed games remain in the collection. Dismissing the dialog leaves the scoreboard visible; cancelling New game returns to the result dialog. A tied fourth round continues to the tiebreaker without announcing a finished game.

Settings offers System, Light, and Dark appearance. The selected Quiet Contrast design uses calm blue surfaces, cyan controls, and restrained cyan-to-magenta accents that connect the interface to the recovered H&F artwork.

## Preview hosting

This is a static app with no install or build step. The test site uses Cloudflare Pages and production currently uses GitHub Pages. Use a separate preview origin for development. Do not change the production deployment branch as part of testing.

For local testing, serve this folder with an HTTP server, for example `python3 -m http.server 8766`, then open `http://localhost:8766/`.

## Saved data and backups

Games are stored locally in the browser, with no account or cross-device sync. A different browser, device, or domain has its own collection. Export a backup before changing devices or hosting domains.

Existing v3 game data stays under `hand-foot-scorekeeper-v3`. The full collection uses `hand-foot-scorekeeper-v32-games`, and device appearance uses `hand-foot-scorekeeper-v32-settings`. Earlier current-game data and v3.1 archives migrate into the new collection on first use. Earlier archives can restore the rounds they retained; they did not contain unfinished entries.

Export backup includes all games and unfinished scoring entries. JSON keeps the older `game`, `completedGames`, and `namePresets` fields and adds optional `gameLibrary`. Older game-only backups remain supported. Import adds games to the current collection; differing versions of a game are both retained. Identical games with matching IDs are not duplicated. Appearance remains a device setting.

Switching games, importing a backup, and reopening a saved round clear entry-undo history. Scores and drafts are preserved independently for each game.

Undo last entry restores the value before a continuous numeric-field edit, rather than stepping backward through each digit. Leaving the field or using another action starts a separate edit. Autosave still writes every keystroke, and plus/minus button taps remain individually undoable.

If stored data cannot be read, the original text is retained under the corresponding storage key plus `-recovery` (with a timestamp suffix when needed). The app displays a recovery notice. If preservation fails, saving pauses rather than overwriting unreadable data. Storage write failures are shown in the app; Export backup includes the current in-memory scores even when autosave has failed.

## Regression checks

Run `node --test tests/*.test.mjs` with a current Node.js installation. Tests cover house-rule scoring, 2/4/6-player round workflows, multi-game switching and drafts, migration, backup validation and merging, rollback on failed storage writes, corrupt-data recovery, input handling, appearance settings, and service-worker caching.

The favicon and PNG icons use the recovered H&F reference artwork with the surrounding white margin removed. `icon.svg` embeds the original raster artwork; it is not a vector trace.
