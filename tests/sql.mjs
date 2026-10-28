import { ClubDatabase } from '../lib/storage.mjs';
import path from 'node:path';
const state = process.env.HL_TEST_STATE_DIR;
if (!state?.startsWith('work/integration-state')) throw new Error('Use the isolated test runner.');
const db = new ClubDatabase(path.resolve(state, 'club.sqlite'));
try { console.log(JSON.stringify([{ results: db.connection.prepare(process.argv[2]).all() }])); }
finally { db.close(); }
