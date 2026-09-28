const test=require('node:test');
const assert=require('node:assert/strict');
const {EXTRA_PRICES_V9,updateExtraPrices}=require('../scripts/update-cemilin-extra-prices-v9');
const {priceCart}=require('../src/pricing');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
test('V9 only changes extra pedas packaged prices, not kiloan',()=>{
 assert.deepEqual(EXTRA_PRICES_V9,{'BAS-150-EXT':18000,'MAK-150-EXT':18000});
});
test('priceCart uses actual selected SKU and cumulative package discount only once',()=>{
 const s={min_qty_tier1:5,discount_tier1:1000,min_qty_tier2:10,discount_tier2:2000};
 const items=[{id:1,sku:'BAS-150-ORI',unit:'PCS',price:16000,quantity:3},{id:2,sku:'BAS-150-EXT',unit:'PCS',price:18000,quantity:2}];
 const p=priceCart(items,s);
 assert.equal(p.subtotal,84000);assert.equal(p.discount,1000);assert.equal(p.total,83000);
});
test('V9 update is transactional, backs up prior prices, keeps IDs and stock untouched',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cemilin-v9-'));const backup=path.join(dir,'prices.json');
 const calls=[];
 const conn={beginTransaction:async()=>calls.push('begin'),query:async(sql,params)=>{
  calls.push({sql,params});
  if(sql.startsWith('SELECT'))return [[{id:3,sku:'BAS-150-EXT',price:17000,variant:'Extra Pedas',unit:'PCS',stock:22},{id:6,sku:'MAK-150-EXT',price:17000,variant:'Extra Pedas',unit:'PCS',stock:34}]];
  return [{affectedRows:1}];},commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release:()=>calls.push('release')};
 try{
  await updateExtraPrices({getConnection:async()=>conn},backup);
  assert.equal(JSON.parse(fs.readFileSync(backup)).changes.length,2);
  assert.equal(calls.filter(c=>typeof c==='object'&&c.sql.startsWith('UPDATE')).length,2);
  assert(calls.filter(c=>typeof c==='object'&&c.sql.startsWith('UPDATE')).every(c=>!c.sql.includes('stock')&&!c.sql.includes('order')));
  assert.equal(calls.at(-2),'commit');assert.equal(calls.at(-1),'release');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
