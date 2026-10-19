# Hand & Foot Scorekeeper

A scorekeeping companion for playing Hand & Foot with real cards. Track rounds for **2 individual players, 4 players in two partnerships, or 6 players in three partnerships**, keep several games in progress, and return to unfinished scores later.

Use it in a phone, tablet, or desktop browser. No account is needed, and it works offline after the first successful online load.

- [Open the app](https://handandfoot.theburkeclann.com/)
- [Try the test version](https://handandfoottest.theburkeclann.com/) — upcoming changes being tested before release

The app follows the house rules summarized below. Check the in-app **Rules** before playing if your group uses a different variation.

## Start a game

1. Open **Games**, choose **+ New game**, give it a name, and select 2, 4, or 6 players.
2. On **Scoreboard**, enter the player or team names. Names can be changed later without affecting scores.
3. Use **Reference** during play for card values, the opening minimum, and books needed to go out. **Rules** contains a searchable house rulebook.
4. When a round ends, open **Score** and enter each player’s or team’s results.

## Score a round

Choose **Calculated** to have the app work out the totals from card and book counts:

1. **Unplayed:** count cards still in Hand or Foot by point value, including any red 3s held.
2. **Books:** enter the number of completed red and black books.
3. **Played:** count the cards in completed books **and** incomplete melds, each exactly once. Book bonuses are added separately.

Use **Mark complete & next →** for each player or team. Select **Who went out?**, then choose **Review round →**, check the totals, and **Confirm & save**. The app adds the +100 going-out bonus automatically.

If your group has already counted its points, choose **Manual** instead:

| Field | What to enter |
| --- | --- |
| Points for | All played card points, including cards inside books |
| Points against | Unplayed-card penalties, including red 3s, entered as a positive number |
| Completed-book total | Book bonuses only: 500 per red book and 300 per black book |

Do not include the going-out bonus in these fields. Manual scoring trusts your book totals; check that the side going out has the required books.

**Undo last entry** reverses your last scoring entry even after you leave its field. Typing a number continuously counts as one edit; each +/− tap is separate. Reloading, switching games, importing a backup, or reopening a saved round clears entry-undo history.

**Scoreboard** shows cumulative totals and the score for each round. A star marks who went out. Use **Edit last round** to correct the most recently saved round, or **Share results** to share or copy the standings.

## Keep several games going

Games and unfinished entries autosave on this device. Start another game whenever you need to, then select **Continue** on an earlier game to resume its scores and scoring step. **Save & return to Games** opens your collection.

At the end of a game, a result dialog announces the winner or final tie. You can view results, start a new game, return to Games, or choose **Play again**. A rematch keeps the same players, teams, and scoring method in a fresh game; the original results stay in **Completed games**.

Use **Rename** to change a game’s title. **Remove** moves it into **Removed games**, where **Restore game** brings it back with its scores and unfinished entries. Removed games do not expire automatically and remain included in backups.

## House scoring rules

| Item | Points or requirement |
| --- | --- |
| Jokers | 50 points each |
| 2s and Aces | 20 points each |
| 8 through King | 10 points each |
| 4 through 7 | 5 points each |
| Black 3s | 0 points |
| Red 3s held in Hand or Foot | −300 points each |
| Red book / black book | +500 / +300, in addition to the cards’ values |
| Going out | +100; requires 1 red + 1 black book for 2 players, or 1 red + 2 black books for partnerships |
| Opening minimum by round | 50, 90, 120, 150; 150 for the tiebreaker |

Round score = played card points + book bonuses + going-out bonus − unplayed cards and penalties. Negative scores are allowed.

The highest cumulative score after four rounds wins. If the leaders are tied, play one fifth round; a tie after that is the final result. The in-app **Rules** covers setup, melds, discard pickup, and other play rules. Rule values are currently fixed rather than configurable.

## Save, back up, and move your games

Saved games belong to the **browser, device, and site address** where you play. There is no account or automatic sync. Clearing browser data can remove your games, and the production and test sites have separate collections.

Use **Export backup** to download a JSON file containing all games, completed results, removed games, unfinished entries, and saved player/team name sets. Confirm the file is actually saved in Files or Downloads; the **Last export started** date in Settings records when the export began.

To move your games, export from the original browser or site, open the destination, and choose **Import backup**. Import adds games to the collection. Identical matching saves are not duplicated, while differing versions are retained separately. Appearance settings and export history stay local to each browser. Older game-only backups are also supported, though they may not contain unfinished entries.

If the app reports an autosave problem, keep it open and export a backup of the current scores before reloading or leaving.

## Appearance, installation, and updates

Open **Settings** to choose **System**, **Light**, or **Dark** appearance. You can also add the app to your Home Screen using your browser’s sharing or install option. Load it online first so its files are available for offline use.

When a new version is ready, choose **Update now** or **Later**. The app saves your current scores and unfinished entries before reloading for an update. A postponed update remains available as **Save & update** in Settings. An update reload clears entry-undo history.

## Development and testing

This is a static HTML, CSS, and JavaScript app with no package installation or build step. To run it locally:

```sh
python3 -m http.server 8766
```

Open [localhost:8766](http://localhost:8766/). Run the automated checks with Node.js:

```sh
node --test tests/*.test.mjs
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for code structure, storage behavior, and deployment, and [TESTING.md](TESTING.md) for physical-device and live-game acceptance checks.
