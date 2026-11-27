// Telefon xotirasi (SQLite): barcha operatsiyalar shu yerda saqlanadi
import * as SQLite from 'expo-sqlite';
const db=SQLite.openDatabaseSync('hisobpro.db');
db.execSync(`CREATE TABLE IF NOT EXISTS ops(id TEXT PRIMARY KEY,ts INTEGER,j TEXT,synced INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT);`);
export const addOp=(o,s=0)=>db.runSync('INSERT OR IGNORE INTO ops(id,ts,j,synced) VALUES(?,?,?,?)',[o.id,o.ts,JSON.stringify(o),s]).changes>0;
export const allOps=()=>db.getAllSync('SELECT j FROM ops ORDER BY ts,id').map(r=>JSON.parse(r.j));
export const unsynced=()=>db.getAllSync('SELECT j FROM ops WHERE synced=0 ORDER BY ts').map(r=>JSON.parse(r.j));
export const markSynced=id=>db.runSync('UPDATE ops SET synced=1 WHERE id=?',[id]);
export const kvGet=k=>db.getFirstSync('SELECT v FROM kv WHERE k=?',[k])?.v;
export const kvSet=(k,v)=>db.runSync('INSERT OR REPLACE INTO kv(k,v) VALUES(?,?)',[k,String(v)]);
