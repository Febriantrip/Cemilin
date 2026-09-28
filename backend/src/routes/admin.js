const router=require('express').Router();
const {pool,getSettings}=require('../db');
const {asyncRoute,fail,int,clean}=require('../utils');
const {requireUser,requireAdmin}=require('../auth');
const {uploader,validateImage,imageUrl}=require('../uploads');
const {orderWithItems,releaseOverdue}=require('../services/orders');
const {canTransition}=require('../services/order-status');
const {postSalesJournal}=require('../services/accounting');

router.use(requireUser,requireAdmin);

const productInput=b=>{
  const sku=clean(b.sku,48).toUpperCase();
  const name=clean(b.name,130);
  const variant=clean(b.variant,80);
  const category=b.category;
  const unit=b.unit;
  const sizeLabel=clean(b.size_label,32);
  const description=clean(b.description,1500);
  const price=int(b.price,1,100000000);
  const stock=Number(b.stock);
  const sort=int(b.sort_order??0,0,1000000);
  if(!/^[A-Z0-9_-]{3,48}$/.test(sku)||name.length<2||!['Basreng','Makaroni','Usus','Kripca'].includes(category)||!['PCS','KG'].includes(unit)||!sizeLabel){
    fail('Periksa SKU, nama, kategori, satuan, dan ukuran produk.');
  }
  if(!Number.isFinite(stock)||stock<0||stock>100000||Math.round(stock*1000)!==stock*1000||(unit==='PCS'&&!Number.isInteger(stock))){
    fail('Stok produk tidak valid.');
  }
  return [sku,name,variant,category,unit,sizeLabel,description,price,stock,sort];
};

const analyticsBuckets={
  PREPARE:['PAID'],
  PROCESSING:['PROCESSING'],
  SHIPPED:['SHIPPED'],
  COMPLETED:['COMPLETED'],
  ALL:['PAID','PROCESSING','SHIPPED','COMPLETED'],
};
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:null;

router.get('/dashboard',asyncRoute(async(_req,res)=>{
  await releaseOverdue();
  const [[data]]=await pool.query(`
    SELECT COUNT(*) total_orders,
      COALESCE(SUM(status IN ('AWAITING_PAYMENT','PAYMENT_REJECTED')),0) awaiting_payment,
      COALESCE(SUM(status='PAYMENT_REVIEW'),0) payment_review,
      COALESCE(SUM(status='PAID'),0) prepare,
      COALESCE(SUM(status='PROCESSING'),0) processing,
      COALESCE(SUM(status='SHIPPED'),0) shipped,
      COALESCE(SUM(CASE WHEN status IN ('PAID','PROCESSING','READY','SHIPPED','COMPLETED') THEN total ELSE 0 END),0) revenue
    FROM orders
  `);
  const [[products]]=await pool.query('SELECT COUNT(*) count FROM products WHERE active=1');
  const [preparationItems]=await pool.query(`
    SELECT oi.product_id,oi.sku,oi.name,oi.variant,COALESCE(p.category,'Camilan') category,
      oi.unit,oi.size_label,SUM(oi.quantity) quantity,COUNT(DISTINCT oi.order_id) order_count
    FROM order_items oi
    JOIN orders o ON o.id=oi.order_id
    LEFT JOIN products p ON p.id=oi.product_id
    WHERE o.status='PAID'
    GROUP BY oi.product_id,oi.sku,oi.name,oi.variant,p.category,oi.unit,oi.size_label
    ORDER BY SUM(oi.quantity) DESC,oi.name ASC,oi.variant ASC
    LIMIT 8
  `);
  res.json({data:{...data,products:products.count,preparation_items:preparationItems}});
}));

router.get('/item-summary',asyncRoute(async(req,res)=>{
  await releaseOverdue();
  const bucket=analyticsBuckets[req.query.bucket]?req.query.bucket:'PREPARE';
  const statuses=analyticsBuckets[bucket];
  const productId=req.query.product_id&&req.query.product_id!=='ALL'?int(req.query.product_id,1):null;
  const from=validDate(req.query.from);
  const to=validDate(req.query.to);
  const conditions=[];
  const params=[];
  if(productId){conditions.push('oi.product_id=?');params.push(productId);}
  if(from){conditions.push('DATE(COALESCE(o.paid_at,o.created_at))>=?');params.push(from);}
  if(to){conditions.push('DATE(COALESCE(o.paid_at,o.created_at))<=?');params.push(to);}
  const sharedWhere=conditions.length?' AND '+conditions.join(' AND '):'';
  const placeholders=statuses.map(()=>'?').join(',');
  const rowParams=[...statuses,...params];
  const [rows]=await pool.query(`
    SELECT oi.product_id,oi.sku,oi.name,oi.variant,oi.unit,oi.size_label,
      SUM(oi.quantity) quantity,
      COUNT(DISTINCT oi.order_id) order_count,
      SUM(oi.line_total) revenue
    FROM order_items oi
    JOIN orders o ON o.id=oi.order_id
    WHERE o.status IN (${placeholders})${sharedWhere}
    GROUP BY oi.product_id,oi.sku,oi.name,oi.variant,oi.unit,oi.size_label
    ORDER BY SUM(oi.quantity) DESC,oi.name ASC,oi.variant ASC
  `,rowParams);

  const stageParams=[...params];
  const [[stageTotals]]=await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN o.status='PAID' THEN oi.quantity ELSE 0 END),0) prepare_qty,
      COUNT(DISTINCT CASE WHEN o.status='PAID' THEN o.id END) prepare_orders,
      COALESCE(SUM(CASE WHEN o.status='PROCESSING' THEN oi.quantity ELSE 0 END),0) processing_qty,
      COUNT(DISTINCT CASE WHEN o.status='PROCESSING' THEN o.id END) processing_orders,
      COALESCE(SUM(CASE WHEN o.status='SHIPPED' THEN oi.quantity ELSE 0 END),0) shipped_qty,
      COUNT(DISTINCT CASE WHEN o.status='SHIPPED' THEN o.id END) shipped_orders,
      COALESCE(SUM(CASE WHEN o.status='COMPLETED' THEN oi.quantity ELSE 0 END),0) completed_qty,
      COUNT(DISTINCT CASE WHEN o.status='COMPLETED' THEN o.id END) completed_orders
    FROM order_items oi
    JOIN orders o ON o.id=oi.order_id
    WHERE o.status IN ('PAID','PROCESSING','SHIPPED','COMPLETED')${sharedWhere}
  `,stageParams);
  const [[totals]]=await pool.query(`
    SELECT COALESCE(SUM(oi.quantity),0) quantity,COUNT(DISTINCT oi.order_id) order_count,COALESCE(SUM(oi.line_total),0) revenue
    FROM order_items oi JOIN orders o ON o.id=oi.order_id
    WHERE o.status IN (${placeholders})${sharedWhere}
  `,rowParams);
  const [products]=await pool.query(`
    SELECT id,sku,name,variant,unit,size_label,active
    FROM products
    ORDER BY active DESC,sort_order,id
  `);
  res.json({bucket,rows,totals,stage_totals:stageTotals,products});
}));

router.get('/orders',asyncRoute(async(req,res)=>{
  await releaseOverdue();
  const allowed=['ALL','AWAITING_PAYMENT','PAYMENT_REVIEW','PAYMENT_REJECTED','PAID','PROCESSING','READY','SHIPPED','COMPLETED','CANCELLED','EXPIRED'];
  const status=allowed.includes(req.query.status)?req.query.status:'ALL';
  const [rows]=await pool.query(`SELECT o.*,u.email customer_email,u.username customer_username FROM orders o JOIN users u ON u.id=o.user_id ${status==='ALL'?'':'WHERE o.status=?'} ORDER BY o.created_at DESC,o.id DESC LIMIT 200`,status==='ALL'?[]:[status]);
  res.json({orders:await orderWithItems(pool,rows)});
}));

router.patch('/orders/:id/status',asyncRoute(async(req,res)=>{
  const next=clean(req.body.status,30);
  const note=clean(req.body.payment_note,500);
  const cx=await pool.getConnection();
  try{
    await cx.beginTransaction();
    const [[o]]=await cx.query('SELECT id,status,fulfillment FROM orders WHERE id=? FOR UPDATE',[int(req.params.id,1)]);
    if(!o)fail('Pesanan tidak ditemukan.',404);
    if(!canTransition(o.status,next))fail('Perubahan status tidak sesuai alur pembayaran dan pesanan.',409);
    if(next==='PAYMENT_REJECTED'&&!note)fail('Berikan alasan penolakan bukti pembayaran.');
    if(next==='SHIPPED'&&o.fulfillment!=='DELIVERY')fail('Status Sudah dikirim hanya untuk pesanan pengiriman.',409);
    if(next==='CANCELLED'){
      const [items]=await cx.query('SELECT product_id,quantity FROM order_items WHERE order_id=? ORDER BY product_id',[o.id]);
      for(const it of items)await cx.query('UPDATE products SET stock=stock+? WHERE id=?',[it.quantity,it.product_id]);
    }
    const settings=await getSettings(cx);
    await cx.query("UPDATE orders SET status=?,payment_note=?,paid_at=IF(?='PAID',NOW(),paid_at),expires_at=IF(?='PAYMENT_REJECTED',DATE_ADD(NOW(),INTERVAL ? HOUR),expires_at) WHERE id=?",[next,next==='PAYMENT_REJECTED'?note:null,next,next,settings.payment_expiry_hours,o.id]);
    if(next==='PAID')await postSalesJournal(cx,o.id,req.user.id);
    await cx.commit();
    res.json({ok:true});
  }catch(e){await cx.rollback();throw e;}finally{cx.release();}
}));

router.get('/products',asyncRoute(async(_req,res)=>{
  const [products]=await pool.query('SELECT * FROM products ORDER BY sort_order,id');
  res.json({products:products.map(p=>({...p,image_url:imageUrl('products',p.image_filename)}))});
}));
router.post('/products',asyncRoute(async(req,res)=>{
  const v=productInput(req.body);
  try{const [r]=await pool.query('INSERT INTO products(sku,name,variant,category,unit,size_label,description,price,stock,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)',v);res.status(201).json({id:r.insertId});}
  catch(e){if(e.code==='ER_DUP_ENTRY')fail('SKU sudah digunakan.',409);throw e;}
}));
router.put('/products/:id',asyncRoute(async(req,res)=>{
  const v=productInput(req.body);
  try{const [r]=await pool.query('UPDATE products SET sku=?,name=?,variant=?,category=?,unit=?,size_label=?,description=?,price=?,stock=?,sort_order=?,active=? WHERE id=?',[...v,req.body.active?1:0,int(req.params.id,1)]);if(!r.affectedRows)fail('Produk tidak ditemukan.',404);res.json({ok:true});}
  catch(e){if(e.code==='ER_DUP_ENTRY')fail('SKU sudah digunakan.',409);throw e;}
}));
router.post('/products/:id/image',uploader('products'),validateImage,asyncRoute(async(req,res)=>{
  if(!req.file)fail('Pilih foto produk terlebih dahulu.');
  const [r]=await pool.query('UPDATE products SET image_filename=? WHERE id=?',[req.file.filename,int(req.params.id,1)]);
  if(!r.affectedRows)fail('Produk tidak ditemukan.',404);
  res.json({image_url:imageUrl('products',req.file.filename)});
}));

router.get('/settings',asyncRoute(async(_req,res)=>{
  const s=await getSettings();
  res.json({settings:{...s,qris_url:imageUrl('qris',s.qris_filename)}});
}));
router.put('/settings',asyncRoute(async(req,res)=>{
  const b=req.body;
  const storeName=clean(b.store_name,100),storeAddress=clean(b.store_address,500),headline=clean(b.headline,180),whatsapp=clean(b.whatsapp,30),bankName=clean(b.bank_name,40),account=clean(b.bank_account,40),holder=clean(b.bank_holder,100);
  const promoEnabled=(b.promo_enabled===true||b.promo_enabled===1)?1:(b.promo_enabled===false||b.promo_enabled===0)?0:null;
  if(promoEnabled===null)fail('Status promo tidak valid.');
  const t1=int(b.min_qty_tier1,1,9999),d1=int(b.discount_tier1,0,1000000),t2=int(b.min_qty_tier2,2,9999),d2=int(b.discount_tier2,0,1000000),shipping=int(b.shipping_flat,0,10000000),hours=int(b.payment_expiry_hours,1,168);
  if(!storeName||!headline||t2<=t1||d2<d1)fail('Nama toko, headline, dan urutan diskon perlu diperiksa.');
  await pool.query('UPDATE store_settings SET store_name=?,store_address=?,headline=?,whatsapp=?,bank_name=?,bank_account=?,bank_holder=?,min_qty_tier1=?,discount_tier1=?,min_qty_tier2=?,discount_tier2=?,shipping_flat=?,payment_expiry_hours=?,promo_enabled=? WHERE id=1',[storeName,storeAddress,headline,whatsapp,bankName,account,holder,t1,d1,t2,d2,shipping,hours,promoEnabled]);
  res.json({ok:true});
}));
router.patch('/settings/promo',asyncRoute(async(req,res)=>{
  const v=req.body?.promo_enabled;
  if(v!==true&&v!==false&&v!==1&&v!==0)fail('Status promo tidak valid.');
  const active=v===true||v===1?1:0;
  await pool.query('UPDATE store_settings SET promo_enabled=? WHERE id=1',[active]);
  res.json({ok:true,promo_enabled:active});
}));
router.post('/settings/qris',uploader('qris'),validateImage,asyncRoute(async(req,res)=>{
  if(!req.file)fail('Pilih gambar QRIS resmi milik toko.');
  await pool.query('UPDATE store_settings SET qris_filename=? WHERE id=1',[req.file.filename]);
  res.json({qris_url:imageUrl('qris',req.file.filename)});
}));

module.exports=router;
