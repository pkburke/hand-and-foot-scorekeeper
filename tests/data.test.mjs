import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGame} from '../scoring.mjs';
import {KEYS,validateGame,validateBackup,validateArchive,saveBackup} from '../data.mjs';
import {memoryStorage,roundFor,archiveFor} from './helpers/app-harness.mjs';

for(const mode of [2,4,6])test(`Existing v3-shaped ${mode}-player games and backups round-trip`,()=>{
  const game=freshGame(mode);game.rounds=[roundFor(game.names.map((_,i)=>100-i*150),mode)];
  assert.deepEqual(validateGame(game),game);
  const backup={game,completedGames:[archiveFor(game)],namePresets:[{mode,names:game.names}]};
  assert.deepEqual(validateBackup(backup),backup);
});

test('Malformed nested counts, flags, selectors, names and scoring methods are rejected',()=>{
  const mutations=[
    g=>g.draft=[{},{}],g=>g.draft[0].left=[0,0,0],g=>g.draft[0].played[0]=-1,
    g=>g.draft[0].red=1.5,g=>g.draft[0].manualFor='100',g=>g.draft[0].red3=Infinity,
    g=>g.completed=[true],g=>g.completed[0]='true',g=>g.active=2,g=>g.out=-1,
    g=>g.names[0]=null,g=>g.mode='2',g=>g.method='automatic',g=>g.step='invalid',
    g=>g.screen='invalid',g=>g.version=2,g=>g.draft[0].black=1000000
  ];
  for(const mutate of mutations){const game=freshGame();mutate(game);assert.throws(()=>validateGame(game))}
});

test('Round entries, totals and legal game length are validated',()=>{
  const mutations=[g=>g.rounds[0].scores[0]++,g=>g.rounds[0].scores.pop(),g=>g.rounds[0].entries[0].played=null,
    g=>g.rounds[0].out=99,g=>g.rounds[0].method='calculated',g=>g.rounds=Array(6).fill(g.rounds[0]),
    g=>g.rounds=Array(5).fill(g.rounds[0])];
  for(const mutate of mutations){const game=freshGame();game.rounds=[roundFor([100,0])];mutate(game);assert.throws(()=>validateGame(game))}
});

test('Tie after four rounds permits exactly one fifth round',()=>{
  const game=freshGame(6);game.rounds=Array.from({length:4},()=>roundFor([100,100,-20],6));
  assert.equal(validateGame(game).rounds.length,4);game.rounds.push(roundFor([-10,-10,0],6));
  assert.equal(validateGame(game).rounds.length,5);
});

test('Stale review state is normalized to scoring',()=>{
  const game=freshGame();game.screen='review';assert.equal(validateGame(game).screen,'score');
});

test('Optional history and presets are validated before any import writes',()=>{
  for(const extra of [{completedGames:[null]},{namePresets:[{mode:6,names:['one']}]},{completedGames:{}},{namePresets:null}]){
    const storage=memoryStorage({[KEYS.game]:'untouched'});
    assert.throws(()=>saveBackup(storage,{game:freshGame(),...extra}));assert.equal(storage.getItem(KEYS.game),'untouched');assert.equal(storage.values.size,1);
  }
});

test('Archive completion status is derived from rounds',()=>{
  const game=freshGame();game.rounds=[roundFor([100,0])];const archived=archiveFor(game);archived.finished=true;
  assert.equal(validateArchive([archived])[0].finished,false);archived.date='broken';assert.throws(()=>validateArchive([archived]));
});

test('Legacy game-only imports preserve history and presets',()=>{
  const storage=memoryStorage({[KEYS.archive]:'[]',[KEYS.presets]:'[]'});
  saveBackup(storage,{game:freshGame(6)});assert.equal(storage.getItem(KEYS.archive),'[]');assert.equal(storage.getItem(KEYS.presets),'[]');
});

test('Storage failure rolls back all written keys and preserves the active game',()=>{
  for(const populated of [false,true]){
    const initial={[KEYS.game]:'old game',...(populated?{[KEYS.archive]:'old library',[KEYS.presets]:'old presets'}:{})};
    const storage=memoryStorage(initial),setItem=storage.setItem;
    storage.setItem=(key,value)=>{if(key===KEYS.game)throw Error('Quota exceeded');setItem(key,value)};
    assert.throws(()=>saveBackup(storage,{game:freshGame(),completedGames:[],namePresets:[]}),/Existing data was kept/);
    assert.deepEqual(Object.fromEntries(storage.values),initial);
  }
});

test('Storage read failures cause no import writes',()=>{
  let writes=0;assert.throws(()=>saveBackup({getItem(){throw Error('Denied')},setItem(){writes++}},{game:freshGame()}));assert.equal(writes,0);
});
