import {gameOver, score, teamCount, validGoingOut} from './scoring.mjs';

export const KEYS = {
  game: 'hand-foot-scorekeeper-v3',
  archive: 'hand-foot-scorekeeper-v31-library',
  presets: 'hand-foot-scorekeeper-v31-presets'
};

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function integer(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}
function list(value, length) {
  return Array.isArray(value) && value.length === length;
}
function mode(value) {
  requireValue([2, 4, 6].includes(value), 'Invalid player count');
  return value;
}
function names(value, count) {
  requireValue(list(value, count) && value.every(name => typeof name === 'string'), 'Invalid player/team names');
  return [...value];
}
function method(value) {
  requireValue(['calculated', 'manual'].includes(value), 'Invalid scoring method');
  return value;
}
function index(value, count) {
  requireValue(integer(value, 0, count - 1), 'Invalid player/team selection');
  return value;
}
function entry(value) {
  requireValue(record(value), 'Invalid scoring entry');
  const result = {};
  for (const field of ['left', 'played']) {
    requireValue(list(value[field], 4) && value[field].every(v => integer(v, 0, 999999)), 'Invalid card counts');
    result[field] = [...value[field]];
  }
  for (const field of ['red3', 'red', 'black', 'manualFor', 'manualAgainst', 'manualBooks']) {
    requireValue(integer(value[field], 0, 999999), 'Invalid book count or manual total');
    result[field] = value[field];
  }
  return result;
}
function entries(value, count) {
  requireValue(list(value, count), 'Invalid number of scoring entries');
  return value.map(entry);
}
function rounds(value, playerMode) {
  requireValue(Array.isArray(value) && value.length <= 5, 'Invalid round history');
  const result = [], count = teamCount(playerMode);
  for (const round of value) {
    requireValue(record(round) && !gameOver(result, count), 'Round follows a finished game');
    const normalized = {entries: entries(round.entries, count), method: method(round.method), out: index(round.out, count)};
    requireValue(list(round.scores, count) && round.scores.every(Number.isSafeInteger), 'Invalid round scores');
    normalized.scores = normalized.entries.map((d, i) => score(d, normalized.method, normalized.out === i));
    requireValue(normalized.scores.every((v, i) => v === round.scores[i]), 'Round scores do not match their entries');
    requireValue(normalized.method === 'manual' || validGoingOut(normalized.entries[normalized.out], playerMode), 'Invalid going-out books');
    result.push(normalized);
  }
  return result;
}

// The v3 game shape and storage keys are retained for existing device data/backups.
export function validateGame(value) {
  requireValue(record(value) && value.version === 1, 'Invalid or unsupported game version');
  const playerMode = mode(value.mode), count = teamCount(playerMode);
  requireValue(list(value.completed, count) && value.completed.every(v => typeof v === 'boolean'), 'Invalid completion flags');
  requireValue(['left', 'books', 'played'].includes(value.step), 'Invalid scoring step');
  requireValue(['game', 'score', 'board', 'rules', 'review', 'library'].includes(value.screen), 'Invalid screen');
  const game = {
    version: 1, mode: playerMode, method: method(value.method), names: names(value.names, count),
    rounds: rounds(value.rounds, playerMode), draft: entries(value.draft, count), completed: [...value.completed],
    out: index(value.out, count), active: index(value.active, count), step: value.step, screen: value.screen
  };
  // A stale review screen must never offer a save for an incomplete draft.
  if (game.screen === 'review' && (!game.completed.every(Boolean) || gameOver(game.rounds, count) ||
      (game.method === 'calculated' && !validGoingOut(game.draft[game.out], playerMode)))) game.screen = 'score';
  return game;
}

export function validateArchive(value) {
  requireValue(Array.isArray(value), 'Invalid game history');
  return value.map(item => {
    requireValue(record(item) && integer(item.id, 0, Number.MAX_SAFE_INTEGER) && typeof item.date === 'string' &&
      Number.isFinite(Date.parse(item.date)), 'Invalid archived game');
    const playerMode = mode(item.mode), count = teamCount(playerMode);
    const history = rounds(item.rounds, playerMode);
    requireValue(history.length > 0, 'Archived game has no rounds');
    return {id: item.id, date: item.date, mode: playerMode, names: names(item.names, count), rounds: history, finished: gameOver(history, count)};
  });
}

export function validatePresets(value) {
  requireValue(Array.isArray(value), 'Invalid saved name sets');
  return value.map(item => {
    requireValue(record(item), 'Invalid saved name set');
    const playerMode = mode(item.mode);
    return {mode: playerMode, names: names(item.names, teamCount(playerMode))};
  });
}

export function validateBackup(value) {
  requireValue(record(value), 'Invalid backup');
  const result = {game: validateGame(value.game)};
  if (Object.hasOwn(value, 'completedGames')) result.completedGames = validateArchive(value.completedGames);
  if (Object.hasOwn(value, 'namePresets')) result.namePresets = validatePresets(value.namePresets);
  return result;
}

// Validate everything before writing anything. Write the active game last and
// roll back earlier keys if storage fills up or becomes unavailable mid-import.
export function saveBackup(storage, candidate) {
  const data = validateBackup(candidate), updates = [];
  if (Object.hasOwn(data, 'completedGames')) updates.push([KEYS.archive, JSON.stringify(data.completedGames)]);
  if (Object.hasOwn(data, 'namePresets')) updates.push([KEYS.presets, JSON.stringify(data.namePresets)]);
  updates.push([KEYS.game, JSON.stringify(data.game)]);
  const previous = updates.map(([key]) => storage.getItem(key)), written = [];
  try {
    updates.forEach(([key, value], i) => {storage.setItem(key, value); written.push(i);});
  } catch (error) {
    let rollbackFailed = false;
    for (const i of written.reverse()) {
      try {
        if (previous[i] === null) storage.removeItem(updates[i][0]);
        else storage.setItem(updates[i][0], previous[i]);
      } catch {rollbackFailed = true;}
    }
    throw new Error(rollbackFailed ? 'Storage failed during import and history/name sets could not be restored. Export a backup before continuing.' : 'Backup could not be saved. Existing data was kept.');
  }
  return data.game;
}
