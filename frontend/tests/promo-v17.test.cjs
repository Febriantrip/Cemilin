const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..','src',p),'utf8');
test('admin promo switch saves independently without submitting other settings',()=>{
 const file=read('admin/AdminSettings.tsx');
 assert.match(file,/role="switch"/);
 assert.match(file,/method:'PATCH',body:json\(\{promo_enabled:active\}\)/);
 assert.match(file,/onSaved\(\)/);
});
test('top bar, shop promo section, and item promo badge are conditional',()=>{
 assert.match(read('App.tsx'),/store\.promo_enabled&&<div className="site-announcement"/);
 assert.match(read('pages/Shop.tsx'),/store\.promo_enabled&&<section className="promo-area"/);
 assert.match(read('pages/Shop.tsx'),/discountTier1=\{store\.promo_enabled\?store\.discount_tier1:0\}/);
 assert.match(read('components/ProductCard.tsx'),/discountTier1>0&&<span className="family-promo"/);
});
test('checkout and cart do not show discount copy when promo off',()=>{
 assert.match(read('components/CartDrawer.tsx'),/store\.promo_enabled&&store\.discount_tier1>0/);
 assert.match(read('components/CartDrawer.tsx'),/store\.promo_enabled&&price\.discount>0/);
 assert.match(read('pages/Checkout.tsx'),/store\.promo_enabled&&cart\.pricing\.discount>0/);
});
