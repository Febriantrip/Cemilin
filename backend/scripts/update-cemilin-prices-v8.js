'use strict';
// V8: fixed retail prices approved by the owner; update live products by SKU only.
// Existing orders retain their snapshot unit_price, discounts and totals.
const fs = require('node:fs');
const path = require('node:path');

const NEW_PRICES = Object.freeze({
  'BAS-150-ORI': 16000, 'BAS-150-PED': 17000, 'BAS-150-EXT': 17000,
  'MAK-150-ORI': 16000, 'MAK-150-PED': 17000, 'MAK-150-EXT': 17000,
  'USU-200-PED': 23000, 'KRI-150-ORI': 13000,
  'BAS-KG-ORI': 65000, 'BAS-KG-PED': 67000, 'BAS-KG-EXT': 69000,
  'MAK-KG-ORI': 65000, 'MAK-KG-PED': 67000, 'MAK-KG-EXT': 69000,
  'USU-KG-PED': 125000, 'KRI-KG-ORI': 79000,
});

async function updatePrices(pool, backupFile) {
  if (!backupFile || !path.isAbsolute(backupFile)) throw new Error('Gunakan lokasi backup JSON absolut dari installer.');
  if (fs.existsSync(backupFile)) throw new Error(`Backup sudah ada, gunakan direktori baru: ${backupFile}`);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const skuList = Object.keys(NEW_PRICES);
    const [products] = await conn.query(
      `SELECT id,sku,name,variant,unit,size_label,price FROM products WHERE sku IN (${skuList.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`, skuList,
    );
    if (!products.length) throw new Error('Tidak ada SKU CemilIn yang cocok. Harga tidak diubah; periksa database .env.');
    const missing = skuList.filter(sku => !products.some(p => p.sku === sku));
    const changes = products.map(p => ({
      ...p,
      new_price: NEW_PRICES[p.sku],
      // Legacy SKU KRI-150-ORI stays unchanged to preserve existing product identity.
      new_variant: p.sku === 'KRI-150-ORI' && p.variant === 'Original' ? 'Pedas' : p.variant,
    }));
    fs.mkdirSync(path.dirname(backupFile), {recursive: true});
    fs.writeFileSync(backupFile, JSON.stringify({created_at:new Date().toISOString(),changes,missing_skus:missing}, null, 2), {flag:'wx'});
    for (const p of changes) {
      await conn.query('UPDATE products SET price=?,variant=? WHERE id=? AND sku=?',
        [p.new_price,p.new_variant,p.id,p.sku]);
    }
    await conn.commit();
    console.log(`[OK] ${changes.length} harga produk diperbarui tanpa mengubah stok atau pesanan lama.`);
    for(const p of changes)console.log(`[PRICE] ${p.sku}: Rp${p.price} -> Rp${p.new_price}${p.variant !== p.new_variant ? `, rasa ${p.new_variant}` : ''}`);
    if(missing.length)console.warn(`[INFO] SKU tidak ada, tidak dibuat produk baru: ${missing.join(', ')}`);
    console.log(`[BACKUP DB] ${backupFile}`);
    return {changes,missing};
  } catch(error) {
    await conn.rollback();
    throw error;
  } finally {conn.release();}
}

if (require.main === module) {
  const backupFile = process.argv[2];
  const {pool} = require('../src/db');
  updatePrices(pool, backupFile)
    .catch(e => {console.error('[ERROR] Migrasi harga V8:',e.message);process.exitCode=1;})
    .finally(() => pool.end());
}
module.exports = {NEW_PRICES,updatePrices};
