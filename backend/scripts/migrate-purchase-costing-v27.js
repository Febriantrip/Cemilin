const {pool}=require('../src/db');

async function hasColumn(table,column){const [rows]=await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`,[column]);return rows.length>0;}
async function addColumn(table,column,ddl){if(!await hasColumn(table,column))await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);}

(async()=>{
 try{
  await addColumn('purchases','gross_total','gross_total DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER due_date');
  await addColumn('purchases','item_discount_total','item_discount_total DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER gross_total');
  await addColumn('purchases','invoice_discount_type',"invoice_discount_type ENUM('NONE','AMOUNT','PERCENT') NOT NULL DEFAULT 'NONE' AFTER item_discount_total");
  await addColumn('purchases','invoice_discount_value','invoice_discount_value DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER invoice_discount_type');
  await addColumn('purchases','invoice_discount_total','invoice_discount_total DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER invoice_discount_value');
  await addColumn('purchases','landed_cost_total','landed_cost_total DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER invoice_discount_total');

  await addColumn('purchase_items','unit_price','unit_price DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER quantity');
  await addColumn('purchase_items','discount_type',"discount_type ENUM('NONE','AMOUNT','PERCENT') NOT NULL DEFAULT 'NONE' AFTER unit_price");
  await addColumn('purchase_items','discount_value','discount_value DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER discount_type');
  await addColumn('purchase_items','gross_amount','gross_amount DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER discount_value');
  await addColumn('purchase_items','discount_amount','discount_amount DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER gross_amount');
  await addColumn('purchase_items','invoice_discount_alloc','invoice_discount_alloc DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER discount_amount');
  await addColumn('purchase_items','landed_cost_alloc','landed_cost_alloc DECIMAL(16,2) NOT NULL DEFAULT 0 AFTER invoice_discount_alloc');

  await pool.query(`UPDATE purchases SET gross_total=total WHERE gross_total=0 AND total>0`);
  await pool.query(`UPDATE purchase_items SET unit_price=unit_cost WHERE unit_price=0 AND unit_cost>0`);
  await pool.query(`UPDATE purchase_items SET gross_amount=amount WHERE gross_amount=0 AND amount>0`);

  console.log('[V27] Purchase costing schema ready: item discount, invoice discount, landed cost, and final HPP.');
 }finally{await pool.end();}
})().catch(err=>{console.error(err);process.exit(1);});
