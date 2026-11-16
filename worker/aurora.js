import {upstream,number,timestamp} from './data.js';
const OVATION_URL='https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';

// Compact NOAA OVATION (1° × 1° global grid, values 0–100) to a flat [lon,lat,value,…]
// array of cells at or above minValue, plus the value nearest to the observation point.
export function compactOvation(data,lat,lon,minValue=2){
 const coords=Array.isArray(data?.coordinates)?data.coordinates:[],points=[];let max=0,here=null,best=Infinity;
 for(const c of coords){if(!Array.isArray(c)||c.length<3)continue;const x=number(c[0]),y=number(c[1]),v=number(c[2]);if(x===null||y===null||v===null||v<0||v>100||Math.abs(y)>90)continue;const lo=((x+180)%360+360)%360-180;
  if(lat!=null&&lon!=null){const dl=Math.abs(((lo-lon+540)%360)-180),d=Math.abs(y-lat)+dl*Math.cos(lat*Math.PI/180);if(d<best){best=d;here=v;}}
  if(v>max)max=v;if(v>=minValue)points.push(lo,y,v);}
 if(!coords.length)throw Error('OVATION grid missing');
 return{observed:timestamp(data['Observation Time']),forecast:timestamp(data['Forecast Time']),max,here,points};
}

export async function auroraApi(url){const lat=number(url.searchParams.get('lat')??35.6127),lon=number(url.searchParams.get('lon')??-77.3664);if(lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180)return Response.json({error:'Coordinates out of range'},{status:400});
 try{const o=compactOvation(await upstream(OVATION_URL,300),lat,lon,4);return Response.json({source:'NOAA SWPC OVATION aurora model',sourceUrl:'https://www.swpc.noaa.gov/products/aurora-30-minute-forecast',location:{lat,lon},...o},{headers:{'Cache-Control':'public, max-age=120','X-Content-Type-Options':'nosniff'}});}
 catch{return Response.json({error:'Aurora model could not be loaded. Retry shortly.'},{status:502});}}
