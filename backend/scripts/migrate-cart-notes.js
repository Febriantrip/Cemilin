// Additive, repeatable migration. Existing customers, stock, orders, and notes remain intact.
const {pool}=require('../src/db');
async function addNoteColumn(table){
 const [found]=await pool.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,'note']);
 if(found.length){console.log('[OK] '+table+'.note sudah tersedia.');return;}
 await pool.query("ALTER TABLE `"+table+"` ADD COLUMN `note` VARCHAR(500) NOT NULL DEFAULT ''");
 console.log('[OK] '+table+'.note berhasil dibuat.');
}
(async()=>{
 try{
  await addNoteColumn('cart_items');
  await addNoteColumn('order_items');
  console.log('[SUKSES] Migrasi catatan per item selesai.');
 }catch(e){console.error('[ERROR] Migrasi catatan gagal:',e.message);process.exitCode=1;}
 finally{await pool.end();}
})();
