const crypto=require('node:crypto');
const {fail}=require('../utils');

const money=v=>Math.round((Number(v)||0)*100)/100;
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:null;
const docNo=(prefix,date)=>`${prefix}-${String(date||'').replaceAll('-','').slice(2)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

async function settings(conn){
 const [[row]]=await conn.query('SELECT * FROM accounting_settings WHERE id=1');
 if(!row)fail('Master akuntansi belum siap. Jalankan patch/migrasi akuntansi terlebih dahulu.',503);
 return row;
}

async function postJournal(conn,{journalNo,journalDate,sourceType,sourceId=null,description='',referenceNo='',createdBy=null},lines){
 const cleanLines=(lines||[]).map(x=>({account_id:Number(x.account_id),description:String(x.description||'').slice(0,255),debit:money(x.debit),credit:money(x.credit),party_type:x.party_type||null,party_id:x.party_id?Number(x.party_id):null})).filter(x=>x.debit>0||x.credit>0);
 if(cleanLines.length<2)fail('Jurnal minimal memiliki dua baris.');
 const debit=money(cleanLines.reduce((n,x)=>n+x.debit,0));
 const credit=money(cleanLines.reduce((n,x)=>n+x.credit,0));
 if(debit<=0||Math.abs(debit-credit)>.009)fail('Jurnal tidak seimbang.');
 const [r]=await conn.query(`INSERT INTO accounting_journals(journal_no,journal_date,source_type,source_id,description,reference_no,status,posted_at,created_by)
   VALUES(?,?,?,?,?,?,'POSTED',NOW(),?)`,[journalNo,journalDate,sourceType,sourceId,description,referenceNo||null,createdBy]);
 for(const line of cleanLines)await conn.query(`INSERT INTO accounting_journal_lines(journal_id,account_id,description,debit,credit,party_type,party_id)
   VALUES(?,?,?,?,?,?,?)`,[r.insertId,line.account_id,line.description,line.debit,line.credit,line.party_type,line.party_id]);
 return r.insertId;
}

async function postSalesJournal(conn,orderId,createdBy=null){
 const [[existing]]=await conn.query("SELECT id FROM accounting_journals WHERE source_type='SALES' AND source_id=? LIMIT 1",[orderId]);
 if(existing)return existing.id;
 const [[order]]=await conn.query('SELECT id,order_no,payment_method,subtotal,discount,shipping,total,created_at,paid_at FROM orders WHERE id=?',[orderId]);
 if(!order)fail('Pesanan tidak ditemukan untuk jurnal penjualan.',404);
 const [items]=await conn.query('SELECT quantity,unit_cost FROM order_items WHERE order_id=?',[orderId]);
 const cfg=await settings(conn);
 const cashBankId=order.payment_method==='QRIS'?cfg.qris_cash_bank_id:cfg.bca_cash_bank_id;
 const [[cashBank]]=await conn.query('SELECT account_id FROM cash_bank_accounts WHERE id=? AND active=1',[cashBankId]);
 if(!cashBank)fail(`Master kas/bank untuk ${order.payment_method} belum tersedia.`,409);
 const revenue=money(Number(order.subtotal)-Number(order.discount));
 const shipping=money(order.shipping);
 const cogs=money(items.reduce((n,x)=>n+(Number(x.quantity)*Number(x.unit_cost||0)),0));
 const lines=[
  {account_id:cashBank.account_id,debit:money(order.total),credit:0,description:`Penerimaan ${order.order_no}`},
  {account_id:cfg.sales_account_id,debit:0,credit:revenue,description:`Penjualan ${order.order_no}`},
 ];
 if(shipping>0)lines.push({account_id:cfg.shipping_income_account_id,debit:0,credit:shipping,description:`Pendapatan ongkir ${order.order_no}`});
 if(cogs>0){
  lines.push({account_id:cfg.cogs_account_id,debit:cogs,credit:0,description:`HPP ${order.order_no}`});
  lines.push({account_id:cfg.inventory_account_id,debit:0,credit:cogs,description:`Persediaan keluar ${order.order_no}`});
 }
 return postJournal(conn,{journalNo:`SAL-${order.order_no}`,journalDate:String(order.paid_at||order.created_at).slice(0,10),sourceType:'SALES',sourceId:order.id,description:`Penjualan terverifikasi ${order.order_no}`,referenceNo:order.order_no,createdBy},lines);
}

async function backfillSalesJournals(pool){
 const [orders]=await pool.query(`SELECT o.id FROM orders o
   LEFT JOIN accounting_journals j ON j.source_type='SALES' AND j.source_id=o.id
   WHERE o.status IN ('PAID','PROCESSING','READY','SHIPPED','COMPLETED') AND j.id IS NULL
   ORDER BY o.id`);
 let count=0;
 for(const row of orders){
  const cx=await pool.getConnection();
  try{await cx.beginTransaction();await postSalesJournal(cx,row.id,null);await cx.commit();count++;}
  catch(e){await cx.rollback();throw e;}finally{cx.release();}
 }
 return count;
}

module.exports={money,validDate,docNo,settings,postJournal,postSalesJournal,backfillSalesJournals};
