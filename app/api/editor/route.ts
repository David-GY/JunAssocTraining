import {setTimeout} from 'node:timers/promises';
import {editorConfig,hasEditorAccess,checkPassword,createEditorToken,editorCookie,sameOrigin} from '../../../lib/editor-session.ts';
import {readLimitedJson,RequestBodyError} from '../../../lib/request-json.ts';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){
  return Response.json({unlocked:hasEditorAccess(request),configured:!!editorConfig()},{headers});
}
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403,headers});
  const config=editorConfig();
  if(!config)return Response.json({error:'Editing is not available yet.'},{status:503,headers});
  try{
    const body=await readLimitedJson(request,2048) as {password?:unknown}|null;
    if(!checkPassword(body?.password,config)){
      await setTimeout(500);
      return Response.json({error:'That password did not match. Try again.'},{status:401,headers});
    }
    return Response.json({unlocked:true},{headers:{...headers,'Set-Cookie':editorCookie(createEditorToken(config))}});
  }catch(error){
    return Response.json({error:'Invalid unlock request.'},{status:error instanceof RequestBodyError?error.status:400,headers});
  }
}
export async function DELETE(request:Request){
  if(!sameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403,headers});
  return Response.json({unlocked:false},{headers:{...headers,'Set-Cookie':editorCookie('',true)}});
}
