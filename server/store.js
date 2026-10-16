import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function createStore(dataDir) {
  mkdirSync(dataDir,{recursive:true,mode:0o700});
  const path=join(dataDir,'studio.sqlite'),db=new DatabaseSync(path);
  chmodSync(path,0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,name TEXT NOT NULL,document TEXT NOT NULL,preview TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,favorite INTEGER NOT NULL DEFAULT 0,updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  const record=row=>row?({...row,document:JSON.parse(row.document),favorite:Boolean(row.favorite),preview:JSON.parse(row.preview)}):null;
  const preview=document=>JSON.stringify({...document.pages[0],elements:document.pages[0].elements.map(e=>e.type==='image'?{...e,type:'rect',fill:'#55747a',src:undefined}:e)});
  return {
    health:()=>db.prepare('SELECT 1 AS ok').get().ok===1,
    list:()=>db.prepare('SELECT id,name,preview,revision,favorite,updatedAt FROM projects ORDER BY updatedAt DESC LIMIT 500').all().map(r=>({...r,preview:JSON.parse(r.preview),favorite:Boolean(r.favorite)})),
    get:id=>record(db.prepare('SELECT * FROM projects WHERE id=?').get(id)),
    create(document) {
      const id=randomUUID(),updatedAt=new Date().toISOString();
      db.prepare('INSERT INTO projects(id,name,document,preview,updatedAt) VALUES(?,?,?,?,?)').run(id,document.name,JSON.stringify(document),preview(document),updatedAt);
      return this.get(id);
    },
    update(id,document,revision,favorite) {
      const result=db.prepare('UPDATE projects SET name=?,document=?,preview=?,revision=revision+1,favorite=COALESCE(?,favorite),updatedAt=? WHERE id=? AND revision=?')
        .run(document.name,JSON.stringify(document),preview(document),favorite===undefined?null:Number(favorite),new Date().toISOString(),id,revision);
      return result.changes?this.get(id):null;
    },
    remove:(id,revision)=>db.prepare('DELETE FROM projects WHERE id=? AND revision=?').run(id,revision).changes>0,
    getBrand:()=>JSON.parse(db.prepare("SELECT value FROM settings WHERE key='brand'").get()?.value??'{"name":"Crow Studio","colors":["#69e2da","#111416","#f4f3eb","#c8aff0","#eaa17c"],"fontFamily":"Arial"}'),
    setBrand(brand){db.prepare("INSERT INTO settings(key,value) VALUES('brand',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(brand));return brand;},
    close:()=>db.close()
  };
}
