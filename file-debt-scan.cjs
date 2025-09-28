#!/usr/bin/env node
// file-debt-scan.cjs — scan dir for TODO/FIXME comments, JSON output supported

const fs=require('fs'),path=require('path');
const argv=process.argv.slice(2);
const opts={dir:'.',json:false,pattern:'\\b(TODO|FIXME)\\b',ignore:['node_modules','.git'],excludeHidden:false,onlyHidden:false};
opts.ignore.push(path.basename(__filename));

for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(a==='--json')opts.json=true;
  else if(a==='--pattern')opts.pattern=argv[++i]||opts.pattern;
  else if(a==='--ignore')opts.ignore.push(argv[++i]||'');
  else if(a==='--exclude-hidden')opts.excludeHidden=true;
  else if(a==='--only-hidden')opts.onlyHidden=true;
  else if(a==='-h'||a==='--help'){showHelp();process.exit(0);}
  else if(!opts.dir||opts.dir==='.')opts.dir=a;
}
opts.dir=path.resolve(process.cwd(),opts.dir);

function showHelp(){console.log(`todo-scan — find TODO/FIXME
Usage:
  todo-scan.js [path] [--json] [--pattern PATTERN] [--ignore NAME] [--exclude-hidden] [--only-hidden]
Examples:
  node todo-scan.js
  node todo-scan.js src --json
  node todo-scan.js . --pattern "BUG|HACK"
  node todo-scan.js . --exclude-hidden
  node todo-scan.js . --only-hidden
`);}

function isIgnored(name){
  if(opts.ignore.some(x=>x&&(name===x||name.startsWith(x))))return true;
  const hidden=name.startsWith('.');
  if(opts.onlyHidden&&!hidden)return true;
  if(opts.excludeHidden&&hidden)return true;
  return false;
}

const regex=new RegExp(opts.pattern,'i');

async function walkDir(dir,cb){
  let entries;
  try{entries=await fs.promises.readdir(dir,{withFileTypes:true});}catch(e){return;}
  for(const ent of entries){
    try{
      if(isIgnored(ent.name))continue;
      const full=path.join(dir,ent.name);
      if(ent.isDirectory())await walkDir(full,cb);
      else if(ent.isFile())await cb(full);
    }catch(e){}
  }
}

function readLines(text){return text.split(/\r?\n/);}

async function scanFile(file){
  let data;
  try{data=await fs.promises.readFile(file,'utf8');}catch(e){return [];}
  const lines=readLines(data),hits=[];
  for(let i=0;i<lines.length;i++)if(regex.test(lines[i]))hits.push({file,line:i+1,text:lines[i].trim()});
  return hits;
}

(async()=>{
  const results=[];
  try{
    await walkDir(opts.dir,async(file)=>{
      const ext=path.extname(file).toLowerCase();
      const skipExt=['.png','.jpg','.jpeg','.gif','.bmp','.exe','.dll','.so','.dylib','.zip','.tar','.gz','.min.js'];
      if(skipExt.includes(ext))return;
      const hits=await scanFile(file);
      for(const h of hits)results.push(h);
    });
  }catch(e){console.error('Failed to scan:',e.message);process.exit(2);}
  
  if(opts.json){console.log(JSON.stringify({scannedDir:opts.dir,count:results.length,items:results},null,2));process.exit(0);}
  if(results.length===0){console.log('No TODO/FIXME found. ✅');process.exit(0);}

  const byFile=results.reduce((acc,r)=>{(acc[r.file]||(acc[r.file]=[])).push(r);return acc;},{});
  console.log(`Found ${results.length} marker${results.length>1?'s':''} in ${Object.keys(byFile).length} file${Object.keys(byFile).length>1?'s':''}:\n`);
  for(const file of Object.keys(byFile).sort()){
    const items=byFile[file];
    console.log(`${file} — ${items.length}`);
    for(const it of items){
      const preview=it.text.length>120?it.text.slice(0,117)+'...':it.text;
      console.log(`  ${String(it.line).padStart(4)} │ ${preview}`);
    }
    console.log('');
  }
})();
