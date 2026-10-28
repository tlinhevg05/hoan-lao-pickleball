import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { pbkdf2Sync, randomUUID } from 'node:crypto';
import { migrate } from './database.mjs';
import { ClubDatabase, databasePath } from '../lib/storage.mjs';
if (existsSync('.env')) loadEnvFile('.env');
if (process.env.NODE_ENV !== 'production' && existsSync('.dev.vars')) loadEnvFile('.dev.vars');
if (process.env.NODE_ENV === 'production') {
  const url = new URL(process.env.APP_ORIGIN || '');
  if (url.protocol !== 'https:' || url.origin !== process.env.APP_ORIGIN || url.username || url.password) throw new Error('APP_ORIGIN must be the exact HTTPS website origin, without trailing slash.');
}
migrate();
const db = new ClubDatabase(databasePath());
try {
  const existing = db.connection.prepare("SELECT id FROM accounts WHERE role='admin' LIMIT 1").get();
  if (!existing) {
    const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!/^[a-z0-9._-]{3,60}$/.test(username)) throw new Error('ADMIN_USERNAME must contain 3–60 letters, digits, dots, underscores or hyphens.');
    if (!password || password.length < 12 || password.length > 128 || ['HoanLao@2026!', 'CHANGE_ME_USE_A_UNIQUE_PASSWORD'].includes(password)) throw new Error('Set a unique ADMIN_PASSWORD of 12–128 characters before first startup.');
    const salt = randomUUID();
    const hash = salt + ':' + pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    db.connection.prepare("INSERT INTO accounts(id,username,password_hash,role,disabled,created_at) VALUES(?,?,?,'admin',0,?)").run(randomUUID(), username, hash, new Date().toISOString());
    console.log('Initial admin account created. Existing credentials are never overwritten on restart.');
  }
  const settings = { clubName:'Hoàn Lão Pickleball', logoImage:'/favicon.svg', contact:'Vũ Trịnh Thanh', phone:'', contacts:[{name:'Vũ Trịnh Thanh',phone:''},{name:'',phone:''}], address:'Xã Hoàn Lão, tỉnh Quảng Trị', zaloUrl:'', facebookUrl:'', facebookName:'', sponsors:[], clubBannerImage:'/pickleball-court.jpg', demo:false };
  db.connection.prepare("INSERT OR IGNORE INTO content(id,kind,data,created_at) VALUES('settings','settings',?,?)").run(JSON.stringify(settings), new Date().toISOString());
  console.log('Database migrations applied; club data preserved.');
} finally { db.close(); }
