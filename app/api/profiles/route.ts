import {validProfile,MAX_PROFILE_BYTES} from '../../profiles.ts';
import {hasEditorAccess,sameOrigin} from '../../../lib/editor-session.ts';
import {profileStore} from '../../../lib/profile-store.ts';
import {readLimitedJson,RequestBodyError} from '../../../lib/request-json.ts';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){
  try{
    const trash=request&&new URL(request.url).searchParams.get('trash')==='1';
    if(trash&&!hasEditorAccess(request))return Response.json({error:'Unlock editing to view Trash.'},{status:401,headers});
    const profiles=(await (await profileStore()).list()).filter(p=>trash?!!p.deletedAt:!p.deletedAt);
    // Stream picture-rich lists instead of buffering one large Vercel response.
    const encoder=new TextEncoder();let index=0,started=false;
    const body=new ReadableStream({pull(controller){
      if(!started){controller.enqueue(encoder.encode('['));started=true;return}
      if(index<profiles.length){controller.enqueue(encoder.encode((index?',':'')+JSON.stringify(profiles[index++])))}
      else{controller.enqueue(encoder.encode(']'));controller.close()}
    }});
    return new Response(body,{headers:{...headers,'Content-Type':'application/json'}});
  }catch{return Response.json({error:'Profiles could not load. Please refresh or try again.'},{status:503,headers})}
}
export async function PUT(request:Request){
  if(!hasEditorAccess(request))return Response.json({error:'Unlock editing to save this profile.'},{status:401,headers});
  if(!sameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403,headers});
  let profile;
  try{profile=await readLimitedJson(request,MAX_PROFILE_BYTES)}
  catch(error){return Response.json({error:error instanceof RequestBodyError&&error.status===413?'Profile is too large. Remove a few pictures and try again.':'Invalid profile.'},{status:error instanceof RequestBodyError?error.status:400,headers})}
  if(!validProfile(profile))return Response.json({error:'Check the profile fields, profile address, and pictures. A company name is required.'},{status:400,headers});
  if(profile.deletedAt!==undefined)return Response.json({error:'Use Trash to delete or restore pages.'},{status:400,headers});
  try{
    const store=await profileStore();
    if((await store.list()).find(p=>p.id===profile.id)?.deletedAt)return Response.json({error:'This page is in Trash. Restore it before editing.'},{status:409,headers});
    const saved=await store.save(profile);
    if(!saved)return Response.json({error:'Someone else updated this profile. Copy your draft, close the editor, and reload before trying again.'},{status:409,headers});
    return Response.json(saved,{headers});
  }catch{return Response.json({error:'Changes could not be saved. Your draft is still here; please try again.'},{status:503,headers})}
}

export async function PATCH(request:Request){
  if(!hasEditorAccess(request))return Response.json({error:'Unlock editing to manage pages.'},{status:401,headers});
  if(!sameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403,headers});
  let input;
  try{input=await readLimitedJson(request,1024)}catch{return Response.json({error:'Invalid request.'},{status:400,headers})}
  const data=input as {id?:unknown;version?:unknown;action?:unknown}|null;
  if(!data||typeof data.id!=='string'||!Number.isInteger(data.version)||!['delete','restore'].includes(String(data.action)))return Response.json({error:'Invalid page action.'},{status:400,headers});
  try{
    const store=await profileStore();
    const current=(await store.list()).find(p=>p.id===data.id);
    if(!current)return Response.json({error:'Page not found.'},{status:404,headers});
    if(current.version!==data.version||!!current.deletedAt!==(data.action==='restore'))return Response.json({error:'This page changed. Refresh and try again.'},{status:409,headers});
    const saved=await store.save({...current,deletedAt:data.action==='delete'?new Date().toISOString():undefined});
    if(!saved)return Response.json({error:'This page changed. Refresh and try again.'},{status:409,headers});
    return Response.json(saved,{headers});
  }catch{return Response.json({error:'Page could not be updated. Try again.'},{status:503,headers})}
}
