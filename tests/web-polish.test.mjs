import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame} from '../scoring.mjs';
import {KEYS,validateLibrary,validateBackup} from '../data.mjs';
import {makeLibrary,activeGame,saveActive,addGame,openGame,rematchGame,removeGame,restoreGame,mergeBackup,archiveForLibrary} from '../games.mjs';
import {appHarness,roundFor} from './helpers/app-harness.mjs';
const plain=value=>JSON.parse(JSON.stringify(value));
function completed(mode=2){const game=freshGame(mode);game.names=game.names.map((_,i)=>['Patrick & Co.','The Challengers','Wild Cards'][i]);game.method='manual';game.rounds=Array.from({length:4},()=>roundFor(game.names.map((_,i)=>300-i*100),mode));game.screen='board';return game}
function remove(app,id){app.click('remove-game',{id});app.click('confirm')}

for(const mode of [2,4,6])for(const method of ['manual','calculated'])test(`A ${mode}-player ${method} rematch keeps the players and resets all scoring state`,()=>{
  const game=completed(mode);game.method=method;game.active=1;game.step='played';game.draft[0].red=3;game.completed[0]=true;
  const library=makeLibrary(game),before=JSON.stringify(library),next=rematchGame(library,game,library.activeId,{title:'Saturday rematch'}),fresh=activeGame(next).game;
  assert.equal(JSON.stringify(library),before);assert.equal(next.games.length,2);assert.notEqual(next.activeId,library.activeId);
  assert.deepEqual(fresh,{...freshGame(mode),names:game.names,method});assert.deepEqual(next.games[0].game,game);
});

test('A rematch from an inactive game uses that game’s teams and method, preserving the current draft',()=>{
  const first=completed(6),library=addGame(makeLibrary(first),first,{mode:2,title:'Current'}),game=activeGame(library).game;
  game.draft[0].left[0]=7;
  const next=rematchGame(library,game,library.games[0].id,{title:'Rematch'});
  assert.deepEqual(activeGame(next).game.names,first.names);assert.equal(activeGame(next).game.method,'manual');assert.equal(next.games[1].game.draft[0].left[0],7);
});

test('Play again from the winner dialog supports Cancel and starts a separate game',()=>{
  const game=completed(4);game.rounds.pop();game.screen='review';game.draft=roundFor([300,100],4).entries;game.completed=[true,true];
  const app=appHarness(game);app.click('confirm-save');const id=app.api.library().activeId;
  app.click('rematch');assert.match(app.app.innerHTML,/Start at round 1/);app.click('cancel');assert.match(app.app.innerHTML,/result-dialog/);
  app.click('rematch');app.handlers.keydown({key:'Escape'});assert.match(app.app.innerHTML,/result-dialog/);
  app.click('rematch');app.input('[data-game-title]','Round two');app.click('confirm');
  assert.equal(app.api.state().rounds.length,0);assert.equal(app.api.state().method,'manual');assert.deepEqual(plain(app.api.state().names),game.names);
  assert.equal(app.api.library().games.find(item=>item.id===id).game.rounds.length,4);
  assert.equal(appHarness(null,{storage:app.storage}).api.library().games.length,2);
});

test('A failed rematch save leaves the original game and dialog available',()=>{
  const app=appHarness(completed());const before=plain(app.api.library());app.click('rematch');app.storage.setItem=()=>{throw Error('Full')};app.click('confirm');
  assert.deepEqual(plain(app.api.library()),before);assert.match(app.app.innerHTML,/Start rematch/);assert.match(app.alerts.at(-1),/could not be saved/);
});

test('Removing an inactive game retains its complete draft and does not switch the current game',()=>{
  const first=freshGame(6);first.screen='score';first.active=2;first.step='books';first.draft[2].red=2;
  const library=addGame(makeLibrary(first),first,{title:'Another game'}),current=activeGame(library).game,before=JSON.stringify(library),id=library.games[0].id;
  const removed=removeGame(library,current,id);assert.equal(JSON.stringify(library),before);assert.equal(removed.activeId,library.activeId);
  assert.ok(removed.games[0].deletedAt);assert.deepEqual(removed.games[0].game,first);assert.throws(()=>openGame(removed,current,id));
  const restored=restoreGame(removed,current,id);assert.equal(restored.games[0].deletedAt,undefined);assert.deepEqual(restored.games[0].game,first);
  assert.deepEqual(activeGame(openGame(restored,current,id)).game,first);
});

test('Removing the active game selects a visible game and never selects a removed game',()=>{
  const game=completed(),first=makeLibrary(game),second=addGame(first,game,{title:'Second'}),third=addGame(second,activeGame(second).game,{title:'Third'});
  const removed=removeGame(third,activeGame(third).game,first.activeId),next=removeGame(removed,activeGame(removed).game,third.activeId);
  assert.equal(next.activeId,second.activeId);assert.ok(next.games.find(item=>item.id===third.activeId).deletedAt);assert.doesNotThrow(()=>validateLibrary(next));
});

test('Removing the only visible game provides a blank game and allows full restoration',()=>{
  const game=completed(6),library=makeLibrary(game),removed=removeGame(library,game,library.activeId);
  assert.equal(removed.games.length,2);assert.notEqual(removed.activeId,library.activeId);assert.equal(activeGame(removed).game.rounds.length,0);
  assert.equal(activeGame(removed).game.mode,6);const restored=restoreGame(removed,activeGame(removed).game,library.activeId);
  assert.deepEqual(restored.games[0].game,game);assert.equal(archiveForLibrary(removed).length,0);assert.equal(archiveForLibrary(restored).length,1);
});

test('Remove confirmation, Keep game, and Escape make no library changes',()=>{
  const app=appHarness(completed()),before=plain(app.api.library()),id=before.activeId;
  app.click('remove-game',{id});assert.match(app.app.innerHTML,/Keep game/);app.click('cancel');assert.deepEqual(plain(app.api.library()),before);
  app.click('remove-game',{id});app.handlers.keydown({key:'Escape'});assert.deepEqual(plain(app.api.library()),before);
});

test('Removed games survive reload, backup export/import, restoration, and resuming a draft',async()=>{
  const game=freshGame(6);game.screen='score';game.active=2;game.step='played';game.draft[2].played[0]=5;
  const app=appHarness(game),id=app.api.library().activeId;remove(app,id);
  assert.equal(app.api.state().screen,'library');assert.match(app.app.innerHTML,/Removed games · 1/);
  const reload=appHarness(null,{storage:app.storage}),backup=await reload.export();assert.doesNotThrow(()=>validateBackup(backup));
  assert.equal(backup.gameLibrary.games.find(item=>item.id===id).game.draft[2].played[0],5);
  const target=appHarness();await target.import(backup);assert.ok(target.api.library().games.find(item=>item.id===id).deletedAt);
  target.click('restore-game',{id});target.click('open-game',{id});assert.equal(target.api.state().draft[2].played[0],5);assert.equal(target.api.state().active,2);assert.equal(target.api.state().step,'played');
});

test('Failed remove and restore commits preserve storage, drafts, and removal state',()=>{
  const app=appHarness(),id=app.api.library().activeId;app.click('go-score');app.input('[data-field]','5',{field:'left',index:'0'});
  let before=plain(app.api.library()),raw=Object.fromEntries(app.storage.values),write=app.storage.setItem;
  app.storage.setItem=()=>{throw Error('Full')};remove(app,id);assert.deepEqual(plain(app.api.library()),before);assert.deepEqual(Object.fromEntries(app.storage.values),raw);assert.equal(app.api.state().draft[0].left[0],5);
  app.storage.setItem=write;app.click('confirm');assert.ok(app.api.library().games.find(item=>item.id===id).deletedAt);
  before=plain(app.api.library());raw=Object.fromEntries(app.storage.values);app.storage.setItem=()=>{throw Error('Full')};app.click('restore-game',{id});
  assert.deepEqual(plain(app.api.library()),before);assert.deepEqual(Object.fromEntries(app.storage.values),raw);
});

test('A failure writing the legacy active-game key rolls removal back across all keys',()=>{
  const app=appHarness(completed()),id=app.api.library().activeId,before=plain(app.api.library()),raw=Object.fromEntries(app.storage.values),write=app.storage.setItem;
  app.storage.setItem=(key,value)=>{if(key===KEYS.game)throw Error('Full');write(key,value)};remove(app,id);
  assert.deepEqual(plain(app.api.library()),before);assert.deepEqual(Object.fromEntries(app.storage.values),raw);
});

test('Malformed removal metadata and removed active games reject backups before writing',()=>{
  const game=freshGame(),library=makeLibrary(game),item=library.games[0];
  for(const deletedAt of [null,0,'invalid','1900-01-01T00:00:00.000Z'])assert.throws(()=>validateLibrary({...library,games:[{...item,deletedAt}]}));
  assert.throws(()=>validateLibrary({...library,games:[{...item,deletedAt:new Date().toISOString()}]}),/Active game has been removed/);
  assert.throws(()=>removeGame(library,game,'missing'));assert.throws(()=>restoreGame(library,game,item.id));
});

test('Importing a removed copy cannot hide a visible local game; importing an earlier backup can restore it',()=>{
  const game=completed(),library=makeLibrary(game),removed=removeGame(library,game,library.activeId),backup={game:activeGame(removed).game,gameLibrary:removed};
  const visible=mergeBackup(library,game,backup);assert.equal(visible.games.find(item=>item.id===library.activeId).deletedAt,undefined);
  const before=JSON.stringify(removed),restored=mergeBackup(removed,activeGame(removed).game,{game,gameLibrary:library});
  assert.equal(restored.activeId,library.activeId);assert.equal(activeGame(restored).deletedAt,undefined);assert.equal(JSON.stringify(removed),before);
});

test('Editing an unsaved current game before removing it retains the latest in-memory values',()=>{
  const app=appHarness(),id=app.api.library().activeId,write=app.storage.setItem;app.click('go-score');
  app.storage.setItem=()=>{throw Error('Full')};app.input('[data-field]','9',{field:'left',index:'0'});app.storage.setItem=write;remove(app,id);
  assert.equal(app.api.library().games.find(item=>item.id===id).game.draft[0].left[0],9);
});

test('Removing an inactive game keeps entry Undo for the current game',()=>{
  const app=appHarness(),first=app.api.library().activeId;app.click('new-game');app.click('confirm');app.click('go-score');
  app.input('[data-field]','4',{field:'left',index:'0'});app.click('library');const current=app.api.library().activeId;
  remove(app,first);assert.equal(app.api.library().activeId,current);assert.equal(app.api.stack(),1);
  app.click('go-score');app.click('undo-action');assert.equal(app.api.state().draft[0].left[0],0);
});
