export type PurchaseDiscountType='NONE'|'AMOUNT'|'PERCENT';

export type PurchaseCostingInput={
 quantity:number;
 unitPrice:number;
 discountType:PurchaseDiscountType;
 discountValue:number;
 isProduct:boolean;
};

export type PurchaseCostingRow=PurchaseCostingInput&{
 grossAmount:number;
 itemDiscountAmount:number;
 netBeforeInvoice:number;
 invoiceDiscountAlloc:number;
 landedCostAlloc:number;
 finalAmount:number;
 finalUnitCost:number;
};

export type PurchaseCostingResult={
 rows:PurchaseCostingRow[];
 grossTotal:number;
 itemDiscountTotal:number;
 subtotalAfterItemDiscount:number;
 invoiceDiscountTotal:number;
 landedCostTotal:number;
 total:number;
};

const money=(v:number)=>Math.round((Number(v)||0)*100)/100;

function allocateMoney(total:number,weights:number[]){
 const cents=Math.round(money(total)*100);
 const clean=weights.map(v=>Math.max(0,Number(v)||0));
 const sum=clean.reduce((n,v)=>n+v,0);
 if(cents<=0||sum<=0)return clean.map(()=>0);
 const raw=clean.map(w=>cents*w/sum),base=raw.map(Math.floor);
 let remain=cents-base.reduce((n,v)=>n+v,0);
 const order=raw.map((v,i)=>({i,frac:v-base[i]})).sort((a,b)=>b.frac-a.frac||a.i-b.i);
 for(let n=0;n<remain;n++)base[order[n%order.length].i]++;
 return base.map(v=>v/100);
}

export function computePurchaseCosting(items:PurchaseCostingInput[],invoiceDiscountType:PurchaseDiscountType,invoiceDiscountValue:number,landedCostTotal:number):PurchaseCostingResult{
 const rows:PurchaseCostingRow[]=items.map(x=>{
  const quantity=Math.max(0,Number(x.quantity)||0),unitPrice=money(Math.max(0,Number(x.unitPrice)||0)),discountValue=Math.max(0,Number(x.discountValue)||0);
  const grossAmount=money(quantity*unitPrice);
  const itemDiscountAmount=x.discountType==='PERCENT'?money(grossAmount*Math.min(100,discountValue)/100):x.discountType==='AMOUNT'?money(quantity*Math.min(unitPrice,discountValue)):0;
  const netBeforeInvoice=money(Math.max(0,grossAmount-itemDiscountAmount));
  return {...x,quantity,unitPrice,discountValue,grossAmount,itemDiscountAmount,netBeforeInvoice,invoiceDiscountAlloc:0,landedCostAlloc:0,finalAmount:netBeforeInvoice,finalUnitCost:quantity?money(netBeforeInvoice/quantity):0};
 });
 const grossTotal=money(rows.reduce((n,x)=>n+x.grossAmount,0));
 const itemDiscountTotal=money(rows.reduce((n,x)=>n+x.itemDiscountAmount,0));
 const subtotalAfterItemDiscount=money(grossTotal-itemDiscountTotal);
 const invoiceDiscountTotal=invoiceDiscountType==='PERCENT'?money(subtotalAfterItemDiscount*Math.min(100,Math.max(0,invoiceDiscountValue||0))/100):invoiceDiscountType==='AMOUNT'?money(Math.min(subtotalAfterItemDiscount,Math.max(0,invoiceDiscountValue||0))):0;
 const invoiceAlloc=allocateMoney(invoiceDiscountTotal,rows.map(x=>x.netBeforeInvoice));
 rows.forEach((x,i)=>{x.invoiceDiscountAlloc=invoiceAlloc[i]||0;x.finalAmount=money(x.netBeforeInvoice-x.invoiceDiscountAlloc);});
 const landed=money(Math.max(0,landedCostTotal||0)),productIndexes=rows.map((x,i)=>x.isProduct?i:-1).filter(i=>i>=0);
 let weights=productIndexes.map(i=>rows[i].finalAmount);
 if(weights.reduce((n,v)=>n+v,0)<=0)weights=productIndexes.map(i=>rows[i].grossAmount||rows[i].quantity);
 const landedAlloc=allocateMoney(landed,weights);
 productIndexes.forEach((rowIndex,i)=>{rows[rowIndex].landedCostAlloc=landedAlloc[i]||0;});
 rows.forEach(x=>{x.finalAmount=money(x.finalAmount+x.landedCostAlloc);x.finalUnitCost=x.quantity?money(x.finalAmount/x.quantity):0;});
 return {rows,grossTotal,itemDiscountTotal,subtotalAfterItemDiscount,invoiceDiscountTotal,landedCostTotal:landed,total:money(rows.reduce((n,x)=>n+x.finalAmount,0))};
}
