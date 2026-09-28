const money=v=>Math.round((Number(v)||0)*100)/100;
const discountTypes=new Set(['NONE','AMOUNT','PERCENT']);
const normalizeDiscountType=v=>discountTypes.has(String(v||'').toUpperCase())?String(v).toUpperCase():'NONE';

function allocateMoney(total,weights){
 const cents=Math.round(money(total)*100);
 const normalized=(weights||[]).map(v=>Math.max(0,Number(v)||0));
 const weightTotal=normalized.reduce((n,v)=>n+v,0);
 if(!normalized.length)return [];
 if(cents<=0||weightTotal<=0)return normalized.map(()=>0);
 const raw=normalized.map(w=>cents*w/weightTotal);
 const bases=raw.map(Math.floor);
 let remain=cents-bases.reduce((n,v)=>n+v,0);
 const order=raw.map((v,i)=>({i,frac:v-bases[i]})).sort((a,b)=>b.frac-a.frac||a.i-b.i);
 for(let n=0;n<remain;n++)bases[order[n%order.length].i]++;
 return bases.map(v=>v/100);
}

function calculateLine({quantity,unitPrice,discountType='NONE',discountValue=0}){
 const q=Number(quantity),price=money(unitPrice),type=normalizeDiscountType(discountType),value=Number(discountValue)||0;
 if(!Number.isFinite(q)||q<=0)throw new Error('Quantity pembelian tidak valid.');
 if(!Number.isFinite(price)||price<=0)throw new Error('Harga beli per unit harus lebih dari 0.');
 if(!Number.isFinite(value)||value<0)throw new Error('Nilai diskon tidak valid.');
 if(type==='PERCENT'&&value>100)throw new Error('Diskon persen maksimal 100%.');
 if(type==='AMOUNT'&&money(value)>price)throw new Error('Diskon rupiah per unit tidak boleh melebihi harga beli.');
 const grossAmount=money(q*price);
 const discountAmount=type==='PERCENT'?money(grossAmount*value/100):type==='AMOUNT'?money(q*money(value)):0;
 return {quantity:q,unit_price:price,discount_type:type,discount_value:money(value),gross_amount:grossAmount,discount_amount:discountAmount,net_before_invoice:money(grossAmount-discountAmount)};
}

function calculatePurchaseCosting({items,invoiceDiscountType='NONE',invoiceDiscountValue=0,landedCostTotal=0}){
 if(!Array.isArray(items)||!items.length)throw new Error('Isi minimal satu item pembelian.');
 const rows=items.map(x=>({...x,...calculateLine({quantity:x.quantity,unitPrice:x.unit_price,discountType:x.discount_type,discountValue:x.discount_value})}));
 const grossTotal=money(rows.reduce((n,x)=>n+x.gross_amount,0));
 const itemDiscountTotal=money(rows.reduce((n,x)=>n+x.discount_amount,0));
 const subtotalAfterItemDiscount=money(grossTotal-itemDiscountTotal);
 const invType=normalizeDiscountType(invoiceDiscountType),invValue=Number(invoiceDiscountValue)||0;
 if(!Number.isFinite(invValue)||invValue<0)throw new Error('Nilai diskon invoice tidak valid.');
 if(invType==='PERCENT'&&invValue>100)throw new Error('Diskon invoice persen maksimal 100%.');
 let invoiceDiscountTotal=0;
 if(invType==='PERCENT')invoiceDiscountTotal=money(subtotalAfterItemDiscount*invValue/100);
 if(invType==='AMOUNT')invoiceDiscountTotal=money(invValue);
 if(invoiceDiscountTotal>subtotalAfterItemDiscount+.009)throw new Error('Diskon invoice tidak boleh melebihi subtotal setelah diskon item.');
 const invoiceAlloc=allocateMoney(invoiceDiscountTotal,rows.map(x=>x.net_before_invoice));
 rows.forEach((x,i)=>{x.invoice_discount_alloc=invoiceAlloc[i]||0;x.after_invoice_discount=money(x.net_before_invoice-x.invoice_discount_alloc);});
 const landed=money(landedCostTotal);
 if(!Number.isFinite(Number(landedCostTotal))||Number(landedCostTotal)<0)throw new Error('Biaya pembelian / landed cost tidak valid.');
 const productIndexes=rows.map((x,i)=>x.is_product?i:-1).filter(i=>i>=0);
 if(landed>0&&!productIndexes.length)throw new Error('Biaya pembelian / landed cost hanya dapat dialokasikan jika ada item produk/stok.');
 let productWeights=productIndexes.map(i=>rows[i].after_invoice_discount);
 if(productWeights.reduce((n,v)=>n+v,0)<=0)productWeights=productIndexes.map(i=>rows[i].gross_amount||rows[i].quantity);
 const landedAlloc=allocateMoney(landed,productWeights);
 rows.forEach(x=>{x.landed_cost_alloc=0;});
 productIndexes.forEach((rowIndex,i)=>{rows[rowIndex].landed_cost_alloc=landedAlloc[i]||0;});
 rows.forEach(x=>{
  x.amount=money(x.after_invoice_discount+x.landed_cost_alloc);
  x.unit_cost=x.quantity>0?money(x.amount/x.quantity):0;
 });
 const total=money(rows.reduce((n,x)=>n+x.amount,0));
 return {
  items:rows,
  gross_total:grossTotal,
  item_discount_total:itemDiscountTotal,
  subtotal_after_item_discount:subtotalAfterItemDiscount,
  invoice_discount_type:invType,
  invoice_discount_value:money(invValue),
  invoice_discount_total:invoiceDiscountTotal,
  landed_cost_total:landed,
  total,
 };
}

module.exports={money,normalizeDiscountType,allocateMoney,calculateLine,calculatePurchaseCosting};
