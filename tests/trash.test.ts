import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createFileStore} from '../lib/profile-store.ts';
import {initialProfiles,validProfile} from '../app/profiles.ts';

test('server deletion metadata cannot invalidate a page at the content size limit',()=>{
  const source='data:image/png;base64,iVBORw0KGgoA'+'A'.repeat(198960);
  const page={...initialProfiles[0],version:9,about:'',images:{posts:Array(8).fill(source)}};
  const room=1_600_000-new TextEncoder().encode(JSON.stringify(page)).length;
  page.about='x'.repeat(room);
  assert.equal(validProfile(page),true);
  assert.equal(validProfile({...page,version:10,deletedAt:'2026-10-23T00:00:00.000Z'}),true);
  assert.equal(validProfile({...page,version:11}),true);
});

test('trashed default pages persist without being reseeded and restore all content',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'engage-trash-'));
  try{
    const store=createFileStore(dir);
    const deleted={...initialProfiles[0],deletedAt:'2026-10-23T00:00:00.000Z'};
    assert.equal(validProfile({...deleted,deletedAt:'invalid'}),false);
    const saved=await store.save(deleted);
    assert.ok(saved);
    const reloaded=(await createFileStore(dir).list()).find(p=>p.id===deleted.id)!;
    assert.equal(reloaded.deletedAt,'2026-10-23T00:00:00.000Z');
    assert.equal(await store.save({...deleted,deletedAt:undefined}),null);
    const restored=await store.save({...reloaded,deletedAt:undefined});
    assert.equal(restored?.deletedAt,undefined);
    assert.equal(restored?.about,initialProfiles[0].about);
    assert.equal((await store.list()).filter(p=>p.id===deleted.id).length,1);
  }finally{await rm(dir,{recursive:true,force:true})}
});
