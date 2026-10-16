import {DatabaseSync,backup} from 'node:sqlite';
import {join} from 'node:path';
const destination=process.argv[2]||'/tmp/crow-studio-backup.sqlite';
const db=new DatabaseSync(join(process.env.DATA_DIR||'data','studio.sqlite'),{readOnly:true});
try{await backup(db,destination);console.log('Backup SQLite consistente criado.');}finally{db.close();}
