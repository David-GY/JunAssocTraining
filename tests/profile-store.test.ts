import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createFileStore,profileStore} from '../lib/profile-store.ts';
import {createBlobStore} from '../lib/profile-store.ts';
import {initialProfiles} from '../app/profiles.ts';

test('development edits persist across store instances and reject stale saves',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'engage-store-'));
  try{
    const store=createFileStore(dir);
    const saved=await store.save({...initialProfiles[0],profileLink:'lina.example/new'});
    assert.equal(saved?.version,1);
    assert.equal(await store.save({...initialProfiles[0],name:'stale write'}),null);
    const reloaded=await createFileStore(dir).list();
    assert.equal(reloaded[0].profileLink,'lina.example/new');
    assert.equal(reloaded[0].version,1);
    const outcomes=await Promise.all([store.save({...saved!,name:'A'}),store.save({...saved!,name:'B'})]);
    assert.equal(outcomes.filter(Boolean).length,1);
  }finally{await rm(dir,{recursive:true,force:true})}
});

test('Vercel fails closed without durable storage instead of writing temporary files',async()=>{
  const previous=process.env.VERCEL,url=process.env.DATABASE_URL,blob=process.env.BLOB_READ_WRITE_TOKEN;
  process.env.VERCEL='1';delete process.env.DATABASE_URL;delete process.env.BLOB_READ_WRITE_TOKEN;
  try{await assert.rejects(()=>profileStore(),/Database is not configured/)}
  finally{if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;if(url===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=url;if(blob===undefined)delete process.env.BLOB_READ_WRITE_TOKEN;else process.env.BLOB_READ_WRITE_TOKEN=blob}
});

test('development reads recover after a failed save and filesystem repair',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'engage-store-repair-'));
  try{
    const blocked=path.join(dir,'data');await writeFile(blocked,'blocked');
    const store=createFileStore(blocked);
    await assert.rejects(()=>store.save(initialProfiles[0]));
    await rm(blocked);await mkdir(blocked);
    assert.equal((await store.list())[0].id,'kusina-ni-lina');
  }finally{await rm(dir,{recursive:true,force:true})}
});

test('existing Blob records are preserved and stale or racing writes are rejected',async()=>{
  let current=[{...initialProfiles[0],name:'Existing workshop edits',version:4},initialProfiles[1]];
  let etag='"1"';let race=false;
  const store=createBlobStore({
    read:async()=>({profiles:current,etag}),
    write:async(profiles:typeof current,expected:string|null)=>{if(race||expected!==etag)return false;current=profiles;etag='"2"';return true},
  });
  assert.equal((await store.list())[0].name,'Existing workshop edits');
  assert.equal(await store.save(initialProfiles[0]),null);
  const saved=await store.save({...current[0],profileLink:'edited.example/company'});
  assert.equal(saved?.version,5);assert.equal(current[1].name,'Verdant Packaging');
  race=true;assert.equal(await store.save({...saved!,name:'Concurrent edit'}),null);
  assert.equal(current[0].name,'Existing workshop edits');
});
