import test from 'node:test';
import assert from 'node:assert/strict';
import {sunEci,gsmFrame,shue,magnetopauseR,bowShockR,kpOval,coupling,logRadius,unlogRadius,moonEci,dynamicPressure,geoVec,fixedToGsm} from '../worker/model.js';
import {compactOvation} from '../worker/aurora.js';
import worker from '../worker/main.js';
const deg=x=>x*180/Math.PI;

test('solar ephemeris gives solstice and equinox declinations',()=>{
 assert.ok(Math.abs(deg(Math.asin(sunEci(Date.parse('2026-06-21T08:24:00Z')).v[2]))-23.44)<.1);
 assert.ok(Math.abs(deg(Math.asin(sunEci(Date.parse('2026-12-21T20:50:00Z')).v[2]))+23.44)<.1);
 assert.ok(Math.abs(deg(Math.asin(sunEci(Date.parse('2026-03-20T14:46:00Z')).v[2])))<.1);
});

test('sub-solar point: local noon in Greenwich puts longitude 0 facing the Sun',()=>{
 const t=Date.parse('2026-03-20T12:07:00Z'),F=gsmFrame(t),g=fixedToGsm(geoVec(0,0,1),F);
 assert.ok(g[0]>.99,'equator at 0° longitude points sunward at ~12 UTC near equinox');
 const night=fixedToGsm(geoVec(0,180,1),F);assert.ok(night[0]<-.99);
});

test('dipole tilt reaches its seasonal extremes near ±34°',()=>{
 const summer=deg(gsmFrame(Date.parse('2026-06-21T17:00:00Z')).tilt),winter=deg(gsmFrame(Date.parse('2026-12-21T05:00:00Z')).tilt);
 assert.ok(summer>28&&summer<36,'June tilt '+summer);assert.ok(winter<-28&&winter>-36,'December tilt '+winter);
 for(let h=0;h<24;h++){const t=deg(gsmFrame(Date.parse('2026-03-20T00:00:00Z')+h*3600000).tilt);assert.ok(Math.abs(t)<=12,'equinox tilt stays within the dipole offset');}
});

test('Shue magnetopause: ~10 Rᴇ at 2 nPa, compresses with pressure and southward Bz',()=>{
 const base=shue(2,0).r0;assert.ok(base>10&&base<10.6,'r0 '+base);
 assert.ok(shue(10,0).r0<base*.8,'high pressure compresses');assert.ok(shue(2,-10).r0<base,'southward Bz erodes');
 const m=shue(2,0);assert.ok(magnetopauseR(m,Math.PI/2)>m.r0*1.3,'flanks flare outward');assert.ok(bowShockR(m,0)>m.r0);
 assert.equal(dynamicPressure(null,400),null);assert.ok(Math.abs(dynamicPressure(5,400)-1.338)<.01);
});

test('Kp oval moves equatorward with activity; coupling is larger for southward field',()=>{
 assert.equal(kpOval(0,0)[0],66.5);assert.ok(Math.abs(kpOval(5,0)[0]-56.3)<.01);assert.ok(kpOval(3,12)[0]>kpOval(3,0)[0],'dayside oval sits poleward');
 assert.ok(coupling(400,5,-5)>coupling(400,5,5)*10);assert.equal(coupling(400,null,1),null);
});

test('log distance scale is monotonic and invertible; Moon distance is sane',()=>{
 let prev=0;for(const r of[1,2,6.6,10,60,236]){const s=logRadius(r);assert.ok(s>prev);prev=s;assert.ok(Math.abs(unlogRadius(s)-r)<1e-9);}
 const re=moonEci(Date.parse('2026-11-16T00:00:00Z')).re;assert.ok(re>55&&re<64,'moon '+re);
});

test('OVATION grid compacts, wraps 0–360 longitudes and finds the nearest cell',()=>{
 const data={'Observation Time':'2026-11-16T02:33:00Z','Forecast Time':'2026-11-16T03:52:00Z',coordinates:[[0,60,1],[283,36,7],[282,35,3],[100,65,40],[1,1,'x'],[5,95,10]]};
 const o=compactOvation(data,35.6127,-77.3664,5);
 assert.deepEqual(o.points,[-77,36,7,100,65,40]);assert.equal(o.here,7,'(36°, −77°) is nearer than (35°, −78°)');assert.equal(o.max,40);assert.equal(o.forecast,Date.parse('2026-11-16T03:52:00Z'));
 assert.throws(()=>compactOvation({},0,0));
});

test('aurora route validates coordinates',async()=>{assert.equal((await worker.fetch(new Request('https://example.com/api/aurora?lat=200'))).status,400);});
