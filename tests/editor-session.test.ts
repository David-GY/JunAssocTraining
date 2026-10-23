import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEditorToken,isEditorToken,checkPassword,sameOrigin} from '../lib/editor-session.ts';

const config={password:'workshop-test-password',secret:'a'.repeat(48)};
test('shared-password editing needs no user identity and rejects incorrect passwords',()=>{
  assert.equal(checkPassword('workshop-test-password',config),true);
  assert.equal(checkPassword('incorrect',config),false);
  assert.equal(checkPassword('',config),false);
});
test('editor sessions expire, reject tampering, and are invalid after password rotation',()=>{
  const now=1_800_000_000_000;
  const token=createEditorToken(config,now);
  assert.equal(isEditorToken(token,config,now+1000),true);
  assert.equal(isEditorToken(token+'x',config,now),false);
  assert.equal(isEditorToken(token,config,now+9*60*60*1000),false);
  assert.equal(isEditorToken(token,{...config,password:'changed-password'},now),false);
  assert.equal(isEditorToken(undefined,config,now),false);
  assert.equal(isEditorToken(token,null,now),false);
});
test('same-origin checks use the actual host through the Next.js server proxy',()=>{
  assert.equal(sameOrigin(new Request('http://localhost:5173/api/editor',{headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','x-forwarded-proto':'http'}})),true);
  assert.equal(sameOrigin(new Request('http://localhost:5173/api/editor',{headers:{host:'workshop.example',origin:'https://attacker.example','x-forwarded-proto':'https'}})),false);
});
