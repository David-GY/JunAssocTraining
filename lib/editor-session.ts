import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export type EditorConfig={password:string;secret:string};
export const SESSION_SECONDS=8*60*60;
export function editorConfig():EditorConfig|null {
  const password=process.env.EDITOR_PASSWORD,secret=process.env.EDITOR_SESSION_SECRET;
  return password&&password!=='[SENSITIVE]'&&secret&&secret.length>=32?{password,secret}:null;
}
function signature(value:string,config:EditorConfig){
  const key=createHmac('sha256',config.secret).update(config.password).digest();
  return createHmac('sha256',key).update(value).digest('hex');
}
export function checkPassword(value:unknown,config:EditorConfig):boolean {
  if(typeof value!=='string'||value.length>256)return false;
  return timingSafeEqual(createHash('sha256').update(value).digest(),createHash('sha256').update(config.password).digest());
}
export function createEditorToken(config:EditorConfig,now=Date.now()):string {
  const payload=(Math.floor(now/1000)+SESSION_SECONDS)+'.'+randomBytes(16).toString('hex');
  return payload+'.'+signature(payload,config);
}
export function isEditorToken(token:string|undefined,config:EditorConfig|null,now=Date.now()):boolean {
  if(!token||!config||!/^\d{10,12}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token))return false;
  const [expires,nonce,mac]=token.split('.');const seconds=Math.floor(now/1000);
  if(Number(expires)<=seconds||Number(expires)>seconds+SESSION_SECONDS)return false;
  return timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(signature(expires+'.'+nonce,config),'hex'));
}
const production=()=>process.env.NODE_ENV==='production'||process.env.VERCEL==='1';
const cookieName=()=>production()?'__Host-engage_editor':'engage_editor';
export function editorCookie(token:string,clear=false):string {
  return `${cookieName()}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:SESSION_SECONDS}${production()?'; Secure':''}`;
}
export function hasEditorAccess(request:Request):boolean {
  const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName()+'='))?.slice(cookieName().length+1);
  return isEditorToken(token,editorConfig());
}
export function sameOrigin(request:Request):boolean {
  try{
    const url=new URL(request.url);
    const protocol=request.headers.get('x-forwarded-proto')?.split(',')[0].trim()||url.protocol.slice(0,-1);
    if(protocol!=='http'&&protocol!=='https')return false;
    const host=request.headers.get('host')||url.host;
    return new URL(request.headers.get('origin')||'').origin===new URL(protocol+'://'+host).origin;
  }catch{return false}
}
