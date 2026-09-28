const test=require('node:test');
const assert=require('node:assert/strict');
const {sameFamily,mergeNotes}=require('../src/cart-variant');

test('V10: SKU beda level tetapi satu keluarga boleh ditukar',()=>{
 assert.equal(sameFamily({sku:'BAS-150-ORI'},{sku:'BAS-150-PED'}),true);
 assert.equal(sameFamily({sku:'MAK-KG-PED'},{sku:'MAK-KG-EXT'}),true);
});

test('V10: SKU beda produk atau ukuran tidak boleh ditukar',()=>{
 assert.equal(sameFamily({sku:'BAS-150-ORI'},{sku:'MAK-150-ORI'}),false);
 assert.equal(sameFamily({sku:'BAS-150-ORI'},{sku:'BAS-KG-ORI'}),false);
});

test('V10: catatan item tetap aman ketika level digabung ke SKU yang sudah ada',()=>{
 assert.equal(mergeNotes('tanpa daun jeruk','bumbu dipisah'),'bumbu dipisah\ntanpa daun jeruk');
 assert.equal(mergeNotes('pedas','pedas'),'pedas');
});
