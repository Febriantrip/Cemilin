const {pool}=require('../src/db');
(async()=>{
  try{
    const [promo]=await pool.query("SHOW COLUMNS FROM store_settings LIKE 'promo_enabled'");
    if(!promo.length){
      await pool.query("ALTER TABLE store_settings ADD COLUMN promo_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER qris_filename");
      console.log('[V23] promo_enabled ditambahkan.');
    }
    await pool.query("ALTER TABLE orders MODIFY COLUMN status ENUM('AWAITING_PAYMENT','PAYMENT_REVIEW','PAYMENT_REJECTED','PAID','PROCESSING','READY','SHIPPED','COMPLETED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'AWAITING_PAYMENT'");
    console.log('[V23] orders.status mendukung SHIPPED.');
  }finally{
    await pool.end();
  }
})().catch(err=>{console.error(err);process.exit(1);});
