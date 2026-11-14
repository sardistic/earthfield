import {upstream,number,timestamp} from './data.js';
const HISTORY_DAY=86400000;
export function replayWindow(period,now=Date.now()){
 const end=new Date(now);end.setUTCSeconds(0,0);const start=new Date(end);
 if(period==='decade')start.setUTCFullYear(start.getUTCFullYear()-10);
 else if(period==='year')start.setUTCFullYear(start.getUTCFullYear()-1);
 else if(period==='month')start.setUTCMonth(start.getUTCMonth()-1);
 else start.setUTCDate(start.getUTCDate()-(period==='week'?7:1));
 return{start:start.getTime(),end:end.getTime(),step:period==='day'?300000:period==='week'||period==='month'?3600000:HISTORY_DAY};
}
export function sampleAt(series,time,maxAge){
 if(!series?.length)return null;let lo=0,hi=series.length-1,index=-1;
 while(lo<=hi){const mid=(lo+hi)>>1;if(series[mid][0]<=time){index=mid;lo=mid+1;}else hi=mid-1;}
 if(index<0)return null;const p=series[index],limit=p[2]??maxAge;
 return typeof p[1]==='number'&&Number.isFinite(p[1])&&time-p[0]<=limit?p:null;
}
export function aggregateSeries(series,step){
 const bins=new Map();for(const p of series){const t=Math.floor(p[0]/step)*step,cadence=Math.min(p[2]??step,86400000);let bin=bins.get(t);if(!bin||cadence<bin.cadence){bin={cadence,sum:0,n:0};bins.set(t,bin);}if(cadence===bin.cadence){bin.sum+=p[1];bin.n++;}}
 return [...bins].map(([t,b])=>[t,b.sum/b.n,step]).sort((a,b)=>a[0]-b[0]);
}
export function parseOmni(text){
 const names=['bt','bz','speed','density','kp','dst','f107','protons'],fills=[999.9,999.9,9999,999.9,99,99999,999.9,99999.99],out=Object.fromEntries(names.map(n=>[n,[]]));
 for(const line of text.split(/\r?\n/)){if(!/^\s*\d{4}\s+\d{1,3}\s+\d{1,2}\s+/.test(line))continue;const p=line.trim().split(/\s+/).map(Number);if(p.length<11)continue;const t=Date.UTC(p[0],0,p[1],p[2]);for(let i=0;i<names.length;i++){const value=p[i+3];if(!Number.isFinite(value)||value===fills[i])continue;out[names[i]].push([t,i===4?value/10:value,HISTORY_DAY]);}}
 return out;
}
export function parseHapi(text,mapping,step){
 const lines=text.trim().split(/\r?\n/),header=lines.shift()?.replace(/^\uFEFF/,'').split(',').map(s=>s.trim().replaceAll('"',''))??[],out=Object.fromEntries(Object.values(mapping).map(n=>[n,[]]));
 const ti=header.indexOf('time_tag'),qi=header.indexOf('quality');if(ti<0||qi<0)throw Error('Unrecognized NOAA archive header');
 for(const line of lines){const row=line.split(',').map(s=>s.trim().replaceAll('"',''));if(Number(row[qi])!==0)continue;const t=timestamp(row[ti]);if(t===null)continue;for(const[field,id]of Object.entries(mapping)){const i=header.indexOf(field),v=i<0?null:number(row[i]);if(v!==null&&v>-1e20)out[id].push([t,v,step]);}}
 return out;
}
function compactDate(t){return new Date(t).toISOString().slice(0,10).replaceAll('-','');}
async function nasaArchive(start,end){
 const url=(s,e)=>{const p=new URLSearchParams({activity:'retrieve',res:'daily',spacecraft:'omni2_daily',start_date:compactDate(s),end_date:compactDate(e)});for(const id of[8,16,24,23,38,40,50,45])p.append('vars',String(id));return'https://omniweb.gsfc.nasa.gov/cgi/nx1.cgi?'+p;};
 let text=await upstream(url(start,end),3600,true),range=text.match(/correct range:\s*(\d{8})\s*-\s*(\d{8})/i);
 if(range){const e=Date.parse(range[2].replace(/^(\d{4})(\d\d)(\d\d)$/,'$1-$2-$3')+'T00:00:00Z');if(start>e+HISTORY_DAY)return{};text=await upstream(url(start,Math.min(end,e)),3600,true);}
 return parseOmni(text);
}
export function hapiArchiveUrl(id,fields,start,end,step){const daily=step===86400000,dt=daily?86400000:3600000,to=t=>new Date(Math.floor(t/dt)*dt).toISOString().replace('.000Z','Z');return'https://tlv-swpc.woc.noaa.gov/hapi/data?'+new URLSearchParams({id:id+'-'+(daily?'pt1d':'pt1h'),parameters:fields.join(',')+',quality','time.min':to(start),'time.max':to(end)});}
async function windArchive(start,end,step){const dt=step===HISTORY_DAY?HISTORY_DAY:3600000;
 const query=(id,fields)=>hapiArchiveUrl(id,fields,start,end,step);
 const [mag,plasma]=await Promise.allSettled([upstream(query('active-mag',['bt','bz_gsm']),900,true),upstream(query('active-plasma',['speed','density']),900,true)]);
 if(mag.status==='rejected'&&plasma.status==='rejected')throw Error('NOAA wind archive unavailable: '+mag.reason?.message);
 return{...(mag.status==='fulfilled'?parseHapi(mag.value,{bt:'bt',bz_gsm:'bz'},dt):{}),...(plasma.status==='fulfilled'?parseHapi(plasma.value,{speed:'speed',density:'density'},dt):{})};
}
async function cosmicArchive(start,end,step){const p=new URLSearchParams({station:'OULU',resolution:String(step===HISTORY_DAY?1440:step===300000?5:60),outputmode:'json'});for(const[prefix,t]of[['start',start],['end',end]]){const d=new Date(t);p.set(prefix+'day',String(d.getUTCDate()).padStart(2,'0'));p.set(prefix+'month',String(d.getUTCMonth()+1).padStart(2,'0'));p.set(prefix+'year',String(d.getUTCFullYear()));p.set(prefix+'time',prefix==='start'?'00:00':'23:30');}const data=await upstream('https://cosmicrays.oulu.fi/webform/onlinequery.cgi?'+p,900);return{oulu:(data.data??[]).flatMap(r=>{const t=timestamp(r['time:']),v=number(r['corr:']);return t===null||v===null||v<0?[]:[[t,v,step]];})};}
async function radioArchive(){const rows=await upstream('https://services.swpc.noaa.gov/json/f107_cm_flux.json',1800);return{f107:rows.filter(r=>r.reporting_schedule==='Noon').flatMap(r=>{const t=timestamp(r.time_tag),v=number(r.flux);return t===null||v===null?[]:[[t,v,HISTORY_DAY*1.5]];})};}
export async function historyApi(url){
 const period=url.searchParams.get('period')??'day';if(!['day','week','month','year','decade'].includes(period))return Response.json({error:'Unsupported replay period'},{status:400});
 const window=replayWindow(period),jobs=[['NASA OMNI',()=>nasaArchive(window.start,window.end)],['NOAA solar wind',()=>windArchive(window.start,window.end,window.step)],['Oulu cosmic rays',()=>cosmicArchive(window.start,window.end,window.step)],['NOAA F10.7',()=>radioArchive()]],all=await Promise.allSettled(jobs.map(j=>j[1]())),merged={},errors=[];
 all.forEach((r,i)=>{if(r.status==='rejected'){errors.push(jobs[i][0]+': '+(r.reason?.message??'unavailable'));return;}for(const[id,pts]of Object.entries(r.value)){if(!merged[id])merged[id]=new Map();for(const p of pts){if(p[0]<window.start-HISTORY_DAY||p[0]>window.end)continue;merged[id].set(p[0],[...p,i]);}}});
 const series=Object.fromEntries(Object.entries(merged).map(([id,map])=>[id,[...map.values()].sort((a,b)=>a[0]-b[0])])),count=Object.values(series).reduce((n,s)=>n+s.length,0);
 return Response.json({period,...window,series,sources:jobs.map(j=>j[0]),errors,samples:count,cadence:window.step===HISTORY_DAY?'Daily averages':window.step===300000?'5-minute / hourly samples':'Hourly samples; older OMNI values daily'},{status:count?200:502,headers:{'Cache-Control':'private, max-age=300'}});
}
