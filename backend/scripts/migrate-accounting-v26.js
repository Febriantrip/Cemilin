const {pool}=require('../src/db');

async function hasColumn(table,column){const [rows]=await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`,[column]);return rows.length>0;}
async function idByCode(code){const [[r]]=await pool.query('SELECT id FROM accounting_accounts WHERE code=?',[code]);return r?.id||null;}

(async()=>{
 try{
  if(!await hasColumn('products','average_cost'))await pool.query('ALTER TABLE products ADD COLUMN average_cost DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER price');
  if(!await hasColumn('order_items','unit_cost'))await pool.query('ALTER TABLE order_items ADD COLUMN unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER unit_price');

  await pool.query(`CREATE TABLE IF NOT EXISTS accounting_accounts(
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   code VARCHAR(20) NOT NULL UNIQUE,
   name VARCHAR(120) NOT NULL,
   type ENUM('ASSET','LIABILITY','EQUITY','REVENUE','COGS','EXPENSE') NOT NULL,
   normal_balance ENUM('DEBIT','CREDIT') NOT NULL,
   report_group VARCHAR(40) NOT NULL,
   cashflow_group ENUM('OPERATING','INVESTING','FINANCING','NONE') NOT NULL DEFAULT 'OPERATING',
   is_cash_bank TINYINT(1) NOT NULL DEFAULT 0,
   system_key VARCHAR(40) NULL UNIQUE,
   active TINYINT(1) NOT NULL DEFAULT 1,
   sort_order INT NOT NULL DEFAULT 0,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS suppliers(
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   code VARCHAR(30) NOT NULL UNIQUE,
   name VARCHAR(140) NOT NULL,
   phone VARCHAR(30) NOT NULL DEFAULT '',
   email VARCHAR(190) NULL,
   address VARCHAR(500) NOT NULL DEFAULT '',
   active TINYINT(1) NOT NULL DEFAULT 1,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS cash_bank_accounts(
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   code VARCHAR(30) NOT NULL UNIQUE,
   name VARCHAR(120) NOT NULL,
   kind ENUM('CASH','BANK','EWALLET') NOT NULL,
   account_id BIGINT UNSIGNED NOT NULL,
   bank_name VARCHAR(80) NOT NULL DEFAULT '',
   account_no VARCHAR(80) NOT NULL DEFAULT '',
   account_holder VARCHAR(120) NOT NULL DEFAULT '',
   active TINYINT(1) NOT NULL DEFAULT 1,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   CONSTRAINT fk_cash_bank_coa FOREIGN KEY(account_id) REFERENCES accounting_accounts(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS accounting_settings(
   id TINYINT UNSIGNED PRIMARY KEY,
   inventory_account_id BIGINT UNSIGNED NOT NULL,
   ap_account_id BIGINT UNSIGNED NOT NULL,
   sales_account_id BIGINT UNSIGNED NOT NULL,
   shipping_income_account_id BIGINT UNSIGNED NOT NULL,
   cogs_account_id BIGINT UNSIGNED NOT NULL,
   opening_equity_account_id BIGINT UNSIGNED NOT NULL,
   cash_cash_bank_id BIGINT UNSIGNED NULL,
   bca_cash_bank_id BIGINT UNSIGNED NULL,
   qris_cash_bank_id BIGINT UNSIGNED NULL,
   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS accounting_journals(
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   journal_no VARCHAR(50) NOT NULL UNIQUE,
   journal_date DATE NOT NULL,
   source_type ENUM('PURCHASE','SALES','CASH_BANK','OPENING','MANUAL') NOT NULL,
   source_id BIGINT UNSIGNED NULL,
   description VARCHAR(255) NOT NULL DEFAULT '',
   reference_no VARCHAR(80) NULL,
   status ENUM('POSTED','VOID') NOT NULL DEFAULT 'POSTED',
   posted_at DATETIME NULL,
   created_by BIGINT UNSIGNED NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   UNIQUE KEY uq_journal_source(source_type,source_id),
   KEY idx_journal_date(journal_date,status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS accounting_journal_lines(
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   journal_id BIGINT UNSIGNED NOT NULL,
   account_id BIGINT UNSIGNED NOT NULL,
   description VARCHAR(255) NOT NULL DEFAULT '',
   debit DECIMAL(16,2) NOT NULL DEFAULT 0,
   credit DECIMAL(16,2) NOT NULL DEFAULT 0,
   party_type ENUM('SUPPLIER','CUSTOMER') NULL,
   party_id BIGINT UNSIGNED NULL,
   KEY idx_journal_lines_account(account_id,journal_id),
   CONSTRAINT fk_jl_journal FOREIGN KEY(journal_id) REFERENCES accounting_journals(id) ON DELETE CASCADE,
   CONSTRAINT fk_jl_account FOREIGN KEY(account_id) REFERENCES accounting_accounts(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS purchases(
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   purchase_no VARCHAR(40) NOT NULL UNIQUE,
   purchase_date DATE NOT NULL,
   supplier_id BIGINT UNSIGNED NOT NULL,
   supplier_invoice_no VARCHAR(80) NOT NULL DEFAULT '',
   payment_mode ENUM('CASH','CREDIT') NOT NULL,
   cash_bank_account_id BIGINT UNSIGNED NULL,
   due_date DATE NULL,
   total DECIMAL(16,2) NOT NULL,
   note VARCHAR(500) NOT NULL DEFAULT '',
   status ENUM('POSTED','VOID') NOT NULL DEFAULT 'POSTED',
   journal_id BIGINT UNSIGNED NULL,
   created_by BIGINT UNSIGNED NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   KEY idx_purchase_date(purchase_date,status),
   CONSTRAINT fk_purchase_supplier FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
   CONSTRAINT fk_purchase_cashbank FOREIGN KEY(cash_bank_account_id) REFERENCES cash_bank_accounts(id),
   CONSTRAINT fk_purchase_journal FOREIGN KEY(journal_id) REFERENCES accounting_journals(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS purchase_items(
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   purchase_id BIGINT UNSIGNED NOT NULL,
   product_id BIGINT UNSIGNED NULL,
   account_id BIGINT UNSIGNED NOT NULL,
   description VARCHAR(180) NOT NULL,
   quantity DECIMAL(14,3) NOT NULL DEFAULT 1,
   unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
   amount DECIMAL(16,2) NOT NULL,
   CONSTRAINT fk_purchase_item_header FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
   CONSTRAINT fk_purchase_item_product FOREIGN KEY(product_id) REFERENCES products(id),
   CONSTRAINT fk_purchase_item_account FOREIGN KEY(account_id) REFERENCES accounting_accounts(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS cash_bank_transactions(
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
   transaction_no VARCHAR(40) NOT NULL UNIQUE,
   transaction_date DATE NOT NULL,
   direction ENUM('IN','OUT','TRANSFER') NOT NULL,
   cash_bank_account_id BIGINT UNSIGNED NOT NULL,
   target_cash_bank_account_id BIGINT UNSIGNED NULL,
   counter_account_id BIGINT UNSIGNED NULL,
   supplier_id BIGINT UNSIGNED NULL,
   amount DECIMAL(16,2) NOT NULL,
   description VARCHAR(255) NOT NULL,
   reference_no VARCHAR(80) NOT NULL DEFAULT '',
   journal_id BIGINT UNSIGNED NULL,
   created_by BIGINT UNSIGNED NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   KEY idx_cashbank_date(transaction_date),
   CONSTRAINT fk_cbt_cashbank FOREIGN KEY(cash_bank_account_id) REFERENCES cash_bank_accounts(id),
   CONSTRAINT fk_cbt_target FOREIGN KEY(target_cash_bank_account_id) REFERENCES cash_bank_accounts(id),
   CONSTRAINT fk_cbt_counter FOREIGN KEY(counter_account_id) REFERENCES accounting_accounts(id),
   CONSTRAINT fk_cbt_supplier FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
   CONSTRAINT fk_cbt_journal FOREIGN KEY(journal_id) REFERENCES accounting_journals(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const accounts=[
   ['1101','Kas','ASSET','DEBIT','CURRENT_ASSET','OPERATING',1,'CASH',10],
   ['1102','Bank BCA','ASSET','DEBIT','CURRENT_ASSET','OPERATING',1,'BCA',20],
   ['1103','QRIS / E-Wallet Clearing','ASSET','DEBIT','CURRENT_ASSET','OPERATING',1,'QRIS',30],
   ['1201','Piutang Usaha','ASSET','DEBIT','CURRENT_ASSET','OPERATING',0,'AR',40],
   ['1301','Persediaan Barang Dagang','ASSET','DEBIT','CURRENT_ASSET','OPERATING',0,'INVENTORY',50],
   ['1501','Peralatan','ASSET','DEBIT','FIXED_ASSET','INVESTING',0,null,60],
   ['2001','Hutang Usaha','LIABILITY','CREDIT','CURRENT_LIABILITY','OPERATING',0,'AP',100],
   ['2101','Hutang Lain-lain','LIABILITY','CREDIT','CURRENT_LIABILITY','OPERATING',0,null,110],
   ['3001','Modal Pemilik','EQUITY','CREDIT','EQUITY','FINANCING',0,null,200],
   ['3101','Saldo Awal / Laba Ditahan','EQUITY','CREDIT','EQUITY','FINANCING',0,'OPENING_EQUITY',210],
   ['4001','Penjualan','REVENUE','CREDIT','SALES','OPERATING',0,'SALES',300],
   ['4002','Pendapatan Ongkir','REVENUE','CREDIT','OTHER_REVENUE','OPERATING',0,'SHIPPING_INCOME',310],
   ['5001','Harga Pokok Penjualan','COGS','DEBIT','COGS','OPERATING',0,'COGS',400],
   ['6101','Beban Pengiriman','EXPENSE','DEBIT','OPERATING_EXPENSE','OPERATING',0,null,500],
   ['6201','Beban Admin Bank','EXPENSE','DEBIT','OPERATING_EXPENSE','OPERATING',0,null,510],
   ['6301','Beban Operasional','EXPENSE','DEBIT','OPERATING_EXPENSE','OPERATING',0,null,520],
   ['6401','Beban Pemasaran','EXPENSE','DEBIT','OPERATING_EXPENSE','OPERATING',0,null,530],
   ['6501','Beban Utilitas','EXPENSE','DEBIT','OPERATING_EXPENSE','OPERATING',0,null,540],
   ['6601','Beban Gaji / Tenaga Kerja','EXPENSE','DEBIT','OPERATING_EXPENSE','OPERATING',0,null,550],
   ['6701','Beban Sewa','EXPENSE','DEBIT','OPERATING_EXPENSE','OPERATING',0,null,560],
   ['6801','Beban Lain-lain','EXPENSE','DEBIT','OTHER_EXPENSE','OPERATING',0,null,570],
   ['7001','Pendapatan Lain-lain','REVENUE','CREDIT','OTHER_REVENUE','OPERATING',0,null,600]
  ];
  for(const a of accounts)await pool.query(`INSERT IGNORE INTO accounting_accounts(code,name,type,normal_balance,report_group,cashflow_group,is_cash_bank,system_key,sort_order) VALUES(?,?,?,?,?,?,?,?,?)`,a);

  const cashId=await idByCode('1101'),bcaId=await idByCode('1102'),qrisId=await idByCode('1103');
  const [[store]]=await pool.query('SELECT bank_name,bank_account,bank_holder FROM store_settings WHERE id=1');
  await pool.query(`INSERT IGNORE INTO cash_bank_accounts(code,name,kind,account_id) VALUES('CASH-01','Kas Utama','CASH',?)`,[cashId]);
  await pool.query(`INSERT INTO cash_bank_accounts(code,name,kind,account_id,bank_name,account_no,account_holder)
    VALUES('BCA-01','Bank BCA','BANK',?,?,?,?) ON DUPLICATE KEY UPDATE account_id=VALUES(account_id),bank_name=IF(bank_name='',VALUES(bank_name),bank_name),account_no=IF(account_no='',VALUES(account_no),account_no),account_holder=IF(account_holder='',VALUES(account_holder),account_holder)`,[bcaId,store?.bank_name||'BCA',store?.bank_account||'',store?.bank_holder||'']);
  await pool.query(`INSERT IGNORE INTO cash_bank_accounts(code,name,kind,account_id,bank_name) VALUES('QRIS-01','QRIS / E-Wallet','EWALLET',?,'QRIS')`,[qrisId]);

  const ids={inventory:await idByCode('1301'),ap:await idByCode('2001'),sales:await idByCode('4001'),ship:await idByCode('4002'),cogs:await idByCode('5001'),opening:await idByCode('3101')};
  const [[cash]]=await pool.query("SELECT id FROM cash_bank_accounts WHERE code='CASH-01'"),[[bca]]=await pool.query("SELECT id FROM cash_bank_accounts WHERE code='BCA-01'"),[[qris]]=await pool.query("SELECT id FROM cash_bank_accounts WHERE code='QRIS-01'");
  await pool.query(`INSERT INTO accounting_settings(id,inventory_account_id,ap_account_id,sales_account_id,shipping_income_account_id,cogs_account_id,opening_equity_account_id,cash_cash_bank_id,bca_cash_bank_id,qris_cash_bank_id)
    VALUES(1,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE inventory_account_id=VALUES(inventory_account_id),ap_account_id=VALUES(ap_account_id),sales_account_id=VALUES(sales_account_id),shipping_income_account_id=VALUES(shipping_income_account_id),cogs_account_id=VALUES(cogs_account_id),opening_equity_account_id=VALUES(opening_equity_account_id),cash_cash_bank_id=COALESCE(cash_cash_bank_id,VALUES(cash_cash_bank_id)),bca_cash_bank_id=COALESCE(bca_cash_bank_id,VALUES(bca_cash_bank_id)),qris_cash_bank_id=COALESCE(qris_cash_bank_id,VALUES(qris_cash_bank_id))`,[ids.inventory,ids.ap,ids.sales,ids.ship,ids.cogs,ids.opening,cash.id,bca.id,qris.id]);

  await pool.query('UPDATE order_items oi JOIN products p ON p.id=oi.product_id SET oi.unit_cost=p.average_cost WHERE oi.unit_cost=0 AND p.average_cost>0');
  const {backfillSalesJournals}=require('../src/services/accounting');
  const backfilled=await backfillSalesJournals(pool);
  console.log(`[V26] Accounting schema ready. Sales journals backfilled: ${backfilled}.`);
 }finally{await pool.end();}
})().catch(err=>{console.error(err);process.exit(1);});
