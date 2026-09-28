const test=require('node:test');
const assert=require('node:assert/strict');
const {calculatePurchaseCosting}=require('../src/services/purchase-costing');

test('harga 10.000 diskon Rp2.000 menghasilkan HPP Rp8.000 per unit',()=>{
 const r=calculatePurchaseCosting({items:[{is_product:true,quantity:1,unit_price:10000,discount_type:'AMOUNT',discount_value:2000}],invoiceDiscountType:'NONE',invoiceDiscountValue:0,landedCostTotal:0});
 assert.equal(r.gross_total,10000);assert.equal(r.item_discount_total,2000);assert.equal(r.total,8000);assert.equal(r.items[0].unit_cost,8000);
});

test('diskon Rp2.000 bersifat per unit',()=>{
 const r=calculatePurchaseCosting({items:[{is_product:true,quantity:10,unit_price:10000,discount_type:'AMOUNT',discount_value:2000}],invoiceDiscountType:'NONE',invoiceDiscountValue:0,landedCostTotal:0});
 assert.equal(r.gross_total,100000);assert.equal(r.item_discount_total,20000);assert.equal(r.total,80000);assert.equal(r.items[0].unit_cost,8000);
});

test('diskon persen item dihitung dari harga bruto',()=>{
 const r=calculatePurchaseCosting({items:[{is_product:true,quantity:5,unit_price:10000,discount_type:'PERCENT',discount_value:20}],invoiceDiscountType:'NONE',invoiceDiscountValue:0,landedCostTotal:0});
 assert.equal(r.item_discount_total,10000);assert.equal(r.total,40000);assert.equal(r.items[0].unit_cost,8000);
});

test('diskon invoice dialokasikan proporsional ke semua baris',()=>{
 const r=calculatePurchaseCosting({items:[
  {is_product:true,quantity:10,unit_price:10000,discount_type:'NONE',discount_value:0},
  {is_product:true,quantity:5,unit_price:20000,discount_type:'NONE',discount_value:0},
 ],invoiceDiscountType:'AMOUNT',invoiceDiscountValue:20000,landedCostTotal:0});
 assert.equal(r.invoice_discount_total,20000);assert.equal(r.items[0].invoice_discount_alloc,10000);assert.equal(r.items[1].invoice_discount_alloc,10000);assert.equal(r.total,180000);
});

test('landed cost hanya masuk ke item produk dan menaikkan HPP',()=>{
 const r=calculatePurchaseCosting({items:[
  {is_product:true,quantity:10,unit_price:10000,discount_type:'NONE',discount_value:0},
  {is_product:false,quantity:1,unit_price:50000,discount_type:'NONE',discount_value:0},
 ],invoiceDiscountType:'NONE',invoiceDiscountValue:0,landedCostTotal:20000});
 assert.equal(r.items[0].landed_cost_alloc,20000);assert.equal(r.items[0].unit_cost,12000);assert.equal(r.items[1].landed_cost_alloc,0);assert.equal(r.total,170000);
});

test('kombinasi diskon item + diskon invoice + landed cost membentuk HPP final',()=>{
 const r=calculatePurchaseCosting({items:[{is_product:true,quantity:10,unit_price:10000,discount_type:'AMOUNT',discount_value:2000}],invoiceDiscountType:'AMOUNT',invoiceDiscountValue:10000,landedCostTotal:5000});
 assert.deepEqual([r.gross_total,r.item_discount_total,r.invoice_discount_total,r.landed_cost_total,r.total,r.items[0].unit_cost],[100000,20000,10000,5000,75000,7500]);
});
