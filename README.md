# Hand & Foot Scorekeeper 3.1 — Development preview

Branch: `feature/v3.1`. Do not deploy to the production GitHub Pages site until testing is complete.

Changes: persistent bottom navigation, shorter During Game reference, searchable rules, multi-step undo, round review, name presets, game archive, share results, backup compatibility.

## Preview hosting

Connect the GitHub repository to Cloudflare Pages. Configure build command blank, output directory `/` for this static source, and production branch `main`. Cloudflare Pages generates previews for `feature/v3.1`; use that branch-preview URL rather than the stable GitHub Pages URL. If the provider disallows `/` as output, set `.`.

## Data

Existing game data stays under `hand-foot-scorekeeper-v3`. Completed games and presets use separate v3.1 keys. Keep testing on a distinct preview origin. The exported JSON retains the prior `game` field and adds optional archive/presets fields.
