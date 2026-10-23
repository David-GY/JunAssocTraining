import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {initialProfiles,validProfile,type Profile} from '../app/profiles.ts';
export type ProfileStore={list:()=>Promise<Profile[]>;save:(profile:Profile)=>Promise<Profile|null>};
function merged(records:Profile[]):Profile[]{
  const defaults=new Set(initialProfiles.map(p=>p.id));
  return [...initialProfiles.map(p=>records.find(r=>r.id===p.id)||p),...records.filter(r=>!defaults.has(r.id))];
}
type BlobBackend={read:()=>Promise<{profiles:Profile[];etag:string|null}>;write:(profiles:Profile[],etag:string|null)=>Promise<boolean>};
export function createBlobStore(backend:BlobBackend):ProfileStore {
  return {
    async list(){return (await backend.read()).profiles},
    async save(profile){
      const current=await backend.read();
      const existing=current.profiles.find(p=>p.id===profile.id);
      if((existing?.version??0)!==profile.version)return null;
      const next={...profile,version:profile.version+1};
      const records=existing?current.profiles.map(p=>p.id===next.id?next:p):[...current.profiles,next];
      return await backend.write(records,current.etag)?next:null;
    },
  };
}
async function vercelBlobStore():Promise<ProfileStore>{
  const {get,head,put,BlobNotFoundError,BlobPreconditionFailedError}=await import('@vercel/blob');
  const pathname='engage/profiles.json';
  return createBlobStore({
    async read(){
      try{
        const blob=await get(pathname,{access:'private',useCache:false});
        if(!blob)return {profiles:initialProfiles,etag:null};
        if(blob.statusCode!==200||!blob.stream)throw Error('Could not read profiles.');
        const records:unknown=await new Response(blob.stream).json();
        if(!Array.isArray(records)||!records.every(validProfile))throw Error('Stored profiles are invalid.');
        return {profiles:records,etag:blob.blob.etag};
      }catch(error){if(error instanceof BlobNotFoundError)return {profiles:initialProfiles,etag:null};throw error}
    },
    async write(records,etag){
      // The GET ETag can be weak after compression. HEAD supplies the strong
      // write tag, and comparison ensures it still describes the data read.
      const strong=etag?(await head(pathname)).etag:null;
      if(strong&&strong!==etag!.replace(/^W\//,''))return false;
      try{
        await put(pathname,JSON.stringify(records),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!strong,...(strong?{ifMatch:strong}:{})});
        return true;
      }catch(error){if(error instanceof BlobPreconditionFailedError)return false;throw error}
    },
  });
}
// Development only. Vercel must use durable storage, never its filesystem.
const queues=new Map<string,Promise<unknown>>();
export function createFileStore(directory:string):ProfileStore {
  const file=path.join(directory,'profiles.json');
  async function records():Promise<Profile[]>{
    try{return JSON.parse(await readFile(file,'utf8'))}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error}
  }
  return {
    async list(){await queues.get(file)?.catch(()=>{});return merged(await records())},
    save(profile){
      const task=(queues.get(file)||Promise.resolve()).catch(()=>{}).then(async()=>{
        const all=await records();const current=all.find(p=>p.id===profile.id);
        if(current?current.version!==profile.version:profile.version!==0)return null;
        const saved={...profile,version:profile.version+1};
        const next=current?all.map(p=>p.id===profile.id?saved:p):[...all,saved];
        await mkdir(directory,{recursive:true});const temporary=file+'.tmp';
        await writeFile(temporary,JSON.stringify(next));await rename(temporary,file);return saved;
      });
      queues.set(file,task);return task;
    },
  };
}
export async function profileStore():Promise<ProfileStore>{
  if(process.env.BLOB_READ_WRITE_TOKEN)return vercelBlobStore();
  const url=process.env.DATABASE_URL;
  if(!url){
    if(process.env.NODE_ENV==='production'||process.env.VERCEL==='1')throw Error('Database is not configured.');
    return createFileStore(path.join(process.cwd(),'.local-data'));
  }
  const {neon}=await import('@neondatabase/serverless');const sql=neon(url);
  type Row={data:Profile;version:number};
  const decode=(row:Row):Profile=>({...row.data,version:row.version});
  return {
    async list(){const rows=await sql.query('SELECT data,version FROM engage_profiles ORDER BY id') as Row[];return merged(rows.map(decode))},
    async save(profile){
      const rows=await sql.query(profile.version===0
        ?'INSERT INTO engage_profiles(id,data,version) VALUES($1,$2::jsonb,1) ON CONFLICT(id) DO NOTHING RETURNING data,version'
        :'UPDATE engage_profiles SET data=$2::jsonb,version=version+1 WHERE id=$1 AND version=$3 RETURNING data,version',
        profile.version===0?[profile.id,JSON.stringify(profile)]:[profile.id,JSON.stringify(profile),profile.version]) as Row[];
      return rows[0]?decode(rows[0]):null;
    },
  };
}
