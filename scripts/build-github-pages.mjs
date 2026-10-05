import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const docs=path.join(root,'docs');
const base='/relay-fellowship';

execFileSync(process.execPath,[path.join(root,'scripts','build-content.mjs')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','augment-home.mjs')],{stdio:'inherit'});

if(path.dirname(docs)!==root)throw Error('Unexpected output path');
if(fs.existsSync(docs))fs.rmSync(docs,{recursive:true,force:true});
fs.cpSync(dist,docs,{recursive:true});

function walk(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()){walk(file);continue;}
    if(!/\.(html|css|js)$/.test(entry.name))continue;
    let data=fs.readFileSync(file,'utf8');
    if(/\.html$/.test(entry.name))data=data.replace(/\b(href|src|action|poster)=(['"])\/(?!\/)/g,(_,attr,quote)=>`${attr}=${quote}${base}/`);
    if(/\.css$/.test(entry.name))data=data.replace(/url\((['"]?)\/(?!\/)/g,(_,quote)=>`url(${quote}${base}/`);
    if(/\.js$/.test(entry.name))data=data.replace(/href=\\?"\/(?!\/)/g,match=>match.replace('/',`${base}/`));
    fs.writeFileSync(file,data);
  }
}
walk(docs);
fs.writeFileSync(path.join(docs,'.nojekyll'),'');
console.log(`GitHub Pages files ready in docs${base}/`);
