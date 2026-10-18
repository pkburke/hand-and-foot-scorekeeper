import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame} from '../scoring.mjs';
import {KEYS,validateGame} from '../data.mjs';
import {appHarness,memoryStorage,roundFor} from './helpers/app-harness.mjs';

for(const mode of [2,4,6])test(`Calculated round review, save, reload and edit work for ${mode} players`,()=>{
  const game=freshGame(mode);game.screen='score';game.draft.forEach(entry=>Object.assign(entry,{played:[1,2,3,4],left:[0,1,0,1],red3:1,red:1,black:mode===2?1:2}));
  const app=appHarness(game);app.click('review');assert.equal(app.api.state().screen,'score');
  for(let i=0;i<game.names.length;i++){app.click('step',{value:'played'});app.click('next')}
  app.click('review');assert.equal(app.api.state().screen,'review');app.click('confirm-save');
  assert.equal(app.api.state().rounds.length,1);assert.equal(app.api.state().rounds[0].scores[0],mode===2?715:1015);
  const reloaded=appHarness(null,{storage:app.storage});assert.equal(reloaded.api.state().rounds.length,1);reloaded.click('undo');
  assert.equal(reloaded.api.state().draft[0].red,1);assert.equal(reloaded.api.state().rounds.length,0);
});

for(const mode of [2,4,6])test(`Importing ${mode}-player backup clears old game undo history`,async()=>{
  const game=freshGame();game.method='manual';game.screen='score';const app=appHarness(game);
  app.input('[data-manual]','120',{manual:'manualFor'});assert.equal(app.api.stack(),1);
  const incoming=freshGame(mode);incoming.method='manual';incoming.screen='score';incoming.draft[0].manualFor=999;
  await app.import({game:incoming});assert.equal(app.api.stack(),0);app.click('undo-action');
  assert.equal(app.api.state().draft[0].manualFor,999);assert.equal(app.api.state().names.length,incoming.names.length);
  assert.doesNotThrow(()=>validateGame(JSON.parse(app.storage.getItem(KEYS.game))));
});

test('Invalid game, auxiliary data and unreadable files preserve current game, storage and undo',async()=>{
  const game=freshGame();game.method='manual';game.screen='score';const app=appHarness(game);app.input('[data-manual]','120',{manual:'manualFor'});
  const before=await app.export(),raw=Object.fromEntries(app.storage.values),undo=app.api.stack();
  for(const payload of [{game:{...freshGame(),draft:[{},{}]}},{game:freshGame(),completedGames:[null]},{game:freshGame(),namePresets:[null]}]){
    await app.import(payload);assert.deepEqual((await app.export()).game,before.game);assert.deepEqual(Object.fromEntries(app.storage.values),raw);assert.equal(app.api.stack(),undo);
  }
  await app.api.importFile({text:()=>Promise.reject(Error('File unreadable'))});assert.match(app.alerts.at(-1),/File unreadable/);
  await app.api.importFile({text:()=>Promise.resolve('{bad json')});assert.match(app.alerts.at(-1),/Could not import/);
});

test('Failed import storage commit leaves the current in-memory game and undo intact',async()=>{
  const game=freshGame();game.screen='score';game.method='manual';const storage=memoryStorage({[KEYS.game]:JSON.stringify(game)});
  const app=appHarness(null,{storage});app.input('[data-manual]','120',{manual:'manualFor'});const before=storage.getItem(KEYS.game);
  storage.setItem=()=>{throw Error('Quota exceeded')};await app.import({game:freshGame(6)});
  assert.equal(app.api.state().draft[0].manualFor,120);assert.equal(app.api.stack(),1);assert.equal(storage.getItem(KEYS.game),before);assert.match(app.alerts.at(-1),/could not be saved/);
});

test('Corrupt saved game is preserved for recovery and cannot crash startup',()=>{
  const raw=JSON.stringify({...freshGame(),draft:[{},{}]}),storage=memoryStorage({[KEYS.game]:raw});
  const app=appHarness(null,{storage});assert.equal(storage.getItem(KEYS.game+'-recovery'),raw);assert.match(app.app.innerHTML,/original data was kept/i);
  app.click('go-score');assert.doesNotThrow(()=>appHarness(null,{storage}));assert.equal(storage.getItem(KEYS.game+'-recovery'),raw);
});

test('Malformed saved history and name sets are preserved without breaking the scoreboard',()=>{
  const storage=memoryStorage({[KEYS.archive]:'[null]',[KEYS.presets]:'{}'}),app=appHarness(null,{storage});
  app.click('go-board');app.click('library');assert.match(app.app.innerHTML,/Your games/);
  assert.equal(storage.getItem(KEYS.archive+'-recovery'),'[null]');assert.equal(storage.getItem(KEYS.presets+'-recovery'),'{}');
});

test('Recovery does not overwrite an earlier corrupt-data backup',()=>{
  const storage=memoryStorage({[KEYS.game]:'broken',[KEYS.game+'-recovery']:'earlier'});appHarness(null,{storage});
  assert.equal(storage.getItem(KEYS.game+'-recovery'),'earlier');assert.ok([...storage.values].some(([key,value])=>key.startsWith(KEYS.game+'-recovery-')&&value==='broken'));
});

test('Unavailable storage shows a save warning and prevents destructive reset when archiving fails',()=>{
  const game=freshGame();game.rounds=[roundFor([100,0])];const app=appHarness(game);
  app.storage.setItem=()=>{throw Error('Quota exceeded')};app.click('go-board');assert.match(app.node('[data-save-status]').textContent,/could not be saved/i);
  app.click('new-game');app.click('confirm');assert.equal(app.api.state().rounds.length,1);assert.match(app.alerts.at(-1),/could not be saved/);
});

test('If corrupt saved data cannot be preserved, it is not overwritten',()=>{
  const storage=memoryStorage({[KEYS.game]:'broken'});storage.setItem=()=>{throw Error('Denied')};const app=appHarness(null,{storage});app.click('go-score');
  assert.equal(storage.getItem(KEYS.game),'broken');assert.match(app.app.innerHTML,/Saving paused/);
});

test('Unreadable storage still permits scoring and backup export',async()=>{
  const storage={getItem(){throw Error('Denied')},setItem(){throw Error('Denied')}};const app=appHarness(null,{storage});
  app.click('go-score');assert.match(app.app.innerHTML,/could not be saved|unavailable/);assert.equal((await app.export()).game.mode,2);
});

test('Reopening a saved round clears current-round entry undo',()=>{
  const game=freshGame();game.method='manual';game.screen='score';game.rounds=[roundFor([150,20])];const app=appHarness(game);
  app.input('[data-manual]','999',{manual:'manualFor'});app.click('undo');assert.equal(app.api.stack(),0);app.click('undo-action');
  assert.equal(app.api.state().draft[0].manualFor,50);assert.equal(app.api.state().rounds.length,0);
});

test('Entry undo restores the edited side and scoring step',()=>{
  const game=freshGame(6);game.screen='score';game.active=1;game.step='played';const app=appHarness(game);
  app.input('[data-field]','3',{field:'played',index:'0'});app.change({value:'2',matches:s=>s==='[data-select="active"]'});
  app.click('undo-action');assert.equal(app.api.state().active,1);assert.equal(app.api.state().step,'played');assert.equal(app.api.state().draft[1].played[0],0);
});

test('Typing and leaving number fields does not redraw the pending button or discard live input',()=>{
  const game=freshGame();game.method='manual';game.screen='score';const app=appHarness(game),html=app.app.innerHTML;
  const field=app.input('[data-manual]','120',{manual:'manualFor'});app.change(field);app.handlers.focusout({target:field});
  assert.equal(app.app.innerHTML,html);assert.equal(app.node('[data-provisional-score]').textContent,'220');
  app.click('next');assert.equal(app.api.state().active,1);assert.equal(app.api.state().completed[0],true);
});

test('Direct card entry persists immediately and invalidates completion without a blur redraw',()=>{
  const game=freshGame();game.screen='score';game.completed[0]=true;const app=appHarness(game),html=app.app.innerHTML;
  const field=app.input('[data-field]','2',{field:'left',index:'0'});app.change(field);
  assert.equal(app.app.innerHTML,html);assert.equal(JSON.parse(app.storage.getItem(KEYS.game)).draft[0].left[0],2);assert.equal(app.api.state().completed[0],false);
  assert.equal(app.node('[data-step-total]').textContent,'−100');
});

test('A successful preset save cannot hide an unsaved-game warning',()=>{
  const app=appHarness(),save=app.storage.setItem;
  app.storage.setItem=(key,value)=>{if(key===KEYS.game)throw Error('Quota exceeded');save(key,value)};
  app.click('go-board');assert.match(app.node('[data-save-status]').textContent,/could not be saved/);
  app.click('save-preset');assert.match(app.app.innerHTML,/could not be saved/);
});

test('Editing a completed side removes its checkmark from the scoring selector',()=>{
  const game=freshGame();game.screen='score';game.completed[0]=true;const app=appHarness(game);
  const options=[{textContent:'✓ Player 1'},{textContent:'Player 2'}];app.node('[data-select="active"]').options=options;
  app.input('[data-field]','1',{field:'left',index:'0'});assert.equal(options[0].textContent,'Player 1');
});

test('Changing player count preserves the old saved rounds as an unfinished archive',()=>{
  const game=freshGame();game.rounds=[roundFor([100,0])];const app=appHarness(game);app.click('mode',{value:'6'});app.click('confirm');
  assert.equal(app.api.state().mode,6);const library=JSON.parse(app.storage.getItem(KEYS.archive));assert.equal(library[0].finished,false);
  app.click('library');assert.match(app.app.innerHTML,/Unfinished/);assert.match(app.app.innerHTML,/Leader: Player 1/);assert.doesNotMatch(app.app.innerHTML,/Winner:/);
});

test('Finished games and ties show accurate historical outcomes',()=>{
  for(const tied of [false,true]){
    const game=freshGame();game.rounds=Array.from({length:tied?5:4},()=>roundFor(tied?[100,100]:[100,0]));
    const app=appHarness(game);app.click('new-game');app.click('confirm');app.click('library');
    assert.match(app.app.innerHTML,/Completed/);assert.match(app.app.innerHTML,tied?/Result: Tie/:/Winner: Player 1/);
  }
});

test('Tiebreaker scoreboard says round 5 of 5; finished four-round game says round 4 of 4',()=>{
  for(const tied of [false,true]){
    const game=freshGame();game.screen='board';game.rounds=Array.from({length:4},()=>roundFor(tied?[100,100]:[100,0]));
    assert.match(appHarness(game).app.innerHTML,tied?/Round 5 of 5/:/Round 4 of 4/);
  }
});

test('Share has a safe text fallback without Web Share or clipboard access',async()=>{
  const app=appHarness();await app.api.shareResults();assert.match(app.alerts.at(-1),/Hand & Foot/);
  const cancelled=appHarness(null,{navigator:{share:()=>Promise.reject(Object.assign(Error('Cancel'),{name:'AbortError'}))}});
  await cancelled.api.shareResults();assert.equal(cancelled.alerts.length,0);
});
