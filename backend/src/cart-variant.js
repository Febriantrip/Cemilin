const {fail,int}=require('./utils');

function sameFamily(source,target){
 const fixed=/^(BAS|MAK|USU|KRI)-(150|200|KG)-(ORI|PED|EXT)$/i;
 const a=fixed.exec(source.sku||'');const b=fixed.exec(target.sku||'');
 if(a||b)return !!a&&!!b&&a[1].toUpperCase()===b[1].toUpperCase()&&a[2].toUpperCase()===b[2].toUpperCase();
 return source.category===target.category&&source.name.trim().toLocaleLowerCase('id-ID')===target.name.trim().toLocaleLowerCase('id-ID')&&source.unit===target.unit&&source.size_label===target.size_label;
}
function mergeNotes(sourceNote,destNote){
 const source=String(sourceNote||'').trim(),dest=String(destNote||'').trim();
 if(!source)return dest;if(!dest||source===dest)return source;
 const joined=`${dest}\n${source}`;
 if(joined.length>500)fail('Catatan kedua varian terlalu panjang untuk digabung. Ringkas salah satu catatan terlebih dahulu.');
 return joined;
}
async function swapCartVariant(pool,userId,rawFromId,rawToId){
 const fromId=int(rawFromId,1),toId=int(rawToId,1);
 if(fromId===toId)return;
 const connection=await pool.getConnection();let committed=false;
 try{
  await connection.beginTransaction();
  // Lock source/destination product rows in deterministic order to prevent conflicting swaps.
  const [products]=await connection.query('SELECT id,sku,name,variant,category,unit,size_label,stock,active FROM products WHERE id IN (?,?) ORDER BY id FOR UPDATE',[fromId,toId]);
  const source=products.find(p=>Number(p.id)===fromId),target=products.find(p=>Number(p.id)===toId);
  if(!source||!target||!source.active||!target.active||!sameFamily(source,target))fail('Level pengganti tidak tersedia untuk produk/ukuran ini.',400);
  const [lines]=await connection.query('SELECT product_id,quantity,note FROM cart_items WHERE user_id=? AND product_id IN (?,?) ORDER BY product_id FOR UPDATE',[userId,fromId,toId]);
  const old=lines.find(i=>Number(i.product_id)===fromId),existing=lines.find(i=>Number(i.product_id)===toId);
  if(!old)fail('Item asal tidak ditemukan di keranjang. Muat ulang keranjang.',404);
  const quantity=Number((Number(old.quantity)+Number(existing?.quantity||0)).toFixed(3));
  if(quantity>Number(target.stock))fail(`Stok ${target.variant||'level tujuan'} hanya ${target.stock} ${target.unit==='KG'?'kg':'pcs'}. Kurangi qty terlebih dahulu.`);
  const note=mergeNotes(old.note,existing?.note);
  if(existing){
   await connection.query('UPDATE cart_items SET quantity=?, note=? WHERE user_id=? AND product_id=?',[quantity,note,userId,toId]);
   await connection.query('DELETE FROM cart_items WHERE user_id=? AND product_id=?',[userId,fromId]);
  }else{
   await connection.query('UPDATE cart_items SET product_id=? WHERE user_id=? AND product_id=?',[toId,userId,fromId]);
  }
  await connection.commit();committed=true;
 }catch(error){if(!committed)await connection.rollback();throw error;}finally{connection.release();}
}
module.exports={sameFamily,mergeNotes,swapCartVariant};
