import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { ClubDatabase, getBucket, FileRangeError } from '../lib/storage.mjs';
import { migrate } from '../scripts/database.mjs';

test('SQLite, private file storage and initialization on a VPS',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'hoan-lao-storage-'));
  const previous=process.env.DATA_DIR;
  process.env.DATA_DIR=root;
  const db=new ClubDatabase(path.join(root,'test.sqlite'));
  try {
    await t.test('batch is atomic and rolls back every write on a unique conflict',async()=>{
      db.exec('CREATE TABLE example(id TEXT PRIMARY KEY, value TEXT)');
      await assert.rejects(db.batch([db.prepare('INSERT INTO example VALUES(?,?)').bind('same','first'),db.prepare('INSERT INTO example VALUES(?,?)').bind('same','second')]));
      assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM example').first()).total,0);
      assert.equal((await stat(path.join(root,'test.sqlite'))).mode & 0o777,0o600);
      const [first,ignored]=await db.batch([db.prepare("INSERT OR IGNORE INTO example VALUES('same','first')"),db.prepare("INSERT OR IGNORE INTO example VALUES('same','second')")]);
      assert.equal(first.meta.changes,1);assert.equal(ignored.meta.changes,0);
    });
    await t.test('migrations are repeatable and preserve existing data',async()=>{
      migrate();const application=new ClubDatabase(path.join(root,'club.sqlite'));
      application.exec("INSERT INTO categories VALUES('Keep me','2026-01-01')");application.close();
      migrate();const reopened=new ClubDatabase(path.join(root,'club.sqlite'));
      assert.equal((await reopened.prepare('SELECT name FROM categories').first()).name,'Keep me');
      assert.equal((await reopened.prepare('SELECT COUNT(*) AS total FROM schema_migrations').first()).total,5);
      reopened.close();
    });
    const key='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg';const storage=getBucket();
    await t.test('uploaded bytes and metadata survive a storage object restart',async()=>{
      await storage.put(key,new Uint8Array([1,2,3,4,5,6]),{httpMetadata:{contentType:'image/jpeg'}});
      const file=await getBucket().get(key);const headers=new Headers();file.writeHttpMetadata(headers);
      assert.equal(headers.get('content-type'),'image/jpeg');assert.equal(file.size,6);
      assert.deepEqual(new Uint8Array(await new Response(file.body).arrayBuffer()),new Uint8Array([1,2,3,4,5,6]));
      assert.equal((await stat(path.join(root,'uploads',key))).mode & 0o777,0o600);
    });
    await t.test('ranges, suffixes, stale If-Range and invalid ranges are handled',async()=>{
      let file=await storage.get(key,{range:new Headers({Range:'bytes=1-3'})});
      assert.deepEqual(file.range,{offset:1,length:3});assert.deepEqual([...new Uint8Array(await new Response(file.body).arrayBuffer())],[2,3,4]);
      file=await storage.get(key,{range:new Headers({Range:'bytes=-2'})});
      assert.deepEqual([...new Uint8Array(await new Response(file.body).arrayBuffer())],[5,6]);
      file=await storage.get(key,{range:new Headers({Range:'bytes=1-3','If-Range':'stale'})});
      assert.equal(file.range,undefined);await file.body.cancel();
      await assert.rejects(storage.get(key,{range:new Headers({Range:'bytes=100-200'})}),FileRangeError);
      await assert.rejects(storage.get('../outside.jpg'));
    });
    await t.test('bootstrap rejects default passwords and does not reset credentials',async()=>{
      const env={...process.env,DATA_DIR:path.join(root,'bootstrap'),NODE_ENV:'production',APP_ORIGIN:'https://club.example.com',ADMIN_USERNAME:'owner',ADMIN_PASSWORD:'HoanLao@2026!'};
      let result=spawnSync(process.execPath,['scripts/setup-vps.mjs'],{env,encoding:'utf8'});assert.notEqual(result.status,0);
      env.ADMIN_PASSWORD='Unique-VPS-Password-5678!';result=spawnSync(process.execPath,['scripts/setup-vps.mjs'],{env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
      const initial=new ClubDatabase(path.join(env.DATA_DIR,'club.sqlite'));
      const original=await initial.prepare("SELECT username,password_hash FROM accounts WHERE role='admin'").first();initial.close();
      env.ADMIN_PASSWORD='Different-Password-5678!';env.ADMIN_USERNAME='changed';result=spawnSync(process.execPath,['scripts/setup-vps.mjs'],{env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
      const again=new ClubDatabase(path.join(env.DATA_DIR,'club.sqlite'));
      assert.deepEqual(await again.prepare("SELECT username,password_hash FROM accounts WHERE role='admin'").first(),original);
      assert.equal((await again.prepare('SELECT COUNT(*) AS total FROM content').first()).total,1);again.close();
    });
    await t.test('backup includes a consistent database and private file bytes',async()=>{
      const destination=path.join(root,'backups');
      const result=spawnSync(process.execPath,['scripts/backup.mjs'],{env:{...process.env,BACKUP_DIR:destination},encoding:'utf8'});assert.equal(result.status,0,result.stderr);
      const archive=result.stdout.match(/Backup created: (.+\.tar\.gz)/)[1];
      const files=spawnSync('tar',['-tzf',archive],{encoding:'utf8'});assert.equal(files.status,0,files.stderr);assert.ok(files.stdout.includes('club.sqlite'));assert.ok(files.stdout.includes(key));
      const restore=await mkdtemp(path.join(root,'restore-'));
      const extracted=spawnSync('tar',['-xzf',archive,'-C',restore],{encoding:'utf8'});assert.equal(extracted.status,0,extracted.stderr);
      const recovered=new ClubDatabase(path.join(restore,'club.sqlite'));
      assert.equal((await recovered.prepare('SELECT name FROM categories').first()).name,'Keep me');recovered.close();
      assert.deepEqual([...await readFile(path.join(restore,'uploads',key))],[1,2,3,4,5,6]);
    });
    await t.test('file deletion removes both content and metadata',async()=>{
      await storage.delete(key);assert.equal(await storage.get(key),null);
      await assert.rejects(readFile(path.join(root,'uploads',key+'.json')),{code:'ENOENT'});
    });
  } finally { db.close();if(previous===undefined) delete process.env.DATA_DIR;else process.env.DATA_DIR=previous;await rm(root,{recursive:true,force:true}); }
});
