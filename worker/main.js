import {api} from './data.js';
import {page} from './view.js';
import {historyApi} from './history.js';
import {auroraApi} from './aurora.js';
import {clientSource} from './client.js';
export default {async fetch(request){const url=new URL(request.url);if(request.method!=='GET')return new Response('Method not allowed',{status:405});if(url.pathname==='/healthz')return Response.json({ok:true});if(url.pathname==='/app.js')return new Response(clientSource,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}});if(url.pathname==='/api/history')return historyApi(url);if(url.pathname==='/api/aurora')return auroraApi(url);if(url.pathname==='/')return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'geolocation=(self)'}});if(['/api/space','/api/local','/api/cosmic'].includes(url.pathname))return api(url);return new Response('Not found',{status:404});}};
