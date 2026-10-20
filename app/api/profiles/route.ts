import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {initialProfiles,validProfile} from '../../profiles';
export const dynamic='force-dynamic';
export async function GET(){
try{const rows=await env.DB!.prepare('SELECT id,data,version FROM profiles').all<{id:string,data:string,version:number}>();const records=rows.results.map(r=>({...JSON.parse(r.data),version:r.version}));const ids=new Set(initialProfiles.map(p=>p.id));return Response.json([...initialProfiles.map(p=>records.find(r=>r.id===p.id)||p),...records.filter(r=>!ids.has(r.id))],{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Profiles could not load. Please refresh or try again.'},{status:503});}
}
export async function PUT(request:Request){
if(!await getChatGPTUser())return Response.json({error:'Sign in to edit workshop profiles.'},{status:401});
if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid request origin.'},{status:403});
let p;try{if(Number(request.headers.get('content-length'))>180000)return Response.json({error:'Profile is too large.'},{status:413});p=await request.json();}catch{return Response.json({error:'Invalid profile.'},{status:400});}
if(!validProfile(p))return Response.json({error:'Check the profile fields. A company name is required.'},{status:400});
try{const data=JSON.stringify(p);let result;if(p.version===0){result=await env.DB!.prepare('INSERT INTO profiles(id,data,version) VALUES(?,?,1) ON CONFLICT(id) DO NOTHING').bind(p.id,data).run();}else{result=await env.DB!.prepare('UPDATE profiles SET data=?,version=version+1 WHERE id=? AND version=?').bind(data,p.id,p.version).run();}if(!result.meta.changes)return Response.json({error:'Someone else updated this profile. Copy your draft, close the editor, and reload the page before trying again.'},{status:409});return Response.json({...p,version:p.version+1});}catch{return Response.json({error:'Changes could not be saved. Your draft is still here; please try again.'},{status:503});}
}

