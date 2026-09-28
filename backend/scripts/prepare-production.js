'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const mysql=require('mysql2/promise');

const root=path.resolve(__dirname,'../..');
const databaseDir=path.join(root,'database');
const backendDir=path.join(root,'backend');

function dbConfig(){
 const required=['DB_HOST','DB_USER','DB_NAME'];
 const missing=required.filter(k=>!String(process.env[k]||'').trim());
 if(missing.length)throw new Error('Variable database belum lengkap: '+missing.join(', '));
 return {
  host:process.env.DB_HOST,
  port:Number(process.env.DB_PORT||3306),
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD||'',
  database:process.env.DB_NAME,
  multipleStatements:true,
  decimalNumbers:true,
  timezone:'+07:00',
 };
}

function cleanSql(file){
 return fs.readFileSync(file,'utf8')
  .replace(/^\s*CREATE\s+DATABASE[^;]*;\s*/gim,'')
  .replace(/^\s*USE\s+[^;]+;\s*/gim,'');
}

function runNode(script){
 const full=path.join(backendDir,'scripts',script);
 const r=spawnSync(process.execPath,[full],{cwd:root,env:process.env,stdio:'inherit'});
 if(r.status!==0)throw new Error(`${script} gagal dengan exit code ${r.status}`);
}

(async()=>{
 let conn;
 try{
  conn=await mysql.createConnection(dbConfig());
  console.log('[PROD] Menyiapkan schema dasar...');
  await conn.query(cleanSql(path.join(databaseDir,'001_schema.sql')));

  const [[count]]=await conn.query('SELECT COUNT(*) AS total FROM products');
  if(Number(count.total)===0){
   console.log('[PROD] Database baru terdeteksi. Memasukkan master produk awal...');
   await conn.query(cleanSql(path.join(databaseDir,'002_seed_products.sql')));
   // Seed lokal memakai stok simulasi. Production harus mulai aman dari stok 0.
   await conn.query('UPDATE products SET stock=0, image_filename=NULL');
   console.log('[PROD] Stok seed direset ke 0 dan foto upload dikosongkan; isi stok/foto real dari Seller Center.');
  }else{
   console.log(`[PROD] Produk existing ${count.total}; seed dilewati agar stok/data tidak tertimpa.`);
  }
  await conn.end();conn=null;

  const migrations=[
   'migrate-usernames.js',
   'migrate-cart-notes.js',
   'migrate-cart-general-note.js',
   'migrate-promo-toggle.js',
   'migrate-v23.js',
   'migrate-cemilin-brand.js',
   'migrate-accounting-v26.js',
   'migrate-purchase-costing-v27.js',
  ];
  for(const migration of migrations){
   console.log(`[PROD] ${migration}`);
   runNode(migration);
  }
  console.log('[PROD] Database production siap.');
 }catch(error){
  console.error('[PROD ERROR]',error.message);
  process.exitCode=1;
 }finally{
  if(conn)await conn.end().catch(()=>undefined);
 }
})();
