/** Full production Next.js server with a disposable SQLite database and private upload directory. */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { migrate } from './database.mjs';
import { ClubDatabase } from '../lib/storage.mjs';
const run = (args, env = process.env) => {
  const r = spawnSync(process.execPath, args, { stdio: 'pipe', encoding: 'utf8', env });
  if (r.status !== 0) throw new Error(r.stdout + '\n' + r.stderr);
};
mkdirSync('work', { recursive: true });
if (process.env.HL_SKIP_BUILD !== '1') { run(['node_modules/next/dist/bin/next','build','--webpack']); run(['scripts/prepare-standalone.mjs']); }
const state = 'work/integration-state-vps';
rmSync(state, { recursive: true, force: true });
process.env.DATA_DIR = path.resolve(state);
process.env.HL_TEST_STATE_DIR = state;
process.env.HL_TEST_FIXTURES = '1';
process.env.HL_TEST_ADMIN_PASSWORD = 'QA-Admin-Only-2026!';
process.env.HL_TEST_STAFF_PASSWORD = 'QA-Staff-Only-2026!';
migrate();
run(['scripts/seed.mjs','--reset']);
run(['scripts/seed-training.mjs']);
const db = new ClubDatabase(path.resolve(state, 'club.sqlite'));
db.exec(readFileSync('work/seed.sql','utf8')); db.close();
const port = await new Promise(resolve => { const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));}); });
const base='http://127.0.0.1:'+port;
// A production cookie is always Secure; the tests explicitly forward it over loopback only.
const env={...process.env, NODE_ENV:'production', APP_ORIGIN:base, NEXT_TELEMETRY_DISABLED:'1',PORT:String(port),HOSTNAME:'127.0.0.1'};
const log=openSync('work/integration-server.log','w');
let server=spawn(process.execPath,['.next/standalone/server.js'],{env,stdio:['ignore',log,log]});
const stop=()=>server.kill('SIGTERM'); process.on('SIGINT',stop);process.on('SIGTERM',stop);
try {
  let ready=false;
  for(let i=0;i<100;i++) {
    if(server.exitCode!==null) break;
    try {ready=(await fetch(base+'/api/site')).ok;} catch {}
    if(ready) break;
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!ready) throw new Error('QA server failed:\n'+readFileSync('work/integration-server.log','utf8'));
  console.log('Isolated production QA server: '+base);
  writeFileSync('work/integration-url.txt',base);
  run(['tests/integration.mjs'],{...env,HL_TEST_URL:base});
  console.log('162 API checks passed against the VPS runtime.');
  const before=await (await fetch(base+'/api/site')).json();
  await new Promise(resolve=>{server.once('exit',resolve);stop();});
  server=spawn(process.execPath,['.next/standalone/server.js'],{env,stdio:['ignore',log,log]});
  let after;
  for(let i=0;i<100;i++) {
    try { const r=await fetch(base+'/api/site');if(r.ok){after=await r.json();break;} } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!after || JSON.stringify(after)!==JSON.stringify(before)) throw new Error('Production restart did not preserve public data');
  console.log('Production process restart preserved database content and settings.');
} finally { stop();closeSync(log); }
