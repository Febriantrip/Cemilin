const {pool}=require('../db');
const {priceCart}=require('../pricing');
const {fail}=require('../utils');
async function releaseOverdue(){
 const [rows]=await pool.query("SELECT id FROM orders WHERE status IN ('AWAITING_PAYMENT','PAYMENT_REJECTED') AND expires_at<NOW() LIMIT 100");
 for(const r of rows){const cx=await pool.getConnection();try{await cx.beginTransaction();
   const [[order]]=await cx.query('SELECT id,status,(expires_at<NOW()) AS overdue FROM orders WHERE id=? FOR UPDATE',[r.id]);
   if(['AWAITING_PAYMENT','PAYMENT_REJECTED'].includes(order?.status)&&order.overdue){
     const [items]=await cx.query('SELECT product_id,quantity FROM order_items WHERE order_id=? ORDER BY product_id',[r.id]);
     for(const it of items)await cx.query('UPDATE products SET stock=stock+? WHERE id=?',[it.quantity,it.product_id]);
     await cx.query("UPDATE orders SET status='EXPIRED' WHERE id=?",[r.id]);
   }await cx.commit();}catch(e){await cx.rollback();console.error('Expiration:',e.message);}finally{cx.release();}}
}
async function orderWithItems(conn,orders){if(!orders.length)return orders;const [items]=await conn.query(`SELECT * FROM order_items WHERE order_id IN (${orders.map(()=>'?').join(',')})`,orders.map(o=>o.id));return orders.map(o=>({...o,items:items.filter(it=>it.order_id===o.id)}));}
async function quoteUserCart(conn,userId,fulfillment,settings){
 const [cart]=await conn.query('SELECT c.product_id,c.quantity,c.note,p.sku,p.name,p.variant,p.category,p.unit,p.size_label,p.price,p.average_cost,p.stock,p.active,p.image_filename FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY p.id FOR UPDATE',[userId]);
 if(!cart.length)fail('Keranjang masih kosong.');for(const p of cart)if(!p.active||p.stock<p.quantity)fail(`Stok ${p.name} ${p.variant} tidak cukup, silakan periksa keranjang.`);
 return priceCart(cart,settings,fulfillment);
}
module.exports={releaseOverdue,orderWithItems,quoteUserCart};
