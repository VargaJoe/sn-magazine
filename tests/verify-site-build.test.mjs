import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const hash=value=>createHash('sha256').update(value).digest('hex');
async function fixture(t){
  const root=await fs.mkdtemp(path.resolve('temp/serving-gate-'));
  t.after(async()=>{assert.ok(root.startsWith(path.resolve('temp')+path.sep));await fs.rm(root,{recursive:true,force:true});});
  const build=path.join(root,'temp/run/build'),evidence=path.join(root,'temp/run/evidence');
  await fs.mkdir(build,{recursive:true});await fs.mkdir(evidence);
  const manifest=path.join(root,'site.json');
  await fs.writeFile(manifest,JSON.stringify({schemaVersion:1,id:'demo',allowInitialHeader:false}));
  const output=[];
  for(const[name,bytes]of Object.entries({'index.html':'<html>demo</html>','asset-manifest.json':'{}','static/js/main.js':'console.log("demo")'})){
    await fs.mkdir(path.dirname(path.join(build,name)),{recursive:true});await fs.writeFile(path.join(build,name),bytes);
    output.push({path:name,sha256:hash(bytes)});
  }
  const proof={schemaVersion:1,site:'demo',descriptorSha256:hash(await fs.readFile(manifest)),outputRoot:build,
    violations:[],moduleCount:7,chunkCount:1,output,engineVersion:'1.0.0',engineFingerprint:'f'.repeat(64)};
  const save=()=>fs.writeFile(path.join(evidence,'build-proof.json'),JSON.stringify(proof));await save();
  const run=(...extra)=>spawnSync(process.execPath,['scripts/verify-site-build.mjs','--workspace',root,'--manifest',manifest,
    '--build',build,'--evidence',evidence,...extra],{encoding:'utf8'});
  return {root,build,evidence,manifest,proof,save,run};
}

test('serving CLI accepts a verified build and rejects a changed saved proof',async t=>{
  const f=await fixture(t),pointer=path.join(f.root,'temp/last-build.json');
  const first=f.run('--write-pointer',pointer);assert.equal(first.status,0,first.stderr);
  assert.equal(JSON.parse(first.stdout).files,3);
  assert.equal(f.run('--pointer',pointer).status,0);
  const saved=JSON.parse(await fs.readFile(pointer));
  await fs.writeFile(pointer,JSON.stringify({SchemaVersion:1,Site:saved.site,BuildDirectory:saved.buildDirectory,
    EvidenceDirectory:saved.evidenceDirectory,ProofSha256:saved.buildProofSha256,DescriptorSha256:saved.descriptorSha256}));
  assert.equal(f.run('--pointer',pointer).status,0);
  f.proof.engineVersion='changed';await f.save();
  const result=f.run('--pointer',pointer);assert.equal(result.status,1);assert.match(result.stderr,/pointer/);
});

for(const[name,change,pattern]of[
  ['changed output',async f=>fs.writeFile(path.join(f.build,'index.html'),'tampered'),/hash mismatch/],
  ['extra old chunk',async f=>fs.writeFile(path.join(f.build,'old.js'),'old'),/output file/],
  ['missing output',async f=>fs.unlink(path.join(f.build,'static/js/main.js')),/output file/],
  ['other site proof',async f=>{f.proof.site='other';await f.save();},/Invalid site/],
  ['changed descriptor',async f=>fs.writeFile(f.manifest,'{"schemaVersion":1,"id":"demo","language":"hu"}'),/Invalid site/],
  ['wrong output root',async f=>{f.proof.outputRoot=f.evidence;await f.save();},/Invalid site/],
  ['path escape',async f=>{f.proof.output[0].path='../index.html';await f.save();},/output path/],
  ['case collision',async f=>{f.proof.output.push({...f.proof.output[0],path:'INDEX.HTML'});await f.save();},/output path/],
  ['private stats',async f=>{f.proof.output.push({path:'bundle-stats.json',sha256:'f'.repeat(64)});await f.save();},/private evidence/],
  ['forbidden header',async f=>{f.proof.output.push({path:'reader-initial/desktop.png',sha256:'f'.repeat(64)});await f.save();},/initial header/],
  ['missing module count',async f=>{delete f.proof.moduleCount;await f.save();},/Invalid site/],
])test('serving CLI rejects '+name,async t=>{
  const f=await fixture(t);await change(f);const result=f.run();assert.equal(result.status,1,result.stdout);assert.match(result.stderr,pattern);
});

test('serving CLI rejects linked output root and nested links',async t=>{
  const f=await fixture(t),linked=path.join(f.root,'temp/linked');
  await fs.symlink(f.build,linked,process.platform==='win32'?'junction':'dir');
  const result=f.run('--build',linked);assert.equal(result.status,1);assert.match(result.stderr,/links/);
  await fs.symlink(f.evidence,path.join(f.build,'linked'),process.platform==='win32'?'junction':'dir');
  assert.match(f.run().stderr,/links/);
});
