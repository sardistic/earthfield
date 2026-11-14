import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {number,timestamp,points,distance,nearest,parseNmdb,usgsPoints,derivative,parseDrap,upstream} from '../worker/data.js';
import {page} from '../worker/view.js';
import {clientSource} from '../worker/client.js';
import worker from '../worker/main.js';
test('missing readings cannot silently become zero',()=>{for(const v of[null,undefined,'',true,'NaN',99999])assert.equal(number(v),null);assert.equal(number(0),0);assert.equal(number('0'),0);});
test('timezone-free provider timestamps mean UTC; newest-first inputs sort correctly',()=>{assert.equal(timestamp('2026-11-14T09:00:00'),Date.parse('2026-11-14T09:00:00Z'));assert.deepEqual(points([{time_tag:'2020-01-02',x:2},{time_tag:'2020-01-01',x:null},{time_tag:'2020-01-01T00:00:00',x:0}],'x').map(p=>p[1]),[0,2]);});
test('select active quality-zero spacecraft; do not mix simultaneous sensors',()=>{const rows=[{time_tag:'2020-01-01T00:00:00',active:false,overall_quality:0,bt:999},{time_tag:'2020-01-01T00:00:00',active:true,overall_quality:0,bt:5},{time_tag:'2020-01-01T00:01:00',active:true,overall_quality:1,bt:99}];assert.deepEqual(points(rows,'bt',r=>r.active&&r.overall_quality===0).map(p=>p[1]),[5]);});
test('nearest station handles provider 0–360 longitudes and distant proxies',()=>{const f=nearest([{id:'FRD',geometry:{coordinates:[282.627,38.205]}},{id:'BOU',geometry:{coordinates:[254.763,40.137]}}],35.6127,-77.3664);assert.equal(f.id,'FRD');assert.ok(f.distance>280&&f.distance<300);assert.ok(distance(35.6127,-77.3664,39.68,-75.75)>470);});
test('NMDB corrected rates parse from text without treating gaps as zero',()=>{assert.deepEqual(parseNmdb('# header\n2020-01-01 00:05:00; 92.615\n2020-01-01 00:00:00; null\n2020-01-01 00:10:00; 0').map(p=>p[1]),[92.615,0]);});
test('USGS nulls and future placeholders are excluded, field-change gaps skipped',()=>{const p=usgsPoints({times:['2020-01-01T00:00:00Z','2020-01-01T00:01:00Z','2020-01-01T00:02:00Z','2020-01-01T00:10:00Z'],values:[{id:'H',values:[100,null,104,120]}]},'H');assert.deepEqual(derivative(p).map(x=>x[1]),[2]);});
test('D-RAP preserves valid zero and parses the actual unprefixed longitude header',()=>{const xs=Array.from({length:90},(_,i)=>-178+i*4);const text='# Product Valid At : 2026-11-14 09:32 UTC\n    '+xs.join(' ')+'\n-------\n37 | '+xs.map(()=>0).join(' ')+'\n35 | '+xs.map(()=>3).join(' ');const p=parseDrap(text,37,-150);assert.equal(p.value,0);assert.equal(p.lon,-150);assert.equal(p.lat,37);assert.throws(()=>parseDrap('provider error',35,-77));});
test('diorama client parses and exposes all requested replay periods',()=>{new vm.Script(clientSource);assert.match(page,/Greenville, North Carolina/);for(const p of ['day','week','month','year','decade'])assert.ok(page.includes('data-period=\"'+p+'\"'));assert.match(page,/earthCanvas/);});
test('routes validate coordinates and expose application health independently',async()=>{assert.equal((await worker.fetch(new Request('https://example.com/'))).status,200);assert.equal((await worker.fetch(new Request('https://example.com/api/local?lat=91'))).status,400);assert.equal((await worker.fetch(new Request('https://example.com/nope'))).status,404);assert.equal((await worker.fetch(new Request('https://example.com/healthz'))).status,200);});
test('hosted cache denial cannot block live provider fetches',async()=>{
 const originalFetch=globalThis.fetch,originalCaches=Object.getOwnPropertyDescriptor(globalThis,'caches');
 let requests=0;
 globalThis.fetch=async()=>{requests++;return Response.json({reading:119});};
 try {
  Object.defineProperty(globalThis,'caches',{configurable:true,value:{get default(){throw Error('This Worker is not permitted to access the default cache.');}}});
  assert.deepEqual(await upstream('https://example.com/cache-denied'),{reading:119});
  assert.deepEqual(await upstream('https://example.com/cache-denied'),{reading:119});
  assert.equal(requests,1,'in-memory TTL cache still works');
  Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{match:async()=>{throw Error('Cache read denied');}}}});
  assert.deepEqual(await upstream('https://example.com/cache-read-denied'),{reading:119});
  Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{match:async()=>undefined,put:async()=>{throw Error('Cache write denied');}}}});
  assert.deepEqual(await upstream('https://example.com/cache-write-denied'),{reading:119});
  assert.equal(requests,3);
 } finally {globalThis.fetch=originalFetch;if(originalCaches)Object.defineProperty(globalThis,'caches',originalCaches);else delete globalThis.caches;}
});
test('text parsing does not impose a MIME type that NOAA HAPI rejects',async()=>{const original=globalThis.fetch;let accept;globalThis.fetch=async(u,options)=>{accept=options.headers.Accept;return new Response('time_tag,bt,quality\n2020-01-01T00:00:00Z,5,0');};try{const text=await upstream('https://example.com/hapi-csv-negotiation',1,true);assert.equal(accept,'*/*');assert.match(text,/time_tag,bt,quality/);}finally{globalThis.fetch=original;}});
