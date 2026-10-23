import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST,DELETE} from '../app/api/editor/route.ts';
import {PUT} from '../app/api/profiles/route.ts';
import {readLimitedJson,RequestBodyError} from '../lib/request-json.ts';

test('anonymous shared-password unlock, cookie access, and lock need no user headers',async()=>{
  process.env.EDITOR_PASSWORD='test-editor-password';process.env.EDITOR_SESSION_SECRET='s'.repeat(48);
  const url='https://workshop.example/api/editor';
  const request=(password:string,origin='https://workshop.example')=>new Request(url,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({password})});
  assert.equal((await POST(request('test-editor-password','https://attacker.example'))).status,403);
  assert.equal((await POST(request('incorrect'))).status,401);
  const unlocked=await POST(request('test-editor-password'));
  assert.equal(unlocked.status,200);
  const cookie=unlocked.headers.get('set-cookie')!;
  assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
  assert.deepEqual(await (await GET(new Request(url,{headers:{cookie}}))).json(),{unlocked:true,configured:true});
  assert.equal((await PUT(new Request('https://workshop.example/api/profiles',{method:'PUT',headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'fake@example.com',origin:'https://workshop.example'},body:'{}'}))).status,401);
  assert.equal((await PUT(new Request('https://workshop.example/api/profiles',{method:'PUT',headers:{cookie,origin:'https://attacker.example'},body:'{}'}))).status,403);
  assert.equal((await PUT(new Request('https://workshop.example/api/profiles',{method:'PUT',headers:{cookie,origin:'https://workshop.example'},body:'{}'}))).status,400);
  const locked=await DELETE(new Request(url,{method:'DELETE',headers:{cookie,origin:'https://workshop.example'}}));
  assert.match(locked.headers.get('set-cookie')!,/Max-Age=0/);
  delete process.env.EDITOR_PASSWORD;delete process.env.EDITOR_SESSION_SECRET;
});

test('request size is bounded even without a content-length header',async()=>{
  let cancelled=false;
  const body=new ReadableStream({pull(controller){controller.enqueue(new TextEncoder().encode('x'.repeat(100)))},cancel(){cancelled=true}});
  const request=new Request('https://workshop.example',{method:'POST',body,duplex:'half'} as RequestInit);
  await assert.rejects(()=>readLimitedJson(request,50),error=>error instanceof RequestBodyError&&error.status===413);
  assert.equal(cancelled,true);
});
