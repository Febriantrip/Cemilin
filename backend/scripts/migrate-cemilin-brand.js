require('dotenv').config();
const {pool}=require('../src/db');
(async()=>{
 try{
  const [result]=await pool.query("UPDATE store_settings SET store_name='CemilIn' WHERE id=1 AND store_name<>'CemilIn'");
  console.log(result.affectedRows?'[OK] Nama toko diperbarui menjadi CemilIn.':'[OK] Nama toko sudah CemilIn, tidak perlu diubah.');
 }catch(error){console.error('[ERROR] Rebrand MySQL:',error.message);process.exitCode=1;}
 finally{await pool.end();}
})();
