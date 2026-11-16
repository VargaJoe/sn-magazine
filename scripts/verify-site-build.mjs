import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).reduce((entries,value,index,all)=>{
  if(index%2===0)entries.push([value.replace(/^--/,''),all[index+1]]);return entries;
},[]));
const hash=value=>createHash('sha256').update(value).digest('hex');
const workspace=path.resolve(args.workspace||process.cwd());
const inside=(parent,child)=>{const relative=path.relative(parent,child);return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
async function noLinks(filename){
  let current=path.parse(filename).root;
  for(const part of filename.slice(current.length).split(path.sep).filter(Boolean)){
    current=path.join(current,part);
    try{if((await fs.lstat(current)).isSymbolicLink())throw Error('Build boundary cannot contain links');}
    catch(error){if(error.code==='ENOENT')break;throw error;}
  }
}
async function files(root,relative=''){
  const result=[];
  for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
    if(entry.isSymbolicLink())throw Error('A verified output cannot contain links');
    const name=path.posix.join(relative,entry.name);
    if(entry.isDirectory())result.push(...await files(root,name));
    else if(entry.isFile())result.push(name);else throw Error('Public output must contain regular files');
  }
  return result.sort();
}
try{
  if(!args.manifest)throw Error('A site manifest is required');
  const descriptorBytes=await fs.readFile(path.resolve(args.manifest));
  const descriptor=JSON.parse(descriptorBytes);
  if(descriptor.schemaVersion!==1||!/^[a-z][a-z0-9-]*$/.test(descriptor.id))throw Error('Invalid site descriptor');
  if(args.pointer)await noLinks(path.resolve(args.pointer));
  const saved=args.pointer?JSON.parse(await fs.readFile(path.resolve(args.pointer),'utf8')):null;
  const pointer=saved?{schemaVersion:saved.schemaVersion??saved.SchemaVersion,site:saved.site??saved.Site,
    buildDirectory:saved.buildDirectory??saved.BuildDirectory,evidenceDirectory:saved.evidenceDirectory??saved.EvidenceDirectory,
    buildProofSha256:saved.buildProofSha256??saved.ProofSha256,descriptorSha256:saved.descriptorSha256??saved.DescriptorSha256}:null;
  if(pointer&&pointer.site!==descriptor.id)throw Error('Pointer belongs to another site');
  if(!(args.build||pointer?.buildDirectory)||!(args.evidence||pointer?.evidenceDirectory))throw Error('Build and evidence paths are required');
  const build=path.resolve(args.build||pointer?.buildDirectory||'');
  const evidence=path.resolve(args.evidence||pointer?.evidenceDirectory||'');
  if(!(inside(path.join(workspace,'temp'),build)||build===path.join(workspace,'build'))||
     !inside(path.join(workspace,'temp'),evidence))throw Error('Build/evidence must stay in the caller workspace');
  if(build===evidence||inside(build,evidence)||inside(evidence,build))throw Error('Evidence and output must be separate');
  await noLinks(build);await noLinks(evidence);
  const proofPath=path.join(evidence,'build-proof.json');
  await noLinks(proofPath);
  const proofBytes=await fs.readFile(proofPath),proof=JSON.parse(proofBytes);
  if(proof.schemaVersion!==1||proof.site!==descriptor.id||!Array.isArray(proof.violations)||proof.violations.length!==0||
     proof.descriptorSha256!==hash(descriptorBytes)||typeof proof.outputRoot!=='string'||path.resolve(proof.outputRoot)!==build||
     !(proof.moduleCount>0)||!(proof.chunkCount>0)||!Array.isArray(proof.output)||!proof.output.length||
     !/^[a-f0-9]{64}$/.test(proof.engineFingerprint)||typeof proof.engineVersion!=='string')throw Error('Invalid site build proof');
  if(pointer&&(pointer.schemaVersion!==1||pointer.buildProofSha256!==hash(proofBytes)||
      pointer.descriptorSha256!==hash(descriptorBytes)))throw Error('Build pointer no longer matches its proof');
  const seen=new Set();
  for(const item of proof.output){
    if(typeof item.path!=='string'||/[\\:\x00-\x1f<>"|?*]/.test(item.path)||
       !item.path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part))||
       seen.has(item.path.toLowerCase())||!/^[a-f0-9]{64}$/.test(item.sha256))throw Error('Invalid/repeated public output path');
    seen.add(item.path.toLowerCase());
    if(/(^|\/)(src|tests?|test-support|node_modules|\.git)(\/|$)|(^|\/)\.env|(^|\/)(bundle-stats|build-proof|engine|site)\.json$|\.(map|jsx|tsx?|mjs|cjs)$/i.test(item.path))throw Error('Source or private evidence in public build');
  }
  if(!seen.has('index.html')||!seen.has('asset-manifest.json'))throw Error('Production entry is missing');
  if(!descriptor.allowInitialHeader&&[...seen].some(name=>name.startsWith('reader-initial/')))throw Error('Consumer does not allow an initial header');
  const actual=await files(build),expected=proof.output.map(item=>item.path).sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Unexpected/missing public output file');
  for(const item of proof.output){
    if(!inside(build,path.resolve(build,item.path))||hash(await fs.readFile(path.join(build,item.path)))!==item.sha256)
      throw Error('Public build hash mismatch: '+item.path);
  }
  if(args['write-pointer']){
    const destination=path.resolve(args['write-pointer']);
    if(!inside(path.join(workspace,'temp'),destination))throw Error('Pointer must stay in workspace temp');
    await noLinks(destination);
    await fs.mkdir(path.dirname(destination),{recursive:true});
    const temporary=destination+'.'+randomUUID()+'.tmp';
    await fs.writeFile(temporary,JSON.stringify({schemaVersion:1,site:descriptor.id,buildDirectory:build,
      evidenceDirectory:evidence,buildProofSha256:hash(proofBytes),descriptorSha256:hash(descriptorBytes),
      engineVersion:proof.engineVersion,engineFingerprint:proof.engineFingerprint,builtAt:new Date().toISOString()},null,2)+'\n');
    await fs.rename(temporary,destination);
  }
  console.log(JSON.stringify({verified:true,site:descriptor.id,files:actual.length,engineVersion:proof.engineVersion,
    engineFingerprint:proof.engineFingerprint,buildDirectory:build,evidenceDirectory:evidence}));
}catch(error){console.error(error.message);process.exitCode=1;}
