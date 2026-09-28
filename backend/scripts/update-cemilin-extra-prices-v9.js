'use strict';
const fs=require('node:fs');
const path=require('node:path');
// Preserve product IDs, inventory, carts and historical order price snapshots.
const EXTRA_PRICES_V9=Object.freeze({'BAS-150-EXT':18000,'MAK-150-EXT':18000});
async function updateExtraPrices(pool,backupFile){
 if(!backupFile||!path.isAbsolute(backupFile)||fs.existsSync(backupFile))throw new Error('Sediakan path backup JSON absolut yang belum ada.');
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();
  const [rows]=await conn.query('SELECT id,sku,price,variant,unit,stock FROM products WHERE sku IN (?,?) FOR UPDATE',Object.keys(EXTRA_PRICES_V9));
  if(rows.length!==2||rows.some(row=>row.unit!=='PCS'||!/Extra Pedas/i.test(row.variant))){throw new Error('SKU Extra Pedas kemasan tidak lengkap atau varian berubah; tidak ada harga yang diubah.');}
  const changes=rows.map(p=>({...p,new_price:EXTRA_PRICES_V9[p.sku]}));
  fs.mkdirSync(path.dirname(backupFile),{recursive:true});
  fs.writeFileSync(backupFile,JSON.stringify({created_at:new Date().toISOString(),changes},null,2),{flag:'wx'});
  for(const p of changes)await conn.query('UPDATE products SET price=? WHERE id=? AND sku=?',[p.new_price,p.id,p.sku]);
  await conn.commit();
  console.log(`[OK] Harga Extra Pedas kemasan: ${changes.map(p=>p.sku+' Rp'+p.price+' -> Rp'+p.new_price).join(', ')}`);
  console.log(`[BACKUP HARGA] ${backupFile}`);
  return changes;
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
if(require.main===module){require('dotenv').config({path:path.resolve(__dirname,'../.env')});const {pool}=require('../src/db');updateExtraPrices(pool,process.argv[2]).catch(error=>{console.error('[ERROR] Update harga:',error.message);process.exitCode=1;}).finally(()=>pool.end());}
module.exports={EXTRA_PRICES_V9,updateExtraPrices};
