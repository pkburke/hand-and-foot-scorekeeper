# Development and maintenance

For app features and usage, start with [README.md](README.md). Physical-device and live-game release acceptance is tracked in [TESTING.md](TESTING.md).

## Run and test locally

The app uses static files with ES modules, browser localStorage, and a service worker. There is no dependency installation or build step. Serve the repository over HTTP rather than opening `index.html` directly:

```sh
python3 -m http.server 8766
```

Open [localhost:8766](http://localhost:8766/). Run the regression suite with Node.js; CI uses Node 24:

```sh
node --test tests/*.test.mjs
```

Tests cover scoring, round workflows, multi-game drafts, migration, backup validation and merging, storage failures and recovery, input handling, appearance, rematches, recoverable removal, backup export history, save-before-update behavior, and service-worker caching/version messaging. Browser simulation does not replace the physical iPhone checks in the acceptance checklist.

## Source layout

| File | Purpose |
| --- | --- |
| `index.html` | App entry point |
| `app.mjs` | Screens, scoring controls, dialogs, and browser interactions |
| `scoring.mjs` | Point values, round totals, and game completion rules |
| `data.mjs` | Saved-game validation and backup data handling |
| `games.mjs` | Multi-game library and lifecycle operations |
| `styles.css` | Responsive layout and appearance themes |
| `sw.js` | Offline caching and update messaging |
| `manifest.webmanifest`, `icons/` | Home-screen installation and app artwork |
| `tests/` | Automated regression checks and test helpers |
| `.github/workflows/tests.yml` | Regression checks on pushes and pull requests |

Deploy the complete runtime file set together. Keep the app version, service-worker cache version, and update messaging consistent when preparing a release.

## Hosting and releases

GitHub holds the code. One Cloudflare Pages project, `hand-and-foot-scorekeeper-test`, hosts production and branch previews with no build step.

| Branch | Destination |
| --- | --- |
| `main` | [Production](https://handandfoot.theburkeclann.com/) |
| `staging` | [Stable test site](https://handandfoottest.theburkeclann.com/) |
| Feature branches | Cloudflare branch preview addresses |

Merge feature changes into `staging`, validate the test deployment, then promote an accepted release into `main`. A feature-branch push alone does not update the stable test domain. Keep Cloudflare’s production branch set to `main` with automatic deployments enabled. The test domain uses a proxied CNAME to `staging.hand-and-foot-scorekeeper-test.pages.dev`.

GitHub Actions runs the regression suite on every push and pull request with read-only repository access and no deployment credentials. Cloudflare deployment runs independently; confirm the regression check is green before promoting a release.

The [legacy GitHub Pages address](https://pkburke.github.io/hand-and-foot-scorekeeper/) has separate browser storage. Users moving from that address must export there and import at the new address, then update bookmarks and Home Screen installations.

## Storage and compatibility

Current-game compatibility data uses `hand-foot-scorekeeper-v3`. The full library uses `hand-foot-scorekeeper-v32-games`, and appearance settings use `hand-foot-scorekeeper-v32-settings`. Earlier current-game data and v3.1 archives migrate into the library on first use. Earlier archives can restore the rounds they retained; they did not contain unfinished entries.

Backup JSON retains the older `game`, `completedGames`, and `namePresets` fields and adds optional `gameLibrary`. Imports merge rather than replace. Identical matching IDs are deduplicated; differing versions are retained separately. Importing a visible game from an earlier backup restores its identical removed copy; importing a removed copy never hides a visible local game. Older app versions may show removed games as ordinary saved games because they do not understand removal metadata.

Removed games have no automatic expiry or permanent-delete action. Removing the current game selects another visible game; removing the only visible game creates a blank replacement. Restore preserves scores, drafts, and resume position without replacing the current game.

Continuous numeric typing is grouped as one entry-undo action, while each keystroke still autosaves. Switching games, importing, reopening a saved round, and reloading clear transient undo history. Scores and drafts are saved independently for each game.

Unreadable stored data is preserved under its storage key plus `-recovery`, with a timestamp suffix when needed. If preservation fails, saving pauses rather than overwriting the unreadable data. Storage write failures are reported; backup export includes current in-memory scores even when autosave fails.

The last-export timestamp records download initiation, not confirmed file retention. It is local bookkeeping, excluded from backups. Failure to store that timestamp must not prevent scoring or export or report a false game-save failure.

## Offline updates

The app checks its service worker when returning to the foreground. A newer ready version offers **Update now** and **Later** without redrawing focused scoring fields or automatically reloading. Updating saves the current library and draft first. If saving fails, the app stays open and asks for a backup. A deferred update remains available in Settings, including when Settings was already open when the update arrived.

Existing v3.3 installations need one ordinary reload or reopen to receive the update-notice feature; it handles subsequent versions. New installs, matching worker versions, and temporarily older controllers should not show a misleading update prompt.

## Accessibility and artwork

Layouts follow browser text sizing and reflow with enlarged text. Controls provide at least 44 × 44 CSS-pixel targets. Scoring controls have field descriptions and named groups; the round table has headers and a caption. Screen navigation moves focus to its heading, counter buttons retain focus during updates, and dialogs contain keyboard focus and restore it on cancellation. Real iPhone VoiceOver, software-keyboard, and text-setting acceptance checks remain in [TESTING.md](TESTING.md).

The original H&F PNG artwork remains available for ordinary installations and Apple touch icons. The header and favicon use a compact, path-based SVG traced from the approved monogram, with less small-scale detail. A separate, opaque maskable export keeps the mark inside the guaranteed safe zone. See [icons/README.md](icons/README.md) for asset roles, colors, and export details.
