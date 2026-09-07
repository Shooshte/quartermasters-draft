import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { randomCase, trace } from './cases.mjs';
const count=Number(process.argv[2]??1000), start=Number(process.argv[3]??1000);
const child=spawn(new URL('../../target/debug/qd-engine-parity',import.meta.url).pathname,[],{stdio:['pipe','pipe','inherit']});
const lines=createInterface({input:child.stdout});
const iterator=lines[Symbol.asyncIterator]();
function firstDifference(a,b,path=''){
  if(typeof a==='number'&&typeof b==='number'&&a===b)return;
  if(a===b)return;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return {path,actual:a,expected:b};
  const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
  for(const key of keys){const difference=firstDifference(a[key],b[key],`${path}/${key}`);if(difference)return difference;}
}
try{
  for(let i=0;i<count;i++){
    const c=randomCase(start+i),expected=trace(c.input,c.options);
    if(!child.stdin.write(`${JSON.stringify(c)}\n`))await once(child.stdin,'drain');
    const {value,done}=await iterator.next();if(done)throw Error(`Rust exited at case ${c.name}`);
    const actual=JSON.parse(value);
    const difference=firstDifference(actual,expected);
    if(difference){writeFileSync('/tmp/qd-engine-parity-failure.json',JSON.stringify({case:c,difference,expected,actual},null,2));throw Error(`${c.name}: ${JSON.stringify(difference)} (full reproduction /tmp/qd-engine-parity-failure.json)`);}
    if((i+1)%100===0)console.log(`Matched ${i+1}/${count} complete randomized battles, every batch and log.`);
  }
  console.log(`PASS: ${count} randomized battles (${start}..${start+count-1}) match the TypeScript engine exactly.`);
}finally{child.stdin.end();lines.close();child.kill();}
