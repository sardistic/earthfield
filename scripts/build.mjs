import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
const pieces=await Promise.all(['worker/data.js','worker/ui.js','worker/main.js'].map(p=>readFile(p,'utf8')));
const source=pieces.map((s,i)=>i<2?s.replace(/^export /gm,''):s.replace(/^import .*;\r?\n/gm,'')).join('\n');
await writeFile('dist/server/index.js',source);
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built standalone Earth Field Worker.');
