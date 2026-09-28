'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {NEW_PRICES,updatePrices} = require('../scripts/update-cemilin-prices-v8');
const root = path.resolve(__dirname,'../..');

test('V8: 16 SKU memiliki harga retail yang diminta', () => {
  assert.equal(Object.keys(NEW_PRICES).length,16);
  assert.deepEqual([
    NEW_PRICES['BAS-150-ORI'],NEW_PRICES['BAS-150-PED'],NEW_PRICES['BAS-150-EXT'],
    NEW_PRICES['MAK-150-ORI'],NEW_PRICES['MAK-150-PED'],NEW_PRICES['MAK-150-EXT'],
    NEW_PRICES['USU-200-PED'],NEW_PRICES['KRI-150-ORI'],
    NEW_PRICES['BAS-KG-ORI'],NEW_PRICES['BAS-KG-PED'],NEW_PRICES['BAS-KG-EXT'],
    NEW_PRICES['MAK-KG-ORI'],NEW_PRICES['MAK-KG-PED'],NEW_PRICES['MAK-KG-EXT'],
    NEW_PRICES['USU-KG-PED'],NEW_PRICES['KRI-KG-ORI']
  ],[16000,17000,17000,16000,17000,17000,23000,13000,65000,67000,69000,65000,67000,69000,125000,79000]);
});
test('V8: source beranda memakai Jajan Yuk! dan admin role landing di dashboard', () => {
  const app = fs.readFileSync(path.join(root,'frontend/src/App.tsx'),'utf8');
  assert.match(app,/>Jajan Yuk!<\/button>/);
  assert.doesNotMatch(app,/>Katalog<\/button>/);
  assert.doesNotMatch(app,/>Seller Center<\/button>/);
  assert.match(app,/setPage\(r\.user\.role==='ADMIN'\?'admin':'shop'\)/);
  assert.match(app,/setPage\(u\.role==='ADMIN'\?'admin':'shop'\)/);
  assert.match(app,/if\(u\.role==='ADMIN'\)\{setPending\(null\)/);
});
test('V8: migrator menyimpan backup dan tidak mengubah tabel pesanan atau stok',async() => {
  const calls=[];
  let tx=false;
  const products=[{id:8,sku:'KRI-150-ORI',name:'Kripca',variant:'Original',unit:'PCS',size_label:'150 gr',price:10000}];
  const conn={
    beginTransaction:async()=>{tx=true;},commit:async()=>{calls.push('commit');},rollback:async()=>{calls.push('rollback');},release:()=>{},
    query:async(sql,vals)=>{calls.push({sql,vals});if(sql.startsWith('SELECT'))return [products];return [{affectedRows:1}];}
  };
  const dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'cemilin-v8-test-'));
  try {
    const back=path.join(dir,'before.json');
    const r=await updatePrices({getConnection:async()=>conn},back);
    assert.equal(tx,true);
    assert.equal(r.changes.length,1);
    assert.equal(r.changes[0].new_variant,'Pedas');
    assert.equal(r.changes[0].new_price,13000);
    assert.equal(JSON.parse(fs.readFileSync(back,'utf8')).changes[0].price,10000);
    assert.equal(calls.at(-1),'commit');
    assert.equal(calls.filter(x=>x.sql?.startsWith('UPDATE')).length,1);
    assert.ok(calls.filter(x=>x.sql?.startsWith('UPDATE')).every(x=>!/(orders|stock|cart_items)/.test(x.sql)));
  }finally {fs.rmSync(dir,{recursive:true,force:true});}
});
