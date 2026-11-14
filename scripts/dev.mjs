import {createServer} from 'node:http';
import worker from '../worker/main.js';
createServer(async(req,res)=>{try{const response=await worker.fetch(new Request('http://localhost:4174'+req.url));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.writeHead(500);res.end(error.message);}}).listen(4174,'127.0.0.1',()=>console.log('Earth Field local preview: http://localhost:4174'));
