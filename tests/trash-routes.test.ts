import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {GET,PATCH,PUT} from '../app/api/profiles/route.ts';
import {POST} from '../app/api/editor/route.ts';
import {initialProfiles} from '../app/profiles.ts';

test('delete and restore require editor access, retain content, and reject stale changes',async()=>{
  const cwd=process.cwd(),dir=await mkdtemp(path.join(tmpdir(),'engage-route-trash-'));
  process.chdir(dir);process.env.EDITOR_PASSWORD='test-password';process.env.EDITOR_SESSION_SECRET='s'.repeat(48);
  const url='https://workshop.example/api/profiles';
  const make=(method:string,body:unknown,cookie='',origin='https://workshop.example')=>new Request(url,{method,headers:{cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    const unlocked=await POST(new Request('https://workshop.example/api/editor',{method:'POST',headers:{origin:'https://workshop.example','Content-Type':'application/json'},body:JSON.stringify({password:'test-password'})}));
    const cookie=unlocked.headers.get('set-cookie')!;
    const page={...initialProfiles[0],profileLink:'saved.example/page',name:'Saved page'};
    assert.equal((await PUT(make('PUT',page,cookie))).status,200);
    const action={id:page.id,version:1,action:'delete'};
    assert.equal((await PATCH(make('PATCH',action))).status,401);
    assert.equal((await PATCH(make('PATCH',action,cookie,'https://attacker.example'))).status,403);
    assert.equal((await PATCH(make('PATCH',{...action,version:0},cookie))).status,409);
    const deleted=await (await PATCH(make('PATCH',action,cookie))).json();
    assert.equal(deleted.version,2);assert.ok(deleted.deletedAt);
    const publicPages=await (await GET(new Request(url))).json();
    assert.equal(publicPages.some((p:{id:string})=>p.id===page.id),false);
    assert.equal((await GET(new Request(url+'?trash=1'))).status,401);
    const trash=await (await GET(new Request(url+'?trash=1',{headers:{cookie}}))).json();
    assert.equal(trash.length,1);assert.equal(trash[0].profileLink,'saved.example/page');
    assert.equal((await PUT(make('PUT',{...page,version:2},cookie))).status,409);
    assert.equal((await PUT(make('PUT',deleted,cookie))).status,400);
    assert.equal((await PATCH(make('PATCH',{id:page.id,version:2,action:'restore'},cookie))).status,200);
    const restored=(await (await GET(new Request(url))).json()).find((p:{id:string})=>p.id===page.id);
    assert.equal(restored.name,'Saved page');assert.equal(restored.version,3);assert.equal(restored.profileLink,'saved.example/page');
    assert.equal((await PATCH(make('PATCH',action,cookie))).status,409);
  }finally{process.chdir(cwd);delete process.env.EDITOR_PASSWORD;delete process.env.EDITOR_SESSION_SECRET;await rm(dir,{recursive:true,force:true})}
});
