const router=require('express').Router();const crypto=require('node:crypto');
const {pool,getSettings}=require('../db');const {asyncRoute,fail,clean,int}=require('../utils');
const {requireUser}=require('../auth');const {uploader,validateImage,imageUrl}=require('../uploads');
const {releaseOverdue,orderWithItems,quoteUserCart}=require('../services/orders');
router.use(requireUser);
router.get('/my',asyncRoute(async(req,res)=>{
 await releaseOverdue();const [rows]=await pool.query('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100',[req.user.id]);
 const s=await getSettings();res.json({orders:await orderWithItems(pool,rows),payment:{bank_name:s.bank_name,bank_account:s.bank_account,bank_holder:s.bank_holder,qris_url:imageUrl('qris',s.qris_filename),whatsapp:s.whatsapp}});
}));
router.post('/',asyncRoute(async(req,res)=>{
 await releaseOverdue();const fulfillment=req.body.fulfillment,paymentMethod=req.body.payment_method;
 if(!['PICKUP','DELIVERY'].includes(fulfillment)||!['QRIS','BCA'].includes(paymentMethod))fail('Pilih metode penerimaan dan pembayaran.');
 const recipient=clean(req.body.recipient_name,120),phone=clean(req.body.recipient_phone,30),address=clean(req.body.address,500),note=clean(req.body.note,500);
 if(recipient.length<2||!/^\+?[\d\s-]{8,30}$/.test(phone))fail('Isi nama dan nomor WhatsApp penerima yang valid.');
 if(fulfillment==='DELIVERY'&&address.length<10)fail('Isi alamat pengiriman lebih lengkap.');
 const cx=await pool.getConnection();try{await cx.beginTransaction();const s=await getSettings(cx);
 if(paymentMethod==='BCA'&&(!s.bank_account||!s.bank_holder))fail('Transfer BCA belum diatur admin. Silakan pilih metode lain.');
 if(paymentMethod==='QRIS'&&!s.qris_filename)fail('QRIS belum tersedia. Silakan pilih metode lain.');
 const quote=await quoteUserCart(cx,req.user.id,fulfillment,s);
 if(Number(req.body.expected_total)!==quote.total)fail('Harga atau promo berubah. Kembali ke keranjang dan periksa total terbaru.',409);
 const orderNo=`RN${new Date().toISOString().slice(0,10).replaceAll('-','')}${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
 const [result]=await cx.query("INSERT INTO orders(order_no,user_id,recipient_name,recipient_phone,fulfillment,address,note,payment_method,subtotal,discount,shipping,total,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? HOUR))",[orderNo,req.user.id,recipient,phone,fulfillment,address||null,note,paymentMethod,quote.subtotal,quote.discount,quote.shipping,quote.total,s.payment_expiry_hours]);
 for(const item of quote.lines){await cx.query('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?',[item.quantity,item.product_id,item.quantity]);
 await cx.query('INSERT INTO order_items(order_id,product_id,sku,name,variant,unit,size_label,quantity,unit_price,unit_cost,unit_discount,line_total,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[result.insertId,item.product_id,item.sku,item.name,item.variant,item.unit,item.size_label,item.quantity,item.price,item.average_cost||0,item.unitDiscount,item.lineTotal,item.note||'']);}
 await cx.query('DELETE FROM cart_items WHERE user_id=?',[req.user.id]);await cx.query('DELETE FROM cart_notes WHERE user_id=?',[req.user.id]);await cx.commit();res.status(201).json({id:result.insertId,order_no:orderNo});
 }catch(e){await cx.rollback();throw e;}finally{cx.release();}
}));
router.post('/:id/proof',uploader('proofs'),validateImage,asyncRoute(async(req,res)=>{
 if(!req.file)fail('Pilih foto bukti pembayaran terlebih dahulu.');await releaseOverdue();
 const [result]=await pool.query("UPDATE orders SET proof_filename=?,payment_note=NULL,status='PAYMENT_REVIEW' WHERE id=? AND user_id=? AND status IN ('AWAITING_PAYMENT','PAYMENT_REJECTED') AND expires_at>NOW()",[req.file.filename,int(req.params.id,1),req.user.id]);
 if(!result.affectedRows)fail('Pesanan sudah kedaluwarsa atau tidak bisa menerima bukti pembayaran.',409);
 res.json({ok:true,message:'Bukti pembayaran diterima, menunggu verifikasi penjual.'});
}));
router.post('/:id/cancel',asyncRoute(async(req,res)=>{
 const cx=await pool.getConnection();try{await cx.beginTransaction();const [[o]]=await cx.query('SELECT id,status,user_id FROM orders WHERE id=? FOR UPDATE',[int(req.params.id,1)]);
 if(!o||o.user_id!==req.user.id)fail('Pesanan tidak ditemukan.',404);
 if(!['AWAITING_PAYMENT','PAYMENT_REJECTED'].includes(o.status))fail('Pesanan ini tidak bisa dibatalkan sendiri. Hubungi penjual.',409);
 const [items]=await cx.query('SELECT product_id,quantity FROM order_items WHERE order_id=? ORDER BY product_id',[o.id]);for(const it of items)await cx.query('UPDATE products SET stock=stock+? WHERE id=?',[it.quantity,it.product_id]);
 await cx.query("UPDATE orders SET status='CANCELLED' WHERE id=?",[o.id]);await cx.commit();res.json({ok:true});
 }catch(e){await cx.rollback();throw e;}finally{cx.release();}
}));
module.exports=router;
