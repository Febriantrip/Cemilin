require('dotenv').config();
const {pool}=require('../src/db');
async function main(){
 try{
  const [[db]]=await pool.query('SELECT DATABASE() AS db');
  if(!db?.db)throw new Error('Database MySQL belum dikonfigurasi.');
  await pool.query(`CREATE TABLE IF NOT EXISTS cart_notes (
   user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
   note VARCHAR(500) NOT NULL DEFAULT '',
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log(`[OK] Migrasi catatan umum siap di database ${db.db}.`);
 }finally{await pool.end();}
}
main().catch(e=>{console.error('[ERROR] Migrasi catatan umum:',e.message);process.exitCode=1;});
