---
name: Hand & Foot Scorekeeper
description: Quiet Contrast for scoring a card game with friends and family.
colors:
  accent: "#086a7c"
  magenta: "#ae228e"
  page: "#f5f8fc"
  surface: "#ffffff"
  text: "#17283a"
  muted: "#5b6a7c"
  control-border: "#7b8d9e"
  dark-page: "#101925"
  dark-surface: "#1a2739"
  dark-accent: "#79ebf1"
  dark-magenta: "#ff8bdf"
rounded:
  control: "12px"
  panel: "16px"
spacing:
  small: "8px"
  medium: "16px"
  group: "24px"
  section: "32px"
---

# Hand & Foot design system

## Overview

Quiet Contrast is the approved visual direction: calm blue surfaces, cyan actions, and restrained magenta accents connecting to the existing H&F artwork. A scorekeeper should be able to scan the current side, enter scores, and check standings while the group plays with real cards.

This document describes the implementation in `styles.css`. The 3.3.3 closeout has automated regression checks and current Chromium layout/interaction verification. Physical iPhone and live-game acceptance remain pending in `TESTING.md`.

## Colors

Use semantic CSS variables, including their dark-theme overrides. Cyan identifies primary actions, active navigation, and selected scoring steps. Magenta remains in the narrow existing cyan-to-magenta accent on the current game, reference panel, and result dialog. Red denotes penalties and removal actions. Neutral text, not color alone, explains game status.

Keep the lighter `--border` for noninteractive divisions. Use the stronger `--control-border` for editable fields, counter controls, and unselected radio rows. Light and dark themes retain separate surface, text, accent, warning, and danger tokens.

## Typography

Use the existing platform sans-serif stack without remote font dependencies. Body text is .9375rem with 1.5 line height. Rule text uses 1.65 line height. Screen titles are 1.375rem; the Games heading is 1.75rem. Supporting text is generally .8125rem. Scores use tabular numerals, with 1.75rem totals on saved-game cards and 2rem on the scoreboard.

Use rem units so browser text settings remain effective. Keep labels in sentence case, names fully readable, and headings at no tighter than -.025em tracking.

## Layout

Use a single column up to 680px wide. Page padding is 20px, becomes 32px from 600px wide, and reduces to 12px at narrow phone widths. Use 8/12/16/20/24/32px spacing to distinguish controls, groups, and sections.

Game actions use two equal columns. Continue spans both columns on unfinished games. Six-player totals use three columns, becoming aligned name/score rows when the game card is narrow. Scoreboard cards use two columns from 600px. Only the round-history table may require horizontal scrolling. Bottom navigation includes safe-area padding and must leave the last page action reachable.

## Elevation & Depth

Use borders and tonal separation for ordinary information. Avoid adding shadows to game cards or every panel. Selected segmented controls use a small offset shadow; dialogs use the larger offset shadow to separate them from the dimmed background.

## Shapes

Controls use a 12px radius, panels 16px, and small status pills 20px. Keep the approved H&F lettering, ampersand, and cyan/magenta identity. The original dimensional PNGs serve ordinary installations; a flatter vector adaptation serves the header and favicon. A separate inset export serves maskable installations. Utility icons share a 24px SVG grid, 1.7px stroke, and rounded caps and joins. The sparse Scoreboard bars use a 2px stroke and wider spacing for optical balance; Games uses stacked score sheets. See `icons/README.md` for asset roles.

## Components

Primary actions are solid cyan with contrasting text. Secondary actions use the soft surface, while backup and lower-priority utility actions are outlined or unfilled. Buttons and fields are generally at least 48px tall; counter and settings buttons are at least 44px.

Scoring steps sit within a single entry panel. The step subtotal is separated by a rule, not another nested card. The provisional score and next action form a distinct group. Going-out choices use whole clickable rows, with a radio indicator plus a visible selected border and surface.

Rules and Settings use section spacing and dividers rather than a stack of identical cards. Saved and completed games retain cards, aligned totals, and a stable action grid. Result dialogs initially focus their winner heading without scrolling past it. Narrow result containers stack names and scores; all existing follow-up actions remain available.

Save failures and conflicting windows show a persistent recovery notice near the top of the viewport without shifting the form. Its actions use the warning palette with readable borders. Focused fields remain usable below the notice.

Every interactive element needs visible focus, active, hover where supported, and disabled styling. Keep the existing focus management and live save/update announcements. Transitions apply only when reduced motion is not requested.

## Do's and Don'ts

- Preserve the Quiet Contrast identity and existing H&F artwork.
- Keep scoring, saved-game recovery, backups, offline use, and update protection intact.
- Preserve meaningful labels and the house-rule terminology.
- Use consistent SVG utility icons; stars identifying the side that went out are meaningful score annotations.
- Check narrow screens, long names, large totals, enlarged text, keyboard access, and both themes before release.
- Record rendered and physical-device checks honestly; automated tests do not establish visual or VoiceOver acceptance.
