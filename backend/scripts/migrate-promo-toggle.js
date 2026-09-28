require('dotenv').config();
const {pool}=require('../src/db');
(async()=>{
  try{
    const [[schema]]=await pool.query('SELECT DATABASE() AS name');
    if(!schema?.name)throw new Error('Nama database tidak ditemukan.');
    const [[col]]=await pool.query(`SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_settings' AND COLUMN_NAME='promo_enabled'`);
    if(Number(col.total)===0){
      await pool.query('ALTER TABLE store_settings ADD COLUMN promo_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER qris_filename');
      console.log('[DB] Kolom promo_enabled dibuat (default aktif; nominal diskon lama dipertahankan).');
    }else console.log('[DB] Kolom promo_enabled sudah ada; data tidak diubah.');
    const [[s]]=await pool.query('SELECT promo_enabled, min_qty_tier1,discount_tier1,min_qty_tier2,discount_tier2 FROM store_settings WHERE id=1');
    if(!s)throw new Error('Baris pengaturan toko id=1 tidak ditemukan.');
    console.log('[DB] Status promo:',Number(s.promo_enabled)===1?'Aktif':'Nonaktif');
    console.log('[DB] Aturan tersimpan:',s.min_qty_tier1,'pcs / Rp'+s.discount_tier1,';',s.min_qty_tier2,'pcs / Rp'+s.discount_tier2);
  }catch(error){console.error('[DB ERROR]',error.message);process.exitCode=1;}
  finally{await pool.end();}
})();
