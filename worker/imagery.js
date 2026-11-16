import {upstream,timestamp} from './data.js';
// Live imagery manifest. Images are loaded by the browser straight from the providers; the
// server only lists timestamped frames so the page can show the latest, animate the last hours,
// or follow the replay cursor.
const SWPC='https://services.swpc.noaa.gov';
const ANIMATIONS={suvi195:'suvi-primary-195',suvi304:'suvi-primary-304',hmi:'sdo-hmii',lasco3:'lasco-c3',lasco2:'lasco-c2',enlil:'enlil',ovationN:'ovation_north_24h',ovationS:'ovation_south_24h'};
const GOES_URL='https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/678x678.jpg';
let goesCache=null;

// Frame time from SWPC's time_tag, else from the file name (SUVI s20261116T025200Z,
// HMI 20261116_022238, LASCO 20261116_0154, Enlil 20261121T000000).
export function frameTime(entry){const tag=timestamp(entry?.time_tag);if(tag)return tag;const m=String(entry?.url??'').match(/(\d{4})(\d\d)(\d\d)[T_](\d\d)(\d\d)(\d\d)?(?!\d)/);if(!m)return null;const t=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]??0));return Number.isFinite(t)?t:null;}
export function swpcFrames(list,base=SWPC){const seen=new Map();for(const e of Array.isArray(list)?list:[]){const t=frameTime(e),u=typeof e?.url==='string'?e.url:null;if(t===null||!u||!/\.(png|jpe?g|gif)$/i.test(u))continue;seen.set(t,[t,new URL(u,base).href]);}return[...seen.values()].sort((a,b)=>a[0]-b[0]);}
export function epicFrames(list){const out=[];for(const e of Array.isArray(list)?list:[]){const t=timestamp(e?.date),img=typeof e?.image==='string'&&/^[\w-]+$/.test(e.image)?e.image:null;if(t===null||!img)continue;const d=new Date(t),p=n=>String(n).padStart(2,'0');out.push([t,'https://epic.gsfc.nasa.gov/archive/natural/'+d.getUTCFullYear()+'/'+p(d.getUTCMonth()+1)+'/'+p(d.getUTCDate())+'/jpg/'+img+'.jpg']);}return out.sort((a,b)=>a[0]-b[0]);}
async function goesFrames(){if(goesCache&&Date.now()-goesCache.at<300000)return goesCache.value;const res=await fetch(GOES_URL,{method:'HEAD',signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('GOES HTTP '+res.status);const t=Date.parse(res.headers.get('last-modified')??'');if(!Number.isFinite(t))throw Error('GOES time missing');const value=[[t,GOES_URL]];goesCache={at:Date.now(),value};return value;}

export async function imageryApi(){
 const jobs={...Object.fromEntries(Object.entries(ANIMATIONS).map(([id,name])=>[id,async()=>swpcFrames(await upstream(SWPC+'/products/animations/'+name+'.json',240))])),epic:async()=>epicFrames(await upstream('https://epic.gsfc.nasa.gov/api/natural',1800)),goes:goesFrames};
 const ids=Object.keys(jobs),settled=await Promise.allSettled(ids.map(id=>jobs[id]()));
 const sources=Object.fromEntries(ids.map((id,i)=>{const r=settled[i];return[id,r.status==='fulfilled'&&r.value.length?{frames:r.value}:{frames:[],error:'Unavailable'}];}));
 return Response.json({fetchedAt:new Date().toISOString(),sources},{headers:{'Cache-Control':'public, max-age=120','X-Content-Type-Options':'nosniff'}});
}
