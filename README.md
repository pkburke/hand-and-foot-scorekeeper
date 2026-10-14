# Hand & Foot Scorekeeper 3.0

A dependency-free, installable Progressive Web App for the house rules developed in ChatGPT.

## Run locally

```bash
cd hand-foot-scorekeeper
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser. No npm install or build is required.

## Publish

Upload the **contents** of this folder to any HTTPS static web host, such as GitHub Pages or Cloudflare Pages. In iPhone Safari, use Share → Add to Home Screen. After the first successful load the service worker caches the app for offline use.

## Features

- Two individual players (3 decks), two partnership teams (4 players, 5 decks), or three partnership teams (6 players, 7 decks)
- Calculated counts or manual points-for / points-against / book bonus entry
- Unplayed cards → completed books → played cards scoring order
- Editable names, current-round quick reference, book/going-out validation for calculated mode
- Autosaved local state (localStorage), undo last round, JSON export/import
- Four rounds, a fifth tiebreaker when top cumulative scores are tied

## Caveats

- Local storage can be cleared by the browser/OS; use Export backup periodically.
- Offline operation requires initial loading on HTTPS or localhost; `file://` cannot install a service worker.
- This build does not sync across devices or have online multiplayer.
- Manual scoring accepts the entered book bonus total without validating actual book counts.
