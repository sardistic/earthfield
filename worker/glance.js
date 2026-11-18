import {spaceMetrics,cosmicMetrics} from './data.js';
// A glance at right now, for embedding elsewhere (sardistic.com's room reads it for its ceiling's stars): the newest value
// of each driver, NOAA's three storm scales, and the few derived numbers a small display needs. Public data, so any origin.
const H3=3*3600000;
let glanceMemo=null;
const at=(list,id)=>list.find(m=>m.id===id);
const now1=(m)=>m&&!m.error&&m.latest?m.latest[1]:null;
export function rScale(x){return x===null?0:x>=2e-3?5:x>=1e-3?4:x>=1e-4?3:x>=5e-5?2:x>=1e-5?1:0;}
export function sScale(p){return p===null?0:p>=1e5?5:p>=1e4?4:p>=1e3?3:p>=100?2:p>=10?1:0;}
export function gScale(kp){return kp===null?0:Math.max(0,Math.min(5,Math.floor(kp+1e-9)-4));}
export function flareClass(x){if(x===null)return null;const c=[['X',1e-4],['M',1e-5],['C',1e-6],['B',1e-7],['A',1e-8]].find(([,v])=>x>=v)??['A',1e-8];return c[0]+(x/c[1]).toFixed(1);}
export function summarize(metrics,now=Date.now()){
 const kp=now1(at(metrics,'kp')),xr=at(metrics,'xray'),x=now1(xr),pr=now1(at(metrics,'protons')),cos=at(metrics,'cosmic');
 const recent=(xr?.history??[]).filter(p=>p[0]>=now-H3),peak=recent.reduce((b,p)=>p[1]>(b?.[1]??-1)?p:b,null);
 const ch=(cos?.history??[]).map(p=>p[1]),cm=ch.length?ch.reduce((a,b)=>a+b,0)/ch.length:null,cn=now1(cos);
 const g=gScale(kp),r=rScale(peak?.[1]??x),s=sScale(pr);
 const level=g>=1||r>=2||s>=1?'storm':kp>=4||r>=1?'active':kp>=3?'unsettled':'quiet';
 return{kp,g,speed:now1(at(metrics,'speed')),density:now1(at(metrics,'density')),bz:now1(at(metrics,'bz')),bt:now1(at(metrics,'bt')),
  xray:x,xrayClass:flareClass(x),xrayPeak3h:peak?.[1]??null,xrayPeakAt:peak?.[0]??null,r,
  f107:now1(at(metrics,'f107')),f107Mean:at(metrics,'f107')?.reference??null,protons:pr,s,
  cosmic:cn,cosmicMean:cm,cosmicRatio:cn!==null&&cm?cn/cm:null,level};
}
export async function glanceApi(){
 const headers={'Cache-Control':'public, max-age=120','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'};
 try{
  if(!glanceMemo||Date.now()-glanceMemo.t>60000){const[sp,co]=await Promise.all([spaceMetrics(),cosmicMetrics(35.6127,-77.3664)]);glanceMemo={t:Date.now(),v:{fetchedAt:new Date().toISOString(),...summarize([...sp,...co])}};}
  return Response.json(glanceMemo.v,{headers});
 }catch{return Response.json({error:'Upstream data could not be loaded. Retry shortly.'},{status:502,headers});}
}
