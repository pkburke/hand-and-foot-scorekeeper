import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame} from '../scoring.mjs';
import {KEYS} from '../data.mjs';
import {makeLibrary,addGame} from '../games.mjs';
import {appHarness,memoryStorage} from './helpers/app-harness.mjs';
const current=storage=>JSON.parse(storage.getItem(KEYS.games));
function pair(){
  const game=freshGame();game.screen='score';game.method='manual';
  const storage=memoryStorage({[KEYS.game]:JSON.stringify(game)});
  return {storage,a:appHarness(null,{storage}),b:appHarness(null,{storage})};
}
function writeLock(){
  let held=false;
  return {request(_name,options,callback){assert.equal(options.ifAvailable,true);if(held)return Promise.resolve(callback(null));held=true;return Promise.resolve(callback({name:_name}))}};
}

test('A stale app cannot erase a game created by another window, even without a storage event',async()=>{
  const {storage,a,b}=pair();a.click('new-game');a.input('[data-game-title]','Newer game');a.click('confirm');
  const before=storage.getItem(KEYS.games);assert.equal(current(storage).games.length,2);
  b.input('[data-manual]','875',{manual:'manualFor'});
  assert.equal(storage.getItem(KEYS.games),before);assert.equal(b.api.state().draft[0].manualFor,875);
  assert.match(b.node('[data-save-problem]').textContent,/Another app window updated/);
  assert.equal(b.node('[data-save-notice]').hidden,false);
  assert.equal((await b.export()).game.draft[0].manualFor,875);
  assert.equal(storage.getItem(KEYS.games),before);
});

test('A storage event warns immediately without redrawing or discarding the local draft',()=>{
  const {storage,a,b}=pair();b.input('[data-manual]','125',{manual:'manualFor'});
  // A has the older snapshot. Reload it as a new app before making the external change.
  const newer=appHarness(null,{storage});newer.input('[data-manual]','250',{manual:'manualFor'});
  const html=b.app.innerHTML;
  b.windowHandlers.storage({key:KEYS.games,newValue:storage.getItem(KEYS.games)});
  assert.equal(b.app.innerHTML,html);assert.equal(b.api.state().draft[0].manualFor,125);
  assert.equal(b.node('[data-save-notice]').hidden,false);
  assert.equal(b.node('[data-reload-games]').hidden,false);
  assert.equal(b.node('[data-retry-save]').hidden,true);
});

test('A second window cannot write even before the first window has made its first save',async()=>{
  const game=freshGame();game.screen='score';game.method='manual';const storage=memoryStorage({[KEYS.game]:JSON.stringify(game)}),locks=writeLock();
  const a=appHarness(null,{storage,navigator:{locks}}),b=appHarness(null,{storage,navigator:{locks}});
  b.input('[data-manual]','900',{manual:'manualFor'});
  assert.equal(storage.getItem(KEYS.games),null);assert.match(b.node('[data-save-problem]').textContent,/Another app window is keeping score/);
  a.input('[data-manual]','300',{manual:'manualFor'});
  assert.equal(current(storage).games[0].game.draft[0].manualFor,300);
  assert.equal((await b.export()).game.draft[0].manualFor,900);
});

test('Edits made while writer ownership is pending save when ownership is granted',()=>{
  let grant;const locks={request(_name,_options,callback){grant=callback;return new Promise(()=>{})}};
  const game=freshGame();game.screen='score';game.method='manual';const app=appHarness(game,{navigator:{locks}});
  app.input('[data-manual]','725',{manual:'manualFor'});assert.equal(app.storage.getItem(KEYS.games),null);
  grant({});assert.equal(current(app.storage).games[0].game.draft[0].manualFor,725);
  assert.equal(app.node('[data-save-notice]').hidden,true);
});

test('Storage failure reveals recovery controls without replacing the focused scoring form; retry clears it',()=>{
  const game=freshGame();game.screen='score';game.method='manual';const app=appHarness(game),write=app.storage.setItem,html=app.app.innerHTML;
  app.storage.setItem=()=>{throw Error('Quota')};app.input('[data-manual]','625',{manual:'manualFor'});
  assert.equal(app.app.innerHTML,html);assert.equal(app.node('[data-save-notice]').hidden,false);
  assert.match(app.node('[data-save-problem]').textContent,/could not be saved/);
  let prevented=false;const event={preventDefault(){prevented=true}};app.windowHandlers.beforeunload(event);assert.equal(prevented,true);
  app.storage.setItem=write;app.click('retry-save');assert.equal(current(app.storage).games[0].game.draft[0].manualFor,625);
  assert.equal(app.node('[data-save-notice]').hidden,true);
  prevented=false;app.windowHandlers.beforeunload({preventDefault(){prevented=true}});assert.equal(prevented,false);
});

test('A stale import or saved-name change cannot replace newer data',async()=>{
  const {storage,a,b}=pair();a.click('new-game');a.click('confirm');const before=storage.getItem(KEYS.games);
  await b.import({game:freshGame(6)});assert.equal(storage.getItem(KEYS.games),before);
  assert.match(b.alerts.at(-1),/Another app window updated/);
  b.click('save-preset');assert.equal(storage.getItem(KEYS.presets),null);
  b.click('appearance',{value:'dark'});assert.equal(b.api.settings().appearance,'dark');
});

test('Stale-window reload is guarded when local scoring edits have not been saved',()=>{
  const {a,b}=pair();a.click('new-game');a.click('confirm');b.input('[data-manual]','400',{manual:'manualFor'});
  let prevented=false;const event={preventDefault(){prevented=true}};b.windowHandlers.beforeunload(event);
  assert.equal(prevented,true);assert.equal(event.returnValue,'');
});

test('Unrelated appearance and export-history changes do not pause saving',()=>{
  const app=appHarness();app.windowHandlers.storage({key:KEYS.settings,newValue:'{"appearance":"dark"}'});
  app.windowHandlers.storage({key:KEYS.lastExport,newValue:new Date().toISOString()});
  app.click('go-score');app.input('[data-field]','3',{field:'left',index:'0'});
  assert.equal(current(app.storage).games[0].game.draft[0].left[0],3);assert.equal(app.node('[data-save-notice]').hidden,true);
});

test('A stale score edit cannot replace a newer score in the same saved game',async()=>{
  const {storage,a,b}=pair();a.input('[data-manual]','300',{manual:'manualFor'});
  b.input('[data-manual]','450',{manual:'manualFor'});
  assert.equal(current(storage).games[0].game.draft[0].manualFor,300);
  assert.equal((await b.export()).game.draft[0].manualFor,450);
});

test('A failed writer-lock request retains queued input and falls back to revision checks',async()=>{
  const game=freshGame();game.screen='score';game.method='manual';
  const locks={request(){return Promise.reject(Error('Lock service unavailable'))}};
  const app=appHarness(game,{navigator:{locks}});app.input('[data-manual]','650',{manual:'manualFor'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(current(app.storage).games[0].game.draft[0].manualFor,650);
  assert.equal(app.node('[data-save-notice]').hidden,true);
});

test('A collection changed during startup cannot become the baseline for an older loaded snapshot',()=>{
  const game=freshGame();game.screen='score';game.method='manual';
  const old=makeLibrary(game),newer=addGame(old,game,{title:'Created during startup'});
  const storage=memoryStorage({[KEYS.game]:JSON.stringify(game),[KEYS.games]:JSON.stringify(old)}),read=storage.getItem;
  let swapped=false;storage.getItem=key=>{const value=read(key);if(key===KEYS.games&&!swapped){swapped=true;storage.values.set(KEYS.games,JSON.stringify(newer))}return value};
  const app=appHarness(null,{storage});app.input('[data-manual]','500',{manual:'manualFor'});
  assert.equal(current(storage).games.length,2);assert.equal(current(storage).activeId,newer.activeId);
  assert.match(app.node('[data-save-problem]').textContent,/Another app window updated/);
});
