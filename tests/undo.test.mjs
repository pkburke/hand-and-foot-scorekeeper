import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame} from '../scoring.mjs';
import {KEYS} from '../data.mjs';
import {appHarness} from './helpers/app-harness.mjs';

function field(kind,dataset){return {value:'',dataset,matches:selector=>selector===kind};}
function type(app,element,...values){
  for(const value of values){element.value=value;app.handlers.input({target:element});}
}
function manualGame(mode=2){
  const game=freshGame(mode);game.method='manual';game.screen='score';
  game.active=1;game.draft[1].manualFor=125;game.completed[1]=true;
  return game;
}

for(const mode of [2,4,6])test(`One Undo restores a full typed manual amount for ${mode} players while every digit autosaves`,()=>{
  const app=appHarness(manualGame(mode)),element=field('[data-manual]',{manual:'manualFor'});
  for(const value of ['1','15','150']){
    type(app,element,value);
    assert.equal(JSON.parse(app.storage.getItem(KEYS.game)).draft[1].manualFor,Number(value));
    const library=JSON.parse(app.storage.getItem(KEYS.games));
    assert.equal(library.games.find(game=>game.id===library.activeId).game.draft[1].manualFor,Number(value));
  }
  assert.equal(app.api.state().completed[1],false);
  app.change(element);app.click('undo-action');
  assert.equal(app.api.state().draft[1].manualFor,125);
  assert.equal(app.api.state().completed[1],true);
  assert.equal(app.api.stack(),0);
});

test('Different manual fields remain separate Undo actions',()=>{
  const app=appHarness(manualGame()),points=field('[data-manual]',{manual:'manualFor'}),penalties=field('[data-manual]',{manual:'manualAgainst'});
  type(app,points,'1','15','150');app.change(points);
  type(app,penalties,'2','25');app.change(penalties);
  app.click('undo-action');
  assert.equal(app.api.state().draft[1].manualAgainst,0);assert.equal(app.api.state().draft[1].manualFor,150);
  app.click('undo-action');assert.equal(app.api.state().draft[1].manualFor,125);
});

test('Leaving and returning to the same field starts a separate edit without redrawing on blur',()=>{
  const app=appHarness(manualGame()),element=field('[data-manual]',{manual:'manualFor'}),html=app.app.innerHTML;
  type(app,element,'1','15','150');app.handlers.focusout?.({target:element});
  assert.equal(app.app.innerHTML,html);
  type(app,element,'17','175');app.change(element);
  app.click('undo-action');assert.equal(app.api.state().draft[1].manualFor,150);
  app.click('undo-action');assert.equal(app.api.state().draft[1].manualFor,125);
});

test('Clearing an existing amount and typing its replacement is one edit',()=>{
  const app=appHarness(manualGame()),element=field('[data-manual]',{manual:'manualFor'});
  type(app,element,'','9','90','900');app.click('undo-action');
  assert.equal(app.api.state().draft[1].manualFor,125);
  assert.equal(app.api.stack(),0);
});

test('A failed save still keeps a whole-field Undo in memory',()=>{
  const app=appHarness(manualGame()),element=field('[data-manual]',{manual:'manualFor'});
  app.storage.setItem=()=>{throw Error('Quota exceeded')};
  type(app,element,'1','15','150');app.click('undo-action');
  assert.equal(app.api.state().draft[1].manualFor,125);
  assert.match(app.node('[data-save-status]').textContent,/could not be saved/);
});

test('Typed calculated counts group by field while plus/minus taps remain individual actions',()=>{
  const game=freshGame();game.screen='score';game.step='played';game.draft[0].played[0]=2;
  const app=appHarness(game),element=field('[data-field]',{field:'played',index:'0'});
  type(app,element,'1','12');app.change(element);
  app.click('increment',{field:'played',index:'0'});app.click('increment',{field:'played',index:'0'});
  app.click('undo-action');assert.equal(app.api.state().draft[0].played[0],13);
  app.click('undo-action');assert.equal(app.api.state().draft[0].played[0],12);
  app.click('undo-action');assert.equal(app.api.state().draft[0].played[0],2);
});

test('Undo followed by a new edit starts a fresh group',()=>{
  const app=appHarness(manualGame()),element=field('[data-manual]',{manual:'manualFor'});
  type(app,element,'1','15','150');app.click('undo-action');
  type(app,element,'9','90');app.click('undo-action');
  assert.equal(app.api.state().draft[1].manualFor,125);
  assert.equal(app.api.stack(),0);
});
