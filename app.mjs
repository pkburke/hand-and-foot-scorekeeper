import {VALUES,REQUIRED_BLACK,blankEntry,points,score,teamCount,openingMinimum,standings,gameOver,validGoingOut,freshGame} from './scoring.mjs';
import {KEYS,validateGame,validateArchive,validatePresets,validateLibrary,validateSettings,compatibleGame,saveBackup} from './data.mjs';
import {activeGame,makeLibrary,saveActive,addGame,openGame,renameGame,rematchGame,removeGame,restoreGame,archiveForLibrary,mergeBackup} from './games.mjs';
const KEY=KEYS.game,ARCHIVE_KEY=KEYS.archive,PRESETS_KEY=KEYS.presets;
const undoStack=[];let storageWarning='',recoveryNotice='',recoveryBlocked=false;
let numericEdit=null;
let state=load();
let library=readSaved(KEYS.games,null,validateLibrary)??makeLibrary(state,storeGet(ARCHIVE_KEY,[]));
state=structuredClone(activeGame(library).game);
let settings=readSaved(KEYS.settings,{appearance:'system'},validateSettings);
const APP_VERSION='3.3.1';
let lastExport=readLastExport(),backupDateWarning='';
let availableVersion='',dismissedVersion='',updateWarning='',workerRegistration=null;
let pending=null;let ruleQuery='';let renderedScreen=null,completedOpen=false,removedOpen=false,announcement='';const app=document.querySelector('#app');
function preserveInvalidData(key,raw){
  try{
    const recoveryKey=key+'-recovery',previous=localStorage.getItem(recoveryKey);
    localStorage.setItem(previous&&previous!==raw?recoveryKey+'-'+Date.now():recoveryKey,raw);
    recoveryNotice='Some saved data could not be loaded. The original data was kept on this device for recovery.';
  }catch{
    recoveryBlocked=true;
    storageWarning='Saving paused: saved data could not be loaded or backed up. Export a backup before continuing.';
  }
}
function readSaved(key,fallback,validate){
  let raw;
  try{raw=localStorage.getItem(key)}catch{storageWarning='Device storage is unavailable. Export a backup to keep your scores.';return fallback}
  if(raw===null)return fallback;
  try{return validate(JSON.parse(raw))}catch{preserveInvalidData(key,raw);return fallback}
}
function load(){return readSaved(KEY,freshGame(),validateGame)}
function readLastExport(){
  try{const raw=localStorage.getItem(KEYS.lastExport);return raw&&Number.isFinite(Date.parse(raw))&&new Date(raw).toISOString()===raw?raw:null}catch{return null}
}
function backupStatus(){return lastExport?`Last export started: ${new Date(lastExport).toLocaleString()}`:'No backup export recorded on this device.'}
function refreshBackupStatus(){
  const status=document.querySelector('[data-backup-status]'),note=document.querySelector('[data-backup-date-warning]');
  if(status)status.textContent=backupStatus();if(note)note.textContent=backupDateWarning;
}
function updateNotice(){return `<section class="update-notice card soft" data-update-notice ${!availableVersion||dismissedVersion===availableVersion?'hidden':''} aria-label="App update">
  <p role="status" data-update-message>${text(updateWarning||`Version ${availableVersion} is ready. Save your current game and reload when you’re ready.`)}</p>
  <div class="toolbar">${button('Update now','update-now','class="primary"')}${button('Later','update-later','class="secondary"')}</div></section>`}
function refreshUpdateNotice(){
  const notice=document.querySelector('[data-update-notice]'),message=document.querySelector('[data-update-message]');
  if(notice)notice.hidden=!availableVersion||dismissedVersion===availableVersion;
  if(message)message.textContent=updateWarning||`Version ${availableVersion} is ready. Save your current game and reload when you’re ready.`;
  const settingsMessage=document.querySelector('[data-settings-update-message]'),settingsButton=document.querySelector('[data-settings-update-button]');
  if(settingsMessage){settingsMessage.hidden=!availableVersion;settingsMessage.textContent=`Version ${availableVersion} is available.`}
  if(settingsButton)settingsButton.hidden=!availableVersion;
}
function applyUpdate(){
  if(!availableVersion)return;
  if(!persist()){updateWarning='Your game could not be saved. Export a backup before updating.';refreshUpdateNotice();return}
  location.reload();
}
function watchUpdates(){
  if(!('serviceWorker'in navigator)||location.protocol==='file:')return;
  const workers=navigator.serviceWorker;
  const askVersion=()=>{try{workers.controller?.postMessage({type:'GET_APP_VERSION'})}catch{}};
  workers.addEventListener('controllerchange',askVersion);
  workers.addEventListener('message',event=>{
    if(event.source!==workers.controller||event.data?.type!=='APP_VERSION'||typeof event.data.version!=='string'||event.data.version.length>32||!/^\d+\.\d+(?:\.\d+)?$/.test(event.data.version))return;
    const version=event.data.version;
    // An older controller can briefly coexist with freshly downloaded page code.
    const a=version.split('.').map(Number),b=APP_VERSION.split('.').map(Number);
    const newer=a.some((part,i)=>part>(b[i]??0)&&a.slice(0,i).every((value,j)=>value===(b[j]??0)));
    if(!newer)return;
    availableVersion=version;updateWarning='';refreshUpdateNotice();
  });
  workers.register('./sw.js',{updateViaCache:'none'}).then(registration=>{workerRegistration=registration;askVersion()}).catch(console.warn);
  document.addEventListener?.('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&workerRegistration)void workerRegistration.update().catch(()=>{});
  });
}
function storeGet(key,fallback){return readSaved(key,fallback,key===ARCHIVE_KEY?validateArchive:validatePresets)}
function updateSaveStatus(){const el=document.querySelector('[data-save-status]');if(el)el.textContent=storageWarning||'Autosaved on this device. Offline after first load.'}
function storePut(key,value){
  if(recoveryBlocked)return false;
  try{localStorage.setItem(key,JSON.stringify(value));if(key===KEY)storageWarning='';updateSaveStatus();return true}
  catch{storageWarning='Changes could not be saved on this device. Export a backup to keep your scores.';updateSaveStatus();return false}
}
function remember(input=null){
  // Keep autosaving each keystroke, but undo a whole numeric-field edit at once.
  if(input&&numericEdit===input)return;
  numericEdit=input;
  undoStack.push(JSON.stringify({draft:state.draft,completed:state.completed,out:state.out,method:state.method,active:state.active,step:state.step}));
  if(undoStack.length>20)undoStack.shift();
}
function commitLibrary(next,includeArchive=false){
  if(recoveryBlocked)return false;
  try{
    saveBackup(localStorage,{game:compatibleGame(activeGame(next).game),gameLibrary:next,...(includeArchive?{completedGames:archiveForLibrary(next)}:{})});
    library=next;storageWarning='';updateSaveStatus();return true;
  }catch{storageWarning='Changes could not be saved on this device. Export a backup to keep your scores.';updateSaveStatus();return false}
}
function persist(){return commitLibrary(saveActive(library,state))}
function selectLibrary(next){
  if(!commitLibrary(next,true)){alert('The current game could not be saved or archived. Export a backup before switching games.');draw();return false}
  state=structuredClone(activeGame(library).game);undoStack.length=0;pending=null;ruleQuery='';draw();return true;
}
function applyAppearance(){
  const isDark=settings.appearance==='dark'||settings.appearance==='system'&&typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches;
  if(document.documentElement){document.documentElement.dataset.theme=isDark?'dark':'light';document.documentElement.style.colorScheme=isDark?'dark':'light'}
  document.querySelector('meta[name="theme-color"]')?.setAttribute?.('content',isDark?'#101925':'#f5f8fc');
}
function text(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function num(v){return Math.max(0,Math.min(999999,Math.floor(Number(v)||0)));}function fmt(v){return Number(v).toLocaleString('en-US')}
function label(i){return state.names[i]||`${state.mode===2?'Player':'Team'} ${i+1}`;}
function calculate(d,i){return score(d,state.method,state.out===i)}
function set(mutator,render=true){mutator();persist();if(render)draw();}
function button(label,action,extra=''){return `<button type="button" data-action="${action}" ${extra}>${label}</button>`}
function icon(name){
  const shapes={
    library:'<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 20h16M8 7h8M8 11h5"/>',
    game:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    score:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h1M15 11h1M8 15h1M15 15h1M8 19h1M15 19h1"/>',
    board:'<path d="M4 21h16M7 17V9M12 17V3M17 17v-5"/>',
    rules:'<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
    settings:'<path d="M3 6h7M14 6h7M3 18h11M18 18h3"/><circle cx="12" cy="6" r="2"/><circle cx="16" cy="18" r="2"/>',
    trophy:'<path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 12v6M8 21h8M10 18h4v3h-4z"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes[name]}</svg>`;
}
function segment(options,current,action){const groups={method:"Scoring method",step:"Scoring step",mode:"Number of players","new-mode":"Number of players",appearance:"Appearance"};return `<div class="segments" role="group" aria-label="${groups[action]||action}">${options.map(([v,l])=>button(text(l),action,`data-value="${v}" aria-pressed="${String(current)===String(v)}" class="${String(current)===String(v)?'active':''}"`)).join('')}</div>`}
function counter(field,index,title,detail){const v=index===undefined?state.draft[state.active][field]:state.draft[state.active][field][index];const extra=index===undefined?'':`data-index="${index}"`;return `<div class="row"><div><div class="label">${text(title)}</div><small id="help-${field}-${index??0}">${text(detail)}</small></div><div class="controls">${button('−','decrement',`class="square" data-field="${field}" ${extra} aria-label="Decrease ${text(title)}"`)}<input aria-label="${text(title)} count" aria-describedby="help-${field}-${index??0}" inputmode="numeric" pattern="[0-9]*" type="number" min="0" class="counter" data-field="${field}" ${extra} value="${num(v)}">${button('+','increment',`class="square plus" data-field="${field}" ${extra} aria-label="Increase ${text(title)}"`)}</div></div>`}
function pendingDialog(){
  if(!pending)return '';
  if(pending.type==='result')return resultDialog();
  if(pending.type==='remove')return `<div class="dialog-backdrop"><section class="game-dialog card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="remove-description">
    <h2 id="dialog-title">Remove game?</h2><p id="remove-description">Move <strong>${text(pending.title)}</strong> to Removed games? Its scores and unfinished entries will be kept. You can restore it at any time.</p>
    <div class="toolbar dialog-actions">${button('Keep game','cancel','class="secondary" data-initial-focus')}${button('Remove game','confirm','class="danger"')}</div></section></div>`;
  const rename=pending.type==='rename',rematch=pending.type==='rematch';
  return `<div class="dialog-backdrop"><section class="game-dialog card" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><form data-game-form>
    <h2 id="dialog-title">${rename?'Rename game':rematch?'Play again':'Start a new game'}</h2>
    ${rename?'':`<p class="muted">${rematch?'Start at round 1 with the same players, teams, and scoring method. Your original game will stay in Games.':gameOver(state.rounds,state.names.length)?'Your completed game will stay in Games with its final scores.':'Your current game will be saved, including this round’s unfinished scores.'}</p>`}
    ${rematch?`<p>${text(pending.names.join(' / '))} · ${pending.mode} players · ${pending.method==='manual'?'Manual':'Calculated'} scoring</p>`:''}
    <label for="game-title">Game name</label><input id="game-title" type="text" maxlength="80" required data-game-title data-initial-focus value="${text(pending.title)}">
    ${rename||rematch?'':`<p class="field-label">Number of players</p>${segment([[2,'2 players'],[4,'4 players'],[6,'6 players']],pending.mode,'new-mode')}`}
    <div class="toolbar dialog-actions">${button('Cancel','cancel','class="secondary"')}${button(rename?'Save name':rematch?'Start rematch':'Create game','confirm','class="primary"')}</div>
    </form></section></div>`;
}
function resultDialog(){
  const totals=standings(state.rounds,state.names.length),best=Math.max(...totals);
  const ranked=totals.map((total,index)=>({index,total})).sort((a,b)=>b.total-a.total),tied=totals.filter(total=>total===best).length>1;
  return `<div class="dialog-backdrop"><section class="game-dialog result-dialog card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="result-description">
    <div class="result-symbol">${icon('trophy')}</div><p class="result-eyebrow">Game complete</p>
    <h2 id="dialog-title">${tied?'Game ends in a tie':`${text(label(ranked[0].index))} wins!`}</h2>
    <p id="result-description" class="muted">${text(activeGame(library).title)} · ${state.rounds.length} rounds played</p>
    <h3 class="result-scores-title">Final scores</h3><ol class="result-standings" aria-label="Final standings">${ranked.map(({index,total})=>`<li class="${total===best?'result-leader':''}"><div class="result-name"><span>${text(label(index))}</span>${total===best?`<small>${tied?'Tied for first':'Winner'}</small>`:''}</div><strong>${fmt(total)}<small>points</small></strong></li>`).join('')}</ol>
    ${storageWarning?`<p class="note" role="alert">${text(storageWarning)}</p>${button('Export backup','export','class="secondary full"')}`:''}
    <div class="result-actions">${button('View results','result-board','class="primary full"')}${button('Play again','rematch','class="secondary full"')}${button('New game','new-game','class="secondary full"')}${button('Back to Games','save-game','class="secondary full"')}</div>
    </section></div>`;
}
function layout(content){
  const r=state.rounds.length,done=gameOver(state.rounds,state.names.length);
  const tabs=[['library','Games'],['game','Reference'],['score','Score'],['board','Scoreboard'],['rules','Rules']];
  return `<main class="app" ${pending?'inert aria-hidden="true"':''}><header class="top app-header"><div class="brand-lockup"><img class="brand-logo" src="./icons/icon-180.png" width="44" height="44" alt=""><div><h1 class="brand">Hand & Foot</h1><div class="eyebrow">${state.mode}-player scorekeeper</div><div class="current-game-name">${text(activeGame(library).title)}</div></div></div><div class="header-actions"><span class="pill">${done?'Game over':`Round ${r+1}`}</span>${button(icon('settings'),'settings','class="settings-button secondary" aria-label="Settings"')}</div></header>
    ${updateNotice()}<section class="screen">${content}</section>
    <footer class="bottom"><div class="footer-actions"><div class="backup-actions">${button('Export backup','export','class="secondary full"')}${button('Import backup','import','class="secondary full"')}</div>${state.screen==='library'?'':`<div class="new-game-action">${button('Save & return to Games','save-game','class="secondary full"')}${button('New game','new-game','class="secondary full"')}</div>`}</div>
    <p class="status" data-save-status role="status">${text(storageWarning||'Autosaved on this device. Offline after first load.')}</p>${recoveryNotice?`<p class="note" role="status">${text(recoveryNotice)}</p>`:''}<input type="file" id="import-file" accept="application/json,.json" hidden></footer></main>
    <nav class="bottom-nav" aria-label="Main navigation" ${pending?'inert aria-hidden="true"':''}>${tabs.map(([id,caption])=>`<button type="button" data-action="screen" data-value="${id}" class="nav-tab ${state.screen===id?'active':''}" aria-current="${state.screen===id?'page':'false'}"><span class="nav-icon" aria-hidden="true">${icon(id)}</span><span>${caption}</span></button>`).join('')}</nav>${pendingDialog()}<p class="sr-only" role="status" aria-live="polite" data-announcement>${text(announcement)}</p>`;
}
function gameScreen(){let r=state.rounds.length;let done=gameOver(state.rounds,state.names.length);let black=REQUIRED_BLACK[state.mode];return `<div class="card soft hero"><small>${done?'GAME COMPLETE':`ROUND ${r+1} · MINIMUM TO LAY DOWN`}</small><div class="number">${openingMinimum(r)} points</div></div><h2 class="title">Card values</h2><div class="grid">${[[50,'Jokers'],[20,'2s and Aces'],[10,'8, 9, 10, J, Q, K'],[5,'4, 5, 6, 7']].map(([p,t])=>`<div class="stat"><strong>${p} pts</strong><small>${t}</small></div>`).join('')}</div><div class="grid" style="margin-top:10px"><div class="card soft"><b>Red 3</b><div class="negative">−300 if held</div></div><div class="card soft"><b>Black 3</b><div>0 points</div></div></div><h2 class="title">Books required to go out</h2><div class="grid"><div class="stat"><strong class="negative">1 red</strong><small>+500 per book</small></div><div class="stat"><strong>${black} black</strong><small>+300 per book</small></div></div><div class="toolbar" style="margin-top:18px">${button('Read rulebook','go-rules','class="secondary"')}${done?'':button('Score this round →','go-score','class="primary"')}</div>`}
const RULES=[
['Setup','Use one more 54-card deck (with 2 Jokers) than the number of players. Each player receives 11 cards in Hand and 11 in Foot. Play clockwise; the player left of the dealer starts. Partners alternate seats.'],
['Opening meld','Opening minimum by round: 50, 90, 120, 150; a fifth tiebreaker round uses 150. Combine valid melds and count wild-card point values. One initial laydown per team, or per person in two-player play.'],
['Turn','Draw two cards or legally take seven discards, then meld optionally, and discard one card unless going out by melding the whole Foot.'],
['Discard pickup','Only after opening on an earlier turn; there must be at least seven discards. Hold two natural cards matching the top natural discard, then immediately meld those two and the top card. Cannot pick up a rank already completed in your own book. The remaining six cards are kept or played. A 3 or wild card on top blocks pickup.'],
['Melds and wild cards','New melds need at least three cards including two natural cards of one rank. Natural cards must strictly outnumber Jokers and 2s. Wild-only melds and books are forbidden. Only one meld/book of a rank per team.'],
['Books','Seven natural cards complete a red book (+500). Seven or more cards including wilds, with more naturals than wilds, complete a black book (+300). Completed books receive only additional natural cards; bonus is awarded once.'],
['Foot','Do not look at the Foot until Hand is empty. If the Hand is emptied by melding, immediately play Foot without another draw. If emptied by a discard, pick up and look but wait until next turn to play.'],
['Going out','In two-player mode, each player needs one red and one black book. In four- or six-player partnerships, a team needs one red and two black books. Empty the Foot, with or without a last discard, for +100. No permission needed.'],
['Card values','Jokers 50; 2s and Aces 20; 8 through King 10; 4 through 7 are 5. Black 3s are 0. Red 3s remaining in Hand/Foot at round end are −300 each; discarded red 3s have no penalty.'],
['Scoring','Book bonuses + all played card values + 100 going-out bonus − unplayed card values and red 3 penalties. Unopened Foot is counted normally. Negative scores are allowed. Highest cumulative score after four rounds wins; play one 150-point tiebreaker if tied, then declare a tie if still tied.'],
['Reshuffling','If stock runs out, leave the top discard face-up and shuffle all lower discards into a new draw pile. If one card is left, draw it first, then reshuffle and draw the second.'],
['Corrections and conduct','Playing mistakes may be corrected without penalty, including illegal melds and incorrect pickups. Once discarded, a card cannot be taken back. Do not show or discuss cards held with your partner.']];
function ruleScreen(){return `<h2 class="title">House rulebook</h2><label for="rule-search">Search the rules</label><input id="rule-search" type="search" placeholder="Search wilds, pickup, Foot…" value="${text(ruleQuery)}" class="wide"><div id="rule-results">${ruleResults()}</div>`}
function ruleResults(){const q=ruleQuery.toLowerCase().trim();const matches=RULES.filter(([title,body])=>(title+' '+body).toLowerCase().includes(q));return matches.length?matches.map(([title,body])=>`<article class="card"><h3>${text(title)}</h3><p class="text">${text(body)}</p></article>`).join(''):'<p>No matching rules.</p>'}
function manualFields(){return `<h2 class="title">Manual totals</h2><p class="muted">Enter values calculated by your group. Enter penalties as positive numbers; going-out bonus is added automatically.</p>${[['manualFor','Points for','Played card points'],['manualAgainst','Points against','Unplayed-card penalties, including red 3s'],['manualBooks','Completed-book total','Book bonuses only, excluding the cards inside books']].map(([field,title,note])=>`<label for="${field}">${title}</label><input id="${field}" aria-describedby="${field}-help" type="number" min="0" inputmode="numeric" class="wide" data-manual="${field}" value="${num(state.draft[state.active][field])}"><div class="field-note" id="${field}-help">${note}</div>`).join('')}`}
function calculatedFields(){let step=state.step;let content=step==='books'?`<h2 class="title">Completed books</h2><p class="muted">Count books now. Count cards inside them on the next step.</p>${counter('red',undefined,'Red books','+500 points each')}${counter('black',undefined,'Black books','+300 points each')}`:`<h2 class="title">${step==='left'?'Unplayed cards':'Played cards'}</h2><p class="muted">${step==='left'?'Count all cards still held in Hand or Foot. Black 3s count as zero.':'Count cards in completed books AND incomplete melds, each exactly once.'}</p>${[['Jokers',50],['2s and Aces',20],['8 through King',10],['4 through 7',5]].map(([name,p],i)=>counter(step,i,`${p}-point cards`,name)).join('')}${step==='left'?counter('red3',undefined,'Red 3s left','−300 points each'):''}`;let d=state.draft[state.active];let current=step==='books'?d.red*500+d.black*300:step==='left'?points(d.left)+d.red3*300:points(d.played);return `${segment([['left','1. Unplayed'],['books','2. Books'],['played','3. Played']],step,'step')}${content}<div class="card soft summary"><b>${step==='left'?'Penalties':step==='books'?'Book bonuses':'Played card points'}</b><strong data-step-total class="${step==='left'?'negative':'positive'}">${step==='left'?'−':'+'}${fmt(current)}</strong></div>`}
function scoreScreen(){if(gameOver(state.rounds,state.names.length))return `<div class="card hero"><h2>Game finished</h2><p>See the final standings on the scoreboard.</p>${button('View scoreboard','go-board','class="primary"')}</div>`;let n=state.names.length;let eligible=state.method==='manual'||validGoingOut(state.draft[state.out],state.mode);return `<div class="top"><h2 class="title">Round ${state.rounds.length+1} scoring</h2><small data-completed-count>${state.completed.filter(Boolean).length} of ${n} scored</small></div><label for="active">Scoring for</label><select id="active" data-select="active">${state.names.map((name,i)=>`<option value="${i}" ${i===state.active?'selected':''}>${state.completed[i]?'✓ ':''}${text(label(i))}</option>`).join('')}</select>${segment([['calculated','Calculated'],['manual','Manual']],state.method,'method')}<div class="steps-area">${state.method==='manual'?manualFields():calculatedFields()}</div><p>${button('↶ Undo last entry','undo-action',`class="secondary" ${undoStack.length?'':'disabled'}`)}</p><div class="card soft"><small>${text(label(state.active))} · provisional round score</small><div class="summary"><strong data-provisional-score>${fmt(calculate(state.draft[state.active],state.active))}</strong>${button(state.method==='calculated'&&state.step!=='played'?'Next step →':'Mark complete & next →','next','class="primary"')}</div></div><fieldset class="going-out"><legend class="title">Who went out? (+100)</legend>${state.names.map((_,i)=>`<label class="radio"><input type="radio" name="wentout" value="${i}" ${i===state.out?'checked':''}>${text(label(i))}</label>`).join('')}<div data-eligibility>${eligibilityNotice()}</div></fieldset><div class="card" data-round-preview><b>Round preview</b>${roundPreviewRows()}</div>${button('Review round →','review',`class="primary full" ${!eligible||!state.completed.every(Boolean)?'disabled':''}`)}<p class="muted" data-completion-note>${!state.completed.every(Boolean)?'Mark every player/team complete to save.':''}</p>`}
function reviewScreen(){const eligible=state.method==='manual'||validGoingOut(state.draft[state.out],state.mode);return `<h2 class="title">Review round ${state.rounds.length+1}</h2><p class="muted">Check all totals before saving. You can return to scoring to correct a number.</p>${state.names.map((_,i)=>{const d=state.draft[i];const played=state.method==='manual'?num(d.manualFor):points(d.played);const books=state.method==='manual'?num(d.manualBooks):500*num(d.red)+300*num(d.black);const against=state.method==='manual'?num(d.manualAgainst):points(d.left)+300*num(d.red3);const bonus=i===state.out?100:0;return `<article class="card"><h3>${text(label(i))}</h3><div class="scoreline"><span>Played cards</span><b>+${fmt(played)}</b></div><div class="scoreline"><span>Book bonuses</span><b>+${fmt(books)}</b></div><div class="scoreline"><span>Unplayed cards & penalties</span><b>−${fmt(against)}</b></div><div class="scoreline"><span>Going out</span><b>+${fmt(bonus)}</b></div><div class="scoreline"><strong>Round total</strong><strong>${fmt(calculate(d,i))}</strong></div></article>`}).join('')}<div class="toolbar">${button('← Edit scores','go-score','class="secondary"')}${button('Confirm & save','confirm-save',`class="primary" ${!eligible?'disabled':''}`)}</div>`}
function savedGameCard(item){
  const g=item.game,totals=standings(g.rounds,g.names.length),finished=gameOver(g.rounds,g.names.length),current=item.id===library.activeId;
  const max=Math.max(...totals),leaders=totals.map((value,i)=>value===max?g.names[i]:null).filter(value=>value!==null);
  const result=!g.rounds.length?'No rounds saved yet':finished?(leaders.length===1?`Winner: ${leaders[0]}`:'Result: Tie'):(leaders.length===1?`Leader: ${leaders[0]}`:'Leaders tied');
  const hasDraft=g.draft.some(d=>d.left.some(Boolean)||d.played.some(Boolean)||d.red3||d.red||d.black||d.manualFor||d.manualAgainst||d.manualBooks)||g.completed.some(Boolean);
  return `<article class="card saved-game ${current?'current':''}"><div class="game-card-heading"><h3>${text(item.title)}</h3><span class="pill">${finished?'Completed':current?'Current game':'Unfinished'}</span></div>
    <p class="muted">${g.mode} players · ${finished?`${g.rounds.length} rounds`: `Round ${g.rounds.length+1}`} · ${text(new Date(item.updatedAt).toLocaleDateString())}</p>
    <div class="saved-game-totals ${g.names.length===3?'three':''}">${g.names.map((name,i)=>`<div class="saved-game-score"><span>${text(name)}</span><b>${fmt(totals[i])}</b></div>`).join('')}</div><p class="game-result">${text(result)}${hasDraft&&!finished?' · Unfinished scores saved':''}</p>
    <div class="saved-game-actions">${button(finished?'View results':'Continue','open-game',`class="primary ${finished?'':'continue-game'}" data-id="${text(item.id)}" aria-label="${finished?'View results for':'Continue'} ${text(item.title)}"`)}${finished?button('Play again','rematch',`class="secondary" data-id="${text(item.id)}" aria-label="Play again with ${text(item.title)}"`):''}${button('Rename','rename-game',`class="secondary game-text-action" data-id="${text(item.id)}" aria-label="Rename ${text(item.title)}"`)}${button('Remove','remove-game',`class="secondary game-text-action remove-button" data-id="${text(item.id)}" aria-label="Remove ${text(item.title)}"`)}</div></article>`;
}
function libraryScreen(){
  const current=saveActive(library,state),sorted=[...current.games].sort((a,b)=>Number(b.id===current.activeId)-Number(a.id===current.activeId)||Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  const visible=sorted.filter(item=>!item.deletedAt),removed=sorted.filter(item=>item.deletedAt).sort((a,b)=>Date.parse(b.deletedAt)-Date.parse(a.deletedAt));
  const unfinished=visible.filter(item=>!gameOver(item.game.rounds,item.game.names.length)),finished=visible.filter(item=>gameOver(item.game.rounds,item.game.names.length));
  return `<div class="games-heading"><h2 class="title">Your games</h2>${button('+ New game','new-game','class="secondary"')}</div><p class="muted games-intro">Pick up right where you left off.</p>
    ${unfinished.length?`<h3 class="section-label">In progress · ${unfinished.length}</h3>${unfinished.map(savedGameCard).join('')}`:'<p>No unfinished games.</p>'}
    ${finished.length?`<details id="completed-games" class="finished-games" ${completedOpen?'open':''}><summary>Completed games · ${finished.length}</summary>${finished.map(savedGameCard).join('')}</details>`:''}
    ${removed.length?`<details id="removed-games" class="finished-games" ${removedOpen?'open':''}><summary>Removed games · ${removed.length}</summary><p class="muted">Removed games stay here until you restore them. They are included in your backups.</p>${removed.map(item=>`<article class="card removed-game"><h3>${text(item.title)}</h3><p class="muted">${text(item.game.names.join(' / '))} · ${item.game.mode} players</p><p class="muted">Removed ${text(new Date(item.deletedAt).toLocaleDateString())}</p>${button('Restore game','restore-game',`class="secondary full" data-id="${text(item.id)}" aria-label="Restore ${text(item.title)}"`)}</article>`).join('')}</details>`:''}`;
}
function settingsScreen(){return `<h2 class="title">Settings</h2><section class="card"><h3>Appearance</h3><p class="muted">Use your device’s appearance or choose a light or dark background.</p><div>${segment([['system','System'],['light','Light'],['dark','Dark']],settings.appearance,'appearance')}</div></section><section class="card"><h3>Saved games & backups</h3><p>Your games are stored on this device. A backup includes every saved game, removed game, and unfinished scoring entry.</p><p>Import adds games to your library. Your existing games are kept.</p><p class="backup-status" data-backup-status role="status">${text(backupStatus())}</p><p class="muted">Check Files or Downloads to confirm your backup was saved.</p><p class="muted" data-backup-date-warning>${text(backupDateWarning)}</p></section><section class="card"><h3>About</h3><p>Hand & Foot Scorekeeper · ${APP_VERSION}</p><p class="muted">Custom house rules · Offline after first load</p><p data-settings-update-message ${availableVersion?'':'hidden'}>Version ${text(availableVersion)} is available.</p>${button('Save & update','update-now',`class="secondary full" data-settings-update-button ${availableVersion?'':'hidden'}`)}</section>`}
function presetsSection(){const a=storeGet(PRESETS_KEY,[]);return `<h2 class="title">Saved name sets</h2>${button('Save current names','save-preset','class="secondary"')}${a.map((p,i)=>`<div class="row"><span>${text(p.names.join(' / '))}</span>${button('Use','use-preset',`class="secondary" data-index="${i}"`)}</div>`).join('')}`}
function boardScreen(){let n=state.names.length,totals=standings(state.rounds,n),max=Math.max(...totals),done=gameOver(state.rounds,n),winners=totals.map((v,i)=>v===max?i:-1).filter(i=>i>=0);return `<div class="scoreboard-heading"><h2 class="title" id="scoreboard-title" tabindex="-1">Scoreboard</h2><p class="muted">Round ${done?state.rounds.length:state.rounds.length+1} of ${state.rounds.length>4||state.rounds.length===4&&!done?5:4} · ${state.mode} players</p><p class="muted">Edit names at any time. Scores stay intact.</p></div><div class="scoreboard-cards">${state.names.map((name,i)=>`<div class="stat namefield scoreboard-card"><div class="scoreboard-card-head"><small>${state.mode===2?'Player':'Team'} ${i+1}</small><strong class="scoreboard-total">${fmt(totals[i])}</strong></div><input type="text" maxlength="36" data-name="${i}" value="${text(name)}" aria-label="Name for ${state.mode===2?'player':'team'} ${i+1}"><small class="scoreboard-total-label">Total points</small></div>`).join('')}</div>${state.rounds.length?`<div class="tablewrap"><table><caption class="sr-only">Scores by round; a star marks the side that went out.</caption><thead><tr><th scope="col">Round</th>${state.names.map((_,i)=>`<th scope="col" data-label="${i}">${text(label(i))}</th>`).join('')}</tr></thead><tbody>${state.rounds.map((r,i)=>`<tr><th scope="row">${i===4?'5 (TB)':i+1}</th>${r.scores.map((v,j)=>`<td>${fmt(v)}${r.out===j?' ★':''}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Total</th>${totals.map(v=>`<th>${fmt(v)}</th>`).join('')}</tr></tbody></table></div><p>${button('Edit last round','undo','class="secondary"')}</p>`:'<p class="muted scoreboard-empty">No rounds saved yet.</p>'}${done?`<div class="card hero"><h2>🏆 ${winners.length===1?`${text(label(winners[0]))} wins!`:'Game ends in a tie'}</h2></div>`:button(`Enter round ${state.rounds.length+1} scores →`,'go-score','class="primary full scoreboard-next"')}${done?button('Play again with these players','rematch','class="secondary full"'):''}<div class="scoreboard-actions">${button('▦  Your games & history  ›','library','class="scoreboard-link"')}${button('↗  Share results  ›','share','class="scoreboard-link"')}</div>${presetsSection()}<h2 class="title">Game settings</h2><p class="field-label">Number of players</p>${segment([[2,'2'],[4,'4'],[6,'6']],state.mode,'mode')}<p class="muted">${state.mode===2?'2 individual players, 3 decks, 1 red + 1 black book to go out':`${n} partnerships, ${state.mode+1} decks, 1 red + 2 black books to go out`}</p>`}
function focusAction(action,id,value){
  const control=Array.from(document.querySelectorAll('[data-action]')).find(el=>el.dataset.action===action&&(id===undefined||el.dataset.id===id)&&(value===undefined||el.dataset.value===value));
  if(control){control.focus?.();return true}return false;
}
function focusHeading(){const heading=document.querySelector('.screen h2');heading?.setAttribute?.('tabindex','-1');heading?.focus?.()}
function draw(){
  const focusedElement=document.activeElement,focused=focusedElement?.dataset?{...focusedElement.dataset}:null;
  for(const [selector,setOpen] of [['#completed-games',value=>completedOpen=value],['#removed-games',value=>removedOpen=value]]){
    const el=document.querySelector(selector);if(typeof el?.open==='boolean')setOpen(el.open);
  }
  const changed=renderedScreen!==state.screen;renderedScreen=state.screen;
  numericEdit=null;app.innerHTML=layout(state.screen==='game'?gameScreen():state.screen==='score'?scoreScreen():state.screen==='rules'?ruleScreen():state.screen==='review'?reviewScreen():state.screen==='library'?libraryScreen():state.screen==='settings'?settingsScreen():boardScreen());
  if(pending){document.querySelector(pending.type==='result'?'[data-action="result-board"]':'[data-initial-focus]')?.focus?.();return}
  if(!changed&&focused?.action){
    const control=Array.from(document.querySelectorAll('[data-action]')).find(el=>Object.entries(focused).every(([key,value])=>el.dataset[key]===value));
    if(control){control.focus?.();return}
  }
  if(!changed&&focusedElement){
    const controls=Array.from(document.querySelectorAll('input,select'));
    const control=controls.find(el=>focusedElement.id&&el.id===focusedElement.id||focusedElement.name&&el.name===focusedElement.name&&el.value===focusedElement.value);
    if(control){control.focus?.();return}
  }
  focusHeading();
}
function changeCount(field,index,value,input=null){
  const d=state.draft[state.active],next=num(value),old=index===undefined?d[field]:d[field][index];
  if(next===old)return;
  remember(input);if(index===undefined)d[field]=next;else d[field][index]=next;
  state.completed[state.active]=false;persist();
}
function eligibilityNotice(){
  if(state.method==='manual')return '<p class="muted">Manual mode trusts the book total supplied. Confirm the required books were completed.</p>';
  return validGoingOut(state.draft[state.out],state.mode)?'':`<p class="note">The side going out must have at least 1 red book and ${REQUIRED_BLACK[state.mode]} black book${REQUIRED_BLACK[state.mode]===1?'':'s'}.</p>`;
}
function roundPreviewRows(){return state.names.map((_,i)=>`<div class="scoreline"><span>${text(label(i))} ${i===state.out?'★':''} <small>${state.completed[i]?'✓':'Pending'}</small></span><b>${fmt(calculate(state.draft[i],i))}</b></div>`).join('')}
function refreshScoring(){
  if(state.screen!=='score'||gameOver(state.rounds,state.names.length))return;
  const update=(selector,value,html=false)=>{const el=document.querySelector(selector);if(el)el[html?'innerHTML':'textContent']=value};
  update('[data-provisional-score]',fmt(calculate(state.draft[state.active],state.active)));
  update('[data-completed-count]',`${state.completed.filter(Boolean).length} of ${state.names.length} scored`);
  update('[data-round-preview]','<b>Round preview</b>'+roundPreviewRows(),true);
  update('[data-eligibility]',eligibilityNotice(),true);
  update('[data-completion-note]',state.completed.every(Boolean)?'':'Mark every player/team complete to save.');
  const select=document.querySelector('[data-select="active"]');
  if(select?.options)Array.from(select.options).forEach((option,i)=>option.textContent=(state.completed[i]?'✓ ':'')+label(i));
  const review=document.querySelector('[data-action="review"]');
  if(review)review.disabled=!state.completed.every(Boolean)||(state.method==='calculated'&&!validGoingOut(state.draft[state.out],state.mode));
  const undo=document.querySelector('[data-action="undo-action"]');if(undo)undo.disabled=!undoStack.length;
  if(state.method==='calculated'){
    const d=state.draft[state.active],step=state.step,total=step==='books'?d.red*500+d.black*300:step==='left'?points(d.left)+d.red3*300:points(d.played);
    update('[data-step-total]',(step==='left'?'−':'+')+fmt(total));
  }
}
async function importFile(file){
  try{
    const backup=JSON.parse(await file.text()),merged=mergeBackup(library,state,backup);
    saveBackup(localStorage,{...backup,game:compatibleGame(activeGame(merged).game),gameLibrary:merged,completedGames:archiveForLibrary(merged)});
    library=merged;state=structuredClone(activeGame(library).game);undoStack.length=0;pending=null;ruleQuery='';storageWarning='';recoveryBlocked=false;
    draw();alert('Game imported successfully.');
  }catch(error){alert('Could not import this backup: '+error.message)}
}
async function shareResults(){
  const message=copyGame();
  if(navigator.share){try{await navigator.share({title:'Hand & Foot results',text:message});return}catch(error){if(error.name==='AbortError')return}}
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(message);alert('Results copied.')}
  catch{alert(message)}
}
function copyGame(){const totals=standings(state.rounds,state.names.length);return `Hand & Foot · ${state.mode} players\n`+state.rounds.map((r,i)=>`Round ${i+1} (${r.method}): ${state.names.map((_,j)=>`${label(j)} ${r.scores[j]}`).join(', ')}`).join('\n')+`\nTotals: ${state.names.map((_,i)=>`${label(i)} ${totals[i]}`).join(', ')}`;}
function exportGame(){
  let url,a;
  try{
    const exportedAt=new Date().toISOString(),snapshot=saveActive(library,state);
    const blob=new Blob([JSON.stringify({app:'Hand & Foot Scorekeeper',exportedAt,game:compatibleGame(state),gameLibrary:snapshot,completedGames:archiveForLibrary(snapshot),namePresets:storeGet(PRESETS_KEY,[])},null,2)],{type:'application/json'});
    url=URL.createObjectURL(blob);a=document.createElement('a');a.href=url;a.download=`hand-foot-backup-${exportedAt.slice(0,10)}.json`;document.body.append(a);a.click();
    lastExport=exportedAt;backupDateWarning='';
    try{localStorage.setItem(KEYS.lastExport,exportedAt)}catch{backupDateWarning='The backup download started, but its date could not be remembered on this device.'}
    refreshBackupStatus();return true;
  }catch{alert('The backup could not be prepared. Your game is still open; please try exporting again.');return false}
  finally{a?.remove();if(url)setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
function openNewDialog(mode=state.mode,returnFocus={action:'new-game'}){pending={type:'new',mode,title:`Game ${library.games.filter(item=>!item.deletedAt).length+1}`,returnToResult:pending?.type==='result',returnFocus};draw();document.querySelector('#game-title')?.focus?.()}
function cancelDialog(){
  const result=pending?.type==='result',returnFocus=pending?.returnFocus;
  pending=pending?.returnToResult?{type:'result'}:null;draw();
  if(result)document.querySelector('#scoreboard-title')?.focus?.();
  else if(!pending&&returnFocus)focusAction(returnFocus.action,returnFocus.id,returnFocus.value);
}
function confirmDialog(){
  if(!pending||pending.type==='result')return;
  if(pending.type==='remove'){
    try{
      const title=pending.title,next=removeGame(library,state,pending.id),switching=next.activeId!==library.activeId;
      activeGame(next).game.screen='library';
      const saved=switching?selectLibrary(next):commitLibrary(next,true);
      if(saved){state.screen='library';pending=null;announcement=`${title} moved to Removed games. You can restore it below.`;draw();focusHeading()}
      else if(!switching){alert('The game could not be removed. Export a backup before continuing.');draw()}
    }catch(error){alert(error.message)}
    return;
  }
  const title=pending.title.trim();
  if(!title){alert('Enter a game name.');document.querySelector('#game-title')?.focus?.();return}
  try{
    if(pending.type==='rename'){
      const next=renameGame(library,state,pending.id,title);
      if(commitLibrary(next)){const id=pending.id;pending=null;draw();focusAction('rename-game',id)}else{alert('The game name could not be saved.');draw()}
    }else selectLibrary(pending.type==='rematch'?rematchGame(library,state,pending.id,{title}):addGame(library,state,{title,mode:pending.mode}));
  }catch(error){alert(error.message)}
}
app.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');if(!el||el.disabled)return;
  numericEdit=null;announcement='';
  const a=el.dataset.action,val=el.dataset.value;
  switch(a){
    case 'screen':set(()=>state.screen=val);break;
    case 'step':set(()=>state.step=val);break;
    case 'method':if(val!==state.method){remember();set(()=>{state.method=val;state.completed=state.completed.map(()=>false);state.step='left';state.active=0})}break;
    case 'mode':if(+val!==state.mode)openNewDialog(+val,{action:'mode',value:val});break;
    case 'increment':case 'decrement':{
      const field=el.dataset.field,idx=el.dataset.index===undefined?undefined:+el.dataset.index,d=state.draft[state.active];
      const old=idx===undefined?d[field]:d[field][idx];changeCount(field,idx,num(old)+(a==='increment'?1:-1));draw();break;
    }
    case 'next':set(()=>{
      if(state.method==='calculated'&&state.step!=='played')state.step=state.step==='left'?'books':'played';
      else{state.completed[state.active]=true;state.active=(state.active+1)%state.names.length;state.step='left'}
    });break;
    case 'confirm-save':
      if(gameOver(state.rounds,state.names.length)||!state.completed.every(Boolean)||state.method==='calculated'&&!validGoingOut(state.draft[state.out],state.mode))break;
      set(()=>{
        undoStack.length=0;
        state.rounds.push({scores:state.draft.map((d,i)=>score(d,state.method,state.out===i)),entries:structuredClone(state.draft),out:state.out,method:state.method});
        state.draft=state.names.map(blankEntry);state.completed=state.names.map(()=>false);state.step='left';state.active=0;
        const finished=gameOver(state.rounds,state.names.length);
        state.screen=finished?'board':'game';pending=finished?{type:'result'}:null;
      });break;
    case 'undo':if(state.rounds.length)set(()=>{
      undoStack.length=0;const last=state.rounds.pop();state.draft=structuredClone(last.entries);state.method=last.method;state.out=last.out;
      state.completed=state.names.map(()=>true);state.active=0;state.step='left';state.screen='score';
    });break;
    case 'review':if(!gameOver(state.rounds,state.names.length)&&state.completed.every(Boolean)&&(state.method==='manual'||validGoingOut(state.draft[state.out],state.mode)))set(()=>state.screen='review');break;
    case 'go-rules':set(()=>state.screen='rules');break;
    case 'go-score':set(()=>{state.screen='score';state.step='left'});break;
    case 'go-board':set(()=>state.screen='board');break;
    case 'result-board':pending=null;set(()=>state.screen='board');document.querySelector('#scoreboard-title')?.focus?.();break;
    case 'library':set(()=>state.screen='library');break;
    case 'save-preset':{const presets=storeGet(PRESETS_KEY,[]);presets.push({mode:state.mode,names:[...state.names]});storePut(PRESETS_KEY,presets);draw();break}
    case 'use-preset':{
      const preset=storeGet(PRESETS_KEY,[])[+el.dataset.index];
      if(preset&&preset.mode===state.mode)set(()=>state.names=[...preset.names]);else alert('This name set is for a different player count.');break;
    }
    case 'share':void shareResults();break;
    case 'undo-action':if(undoStack.length){const snapshot=JSON.parse(undoStack.pop());set(()=>Object.assign(state,snapshot))}break;
    case 'new-game':openNewDialog();break;
    case 'rematch':{
      const id=el.dataset.id||library.activeId,item=id===library.activeId?{...activeGame(library),game:state}:library.games.find(g=>g.id===id&&!g.deletedAt);
      if(item){pending={type:'rematch',id,title:(item.title.replace(/ · rematch$/, '').slice(0,70)+' · rematch'),mode:item.game.mode,names:[...item.game.names],method:item.game.method,returnToResult:pending?.type==='result',returnFocus:{action:'rematch',id:el.dataset.id}};draw()}
      break;
    }
    case 'remove-game':{
      const item=library.games.find(g=>g.id===el.dataset.id&&!g.deletedAt);
      if(item){pending={type:'remove',id:item.id,title:item.title,returnFocus:{action:'remove-game',id:item.id}};draw()}
      break;
    }
    case 'restore-game':{
      try{
        const next=restoreGame(library,state,el.dataset.id),item=next.games.find(g=>g.id===el.dataset.id);
        if(commitLibrary(next,true)){completedOpen=true;announcement=`${item.title} restored to Your games.`;draw();
          const completed=document.querySelector('#completed-games');if(completed)completed.open=true;
          if(!focusAction('open-game',item.id))focusHeading();
        }else{alert('The game could not be restored. Export a backup before continuing.');draw()}
      }catch(error){alert(error.message)}
      break;
    }
    case 'new-mode':if(pending){pending.mode=+val;draw();document.querySelector('#game-title')?.focus?.()}break;
    case 'open-game':try{selectLibrary(openGame(library,state,el.dataset.id))}catch(error){alert(error.message)}break;
    case 'rename-game':{const item=library.games.find(g=>g.id===el.dataset.id);if(item){pending={type:'rename',id:item.id,title:item.title,returnFocus:{action:'rename-game',id:item.id}};draw();document.querySelector('#game-title')?.focus?.()}break}
    case 'save-game':{const next=saveActive(library,{...state,screen:'library'});if(selectLibrary(next))state.screen='library';break}
    case 'settings':set(()=>state.screen='settings');break;
    case 'update-now':applyUpdate();break;
    case 'update-later':dismissedVersion=availableVersion;refreshUpdateNotice();focusHeading();break;
    case 'appearance':{const next=validateSettings({appearance:val});if(storePut(KEYS.settings,next)){settings=next;applyAppearance();draw()}else alert('The appearance setting could not be saved.');break}
    case 'cancel':cancelDialog();break;
    case 'confirm':confirmDialog();break;
    case 'export':exportGame();break;
    case 'import':document.querySelector('#import-file').click();break;
  }
});
app.addEventListener('change',e=>{
  const el=e.target;
  if(el.matches('[data-field]')){changeCount(el.dataset.field,el.dataset.index===undefined?undefined:+el.dataset.index,el.value);el.value=num(el.value);refreshScoring()}
  else if(el.matches('[data-manual]')){el.value=num(el.value);refreshScoring()}
  else if(el.matches('[data-select="active"]'))set(()=>{state.active=+el.value;state.step='left'});
  else if(el.name==='wentout'){if(state.out!==+el.value){remember();set(()=>state.out=+el.value)}}
  else if(el.matches('#import-file')){const file=el.files?.[0];el.value='';if(file)void importFile(file)}
  numericEdit=null;
});
app.addEventListener('focusout',e=>{if(numericEdit===e.target)numericEdit=null});
app.addEventListener('input',e=>{
  const el=e.target;
  if(el.matches('[data-game-title]')){if(pending)pending.title=el.value}
  else if(el.matches('#rule-search')){ruleQuery=el.value;document.querySelector('#rule-results').innerHTML=ruleResults()}
  else if(el.matches('[data-name]')){
    state.names[+el.dataset.name]=el.value;persist();
    for(const labelEl of document.querySelectorAll(`[data-label="${+el.dataset.name}"]`))labelEl.textContent=label(+el.dataset.name);
  }else if(el.matches('[data-field]')){
    changeCount(el.dataset.field,el.dataset.index===undefined?undefined:+el.dataset.index,el.value,el);refreshScoring();
  }else if(el.matches('[data-manual]')){
    const value=num(el.value);if(value!==state.draft[state.active][el.dataset.manual]){
      remember(el);state.draft[state.active][el.dataset.manual]=value;state.completed[state.active]=false;persist();refreshScoring();
    }
  }
});
app.addEventListener('submit',event=>{if(event.target.matches('[data-game-form]')){event.preventDefault();confirmDialog()}});
app.addEventListener('keydown',event=>{
  if(!pending)return;
  if(event.key==='Escape'){event.preventDefault?.();cancelDialog();return}
  if(event.key==='Tab'){
    const dialog=document.querySelector('[role="dialog"]'),controls=dialog?.querySelectorAll?.('input,button');
    if(!controls?.length)return;
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
});
const appearanceMedia=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
appearanceMedia?.addEventListener?.('change',()=>{if(settings.appearance==='system')applyAppearance()});
applyAppearance();
// Never replace focused inputs or a pending click target on blur/change.
watchUpdates();
draw();
