const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('cart note exists as its own user-scoped route, separate from per-item note',()=>{
 const src=read('src/routes/cart.js');assert.match(src,/router\.patch\('\/note'/);assert.match(src,/WHERE user_id=\?/);assert.match(src,/router\.patch\('\/:productId\/note'/);
});
test('general order note saved in orders.note and removed after successful checkout',()=>{
 const src=read('src/routes/orders.js');assert.match(src,/const recipient=clean\(req\.body\.recipient_name/);assert.match(src,/note=clean\(req\.body\.note,500\)/);assert.match(src,/DELETE FROM cart_notes WHERE user_id=\?/);
});
test('no kg auto-add increment remains in catalog App',()=>{
 const src=read('../frontend/src/App.tsx');assert.doesNotMatch(src,/p\.unit==='KG'\?0\.25:1/);assert.match(src,/add\(p\.product,p\.quantity,c\)/);
});
