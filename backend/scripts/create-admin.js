require('dotenv').config();
const bcrypt=require('bcryptjs');const crypto=require('node:crypto');
const {pool}=require('../src/db');
(async()=>{
 const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
 const password=String(process.env.ADMIN_PASSWORD||'');
 const name=String(process.env.ADMIN_NAME||'Pemilik Toko').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12){console.error('Isi ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 12 karakter) di backend/.env.');process.exitCode=1;return;}
 const hash=await bcrypt.hash(password,12);
 const [[existing]]=await pool.query('SELECT id,username FROM users WHERE email=?',[email]);
 if(existing){await pool.query("UPDATE users SET name=?,password_hash=?,role='ADMIN' WHERE id=?",[name,hash,existing.id]);console.log('Akun admin diperbarui:',email,'| username:',existing.username);return;}
 let username=email.split('@')[0].replace(/[^a-z0-9._]/g,'').slice(0,25);
 if(!/^[a-z0-9][a-z0-9._]{2,39}$/.test(username))username='admin';
 const [[taken]]=await pool.query('SELECT id FROM users WHERE username=?',[username]);
 if(taken)username='admin_'+crypto.randomBytes(5).toString('hex');
 await pool.query("INSERT INTO users(username,name,email,phone,password_hash,role) VALUES(?,?,?,'',?,'ADMIN')",[username,name,email,hash]);
 console.log('Akun admin disiapkan:',email,'| username:',username);
})().catch(e=>{console.error('Gagal membuat admin:',e.message);process.exitCode=1;}).finally(()=>pool.end());
