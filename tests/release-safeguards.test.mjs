import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame} from '../scoring.mjs';
import {KEYS} from '../data.mjs';
import {appHarness,memoryStorage,roundFor} from './helpers/app-harness.mjs';
const plain=value=>JSON.parse(JSON.stringify(value));

function updatingApp(game=freshGame()){
  const handlers={},queries=[],registration={checks:0,update:async()=>{registration.checks++}};
  const controller={postMessage:message=>queries.push(message)},workers={controller,addEventListener:(name,fn)=>handlers[name]=fn,register:async()=>registration};
  const reloads=[];
  const app=appHarness(game,{navigator:{serviceWorker:workers},location:{protocol:'https:',reload:()=>reloads.push(JSON.parse(app.storage.getItem(KEYS.game)))}});
  return {...app,workers,registration,queries,reloads,
    ready:()=>Promise.resolve(),
    signal:(version,source=workers.controller)=>handlers.message({source,data:{type:'APP_VERSION',version}}),
    controllerChange:()=>handlers.controllerchange()
  };
}

test('A fresh app queries its controlling worker and ignores matching, older, or malformed replies',async()=>{
  const app=updatingApp();await app.ready();assert.equal(app.queries[0].type,'GET_APP_VERSION');app.controllerChange();assert.equal(app.queries.length,2);
  for(const version of ['3.3.2','3.3.1','3.3','3.2.99','not a version',3.4,null,'<b>4.0.0</b>'])app.signal(version);
  app.signal('9.0.0',{});assert.equal(app.node('[data-update-notice]').hidden,undefined);assert.equal(app.reloads.length,0);
  assert.match(app.app.innerHTML,/data-update-notice hidden/);
});

test('An update notification does not redraw a focused scoring form or change its draft and Undo',()=>{
  const game=freshGame(6);game.method='manual';game.screen='score';game.active=2;
  const app=updatingApp(game);app.input('[data-manual]','275',{manual:'manualFor'});const html=app.app.innerHTML,stack=app.api.stack();
  app.signal('3.4.0');assert.equal(app.node('[data-update-notice]').hidden,false);assert.match(app.node('[data-update-message]').textContent,/3.4.0/);
  assert.equal(app.app.innerHTML,html);assert.equal(app.api.state().draft[2].manualFor,275);assert.equal(app.api.stack(),stack);assert.equal(app.reloads.length,0);
  app.click('undo-action');assert.equal(app.api.state().draft[2].manualFor,0);
});

test('Later defers the same update; Settings keeps an update action and a subsequent version can notify again',()=>{
  const app=updatingApp();app.signal('3.4.0');app.click('update-later');assert.equal(app.node('[data-update-notice]').hidden,true);
  app.signal('3.4.0');assert.equal(app.node('[data-update-notice]').hidden,true);app.click('settings');assert.match(app.app.innerHTML,/Version 3.4.0 is available/);assert.match(app.app.innerHTML,/Save &amp; update|Save & update/);
  app.signal('3.5.0');assert.equal(app.node('[data-update-notice]').hidden,false);assert.equal(app.reloads.length,0);
});

test('Update now saves the latest full draft and all games before reloading',()=>{
  const game=freshGame(6);game.method='manual';game.rounds=[roundFor([300,200,100],6)];game.screen='score';game.active=2;game.step='played';
  const app=updatingApp(game),first=app.api.library().activeId;app.click('new-game');app.click('confirm');app.click('open-game',{id:first});
  app.input('[data-manual]','725',{manual:'manualFor'});app.signal('3.4.0');app.click('update-now');
  assert.equal(app.reloads.length,1);assert.equal(app.reloads[0].draft[2].manualFor,725);assert.equal(app.reloads[0].rounds.length,1);
  const reloaded=appHarness(null,{storage:app.storage});assert.equal(reloaded.api.library().games.length,2);assert.equal(reloaded.api.state().draft[2].manualFor,725);assert.equal(reloaded.api.state().active,2);assert.equal(reloaded.api.state().step,'played');
});

test('An unsuccessful save blocks update reload and leaves an exportable current draft',async()=>{
  const game=freshGame();game.method='manual';game.screen='score';const app=updatingApp(game),write=app.storage.setItem;
  app.storage.setItem=()=>{throw Error('Full')};app.input('[data-manual]','925',{manual:'manualFor'});app.signal('3.4.0');app.click('update-now');
  assert.equal(app.reloads.length,0);assert.match(app.node('[data-update-message]').textContent,/could not be saved/);assert.equal((await app.export()).game.draft[0].manualFor,925);
  app.storage.setItem=write;app.click('update-now');assert.equal(app.reloads.length,1);assert.equal(app.reloads[0].draft[0].manualFor,925);
});

test('Returning to a visible page checks for a worker update without reloading',async()=>{
  const app=updatingApp();await app.ready();app.documentHandlers.visibilitychange();await Promise.resolve();assert.equal(app.registration.checks,1);assert.equal(app.reloads.length,0);
});

test('Export history survives reload without changing the game or undo history',async()=>{
  const game=freshGame();game.method='manual';game.screen='score';const app=appHarness(game);app.input('[data-manual]','125',{manual:'manualFor'});
  const before=plain(app.api.state()),stack=app.api.stack(),backup=await app.export();
  assert.equal(app.storage.getItem(KEYS.lastExport),backup.exportedAt);assert.deepEqual(plain(app.api.state()),before);assert.equal(app.api.stack(),stack);
  const restored=appHarness(null,{storage:app.storage});restored.click('settings');assert.match(restored.app.innerHTML,/Last export started:/);assert.match(restored.app.innerHTML,/confirm your backup was saved/);
});

test('Failed download preparation does not overwrite the last export date or current game',()=>{
  const last='2026-10-17T12:00:00.000Z',game=freshGame(),storage=memoryStorage({[KEYS.game]:JSON.stringify(game),[KEYS.lastExport]:last});
  const app=appHarness(null,{storage,downloadError:Error('Download denied')}),before=plain(app.api.state());app.click('export');
  assert.equal(storage.getItem(KEYS.lastExport),last);assert.deepEqual(plain(app.api.state()),before);assert.match(app.alerts.at(-1),/backup could not be prepared/);
});

test('Failure to remember an export date does not mark a saved game as unsaved or prevent export',async()=>{
  const app=appHarness(),write=app.storage.setItem;app.click('go-score');app.storage.setItem=(key,value)=>{if(key===KEYS.lastExport)throw Error('Denied');write(key,value)};
  const backup=await app.export();assert.equal(backup.game.mode,2);assert.equal(app.storage.getItem(KEYS.lastExport),null);app.click('settings');
  assert.match(app.app.innerHTML,/download started, but its date could not be remembered/);assert.doesNotMatch(app.app.innerHTML,/Changes could not be saved/);
});

test('Malformed or unreadable backup history never blocks scoring or overwrites saved game data',()=>{
  for(const raw of ['invalid','null','{"bad":true}','2026-10-17']){
    const game=freshGame();game.draft[0].red=5;const storage=memoryStorage({[KEYS.game]:JSON.stringify(game),[KEYS.lastExport]:raw});const app=appHarness(null,{storage});app.click('settings');
    assert.match(app.app.innerHTML,/No backup export recorded/);app.click('go-score');assert.equal(app.api.state().draft[0].red,5);assert.doesNotMatch(app.app.innerHTML,/Saving paused/);
  }
});

test('Import does not mistake another device’s export time for a local backup download',async()=>{
  const app=appHarness(),last='2026-10-17T12:00:00.000Z';app.storage.setItem(KEYS.lastExport,last);
  await app.import({game:freshGame(6),exportedAt:'2026-10-18T12:00:00.000Z'});assert.equal(app.storage.getItem(KEYS.lastExport),last);
});

test('An update arriving while Settings is already open exposes its deferred action without redrawing',()=>{
  const app=updatingApp();app.click('settings');const html=app.app.innerHTML;app.signal('3.4.0');
  assert.equal(app.node('[data-settings-update-message]').hidden,false);assert.match(app.node('[data-settings-update-message]').textContent,/3.4.0/);
  assert.equal(app.node('[data-settings-update-button]').hidden,false);app.click('update-later');assert.equal(app.node('[data-settings-update-button]').hidden,false);assert.equal(app.app.innerHTML,html);
});
