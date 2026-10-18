import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame,gameOver} from '../scoring.mjs';
import {KEYS} from '../data.mjs';
import {appHarness,roundFor} from './helpers/app-harness.mjs';

function finalRound({mode=2,scores,previous=3,names}={}){
  const game=freshGame(mode),totals=scores??game.names.map((_,i)=>100-i*40);
  Object.assign(game,{method:'manual',screen:'review',rounds:Array.from({length:previous},()=>roundFor(totals,mode)),
    draft:roundFor(totals,mode).entries,completed:game.names.map(()=>true)});
  if(names)game.names=names;
  return game;
}
function hasResult(app){return /class="[^\"]*result-dialog/.test(app.app.innerHTML);}

for(const mode of [2,4,6])test(`Saving the deciding round immediately shows the winner and final scores for ${mode} players`,()=>{
  const app=appHarness(finalRound({mode}));app.click('confirm-save');
  assert.ok(hasResult(app));
  assert.match(app.app.innerHTML,new RegExp(`${mode===2?'Player':'Team'} 1 wins!`));
  assert.match(app.app.innerHTML,/Final scores/);assert.match(app.app.innerHTML,/>400</);
  assert.equal(app.api.state().screen,'board');assert.equal(app.api.state().rounds.length,4);
  const saved=JSON.parse(app.storage.getItem(KEYS.game));assert.equal(saved.screen,'board');assert.equal(saved.rounds.length,4);
  const library=JSON.parse(app.storage.getItem(KEYS.games));
  assert.equal(library.games.find(item=>item.id===library.activeId).game.rounds.length,4);
});

test('Ordinary rounds and a fourth-round tie do not announce a finished game',()=>{
  for(const game of [finalRound({previous:1}),finalRound({scores:[100,100]})]){
    const app=appHarness(game);app.click('confirm-save');
    assert.equal(hasResult(app),false);assert.equal(app.api.state().screen,'game');
    assert.equal(gameOver(app.api.state().rounds,2),false);
  }
});

test('A tied fifth round shows final tied standings, including a shared lead among three teams',()=>{
  for(const [mode,scores] of [[2,[100,100]],[6,[100,100,40]]]){
    const app=appHarness(finalRound({mode,scores,previous:4}));app.click('confirm-save');
    assert.ok(hasResult(app));assert.match(app.app.innerHTML,/Game ends in a tie/);
    assert.equal((app.app.innerHTML.match(/Tied for first/g)??[]).length,2);
    assert.match(app.app.innerHTML,/>500</);assert.equal(app.api.state().rounds.length,5);
    assert.equal(gameOver(app.api.state().rounds,app.api.state().names.length),true);
  }
});

test('View results and Escape dismiss the dialog onto the saved scoreboard',()=>{
  for(const escape of [false,true]){
    const app=appHarness(finalRound());app.click('confirm-save');
    if(escape)app.handlers.keydown({key:'Escape'});else app.click('result-board');
    assert.equal(hasResult(app),false);assert.equal(app.api.state().screen,'board');
    assert.equal(app.api.state().rounds.length,4);assert.match(app.app.innerHTML,/Player 1 wins!/);
  }
});

test('Back to Games keeps the completed game and its final scores',()=>{
  const app=appHarness(finalRound());app.click('confirm-save');app.click('save-game');
  assert.equal(hasResult(app),false);assert.equal(app.api.state().screen,'library');
  assert.match(app.app.innerHTML,/Completed games · 1/);assert.match(app.app.innerHTML,/Winner: Player 1/);
  const item=app.api.library().games[0];assert.equal(item.game.rounds.length,4);
  app.click('open-game',{id:item.id});assert.equal(app.api.state().screen,'board');assert.equal(hasResult(app),false);
});

test('New game saves the finished game; Cancel returns to the result dialog',()=>{
  const app=appHarness(finalRound());app.click('confirm-save');const original=app.api.library().activeId;
  app.click('new-game');assert.equal(hasResult(app),false);assert.match(app.app.innerHTML,/completed game/);
  app.click('cancel');assert.ok(hasResult(app));
  app.click('new-game');app.handlers.keydown({key:'Escape'});assert.ok(hasResult(app));
  app.click('new-game');app.input('[data-game-title]','The rematch');app.click('confirm');
  assert.equal(app.api.library().games.length,2);assert.notEqual(app.api.library().activeId,original);
  assert.equal(app.api.state().rounds.length,0);assert.equal(app.api.state().mode,2);
  assert.equal(app.api.library().games.find(item=>item.id===original).game.rounds.length,4);
});

test('Correcting the last round announces the revised winner',()=>{
  const app=appHarness(finalRound());app.click('confirm-save');app.click('result-board');app.click('undo');
  app.change({value:'1',matches:selector=>selector==='[data-select="active"]'});
  app.input('[data-manual]','2000',{manual:'manualFor'});app.click('next');app.click('review');app.click('confirm-save');
  assert.ok(hasResult(app));assert.match(app.app.innerHTML,/Player 2 wins!/);
  assert.equal(app.api.state().rounds.length,4);assert.equal(app.api.state().rounds[3].scores[1],2000);
});

test('An incomplete or invalid calculated round cannot trigger a result dialog',()=>{
  const incomplete=finalRound();incomplete.completed[1]=false;
  const invalid=finalRound();invalid.method='calculated';
  for(const game of [incomplete,invalid]){
    const app=appHarness(game);app.click('confirm-save');assert.equal(hasResult(app),false);assert.equal(app.api.state().rounds.length,3);
  }
});

test('Reloading, opening, or importing an already completed game does not replay the dialog',async()=>{
  const app=appHarness(finalRound());app.click('confirm-save');
  const reloaded=appHarness(null,{storage:app.storage});assert.equal(hasResult(reloaded),false);assert.equal(reloaded.api.state().screen,'board');
  const backup=await app.export(),target=appHarness();await target.import(backup);
  assert.equal(hasResult(target),false);assert.equal(target.api.state().screen,'board');
});

test('The result dialog escapes names, supports negative scores, and ranks the winner first',()=>{
  const app=appHarness(finalRound({scores:[-50,-20],names:['<Player & One>','Winner <Two>']}));app.click('confirm-save');
  assert.ok(hasResult(app));assert.match(app.app.innerHTML,/Winner &lt;Two&gt; wins!/);
  assert.match(app.app.innerHTML,/>-80</);assert.match(app.app.innerHTML,/>-200</);
  const dialog=app.app.innerHTML.split('class="game-dialog result-dialog')[1];
  assert.ok(dialog.indexOf('Winner &lt;Two&gt;')<dialog.indexOf('&lt;Player &amp; One&gt;'));
});

test('Failed final-round storage is visible in the dialog and cannot discard the in-memory result',async()=>{
  const app=appHarness(finalRound());app.storage.setItem=()=>{throw Error('Quota exceeded')};app.click('confirm-save');
  assert.ok(hasResult(app));const dialog=app.app.innerHTML.split('class="game-dialog result-dialog')[1];
  assert.match(dialog,/could not be saved/);assert.match(dialog,/Export backup/);
  app.click('save-game');assert.ok(hasResult(app));assert.equal(app.api.state().rounds.length,4);
  const backup=await app.export();assert.equal(backup.game.rounds.length,4);
});

test('Repeated final-save activation does not duplicate the last round',()=>{
  const app=appHarness(finalRound());app.click('confirm-save');app.click('confirm-save');
  assert.ok(hasResult(app));assert.equal(app.api.state().rounds.length,4);
});
