import {freshGame, gameOver} from './scoring.mjs';
import {validateGame, validateLibrary, validateBackup} from './data.mjs';

let sequence = 0;
function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `game-${Date.now()}-${++sequence}`;
}
function resumeScreen(game) {
  return ['library', 'settings'].includes(game.screen) ? 'score' : game.screen;
}
export function activeGame(library) {
  return library.games.find(item => item.id === library.activeId);
}
export function makeLibrary(game, archive = [], now = new Date().toISOString()) {
  const current = validateGame(game);
  const active = {id: newId(), title: 'Game 1', createdAt: now, updatedAt: now, resumeScreen: resumeScreen(current), game: current};
  const games = [active, ...archive.map(item => {
    const restored = freshGame(item.mode), last = item.rounds.at(-1);
    Object.assign(restored, {names: [...item.names], rounds: structuredClone(item.rounds), method: last.method, out: last.out,
      screen: gameOver(item.rounds, item.names.length) ? 'board' : 'game'});
    return {id: `archive-${item.id}`, title: `Saved game · ${new Date(item.date).toLocaleDateString()}`, createdAt: item.date,
      updatedAt: item.date, resumeScreen: restored.screen, game: restored};
  })];
  // Earlier archives used millisecond IDs, which could repeat on rapid resets.
  const seen = new Set();
  for (const item of games) {if (seen.has(item.id)) item.id = newId();seen.add(item.id);}
  return validateLibrary({version: 1, activeId: active.id, games});
}
export function saveActive(library, game, now = new Date().toISOString()) {
  const saved = validateGame(game);
  return validateLibrary({...library, games: library.games.map(item => item.id !== library.activeId ? item : {
    ...item, game: saved, updatedAt: Date.parse(now) < Date.parse(item.createdAt) ? item.createdAt : now,
    resumeScreen: ['library', 'settings'].includes(saved.screen) ? item.resumeScreen : saved.screen
  })});
}
export function addGame(library, game, {title, mode = game.mode, now = new Date().toISOString()} = {}) {
  const saved = saveActive(library, game, now), next = freshGame(mode);
  const item = {id: newId(), title: title?.trim() || `Game ${saved.games.length + 1}`, createdAt: now, updatedAt: now,
    resumeScreen: 'game', game: next};
  return validateLibrary({...saved, activeId: item.id, games: [...saved.games, item]});
}
export function openGame(library, game, id, now = new Date().toISOString()) {
  const saved = saveActive(library, game, now), target = saved.games.find(item => item.id === id);
  if (!target) throw new Error('Saved game not found');
  const restored = structuredClone(target.game);
  restored.screen = gameOver(restored.rounds, restored.names.length) ? 'board' : target.resumeScreen;
  return saveActive({...saved, activeId: id}, restored, now);
}
export function renameGame(library, game, id, title) {
  const saved = saveActive(library, game);
  if (!saved.games.some(item => item.id === id)) throw new Error('Saved game not found');
  return validateLibrary({...saved, games: saved.games.map(item => item.id === id ? {...item, title: title.trim()} : item)});
}
export function archiveForLibrary(library) {
  return library.games.filter(item => item.game.rounds.length).map((item, i) => ({
    id: i + 1, date: item.updatedAt, mode: item.game.mode, names: [...item.game.names], rounds: structuredClone(item.game.rounds),
    finished: gameOver(item.game.rounds, item.game.names.length)
  }));
}
export function mergeBackup(library, game, backup) {
  const validated = validateBackup(backup);
  const incoming = validated.gameLibrary ?? makeLibrary(validated.game, validated.completedGames ?? []);
  const saved = saveActive(library, game), games = [...saved.games];
  let activeId;
  for (const candidate of incoming.games) {
    const existing = games.find(item => item.id === candidate.id);
    let id = candidate.id;
    // Navigation and save timestamps alone do not make a different game.
    const same = existing && existing.title === candidate.title && JSON.stringify({...existing.game, screen: 'game'}) === JSON.stringify({...candidate.game, screen: 'game'});
    if (existing && !same) id = newId();
    if (!existing || id !== candidate.id) games.push({...candidate, id});
    if (candidate.id === incoming.activeId) activeId = id;
  }
  return validateLibrary({...saved, activeId, games});
}
