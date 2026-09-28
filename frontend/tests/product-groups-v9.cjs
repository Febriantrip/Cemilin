'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const src=fs.readFileSync(path.join(__dirname,'../src/services/product-groups.ts'),'utf8');
const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
const m={exports:{}};new Function('module','exports',out)(m,m.exports);
const {groupProducts}=m.exports;
const p=(id,sku,name,variant,unit,size_label,price,stock=10,category='Basreng')=>({id,sku,name,variant,unit,size_label,category,price,stock,sort_order:id});
test('same snack/size becomes one visual card with distinct SKUs and range 16k-18k',()=>{
 const products=[p(3,'BAS-150-EXT','Basreng','Extra Pedas','PCS','150 gr',18000),p(1,'BAS-150-ORI','Basreng','Original','PCS','150 gr',16000),p(2,'BAS-150-PED','Basreng','Pedas','PCS','150 gr',17000)];
 const result=groupProducts(products);assert.equal(result.length,1);assert.equal(result[0].minPrice,16000);assert.equal(result[0].maxPrice,18000);assert.deepEqual(result[0].products.map(p=>p.sku),['BAS-150-ORI','BAS-150-PED','BAS-150-EXT']);
});
test('kiloan does not merge with kemasan, other category does not merge',()=>{
 const list=[p(1,'BAS-150-ORI','Basreng','Original','PCS','150 gr',16000),p(9,'BAS-KG-ORI','Basreng Kiloan','Original','KG','1 kg',65000),p(10,'MAK-150-ORI','Makaroni','Original','PCS','150 gr',16000,10,'Makaroni')];
 assert.equal(groupProducts(list).length,3);
});
test('custom products do not get mistakenly grouped into seeded family',()=>{
 const list=[p(1,'BAS-150-ORI','Basreng','Original','PCS','150 gr',16000),p(25,'CUSTOM-25','Basreng Special','Original','PCS','150 gr',19000)];
 assert.equal(groupProducts(list).length,2);
});
test('search by extra pedas preserves all flavors for the popup',()=>{
 const g=groupProducts([p(1,'BAS-150-ORI','Basreng','Original','PCS','150 gr',16000),p(3,'BAS-150-EXT','Basreng','Extra Pedas','PCS','150 gr',18000)]);
 const results=g.filter(group=>group.products.some(p=>`${p.name} ${p.variant}`.toLowerCase().includes('extra pedas')));
 assert.equal(results.length,1);assert.equal(results[0].products.length,2);
});
