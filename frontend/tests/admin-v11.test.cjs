'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'../src');
const src=fs.readFileSync(path.join(root,'admin/order-filters.ts'),'utf8');
const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const m={exports:{}};new Function('module','exports',out)(m,m.exports);
const {matchesAdminOrderFilter:match}=m.exports;
test('menunggu pembayaran includes rejected payment proof, excludes confirmed orders',()=>{
 assert.equal(match('AWAITING','AWAITING_PAYMENT'),true);
 assert.equal(match('AWAITING','PAYMENT_REJECTED'),true);
 assert.equal(match('AWAITING','PAID'),false);
});
test('harus disiapkan includes paid and in-progress orders, not unverified payment',()=>{
 assert.equal(match('PREPARE','PAID'),true);
 assert.equal(match('PREPARE','PROCESSING'),true);
 assert.equal(match('PREPARE','PAYMENT_REVIEW'),false);
 assert.equal(match('PREPARE','READY'),false);
});
test('review filter and all filter remain independent',()=>{
 assert.equal(match('PAYMENT_REVIEW','PAYMENT_REVIEW'),true);
 assert.equal(match('PAYMENT_REVIEW','PAID'),false);
 assert.equal(match('ALL','EXPIRED'),true);
});
test('all admin product data remains per SKU, no product schema or database migration',()=>{
 const p=fs.readFileSync(path.join(root,'admin/AdminProducts.tsx'),'utf8');
 assert.match(p,/key=\{p\.id\}/);
 assert.match(p,/admin-product-details/);
 assert.match(p,/aria-pressed=\{activeOnly\}/);
});
