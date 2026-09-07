import { BattleEngine } from '../../packages/engine/src/battle-engine.ts';
import { createSeededRandom } from '../../packages/engine/src/rng.ts';
export const rows = ['tank', 'melee', 'ranged', 'support'];
export const priorities = ['highest_health','lowest_health','highest_damage','support','random'];
export const scopes = ['self','self_allies','self_enemies','allies','enemies','both'];
export const stats = (s = {}) => ({ health: 100, mana: 100, meleeDmg: 10, rangedDmg: 0, manaRegen: 0, spellDmg: 0, speed: 10, dodge: 0, criticalChance: 0, ...s });
export const unit = (name, s = {}, rest = {}) => ({ name, stats: stats(s), ...rest });
export const effect = (e = {}) => ({name: 'Effect', timingType:'instant', effectType:'damage', isTaunt:false, ...e});
export const item = (...effects) => ({name:'Item', effects:effects.map((effect,i)=>({sequenceOrder:i+1,effect}))});
export const battle = (a, b, seed = 42) => ({scenarios:[{id:'A',rows:a},{id:'B',rows:b}],seed});
export function trace(input, options = {}) {
  const engine = new BattleEngine(input, options);
  let previousLogLength = 0;
  const compact = (state) => { const log = state.log.slice(previousLogLength); previousLogLength = state.log.length; return {...state,log}; };
  const initial = compact(engine.getState());
  const batches = [];
  while(engine.getState().status !== 'finished') {
    if (batches.length > 2000) throw Error('Reference failed to terminate');
    batches.push(compact(engine.resolveNextBatch()));
  }
  return {initial,batches};
}
export function directedCases() {
  const cases = [];
  const add = (name,input,options={fatigueActionThreshold:12}) => cases.push({name,input,options});
  add('simultaneous-lethal', battle({tank:[unit('A',{health:10})]},{tank:[unit('B',{health:10})]}));
  add('empty-side',battle({}, {tank:[unit('B')]}));
  add('zero-speed-fatigue',battle({support:[unit('A',{speed:0})]},{support:[unit('B',{speed:0})]}),{fatigueActionThreshold:2,fatigueDamageStart:3});
  add('ready-headstart',battle({tank:[unit('A',{speed:20})]},{tank:[unit('B',{speed:10},{startingActionBar:50})]}));
  for (let a=0;a<4;a++) for(let b=0;b<4;b++) add(`distance-${a}-${b}`,battle({[rows[a]]:[unit('A',{meleeDmg:15,criticalChance:33})]},{[rows[b]]:[unit('B',{dodge:27})]}));
  for(const scope of scopes) for(const priority of priorities) add(`targeting-${scope}-${priority}`,battle({tank:[unit('Ally')],ranged:[unit('Caster',{speed:30},{targetScope:scope,targetPriority:priority,targetCount:3,selectionShape:'adjacent',items:[item(effect({directSpellDmg:17}))]})]}, {tank:[unit('B1'),unit('B2',{health:90})],support:[unit('B3',{spellDmg:23})]}));
  const variants = [
    ['direct-heal-damage',effect({directHealing:40,directMeleeDmg:20,directRangedDmg:999,health:10,effectType:'healing'})],
    ['negative-amounts',effect({directHealing:-20,directSpellDmg:-50,shield:-5})],
    ['buff-all',effect({effectType:'buff',lastsForActions:2,...stats({health:30,mana:20,speed:4})})],
    ['debuff-all',effect({effectType:'debuff',lastsForActions:1,...stats({health:20,mana:20,speed:30,dodge:30})})],
    ['shield',effect({effectType:'buff',lastsForActions:2,shield:30})],
    ['shield-damage',effect({effectType:'buff',lastsForActions:2,shield:30,directSpellDmg:45})],
    ['shield-bypass',effect({effectType:'buff',lastsForActions:2,shield:30,directSpellDmg:45,bypassesShield:true})],
    ['persistent-taunt',effect({effectType:'debuff',isTaunt:true,dodge:10,speed:3})],
    ['timed-taunt',effect({effectType:'debuff',isTaunt:true,lastsForActions:2})],
    ['interval-mixed',effect({timingType:'interval',triggerEveryActions:2,triggerCount:3,directMeleeDmg:7,directRangedDmg:11,directSpellDmg:13})],
    ['interval-heal',effect({timingType:'interval',effectType:'healing',triggerEveryActions:1,triggerCount:3,directHealing:25,directSpellDmg:999})],
    ['interval-zero-triggers',effect({timingType:'interval',triggerEveryActions:0,triggerCount:0,directSpellDmg:10})],
    ['interval-negative',effect({timingType:'interval',triggerEveryActions:1,triggerCount:2,directSpellDmg:-20})],
    ['interval-heal-fallback',effect({timingType:'interval',effectType:'healing',triggerEveryActions:1,triggerCount:2,directSpellDmg:15})],
  ];
  for(const [name,e] of variants) add(name,battle({tank:[unit('A',{speed:20},{targetScope:'self_allies',items:[{...item(e),activationManaCost:60,activationHealthCost:10}]})],ranged:[unit('Ally',{health:150})]}, {tank:[unit('B1',{health:180},{items:[item(effect({directSpellDmg:20}))]})],support:[unit('B2',{health:150})]}));
  add('ordered-items-affordability',battle({tank:[unit('Caster',{mana:50},{items:[{name:'Stat',meleeDmg:5},{...item(effect({name:'First',directSpellDmg:20})),activationManaCost:30},{...item(effect({name:'Second',directSpellDmg:20})),activationManaCost:25}]})]},{tank:[unit('B')]}));
  add('ordered-effects-survivors',battle({ranged:[unit('Caster',{speed:30},{targetCount:2,items:[item(effect({directSpellDmg:40}),effect({name:'Follow up',directSpellDmg:20}))]})]},{tank:[unit('B1',{health:30}),unit('B2',{health:50}),unit('B3',{health:10})]}));
  add('health-cost-suicide',battle({tank:[unit('Caster',{health:20},{targetScope:'self',items:[{...item(effect({directHealing:1})),activationHealthCost:20},item(effect({directHealing:30}))]})]},{tank:[unit('B')]}));
  add('same-batch-shield',battle({tank:[unit('Guard',{health:200})],support:[unit('Shield',{},{targetScope:'allies',items:[item(effect({effectType:'buff',lastsForActions:1,shield:50,dodge:20}))]})]},{tank:[unit('Enemy',{meleeDmg:40})]}));
  return cases;
}
export function randomCase(seed) {
  const rng=createSeededRandom(`case-${seed}`), pick=a=>a[Math.floor(rng()*a.length)], integer=n=>Math.floor(rng()*n);
  const scenarios=['A','B'].map(id=>{const rs={};for(let u=0,n=1+integer(5);u<n;u++) {
    const row=pick(rows);const items=[];
    for(let j=0,m=integer(4);j<m;j++) {
      const effects=[];
      for(let k=0,n=integer(4);k<n;k++) {
        let e=effect({id:`effect-${j}-${k}`,name:`Effect ${k}`,effectType:pick(['damage','healing','buff','debuff']),timingType:pick(['instant','instant','interval'])});
        if(e.timingType==='interval') Object.assign(e,{triggerEveryActions:1+integer(3),triggerCount:integer(4)});
        else {e.lastsForActions=1+integer(3);if(integer(8)===0){e.isTaunt=true;if(integer(2)===0)delete e.lastsForActions;}}
        if(integer(2)) e.directHealing=integer(50)-10;
        for(const key of ['directMeleeDmg','directRangedDmg','directSpellDmg']) if(integer(2)) e[key]=integer(55)-10;
        if(e.timingType==='instant' && ['buff','debuff'].includes(e.effectType)) {for(const key of Object.keys(stats())) if(integer(4)===0)e[key]=integer(30)-10;if(integer(3)===0)e.shield=integer(60);}
        e.bypassesShield=integer(4)===0;
        effects.push({sequenceOrder:integer(4),effect:e});
      }
      items.push({id:`item-${j}`,name:`Item ${j}`,mana:integer(10)-3,meleeDmg:integer(10),activationManaCost:integer(35),activationHealthCost:integer(4)?0:integer(25),effects});
    }
    (rs[row]??=[]).push(unit(`${id} Unit ${u}`,{health:30+integer(150),mana:integer(80),manaRegen:integer(12),meleeDmg:integer(30),rangedDmg:integer(15),spellDmg:integer(15),speed:pick([0,1,7.5,10,20,30]),dodge:integer(130),criticalChance:integer(80)},{id:`unit-${u}`,items,targetScope:pick(scopes),targetPriority:pick(priorities),targetCount:1+integer(4),selectionShape:pick(['individual','adjacent']),startingActionBar:pick([0,0,50,100,110])}));
  }return {id,rows:rs};});
  return {name:`random-${seed}`, input:{scenarios,seed:pick([seed,` ${seed} `,`⚔️${seed}🛡️`])},options:{fatigueActionThreshold:10+integer(15),fatigueDamageStart:1+integer(4)}};
}
