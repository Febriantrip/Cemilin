const router=require('express').Router();
const {pool}=require('../db');
const {asyncRoute,fail,int,clean}=require('../utils');
const {requireUser,requireAdmin}=require('../auth');
const {money,validDate,docNo,settings,postJournal}=require('../services/accounting');
const {calculatePurchaseCosting,normalizeDiscountType}=require('../services/purchase-costing');

router.use(requireUser,requireAdmin);
const today=()=>new Date().toISOString().slice(0,10);
const dateOr=(v,fallback)=>validDate(v)||fallback;
const amount=v=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>999999999999)fail('Nominal tidak valid.');return money(n);};
const qty=v=>{const n=Number(v);if(!Number.isFinite(n)||n<=0||n>999999||Math.round(n*1000)!==n*1000)fail('Quantity pembelian tidak valid.');return n;};

async function masters(){
 const [accounts]=await pool.query('SELECT * FROM accounting_accounts ORDER BY sort_order,code');
 const [suppliers]=await pool.query('SELECT * FROM suppliers ORDER BY active DESC,name');
 const [cash_bank]=await pool.query(`SELECT cb.*,a.code account_code,a.name account_name FROM cash_bank_accounts cb JOIN accounting_accounts a ON a.id=cb.account_id ORDER BY cb.active DESC,cb.id`);
 const [products]=await pool.query('SELECT id,sku,name,variant,unit,size_label,stock,average_cost,active FROM products ORDER BY active DESC,sort_order,id');
 return {accounts,suppliers,cash_bank,products};
}
router.get('/masters',asyncRoute(async(_req,res)=>res.json(await masters())));

router.post('/accounts',asyncRoute(async(req,res)=>{
 const code=clean(req.body.code,20).toUpperCase(),name=clean(req.body.name,120),type=clean(req.body.type,20),normal=clean(req.body.normal_balance,10),report=clean(req.body.report_group,40).toUpperCase(),cashflow=clean(req.body.cashflow_group,20).toUpperCase();
 if(!/^[0-9A-Z.-]{2,20}$/.test(code)||name.length<2||!['ASSET','LIABILITY','EQUITY','REVENUE','COGS','EXPENSE'].includes(type)||!['DEBIT','CREDIT'].includes(normal)||!report||!['OPERATING','INVESTING','FINANCING','NONE'].includes(cashflow))fail('Periksa data akun.');
 try{const [r]=await pool.query('INSERT INTO accounting_accounts(code,name,type,normal_balance,report_group,cashflow_group,active,sort_order) VALUES(?,?,?,?,?,?,1,?)',[code,name,type,normal,report,cashflow,int(req.body.sort_order??900,0,999999)]);res.status(201).json({id:r.insertId});}
 catch(e){if(e.code==='ER_DUP_ENTRY')fail('Kode akun sudah digunakan.',409);throw e;}
}));
router.put('/accounts/:id',asyncRoute(async(req,res)=>{
 const id=int(req.params.id,1),[[old]]=await pool.query('SELECT * FROM accounting_accounts WHERE id=?',[id]);if(!old)fail('Akun tidak ditemukan.',404);
 const name=clean(req.body.name,120),active=req.body.active?1:0,sort=int(req.body.sort_order??old.sort_order,0,999999);
 if(name.length<2)fail('Nama akun minimal 2 karakter.');
 if(old.system_key){await pool.query('UPDATE accounting_accounts SET name=?,active=1,sort_order=? WHERE id=?',[name,sort,id]);}
 else{
  const code=clean(req.body.code,20).toUpperCase(),type=clean(req.body.type,20),normal=clean(req.body.normal_balance,10),report=clean(req.body.report_group,40).toUpperCase(),cashflow=clean(req.body.cashflow_group,20).toUpperCase();
  if(!/^[0-9A-Z.-]{2,20}$/.test(code)||!['ASSET','LIABILITY','EQUITY','REVENUE','COGS','EXPENSE'].includes(type)||!['DEBIT','CREDIT'].includes(normal)||!report||!['OPERATING','INVESTING','FINANCING','NONE'].includes(cashflow))fail('Periksa data akun.');
  await pool.query('UPDATE accounting_accounts SET code=?,name=?,type=?,normal_balance=?,report_group=?,cashflow_group=?,active=?,sort_order=? WHERE id=?',[code,name,type,normal,report,cashflow,active,sort,id]);
 }
 res.json({ok:true});
}));

router.post('/suppliers',asyncRoute(async(req,res)=>{
 const code=clean(req.body.code,30).toUpperCase(),name=clean(req.body.name,140),phone=clean(req.body.phone,30),email=clean(req.body.email,190)||null,address=clean(req.body.address,500);
 if(!/^[A-Z0-9_-]{2,30}$/.test(code)||name.length<2)fail('Kode dan nama supplier wajib diisi.');
 try{const [r]=await pool.query('INSERT INTO suppliers(code,name,phone,email,address,active) VALUES(?,?,?,?,?,1)',[code,name,phone,email,address]);res.status(201).json({id:r.insertId});}
 catch(e){if(e.code==='ER_DUP_ENTRY')fail('Kode supplier sudah digunakan.',409);throw e;}
}));
router.put('/suppliers/:id',asyncRoute(async(req,res)=>{
 const id=int(req.params.id,1),code=clean(req.body.code,30).toUpperCase(),name=clean(req.body.name,140),phone=clean(req.body.phone,30),email=clean(req.body.email,190)||null,address=clean(req.body.address,500),active=req.body.active?1:0;
 if(!/^[A-Z0-9_-]{2,30}$/.test(code)||name.length<2)fail('Kode dan nama supplier wajib diisi.');
 const [r]=await pool.query('UPDATE suppliers SET code=?,name=?,phone=?,email=?,address=?,active=? WHERE id=?',[code,name,phone,email,address,active,id]);if(!r.affectedRows)fail('Supplier tidak ditemukan.',404);res.json({ok:true});
}));

router.post('/cash-bank-master',asyncRoute(async(req,res)=>{
 const code=clean(req.body.code,30).toUpperCase(),name=clean(req.body.name,120),kind=clean(req.body.kind,20),accountId=int(req.body.account_id,1),bank=clean(req.body.bank_name,80),no=clean(req.body.account_no,80),holder=clean(req.body.account_holder,120);
 if(!/^[A-Z0-9_-]{2,30}$/.test(code)||name.length<2||!['CASH','BANK','EWALLET'].includes(kind))fail('Periksa master kas/bank.');
 const [[a]]=await pool.query("SELECT id,type,system_key FROM accounting_accounts WHERE id=? AND active=1",[accountId]);if(!a||a.type!=='ASSET'||(a.system_key&&!['CASH','BCA','QRIS'].includes(a.system_key)))fail('Pilih akun aset kas/bank yang sesuai. Buat akun aset baru untuk rekening tambahan.');
 try{const cx=await pool.getConnection();try{await cx.beginTransaction();const [r]=await cx.query('INSERT INTO cash_bank_accounts(code,name,kind,account_id,bank_name,account_no,account_holder,active) VALUES(?,?,?,?,?,?,?,1)',[code,name,kind,accountId,bank,no,holder]);await cx.query('UPDATE accounting_accounts SET is_cash_bank=1 WHERE id=?',[accountId]);await cx.commit();res.status(201).json({id:r.insertId});}catch(e){await cx.rollback();throw e;}finally{cx.release();}}
 catch(e){if(e.code==='ER_DUP_ENTRY')fail('Kode kas/bank sudah digunakan.',409);throw e;}
}));
router.put('/cash-bank-master/:id',asyncRoute(async(req,res)=>{
 const id=int(req.params.id,1),name=clean(req.body.name,120),bank=clean(req.body.bank_name,80),no=clean(req.body.account_no,80),holder=clean(req.body.account_holder,120),active=req.body.active?1:0;
 if(name.length<2)fail('Nama kas/bank wajib diisi.');
 const [r]=await pool.query('UPDATE cash_bank_accounts SET name=?,bank_name=?,account_no=?,account_holder=?,active=? WHERE id=?',[name,bank,no,holder,active,id]);if(!r.affectedRows)fail('Kas/bank tidak ditemukan.',404);res.json({ok:true});
}));

router.get('/purchases',asyncRoute(async(req,res)=>{
 const from=dateOr(req.query.from,'2000-01-01'),to=dateOr(req.query.to,'2099-12-31');
 const [rows]=await pool.query(`SELECT p.*,s.code supplier_code,s.name supplier_name,cb.name cash_bank_name,j.journal_no
  FROM purchases p JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN cash_bank_accounts cb ON cb.id=p.cash_bank_account_id LEFT JOIN accounting_journals j ON j.id=p.journal_id
  WHERE p.purchase_date BETWEEN ? AND ? ORDER BY p.purchase_date DESC,p.id DESC LIMIT 300`,[from,to]);
 if(rows.length){const [items]=await pool.query(`SELECT pi.*,pr.sku,pr.name product_name,pr.variant,a.code account_code,a.name account_name FROM purchase_items pi LEFT JOIN products pr ON pr.id=pi.product_id JOIN accounting_accounts a ON a.id=pi.account_id WHERE pi.purchase_id IN (${rows.map(()=>'?').join(',')}) ORDER BY pi.id`,rows.map(x=>x.id));for(const p of rows)p.items=items.filter(x=>x.purchase_id===p.id);}
 res.json({purchases:rows});
}));

router.post('/purchases',asyncRoute(async(req,res)=>{
 const purchaseDate=dateOr(req.body.purchase_date,null);if(!purchaseDate)fail('Tanggal pembelian tidak valid.');
 const supplierId=int(req.body.supplier_id,1),payment=clean(req.body.payment_mode,10),invoice=clean(req.body.supplier_invoice_no,80),note=clean(req.body.note,500),dueDate=req.body.due_date?dateOr(req.body.due_date,null):null;
 if(!['CASH','CREDIT'].includes(payment))fail('Pilih cara pembayaran pembelian.');
 const cashBankId=payment==='CASH'?int(req.body.cash_bank_account_id,1):null;
 const input=Array.isArray(req.body.items)?req.body.items:[];if(!input.length||input.length>100)fail('Isi minimal satu item pembelian.');
 const invoiceDiscountType=normalizeDiscountType(req.body.invoice_discount_type);
 const invoiceDiscountValue=Number(req.body.invoice_discount_value||0);
 const landedCostTotal=Number(req.body.landed_cost_total||0);
 if(!Number.isFinite(invoiceDiscountValue)||invoiceDiscountValue<0)fail('Nilai diskon invoice tidak valid.');
 if(!Number.isFinite(landedCostTotal)||landedCostTotal<0)fail('Biaya pembelian / landed cost tidak valid.');
 const cx=await pool.getConnection();
 try{
  await cx.beginTransaction();
  const [[supplier]]=await cx.query('SELECT id,name FROM suppliers WHERE id=? AND active=1',[supplierId]);if(!supplier)fail('Supplier tidak aktif atau tidak ditemukan.');
  const cfg=await settings(cx);
  let creditAccountId=cfg.ap_account_id,cashName='Hutang Usaha';
  if(payment==='CASH'){
   const [[cb]]=await cx.query('SELECT cb.id,cb.name,cb.account_id FROM cash_bank_accounts cb WHERE cb.id=? AND cb.active=1 FOR UPDATE',[cashBankId]);if(!cb)fail('Kas/bank pembayaran tidak tersedia.');creditAccountId=cb.account_id;cashName=cb.name;
  }

  const drafts=[];
  for(const raw of input){
   const productId=raw.product_id?int(raw.product_id,1):null;
   const q=qty(raw.quantity??1);
   const unitPrice=amount(raw.unit_price??raw.unit_cost);
   const discountType=normalizeDiscountType(raw.discount_type);
   const discountValue=Number(raw.discount_value||0);
   if(!Number.isFinite(discountValue)||discountValue<0)fail('Nilai diskon item tidak valid.');
   if(discountType==='PERCENT'&&discountValue>100)fail('Diskon item persen maksimal 100%.');
   if(discountType==='AMOUNT'&&money(discountValue)>unitPrice)fail('Diskon rupiah per unit tidak boleh melebihi harga beli.');

   if(productId){
    const [[p]]=await cx.query('SELECT id,sku,name,variant,unit,stock,average_cost FROM products WHERE id=? FOR UPDATE',[productId]);if(!p)fail('Produk pembelian tidak ditemukan.');if(p.unit==='PCS'&&!Number.isInteger(q))fail('Pembelian produk kemasan harus dalam pcs utuh.');
    const desc=clean(raw.description,180)||`${p.name}${p.variant?` · ${p.variant}`:''}`;
    drafts.push({is_product:true,product:p,product_id:p.id,account_id:cfg.inventory_account_id,description:desc,quantity:q,unit_price:unitPrice,discount_type:discountType,discount_value:discountValue});
   }else{
    const accountId=int(raw.account_id,1),[[a]]=await cx.query("SELECT id,name,type,is_cash_bank FROM accounting_accounts WHERE id=? AND active=1",[accountId]);if(!a||a.is_cash_bank||['REVENUE','LIABILITY','EQUITY'].includes(a.type))fail('Akun pembelian non-stok harus akun debit yang sesuai (aset/beban/HPP).');
    const desc=clean(raw.description,180)||a.name;
    drafts.push({is_product:false,product:null,product_id:null,account_id:accountId,description:desc,quantity:q,unit_price:unitPrice,discount_type:discountType,discount_value:discountValue});
   }
  }

  let costing;
  try{costing=calculatePurchaseCosting({items:drafts,invoiceDiscountType,invoiceDiscountValue,landedCostTotal});}
  catch(e){fail(e instanceof Error?e.message:'Perhitungan HPP pembelian tidak valid.');}
  if(costing.total<=0)fail('Total pembelian setelah diskon harus lebih dari 0.');

  const lines=[];const itemRows=[];
  for(const x of costing.items){
   if(x.is_product){
    const p=x.product;
    const knownQty=Number(p.average_cost)>0?Number(p.stock):0;
    const knownValue=knownQty*Number(p.average_cost||0);
    const newAvg=money((knownValue+x.amount)/(knownQty+x.quantity));
    await cx.query('UPDATE products SET stock=stock+?,average_cost=? WHERE id=?',[x.quantity,newAvg,p.id]);
   }
   itemRows.push({
    product_id:x.product_id,account_id:x.account_id,description:x.description,quantity:x.quantity,
    unit_price:x.unit_price,discount_type:x.discount_type,discount_value:x.discount_value,
    gross_amount:x.gross_amount,discount_amount:x.discount_amount,invoice_discount_alloc:x.invoice_discount_alloc,
    landed_cost_alloc:x.landed_cost_alloc,unit_cost:x.unit_cost,amount:x.amount
   });
   if(x.amount>0)lines.push({account_id:x.account_id,debit:x.amount,credit:0,description:x.description,party_type:'SUPPLIER',party_id:supplierId});
  }

  lines.push({account_id:creditAccountId,debit:0,credit:costing.total,description:payment==='CASH'?`Pembayaran via ${cashName}`:'Hutang pembelian',party_type:'SUPPLIER',party_id:supplierId});
  const no=docNo('PB',purchaseDate);
  const [head]=await cx.query(`INSERT INTO purchases(
    purchase_no,purchase_date,supplier_id,supplier_invoice_no,payment_mode,cash_bank_account_id,due_date,
    gross_total,item_discount_total,invoice_discount_type,invoice_discount_value,invoice_discount_total,landed_cost_total,total,note,created_by
   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
    no,purchaseDate,supplierId,invoice,payment,cashBankId,dueDate,
    costing.gross_total,costing.item_discount_total,costing.invoice_discount_type,costing.invoice_discount_value,costing.invoice_discount_total,costing.landed_cost_total,costing.total,note,req.user.id
   ]);
  for(const x of itemRows)await cx.query(`INSERT INTO purchase_items(
    purchase_id,product_id,account_id,description,quantity,unit_price,discount_type,discount_value,gross_amount,discount_amount,
    invoice_discount_alloc,landed_cost_alloc,unit_cost,amount
   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
    head.insertId,x.product_id,x.account_id,x.description,x.quantity,x.unit_price,x.discount_type,x.discount_value,x.gross_amount,x.discount_amount,
    x.invoice_discount_alloc,x.landed_cost_alloc,x.unit_cost,x.amount
   ]);
  const journalId=await postJournal(cx,{journalNo:`PUR-${no}`,journalDate:purchaseDate,sourceType:'PURCHASE',sourceId:head.insertId,description:`Pembelian ${no} · ${supplier.name}`,referenceNo:invoice||no,createdBy:req.user.id},lines);
  await cx.query('UPDATE purchases SET journal_id=? WHERE id=?',[journalId,head.insertId]);
  await cx.commit();res.status(201).json({id:head.insertId,purchase_no:no,gross_total:costing.gross_total,item_discount_total:costing.item_discount_total,invoice_discount_total:costing.invoice_discount_total,landed_cost_total:costing.landed_cost_total,total:costing.total});
 }catch(e){await cx.rollback();throw e;}finally{cx.release();}
}));


router.get('/cash-bank',asyncRoute(async(req,res)=>{
 const from=dateOr(req.query.from,'2000-01-01'),to=dateOr(req.query.to,'2099-12-31');
 const [balances]=await pool.query(`SELECT cb.id,cb.code,cb.name,cb.kind,cb.bank_name,cb.account_no,cb.active,a.id account_id,a.code account_code,
   COALESCE(SUM(CASE WHEN j.status='POSTED' AND j.journal_date<=? THEN jl.debit-jl.credit ELSE 0 END),0) balance
   FROM cash_bank_accounts cb JOIN accounting_accounts a ON a.id=cb.account_id LEFT JOIN accounting_journal_lines jl ON jl.account_id=a.id LEFT JOIN accounting_journals j ON j.id=jl.journal_id
   GROUP BY cb.id,cb.code,cb.name,cb.kind,cb.bank_name,cb.account_no,cb.active,a.id,a.code ORDER BY cb.active DESC,cb.id`,[to]);
 const [transactions]=await pool.query(`SELECT t.*,cb.name cash_bank_name,tcb.name target_cash_bank_name,a.code counter_account_code,a.name counter_account_name,s.name supplier_name,j.journal_no
   FROM cash_bank_transactions t JOIN cash_bank_accounts cb ON cb.id=t.cash_bank_account_id LEFT JOIN cash_bank_accounts tcb ON tcb.id=t.target_cash_bank_account_id LEFT JOIN accounting_accounts a ON a.id=t.counter_account_id LEFT JOIN suppliers s ON s.id=t.supplier_id LEFT JOIN accounting_journals j ON j.id=t.journal_id
   WHERE t.transaction_date BETWEEN ? AND ? ORDER BY t.transaction_date DESC,t.id DESC LIMIT 300`,[from,to]);
 res.json({balances,transactions});
}));

router.post('/cash-bank',asyncRoute(async(req,res)=>{
 const transactionDate=dateOr(req.body.transaction_date,null);if(!transactionDate)fail('Tanggal transaksi tidak valid.');
 const direction=clean(req.body.direction,12);if(!['IN','OUT','TRANSFER'].includes(direction))fail('Jenis transaksi kas/bank tidak valid.');
 const sourceId=int(req.body.cash_bank_account_id,1),amt=amount(req.body.amount),description=clean(req.body.description,255),reference=clean(req.body.reference_no,80),supplierId=req.body.supplier_id?int(req.body.supplier_id,1):null;
 if(description.length<3)fail('Isi keterangan transaksi kas/bank.');
 const cx=await pool.getConnection();
 try{await cx.beginTransaction();const [[source]]=await cx.query('SELECT id,name,account_id FROM cash_bank_accounts WHERE id=? AND active=1',[sourceId]);if(!source)fail('Kas/bank sumber tidak ditemukan.');
  let targetId=null,counterId=null,lines=[];
  if(direction==='TRANSFER'){
   targetId=int(req.body.target_cash_bank_account_id,1);if(targetId===sourceId)fail('Kas/bank tujuan harus berbeda.');
   const [[target]]=await cx.query('SELECT id,name,account_id FROM cash_bank_accounts WHERE id=? AND active=1',[targetId]);if(!target)fail('Kas/bank tujuan tidak ditemukan.');
   lines=[{account_id:target.account_id,debit:amt,credit:0,description},{account_id:source.account_id,debit:0,credit:amt,description}];
  }else{
   counterId=int(req.body.counter_account_id,1);const [[counter]]=await cx.query('SELECT id,name,is_cash_bank,active FROM accounting_accounts WHERE id=?',[counterId]);if(!counter||!counter.active||counter.is_cash_bank)fail('Pilih akun lawan non kas/bank yang aktif.');
   lines=direction==='IN'?[{account_id:source.account_id,debit:amt,credit:0,description},{account_id:counterId,debit:0,credit:amt,description,party_type:supplierId?'SUPPLIER':null,party_id:supplierId}]:[{account_id:counterId,debit:amt,credit:0,description,party_type:supplierId?'SUPPLIER':null,party_id:supplierId},{account_id:source.account_id,debit:0,credit:amt,description}];
  }
  const no=docNo('CB',transactionDate);const [h]=await cx.query('INSERT INTO cash_bank_transactions(transaction_no,transaction_date,direction,cash_bank_account_id,target_cash_bank_account_id,counter_account_id,supplier_id,amount,description,reference_no,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[no,transactionDate,direction,sourceId,targetId,counterId,supplierId,amt,description,reference,req.user.id]);
  const journalId=await postJournal(cx,{journalNo:`CB-${no}`,journalDate:transactionDate,sourceType:'CASH_BANK',sourceId:h.insertId,description,referenceNo:reference||no,createdBy:req.user.id},lines);await cx.query('UPDATE cash_bank_transactions SET journal_id=? WHERE id=?',[journalId,h.insertId]);await cx.commit();res.status(201).json({id:h.insertId,transaction_no:no});
 }catch(e){await cx.rollback();throw e;}finally{cx.release();}
}));

router.post('/opening-balance',asyncRoute(async(req,res)=>{
 const journalDate=dateOr(req.body.journal_date,null);if(!journalDate)fail('Tanggal saldo awal tidak valid.');const input=Array.isArray(req.body.lines)?req.body.lines:[];if(!input.length||input.length>100)fail('Isi saldo awal minimal satu akun.');
 const cx=await pool.getConnection();try{await cx.beginTransaction();const cfg=await settings(cx);const lines=[];let debit=0,credit=0;
 for(const raw of input){const accountId=int(raw.account_id,1);if(accountId===cfg.opening_equity_account_id)fail('Akun penyeimbang saldo awal diisi otomatis.');const [[a]]=await cx.query("SELECT id,name,type FROM accounting_accounts WHERE id=? AND active=1",[accountId]);if(!a||['REVENUE','COGS','EXPENSE'].includes(a.type))fail('Saldo awal hanya untuk akun neraca.');const amt=amount(raw.amount),side=raw.side==='CREDIT'?'CREDIT':'DEBIT';lines.push({account_id:accountId,debit:side==='DEBIT'?amt:0,credit:side==='CREDIT'?amt:0,description:'Saldo awal'});if(side==='DEBIT')debit=money(debit+amt);else credit=money(credit+amt);}
 if(debit>credit)lines.push({account_id:cfg.opening_equity_account_id,debit:0,credit:money(debit-credit),description:'Penyeimbang saldo awal'});else if(credit>debit)lines.push({account_id:cfg.opening_equity_account_id,debit:money(credit-debit),credit:0,description:'Penyeimbang saldo awal'});else if(lines.length<2)fail('Saldo awal membutuhkan lebih dari satu akun atau nilai penyeimbang.');
 const no=docNo('OB',journalDate);const id=await postJournal(cx,{journalNo:no,journalDate,sourceType:'OPENING',description:'Saldo awal / penyesuaian awal',referenceNo:no,createdBy:req.user.id},lines);await cx.commit();res.status(201).json({id,journal_no:no});}catch(e){await cx.rollback();throw e;}finally{cx.release();}
}));

router.get('/reports/purchase-journal',asyncRoute(async(req,res)=>{
 const from=dateOr(req.query.from,'2000-01-01'),to=dateOr(req.query.to,today());
 const [rows]=await pool.query(`SELECT p.purchase_date,p.purchase_no,p.supplier_invoice_no,s.code supplier_code,s.name supplier_name,p.payment_mode,cb.name cash_bank_name,p.total,j.journal_no
  FROM purchases p JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN cash_bank_accounts cb ON cb.id=p.cash_bank_account_id LEFT JOIN accounting_journals j ON j.id=p.journal_id WHERE p.status='POSTED' AND p.purchase_date BETWEEN ? AND ? ORDER BY p.purchase_date,p.id`,[from,to]);
 res.json({from,to,rows,total:money(rows.reduce((n,x)=>n+Number(x.total),0))});
}));

router.get('/reports/general-ledger',asyncRoute(async(req,res)=>{
 const from=dateOr(req.query.from,'2000-01-01'),to=dateOr(req.query.to,today()),accountId=int(req.query.account_id,1);const [[account]]=await pool.query('SELECT * FROM accounting_accounts WHERE id=?',[accountId]);if(!account)fail('Akun buku besar tidak ditemukan.',404);
 const [[opening]]=await pool.query(`SELECT COALESCE(SUM(jl.debit-jl.credit),0) raw_balance FROM accounting_journal_lines jl JOIN accounting_journals j ON j.id=jl.journal_id WHERE j.status='POSTED' AND jl.account_id=? AND j.journal_date<?`,[accountId,from]);
 const [rows]=await pool.query(`SELECT j.journal_date,j.journal_no,j.source_type,j.reference_no,j.description journal_description,jl.description,jl.debit,jl.credit FROM accounting_journal_lines jl JOIN accounting_journals j ON j.id=jl.journal_id WHERE j.status='POSTED' AND jl.account_id=? AND j.journal_date BETWEEN ? AND ? ORDER BY j.journal_date,j.id,jl.id`,[accountId,from,to]);
 let running=Number(opening.raw_balance);for(const row of rows){running=money(running+Number(row.debit)-Number(row.credit));row.running_raw=running;}
 res.json({from,to,account,opening_raw:Number(opening.raw_balance),closing_raw:running,rows});
}));

router.get('/reports/profit-loss',asyncRoute(async(req,res)=>{
 const from=dateOr(req.query.from,'2000-01-01'),to=dateOr(req.query.to,today());
 const [rows]=await pool.query(`SELECT a.id,a.code,a.name,a.type,a.report_group,a.normal_balance,COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jl.debit ELSE 0 END),0) debit,COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jl.credit ELSE 0 END),0) credit FROM accounting_accounts a LEFT JOIN accounting_journal_lines jl ON jl.account_id=a.id LEFT JOIN accounting_journals j ON j.id=jl.journal_id AND j.status='POSTED' AND j.journal_date BETWEEN ? AND ? WHERE a.type IN ('REVENUE','COGS','EXPENSE') GROUP BY a.id,a.code,a.name,a.type,a.report_group,a.normal_balance ORDER BY a.sort_order,a.code`,[from,to]);
 for(const r of rows)r.amount=money(r.type==='REVENUE'?Number(r.credit)-Number(r.debit):Number(r.debit)-Number(r.credit));
 const revenue=money(rows.filter(x=>x.type==='REVENUE').reduce((n,x)=>n+x.amount,0)),cogs=money(rows.filter(x=>x.type==='COGS').reduce((n,x)=>n+x.amount,0)),expense=money(rows.filter(x=>x.type==='EXPENSE').reduce((n,x)=>n+x.amount,0));
 res.json({from,to,rows,totals:{revenue,cogs,gross_profit:money(revenue-cogs),expense,net_profit:money(revenue-cogs-expense)}});
}));

router.get('/reports/balance-sheet',asyncRoute(async(req,res)=>{
 const asOf=dateOr(req.query.as_of,today());
 const [rows]=await pool.query(`SELECT a.id,a.code,a.name,a.type,a.report_group,a.normal_balance,COALESCE(SUM(CASE WHEN j.status='POSTED' AND j.journal_date<=? THEN jl.debit ELSE 0 END),0) debit,COALESCE(SUM(CASE WHEN j.status='POSTED' AND j.journal_date<=? THEN jl.credit ELSE 0 END),0) credit FROM accounting_accounts a LEFT JOIN accounting_journal_lines jl ON jl.account_id=a.id LEFT JOIN accounting_journals j ON j.id=jl.journal_id WHERE a.type IN ('ASSET','LIABILITY','EQUITY') GROUP BY a.id,a.code,a.name,a.type,a.report_group,a.normal_balance ORDER BY a.sort_order,a.code`,[asOf,asOf]);
 for(const r of rows)r.amount=money(r.type==='ASSET'?Number(r.debit)-Number(r.credit):Number(r.credit)-Number(r.debit));
 const [[pl]]=await pool.query(`SELECT COALESCE(SUM(CASE WHEN a.type='REVENUE' THEN jl.credit-jl.debit WHEN a.type IN ('COGS','EXPENSE') THEN jl.credit-jl.debit ELSE 0 END),0) earnings FROM accounting_journal_lines jl JOIN accounting_journals j ON j.id=jl.journal_id JOIN accounting_accounts a ON a.id=jl.account_id WHERE j.status='POSTED' AND j.journal_date<=? AND a.type IN ('REVENUE','COGS','EXPENSE')`,[asOf]);
 const assets=rows.filter(x=>x.type==='ASSET'),liabilities=rows.filter(x=>x.type==='LIABILITY'),equity=rows.filter(x=>x.type==='EQUITY');const currentEarnings=money(pl.earnings);
 res.json({as_of:asOf,assets,liabilities,equity,current_earnings:currentEarnings,totals:{assets:money(assets.reduce((n,x)=>n+x.amount,0)),liabilities:money(liabilities.reduce((n,x)=>n+x.amount,0)),equity:money(equity.reduce((n,x)=>n+x.amount,0)+currentEarnings)}});
}));

router.get('/reports/cash-flow',asyncRoute(async(req,res)=>{
 const from=dateOr(req.query.from,'2000-01-01'),to=dateOr(req.query.to,today());
 const [[opening]]=await pool.query(`SELECT COALESCE(SUM(jl.debit-jl.credit),0) amount FROM accounting_journal_lines jl JOIN accounting_journals j ON j.id=jl.journal_id JOIN accounting_accounts a ON a.id=jl.account_id WHERE j.status='POSTED' AND a.is_cash_bank=1 AND (j.journal_date<? OR (j.source_type='OPENING' AND j.journal_date<=?))`,[from,from]);
 const [rows]=await pool.query(`SELECT j.id,j.journal_date,j.journal_no,j.source_type,j.description,
   SUM(CASE WHEN ca.is_cash_bank=1 THEN jl.debit-jl.credit ELSE 0 END) cash_delta,
   MAX(CASE WHEN ca.is_cash_bank=0 AND ca.cashflow_group='FINANCING' THEN 3 WHEN ca.is_cash_bank=0 AND ca.cashflow_group='INVESTING' THEN 2 WHEN ca.is_cash_bank=0 THEN 1 ELSE 0 END) flow_rank
   FROM accounting_journals j JOIN accounting_journal_lines jl ON jl.journal_id=j.id JOIN accounting_accounts ca ON ca.id=jl.account_id
   WHERE j.status='POSTED' AND j.source_type<>'OPENING' AND j.journal_date BETWEEN ? AND ? GROUP BY j.id,j.journal_date,j.journal_no,j.source_type,j.description HAVING ABS(cash_delta)>.009 ORDER BY j.journal_date,j.id`,[from,to]);
 const groups={OPERATING:[],INVESTING:[],FINANCING:[]};let movement=0;for(const r of rows){r.cash_delta=money(r.cash_delta);r.group=r.flow_rank===3?'FINANCING':r.flow_rank===2?'INVESTING':'OPERATING';groups[r.group].push(r);movement=money(movement+r.cash_delta);}
 const sums={operating:money(groups.OPERATING.reduce((n,x)=>n+x.cash_delta,0)),investing:money(groups.INVESTING.reduce((n,x)=>n+x.cash_delta,0)),financing:money(groups.FINANCING.reduce((n,x)=>n+x.cash_delta,0))};
 res.json({from,to,opening_cash:money(opening.amount),groups,sums,net_change:movement,ending_cash:money(Number(opening.amount)+movement)});
}));

router.get('/reports/worksheet',asyncRoute(async(req,res)=>{
 const from=dateOr(req.query.from,'2000-01-01'),to=dateOr(req.query.to,today());
 const [rows]=await pool.query(`SELECT a.id,a.code,a.name,a.type,a.normal_balance,a.report_group,
   COALESCE(SUM(CASE WHEN j.status='POSTED' AND j.journal_date<? THEN jl.debit-jl.credit ELSE 0 END),0) opening_raw,
   COALESCE(SUM(CASE WHEN j.status='POSTED' AND j.journal_date BETWEEN ? AND ? THEN jl.debit ELSE 0 END),0) period_debit,
   COALESCE(SUM(CASE WHEN j.status='POSTED' AND j.journal_date BETWEEN ? AND ? THEN jl.credit ELSE 0 END),0) period_credit
   FROM accounting_accounts a LEFT JOIN accounting_journal_lines jl ON jl.account_id=a.id LEFT JOIN accounting_journals j ON j.id=jl.journal_id
   GROUP BY a.id,a.code,a.name,a.type,a.normal_balance,a.report_group ORDER BY a.sort_order,a.code`,[from,from,to,from,to]);
 let netProfit=0;for(const r of rows){const isPL=['REVENUE','COGS','EXPENSE'].includes(r.type);r.opening_raw=isPL?0:money(r.opening_raw);r.period_debit=money(r.period_debit);r.period_credit=money(r.period_credit);const end=money(r.opening_raw+r.period_debit-r.period_credit);r.ending_debit=end>=0?end:0;r.ending_credit=end<0?-end:0;r.pl_debit=0;r.pl_credit=0;r.bs_debit=0;r.bs_credit=0;if(isPL){r.pl_debit=r.ending_debit;r.pl_credit=r.ending_credit;if(r.type==='REVENUE')netProfit=money(netProfit+(r.ending_credit-r.ending_debit));else netProfit=money(netProfit-(r.ending_debit-r.ending_credit));}else{r.bs_debit=r.ending_debit;r.bs_credit=r.ending_credit;}}
 res.json({from,to,rows,net_profit:netProfit});
}));

module.exports=router;
