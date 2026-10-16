# Hand & Foot Scorekeeper 3.1 — Development preview

Branch: `feature/v3.1`. Do not deploy to the production GitHub Pages site until testing is complete.

Changes: persistent bottom navigation, shorter During Game reference, searchable rules, multi-step undo, round review, name presets, game archive, share results, backup compatibility.

## Preview hosting

Connect the GitHub repository to Cloudflare Pages. Configure build command blank, output directory `/` for this static source, and production branch `main`. Cloudflare Pages generates previews for `feature/v3.1`; use that branch-preview URL rather than the stable GitHub Pages URL. If the provider disallows `/` as output, set `.`.

## Data

Existing game data stays under `hand-foot-scorekeeper-v3`. Completed games and presets use separate v3.1 keys. Keep testing on a distinct preview origin. The exported JSON retains the prior `game` field and adds optional archive/presets fields.

## Regression checks

Run `node --test tests/*.test.mjs` with a current Node.js installation. The app still needs no install or build step. The tests cover house-rule scoring, 2/4/6-player round workflows, import/undo boundaries, rejected or failed imports, archive outcomes, storage recovery, input handling, and service-worker caching.

Imports validate the entire game, round history, card counts, saved game library, and name sets before replacing any data. Existing v3 game-only backups remain supported and leave the local library and presets intact. Importing a backup or reopening a saved round starts a fresh entry-undo history.

If stored game/library/preset data cannot be read, the original text is retained under the corresponding storage key plus `-recovery` (with a timestamp suffix when needed). The app displays a recovery notice. If preservation fails, saving is paused rather than overwriting the unreadable original. Storage write failures are shown in the app; use Export backup to retain the current in-memory game.

The favicon and PNG icons use the recovered H&F reference artwork with the surrounding white margin removed. `icon.svg` embeds the original raster artwork; it is not a vector trace.
