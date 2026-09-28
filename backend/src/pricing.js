const money = x => Math.round(Number(x) || 0);

// Promo berlaku SEKALI untuk seluruh keranjang kemasan, BUKAN per pcs.
// Item kiloan tidak ikut memenuhi ambang dan tidak menerima potongan.
function priceCart(items, settings, fulfillment='PICKUP') {
  const pcsCount=items.filter(x=>x.unit==='PCS').reduce((n,x)=>n+Number(x.quantity),0);
  const promoEnabled=settings.promo_enabled===undefined||Number(settings.promo_enabled)===1;
  const tier=promoEnabled?(pcsCount>=Number(settings.min_qty_tier2)?2:pcsCount>=Number(settings.min_qty_tier1)?1:0):0;
  const eligibleSubtotal=items.filter(x=>x.unit==='PCS').reduce((n,x)=>n+money(x.price*x.quantity),0);
  const tierDiscount=tier===2?money(settings.discount_tier2):tier===1?money(settings.discount_tier1):0;
  // Potongan tidak pernah membuat item/total menjadi negatif.
  let remaining=Math.min(eligibleSubtotal,Math.max(0,tierDiscount));
  const lines=items.map(item=>{
    const lineSubtotal=money(item.price*item.quantity);
    const lineDiscount=item.unit==='PCS'?Math.min(remaining,lineSubtotal):0;
    remaining-=lineDiscount;
    // unitDiscount sengaja nol: diskon ini bukan harga per unit.
    return {...item,lineSubtotal,unitDiscount:0,lineDiscount,lineTotal:lineSubtotal-lineDiscount};
  });
  const subtotal=lines.reduce((n,x)=>n+x.lineSubtotal,0);
  const discount=lines.reduce((n,x)=>n+x.lineDiscount,0);
  const shipping=fulfillment==='DELIVERY'?money(settings.shipping_flat):0;
  return {lines,pcsCount,tier,tierDiscount,subtotal,discount,shipping,total:subtotal-discount+shipping};
}
module.exports={priceCart};
