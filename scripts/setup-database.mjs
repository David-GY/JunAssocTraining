import {readFile} from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';
import {validProfile} from '../app/profiles.ts';
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL before setting up production storage.');
const sql=neon(process.env.DATABASE_URL);
await sql.query(await readFile(new URL('../migrations/001_profiles.sql',import.meta.url),'utf8'));
console.log('Company profile table is ready. No user tables are created.');
if(process.argv[2]){
  const records=JSON.parse(await readFile(process.argv[2],'utf8'));
  if(!Array.isArray(records)||!records.every(validProfile))throw Error('Import must be an exported array of valid company profiles.');
  let count=0;
  for(const profile of records){
    const rows=await sql.query('INSERT INTO engage_profiles(id,data,version) VALUES($1,$2::jsonb,$3) ON CONFLICT(id) DO NOTHING RETURNING id',[profile.id,JSON.stringify(profile),Math.max(1,profile.version)]);
    count+=rows.length;
  }
  console.log(`Imported ${count} profiles. Existing saved profiles were preserved.`);
}
