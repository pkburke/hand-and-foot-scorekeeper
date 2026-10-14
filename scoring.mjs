export const VALUES = [50,20,10,5];
export const OPENING = [50,90,120,150,150];
export const REQUIRED_BLACK = {2:1,4:2,6:2};
export function blankEntry(){return {left:[0,0,0,0],red3:0,red:0,black:0,played:[0,0,0,0],manualFor:0,manualAgainst:0,manualBooks:0};}
export function points(counts){return VALUES.reduce((sum,value,i)=>sum+value*(Number(counts?.[i])||0),0);}
export function score(entry,method,wentOut){let base=method==='manual'?(+entry.manualFor||0)-(+entry.manualAgainst||0)+(+entry.manualBooks||0):points(entry.played)-points(entry.left)-300*(+entry.red3||0)+500*(+entry.red||0)+300*(+entry.black||0);return base+(wentOut?100:0);}
export function teamCount(mode){return Number(mode)===6?3:2;}
export function openingMinimum(roundIndex){return OPENING[Math.min(roundIndex,4)];}
export function standings(rounds,n){return Array.from({length:n},(_,i)=>rounds.reduce((sum,r)=>sum+r.scores[i],0));}
export function gameOver(rounds,n){if(rounds.length>=5)return true;if(rounds.length<4)return false;let totals=standings(rounds,n),max=Math.max(...totals);return totals.filter(v=>v===max).length===1;}
export function validGoingOut(entry,mode){return (+entry.red||0)>=1&&(+entry.black||0)>=REQUIRED_BLACK[mode];}
export function freshGame(mode=2){const n=teamCount(mode);return {version:1,mode:Number(mode),method:'calculated',names:Array.from({length:n},(_,i)=>`${Number(mode)===2?'Player':'Team'} ${i+1}`),rounds:[],draft:Array.from({length:n},blankEntry),completed:Array(n).fill(false),out:0,active:0,step:'left',screen:'game'};}
