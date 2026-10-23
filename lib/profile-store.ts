import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {initialProfiles,type Profile} from '../app/profiles.ts';
export type ProfileStore={list:()=>Promise<Profile[]>;save:(profile:Profile)=>Promise<Profile|null>};
function merged(records:Profile[]):Profile[]{
  const defaults=new Set(initialProfiles.map(p=>p.id));
  return [...initialProfiles.map(p=>records.find(r=>r.id===p.id)||p),...records.filter(r=>!defaults.has(r.id))];
}
// Development only. Vercel must use durable Postgres, never its filesystem.
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
