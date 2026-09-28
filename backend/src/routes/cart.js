const router=require('express').Router();
const {pool,getSettings}=require('../db');
const {asyncRoute,fail,qty,int}=require('../utils');
const {requireUser}=require('../auth');
const {priceCart}=require('../pricing');
const {imageUrl}=require('../uploads');
const {swapCartVariant}=require('../cart-variant');
router.use(requireUser);

async function getCart(userId){
 const [items]=await pool.query('SELECT p.id AS id,c.product_id,c.quantity,c.note,p.sku,p.name,p.variant,p.category,p.unit,p.size_label,p.price,p.stock,p.active,p.image_filename FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY p.sort_order,p.id',[userId]);
 const [[general]] = await pool.query('SELECT note FROM cart_notes WHERE user_id=?',[userId]);
 const s=await getSettings();
 return {note:general?.note||'',items:items.map(p=>({...p,image_url:imageUrl('products',p.image_filename)})),pricing:priceCart(items,s)};
}
router.get('/',asyncRoute(async(req,res)=>res.json(await getCart(req.user.id))));
router.patch('/note',asyncRoute(async(req,res)=>{
 if(typeof req.body?.note!=='string'||req.body.note.length>500)fail('Catatan umum maksimal 500 karakter.');
 const note=req.body.note.trim();
 await pool.query('INSERT INTO cart_notes(user_id,note) VALUES(?,?) ON DUPLICATE KEY UPDATE note=VALUES(note)',[req.user.id,note]);
 res.json(await getCart(req.user.id));
}));
router.put('/:productId',asyncRoute(async(req,res)=>{
 const id=int(req.params.productId,1),[[p]]=await pool.query('SELECT id,unit,stock,active FROM products WHERE id=?',[id]);
 if(!p||!p.active)fail('Produk sudah tidak tersedia.',404);
 const quantity=qty(req.body.quantity,p.unit);
 if(quantity>p.stock)fail(`Stok tersisa ${p.stock} ${p.unit.toLowerCase()}.`);
 // Updating quantity MUST preserve a note that the customer previously wrote.
 await pool.query("INSERT INTO cart_items(user_id,product_id,quantity,note) VALUES(?,?,?,'') ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)",[req.user.id,id,quantity]);
 res.json(await getCart(req.user.id));
}));
// Atomically swap SKU while keeping quantity, notes, stock validation and cart pricing consistent.
router.patch('/:productId/variant',asyncRoute(async(req,res)=>{
 const fromId=int(req.params.productId,1),toId=int(req.body?.toProductId,1);
 await swapCartVariant(pool,req.user.id,fromId,toId);
 res.json(await getCart(req.user.id));
}));
router.patch('/:productId/note',asyncRoute(async(req,res)=>{
 const id=int(req.params.productId,1);
 if(typeof req.body?.note!=='string'||req.body.note.length>500)fail('Catatan harus berupa teks maksimal 500 karakter.');
 const note=req.body.note.trim();
 const [result]=await pool.query('UPDATE cart_items SET note=? WHERE user_id=? AND product_id=?',[note,req.user.id,id]);
 if(!result.affectedRows)fail('Barang tidak ditemukan di keranjang.',404);
 res.json(await getCart(req.user.id));
}));
router.delete('/:productId',asyncRoute(async(req,res)=>{
 await pool.query('DELETE FROM cart_items WHERE user_id=? AND product_id=?',[req.user.id,int(req.params.productId,1)]);
 res.json(await getCart(req.user.id));
}));
module.exports=router;
