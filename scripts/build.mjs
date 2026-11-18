import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const pieces=await Promise.all(['worker/data.js','worker/history.js','worker/aurora.js','worker/imagery.js','worker/glance.js','worker/assets.js','worker/model.js','worker/diorama.js','worker/view.js','worker/client.js','worker/main.js'].map(p=>readFile(p,'utf8')));
const source=pieces.map((s,i)=>{s=s.replace(/^import .*;\r?\n/gm,'');return i<pieces.length-1?s.replace(/^export /gm,''):s;}).join('\n');
await writeFile('dist/server/index.js',source);
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built standalone Earth Field Worker.');
