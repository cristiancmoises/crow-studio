import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {createHmac} from 'node:crypto';

const hour=3600000,day=24*hour;
export function createDemoBudget(dataDir,secret) {
  mkdirSync(dataDir,{recursive:true,mode:0o700});
  const path=join(dataDir,'demo-quota.sqlite'),db=new DatabaseSync(path);
  chmodSync(path,0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS reservations (client TEXT NOT NULL,createdAt INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS reservation_time ON reservations(createdAt);`);
  return {
    reserve(address,now=Date.now()) {
      const client=createHmac('sha256',secret).update(address).digest('hex');
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM reservations WHERE createdAt<=?').run(now-day);
        const checks=[
          {limit:2,period:hour,rows:db.prepare('SELECT createdAt FROM reservations WHERE client=? AND createdAt>? ORDER BY createdAt').all(client,now-hour)},
          {limit:8,period:hour,rows:db.prepare('SELECT createdAt FROM reservations WHERE createdAt>? ORDER BY createdAt').all(now-hour)},
          {limit:30,period:day,rows:db.prepare('SELECT createdAt FROM reservations ORDER BY createdAt').all()}
        ];
        const waits=checks.filter(c=>c.rows.length>=c.limit).map(c=>Math.max(1,Math.ceil((c.rows[0].createdAt+c.period-now)/1000)));
        if(waits.length){db.exec('COMMIT');return {allowed:false,retryAfter:Math.max(...waits)};}
        db.prepare('INSERT INTO reservations(client,createdAt) VALUES(?,?)').run(client,now);
        db.exec('COMMIT');return {allowed:true};
      } catch(error){db.exec('ROLLBACK');throw error;}
    },
    close:()=>db.close()
  };
}
