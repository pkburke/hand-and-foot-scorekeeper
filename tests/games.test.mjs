import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame} from '../scoring.mjs';
import {KEYS,compatibleGame,validateLibrary,validateBackup,saveBackup} from '../data.mjs';
import {makeLibrary,activeGame,saveActive,addGame,openGame,renameGame,archiveForLibrary,mergeBackup} from '../games.mjs';
import {appHarness,memoryStorage,roundFor,archiveFor} from './helpers/app-harness.mjs';
const plain=value=>JSON.parse(JSON.stringify(value));

function start(app,title,mode){app.click('new-game');app.input('[data-game-title]',title);if(mode)app.click('new-mode',{value:String(mode)});app.click('confirm')}

for(const mode of [2,4,6])test(`Switching away and back preserves a full ${mode}-player draft`,()=>{
  const game=freshGame(mode);game.screen='score';game.step='played';game.active=game.names.length-1;game.out=1;
  game.rounds=[roundFor(game.names.map((_,i)=>100-i*10),mode)];game.draft[game.active].played=[1,2,3,4];game.completed[0]=true;
  const library=makeLibrary(game),id=library.activeId,next=addGame(library,game,{title:'Another game',mode:mode===2?6:2});
  const restored=openGame(next,activeGame(next).game,id);
  assert.deepEqual(activeGame(restored).game,game);assert.equal(restored.games.length,2);
});

test('Existing current game and finished/unfinished v3.1 archives migrate without changing scores',()=>{
  const game=freshGame();game.screen='score';game.draft[0].left[1]=3;
  const unfinished=freshGame(6);unfinished.rounds=[roundFor([100,70,30],6)];
  const finished=freshGame();finished.rounds=Array.from({length:4},()=>roundFor([100,0]));
  const library=makeLibrary(game,[archiveFor(unfinished),{...archiveFor(finished),id:2}]);
  assert.equal(library.games.length,3);assert.deepEqual(activeGame(library).game,game);
  const restored=openGame(library,game,library.games[1].id);
  assert.deepEqual(activeGame(restored).game.rounds,unfinished.rounds);assert.equal(activeGame(restored).game.mode,6);
  const results=openGame(restored,activeGame(restored).game,library.games[2].id);
  assert.equal(activeGame(results).game.screen,'board');assert.equal(activeGame(results).game.rounds.length,4);
});

test('Duplicate IDs in an old millisecond archive are migrated to distinct games',()=>{
  const game=freshGame();game.rounds=[roundFor([100,0])];
  const library=makeLibrary(freshGame(),[archiveFor(game),archiveFor(game)]);
  assert.equal(new Set(library.games.map(g=>g.id)).size,3);
});

test('Create, rename and open functions do not mutate their inputs',()=>{
  const game=freshGame(),library=makeLibrary(game),before=JSON.stringify(library);
  const next=addGame(library,game,{title:'Friday',mode:4});assert.equal(JSON.stringify(library),before);
  const renamed=renameGame(next,activeGame(next).game,next.activeId,'  Sunday  ');
  assert.equal(activeGame(renamed).title,'Sunday');assert.equal(activeGame(next).title,'Friday');
  assert.throws(()=>renameGame(next,game,next.activeId,'   '));assert.throws(()=>openGame(next,game,'missing'));
});

test('Games survive multiple switches, reload and independent player formats',()=>{
  const app=appHarness();app.click('go-score');app.click('method',{value:'manual'});app.input('[data-manual]','125',{manual:'manualFor'});
  const first=app.api.library().activeId;
  start(app,'Friday cards',4);const second=app.api.library().activeId;
  app.click('go-score');app.input('[data-field]','3',{field:'red'});
  start(app,'Weekend rematch',6);const third=app.api.library().activeId;
  app.click('go-score');app.change({value:'2',matches:s=>s==='[data-select="active"]'});app.input('[data-field]','2',{field:'left',index:'0'});
  app.click('open-game',{id:first});assert.equal(app.api.state().mode,2);assert.equal(app.api.state().draft[0].manualFor,125);assert.equal(app.api.stack(),0);
  app.click('open-game',{id:second});assert.equal(app.api.state().mode,4);assert.equal(app.api.state().draft[0].red,3);
  const reloaded=appHarness(null,{storage:app.storage});assert.equal(reloaded.api.library().games.length,3);
  reloaded.click('open-game',{id:third});assert.equal(reloaded.api.state().mode,6);assert.equal(reloaded.api.state().active,2);assert.equal(reloaded.api.state().draft[2].left[0],2);
});

test('Save & return to Games preserves the scoring screen, team and step to resume',()=>{
  const game=freshGame(6);game.screen='score';game.active=2;game.step='books';game.draft[2].red=1;
  const app=appHarness(game),id=app.api.library().activeId;app.click('save-game');assert.equal(app.api.state().screen,'library');
  app.click('open-game',{id});assert.equal(app.api.state().screen,'score');assert.equal(app.api.state().step,'books');assert.equal(app.api.state().active,2);
});

test('Game names are saved, escaped for display, and can be changed independently',()=>{
  const app=appHarness();start(app,'<Friday & friends>',4);const id=app.api.library().activeId;app.click('library');
  assert.match(app.app.innerHTML,/&lt;Friday &amp; friends&gt;/);
  app.click('rename-game',{id});app.input('[data-game-title]','Sunday game');app.click('confirm');
  assert.equal(activeGame(app.api.library()).title,'Sunday game');
  assert.equal(appHarness(null,{storage:app.storage}).api.library().games.find(g=>g.id===id).title,'Sunday game');
});

test('Cancel and Escape leave the current game and library unchanged',()=>{
  const app=appHarness(),before=plain(app.api.library());app.click('new-game');app.input('[data-game-title]','Nope');app.click('cancel');
  assert.deepEqual(plain(app.api.library()),before);app.click('new-game');app.handlers.keydown({key:'Escape'});assert.deepEqual(plain(app.api.library()),before);
});

test('A failed save cannot switch games, create a game, or discard an unsaved draft',()=>{
  const app=appHarness();const first=app.api.library().activeId;start(app,'Second',4);const second=app.api.library().activeId;
  app.click('go-score');app.input('[data-field]','1',{field:'red'});const stored=Object.fromEntries(app.storage.values);
  app.storage.setItem=()=>{throw Error('Quota exceeded')};app.input('[data-field]','5',{field:'red'});
  app.click('open-game',{id:first});assert.equal(app.api.library().activeId,second);assert.equal(app.api.state().draft[0].red,5);
  start(app,'Third',6);assert.equal(app.api.library().games.length,2);assert.equal(app.api.state().draft[0].red,5);
  assert.deepEqual(Object.fromEntries(app.storage.values),stored);
});

test('Backups preserve every game, titles, drafts and the selected game',async()=>{
  const app=appHarness();app.click('go-score');app.input('[data-field]','4',{field:'left',index:'0'});const first=app.api.library().activeId;
  start(app,'Other game',6);app.click('go-score');app.input('[data-field]','2',{field:'black'});
  const backup=await app.export();assert.equal(backup.gameLibrary.games.length,2);assert.equal(backup.gameLibrary.activeId,app.api.library().activeId);assert.doesNotThrow(()=>validateBackup(backup));
  const target=appHarness();const retained=target.api.library().activeId;await target.import(backup);
  assert.ok(target.api.library().games.some(g=>g.id===retained));assert.equal(target.api.state().draft[0].black,2);
  target.click('open-game',{id:first});assert.equal(target.api.state().draft[0].left[0],4);
});

test('Conflicting imported versions keep both games instead of overwriting a local version',()=>{
  const original=freshGame(),library=makeLibrary(original),backup={game:original,gameLibrary:library};
  const changed=structuredClone(original);changed.draft[0].red=3;
  const merged=mergeBackup(saveActive(library,changed),changed,backup);
  assert.equal(merged.games.length,2);assert.notEqual(merged.activeId,library.activeId);
  assert.equal(merged.games.find(g=>g.id===library.activeId).game.draft[0].red,3);assert.equal(activeGame(merged).game.draft[0].red,0);
});

test('Importing an unchanged library does not duplicate games because of navigation or timestamps',()=>{
  const game=freshGame(),library=makeLibrary(game),backup={game,gameLibrary:library};
  const navigated={...game,screen:'library'};const merged=mergeBackup(library,navigated,backup);assert.equal(merged.games.length,1);
});

test('Malformed inactive games or missing active games reject the whole backup before writes',()=>{
  const game=freshGame(),library=addGame(makeLibrary(game),game,{title:'Second'}),bad=structuredClone(library);
  bad.games[0].game.draft=[{},{}];const storage=memoryStorage({[KEYS.game]:'keep'});
  assert.throws(()=>saveBackup(storage,{game:activeGame(bad).game,gameLibrary:bad}));assert.equal(storage.getItem(KEYS.game),'keep');assert.equal(storage.values.size,1);
  assert.throws(()=>validateLibrary({...library,activeId:'missing'}));
  assert.throws(()=>validateLibrary({...library,games:[library.games[0],library.games[0]]}));
});

test('Backup active-game mismatch is rejected',()=>{
  const game=freshGame(),library=makeLibrary(game),other=freshGame(6);
  assert.throws(()=>validateBackup({game:other,gameLibrary:library}),/does not match/);
});

test('Library write is rolled back if writing the active legacy game fails',()=>{
  const game=freshGame(),library=makeLibrary(game),before={[KEYS.game]:'old current',[KEYS.games]:'old library'},storage=memoryStorage(before),set=storage.setItem;
  storage.setItem=(key,value)=>{if(key===KEYS.game)throw Error('Full');set(key,value)};
  assert.throws(()=>saveBackup(storage,{game,gameLibrary:library}));assert.deepEqual(Object.fromEntries(storage.values),before);
});

test('Unreadable library is preserved for recovery while the existing current game stays usable',()=>{
  const game=freshGame();game.draft[0].left[0]=2;const storage=memoryStorage({[KEYS.game]:JSON.stringify(game),[KEYS.games]:'broken'});
  const app=appHarness(null,{storage});assert.equal(app.api.state().draft[0].left[0],2);assert.equal(storage.getItem(KEYS.games+'-recovery'),'broken');
});

test('Settings survive reload, remain device-wide across games and preserve game data',()=>{
  const app=appHarness();app.click('appearance',{value:'dark'});assert.equal(app.rootElement.dataset.theme,'dark');
  start(app,'Another game',6);assert.equal(app.api.settings().appearance,'dark');
  const reloaded=appHarness(null,{storage:app.storage});assert.equal(reloaded.rootElement.dataset.theme,'dark');assert.equal(reloaded.api.library().games.length,2);
});

test('System appearance responds to device changes; explicit light/dark overrides it',()=>{
  let callback;const media={matches:true,addEventListener:(event,fn)=>callback=fn},app=appHarness(undefined,{matchMedia:()=>media});
  assert.equal(app.rootElement.dataset.theme,'dark');media.matches=false;callback();assert.equal(app.rootElement.dataset.theme,'light');
  app.click('appearance',{value:'dark'});callback();assert.equal(app.rootElement.dataset.theme,'dark');
  app.click('appearance',{value:'light'});media.matches=true;callback();assert.equal(app.rootElement.dataset.theme,'light');
});

test('Failed appearance writes retain the previous selection',()=>{
  const app=appHarness();app.storage.setItem=()=>{throw Error('Denied')};app.click('appearance',{value:'dark'});
  assert.equal(app.api.settings().appearance,'system');assert.equal(app.rootElement.dataset.theme,'light');
});

test('Settings exports keep a v3.1-readable active game field',async()=>{
  const app=appHarness();app.click('settings');const backup=await app.export();assert.equal(backup.game.screen,'board');assert.equal(activeGame(backup.gameLibrary).game.screen,'settings');
  assert.doesNotThrow(()=>validateBackup(backup));assert.equal(compatibleGame(app.api.state()).screen,'board');
});
