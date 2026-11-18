import test from 'node:test';
import assert from 'node:assert/strict';
import {rScale,sScale,gScale,flareClass,summarize} from '../worker/glance.js';
import worker from '../worker/main.js';
test('NOAA scales follow their published thresholds',()=>{
 assert.deepEqual([null,4.99,5,6.7,9].map(gScale),[0,0,1,2,5]);
 assert.deepEqual([null,9e-6,1e-5,5e-5,1e-4,2.1e-3].map(rScale),[0,0,1,2,3,5]);
 assert.deepEqual([null,9.9,10,150,1e5].map(sScale),[0,0,1,2,5]);
 assert.equal(flareClass(6.2e-7),'B6.2');assert.equal(flareClass(2.3e-5),'M2.3');assert.equal(flareClass(null),null);
});
test('glance keeps missing readings null and takes the recent X-ray peak',()=>{
 const now=Date.parse('2026-11-16T12:00:00Z'),h=3600000;
 const g=summarize([{id:'kp',latest:[now,5.33],history:[]},{id:'xray',latest:[now,2e-6],history:[[now-5*h,9e-4],[now-h,3e-5],[now,2e-6]]},{id:'speed',error:'down',latest:[now,400],history:[]},{id:'cosmic',latest:[now,90],history:[[0,100],[1,100]]}],now);
 assert.equal(g.g,1);assert.equal(g.xrayPeak3h,3e-5);assert.equal(g.r,1);assert.equal(g.speed,null);assert.equal(g.protons,null);assert.equal(g.cosmicRatio,.9);assert.equal(g.level,'storm');
});
test('glance route is public to other origins',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline');};
 try{const res=await worker.fetch(new Request('https://example.com/api/glance'));assert.equal(res.headers.get('access-control-allow-origin'),'*');assert.ok([200,502].includes(res.status));}
 finally{globalThis.fetch=originalFetch;}
});
