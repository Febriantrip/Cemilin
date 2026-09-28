// Migrasi additive + idempotent: mempertahankan email, password hash, role, data akun,
// keranjang dan pesanan lama. Dapat dijalankan ulang tanpa mengganti username existing.
const {pool}=require('../src/db');
async function hasColumn(name){const [r]=await pool.query('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1',['users',name]);return r.length>0;}
async function main(){
 if(!await hasColumn('username')){await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(40) NULL AFTER id');console.log('[OK] users.username dibuat.');}
 const [users]=await pool.query('SELECT id,username,email FROM users ORDER BY id');
 const occupied=new Set(users.filter(u=>u.username).map(u=>String(u.username).toLowerCase()));
 for(const u of users){
  if(u.username&&String(u.username).trim())continue;
  let candidate=String(u.email||'').split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g,'').replace(/^[^a-z0-9]+/,'').slice(0,28);
  if(!/^[a-z0-9][a-z0-9._]{2,39}$/.test(candidate))candidate='user'+u.id;
  const base=candidate;
  if(occupied.has(candidate))candidate=base.slice(0,Math.max(3,39-String(u.id).length))+'_'+u.id;
  let suffix=1;while(occupied.has(candidate)){candidate=('user'+u.id+'_'+suffix).slice(0,40);suffix+=1;}
  await pool.query('UPDATE users SET username=? WHERE id=? AND (username IS NULL OR username=\'\')',[candidate,u.id]);
  occupied.add(candidate);
  console.log('[OK] Username akun lama ID '+u.id+' disiapkan.');
 }
 // Biarkan kolom nullable demi kompatibilitas rollback API lama; aplikasi baru mensyaratkan username.
 const [[unique]]=await pool.query("SELECT COUNT(*) n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='username' AND NON_UNIQUE=0");
 if(!unique.n){await pool.query('ALTER TABLE users ADD UNIQUE KEY uq_users_username (username)');console.log('[OK] Username unik.');}
 // Email NULL = opsional; UNIQUE lama tetap melarang email yang sama jika diisi.
 await pool.query('ALTER TABLE users MODIFY COLUMN email VARCHAR(190) NULL DEFAULT NULL');
 console.log('[SUKSES] Username bisa login; email opsional. Akun lama tetap bisa login dengan email.');
}
main().catch(e=>{console.error('[ERROR] Migrasi akun:',e.message);process.exitCode=1;}).finally(()=>pool.end());
