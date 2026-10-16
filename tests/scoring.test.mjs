import test from 'node:test';
import assert from 'node:assert/strict';
import {blankEntry,score,points,openingMinimum,validGoingOut,gameOver,standings} from '../scoring.mjs';
import {roundFor} from './helpers/app-harness.mjs';

test('Calculated and manual scores include cards, books, penalties and going out exactly once',()=>{
  const entry={...blankEntry(),played:[1,2,3,4],left:[0,1,0,1],red3:1,red:1,black:2,manualFor:140,manualAgainst:325,manualBooks:1100};
  assert.equal(points(entry.played),140);assert.equal(score(entry,'calculated',true),1015);assert.equal(score(entry,'manual',true),1015);
  assert.equal(score({...blankEntry(),red3:2},'calculated',false),-600);
});
test('Opening minimums and going-out requirements match the house rules',()=>{
  assert.deepEqual([0,1,2,3,4].map(openingMinimum),[50,90,120,150,150]);
  for(const mode of [2,4,6]){assert.equal(validGoingOut({red:1,black:1},mode),mode===2);assert.ok(validGoingOut({red:1,black:2},mode));assert.equal(validGoingOut({red:0,black:2},mode),false)}
});
test('Four rounds end with a unique leader; ties get one fifth round including negative totals',()=>{
  const tied=Array.from({length:4},()=>roundFor([-200,-200]));
  assert.equal(gameOver(tied.slice(0,3),2),false);assert.equal(gameOver(tied,2),false);
  assert.equal(gameOver([...tied,roundFor([-100,-100])],2),true);
  assert.equal(gameOver([roundFor([10,-10]),...tied.slice(1)],2),true);
  assert.deepEqual(standings(tied,2),[-800,-800]);
});
