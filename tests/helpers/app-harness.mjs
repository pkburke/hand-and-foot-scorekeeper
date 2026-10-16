import fs from 'node:fs';
import vm from 'node:vm';
import * as scoring from '../../scoring.mjs';
import * as data from '../../data.mjs';

const source=fs.readFileSync(new URL('../../app.mjs',import.meta.url),'utf8').replace(/^import\s+\{([^}]+)\}\s+from\s+'([^']+)';/gm,(_,bindings,module)=>`const {${bindings}}=__modules['${module}'];`);
export function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}
export function roundFor(totals,mode=2){
  return {method:'manual',out:0,entries:totals.map((total,i)=>({...scoring.blankEntry(),manualFor:Math.max(0,total-(i===0?100:0)),manualAgainst:Math.max(0,-total+(i===0?100:0))})),scores:[...totals]};
}
export function archiveFor(game){return {id:1,date:'2026-10-16T12:00:00.000Z',mode:game.mode,names:[...game.names],rounds:structuredClone(game.rounds),finished:scoring.gameOver(game.rounds,game.names.length)}}
export function appHarness(game=scoring.freshGame(),options={}){
  const storage=options.storage??memoryStorage({[data.KEYS.game]:JSON.stringify(game)});
  const handlers={},alerts=[],nodes=new Map();let blob;
  const app={innerHTML:'',addEventListener:(name,handler)=>handlers[name]=handler};
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',innerHTML:'',disabled:false});return nodes.get(selector)};
  const context=vm.createContext({__modules:{'./scoring.mjs':scoring,'./data.mjs':data},structuredClone,console,Blob,Date,
    localStorage:storage,navigator:options.navigator??{},location:{protocol:'file:'},alert:message=>alerts.push(message),
    document:{querySelector:selector=>selector==='#app'?app:node(selector),querySelectorAll:()=>[],body:{append(){}},createElement:()=>({click(){},remove(){}})},
    URL:{createObjectURL:value=>{blob=value;return 'blob:test'},revokeObjectURL(){}},setTimeout(){}
  });
  vm.runInContext(source+'\nglobalThis.__test={state:()=>state,stack:()=>undoStack.length,exportGame,importFile,shareResults};',context);
  const api=context.__test;
  const inputElement=(kind,value,dataset={})=>({value,dataset,matches:selector=>selector===kind});
  return {storage,handlers,alerts,app,api,node,
    click(action,dataset={}){handlers.click({target:{closest:()=>({disabled:false,dataset:{action,...dataset}})}})},
    input(kind,value,dataset){const element=inputElement(kind,value,dataset);handlers.input({target:element});return element},
    change(element){handlers.change({target:element})},
    import(data){return api.importFile({text:()=>Promise.resolve(JSON.stringify(data))})},
    async export(){api.exportGame();return JSON.parse(await blob.text())}
  };
}
